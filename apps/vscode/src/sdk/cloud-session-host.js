// CloudSessionHost — an SdkSessionHost backed by a Cline Cloud sandbox.
//
// A cloud session has two ids: the outer `ses-…` record owned by the Cline
// Cloud control plane (what extension history and the task view use as their
// identifier), and the canonical `tsk-…` Hub session named by the control plane. This host dials the
// pod's Hub through the api.cline.bot WebSocket proxy with the user's Cline
// account token, maps outer <-> inner ids, and re-emits Hub events under the
// outer id so the rest of the extension (session lifecycle, event coordinator,
// message translator, chat view) works exactly as it does for local sessions.
//
// No local tool executors are attached: editing, commands and file reads all
// run inside the sandbox. Tools are auto-approved there (the sandbox is
// isolated and the session must keep going after VS Code closes), so the
// approval capability only surfaces anything the pod still insists on asking.
import { RemoteRuntimeHost } from "@cline/core"
import { buildCloudSessionSystemPrompt } from "@cline/core/cloud"
import { CLOUD_SESSION_MODE, CLOUD_WORKSPACE_ROOT } from "@shared/cloud/cloud-sessions"
import { Logger } from "@/shared/services/Logger"

const AUTO_APPROVE_ALL = { "*": { enabled: true, autoApprove: true } }
function isMissingSessionError(error, sessionId) {
	const { code, message } = error ?? {}
	return code === "session_not_found" || message === `session not found: ${sessionId}`
}
export function mapAgentStatus(status) {
	switch (status) {
		case "running":
		case "pending":
			return "running"
		case "completed":
			return "completed"
		case "failed":
		case "error":
			return "failed"
		case "idle":
			return "idle"
		case "cancelled":
		case "aborted":
			return "cancelled"
		default:
			return undefined
	}
}
export function mapAgentFinishReason(reason) {
	switch (reason) {
		case "completed":
			return "completed"
		case "aborted":
			return "cancelled"
		case "error":
		case "max_iterations":
		case "mistake_limit":
			return "failed"
		default:
			return "unknown"
	}
}
function unsupported(operation) {
	throw new Error(`${operation} is not supported for cloud sessions`)
}
export class CloudSessionHost {
	options
	isCloud = true
	runtimeAddress
	outerSessionId
	taskId
	innerSessionId
	agentStatus = "idle"
	modelId
	host
	statusUnsubscribe
	disposed = false
	statusObservation = {}
	/** Whether the inner session is known to have a live runtime on this connection's Hub. */
	innerSessionLive = false
	constructor(options, host) {
		this.options = options
		this.outerSessionId = options.outerSessionId
		this.taskId = options.taskId
		this.host = host
		this.runtimeAddress = options.socketUrl
		// Track the agent's activity for the whole life of the connection, not
		// just while a task view is subscribed: the registry uses it to show
		// running/finished in History and to notify when a background cloud
		// task completes.
		this.statusUnsubscribe = host.subscribe((event) => this.trackStatus(event))
	}
	static async connect(options) {
		const workspaceRoot = options.workspaceRoot ?? CLOUD_WORKSPACE_ROOT
		const host = new RemoteRuntimeHost({
			endpoint: options.socketUrl,
			clientType: "vscode-cloud-session",
			displayName: "Cline for VS Code (cloud session)",
			workspaceRoot,
			cwd: workspaceRoot,
			telemetry: options.telemetry,
			capabilities: options.requestToolApproval ? { requestToolApproval: options.requestToolApproval } : undefined,
			resolveConnectionHeaders: async () => {
				const token = (await options.getAuthToken())?.trim()
				if (!token) {
					throw new Error("Sign in to Cline to connect to this cloud session.")
				}
				return { Authorization: `Bearer ${token}` }
			},
		})
		await host.connect()
		const cloudHost = new CloudSessionHost(options, host)
		try {
			await cloudHost.discoverInnerSession()
		} catch (error) {
			await cloudHost.dispose("discoveryFailed").catch(() => {})
			throw error
		}
		return cloudHost
	}
	get status() {
		return this.agentStatus
	}
	get sessionModelId() {
		return this.modelId
	}
	/** Attach only to the canonical conversation named by the control plane. */
	async discoverInnerSession() {
		const observation = this.statusObservation
		const sessions = await this.host.listSessions(100)
		if (this.disposed || this.statusObservation !== observation) return
		const task = sessions.find((session) => session.sessionId === this.taskId)
		if (task) {
			this.innerSessionId = task.sessionId
			this.modelId = typeof task.model === "string" ? task.model : undefined
			const mapped = mapAgentStatus(String(task.status ?? ""))
			this.setStatus(mapped ?? "unknown", false)
			// The Hub streams a session's events only to clients subscribed to it,
			// and it subscribes a client when it first sends a command for that
			// session. A connection opened only to watch status has sent none, so
			// list the task's pending prompts to open the stream; otherwise a turn
			// finished by another client would leave this host on "running".
			await this.host.pendingPrompts.list({ sessionId: task.sessionId }).catch(() => undefined)
		} else if (this.innerSessionId) {
			this.setStatus("unknown", false)
		}
	}
	/** Re-read a retained connection after its control-plane record changed. */
	async refreshStatus() {
		const observation = this.statusObservation
		try {
			// The coordinator applies this snapshot only while its record is still
			// current; a snapshot is not a new activity/completion event.
			await this.discoverInnerSession()
		} catch (error) {
			if (!this.disposed && this.statusObservation === observation) this.setStatus("unknown", false)
			throw error
		}
		return this.status
	}
	trackStatus(event) {
		if (!this.innerSessionId || event.payload.sessionId !== this.innerSessionId) {
			return
		}
		this.statusObservation = {}
		if (event.type === "status") {
			const mapped = mapAgentStatus(event.payload.status)
			// "idle" is the resting state after any turn; keep the more specific
			// completed/failed/cancelled outcome until the agent runs again.
			if (mapped && !(mapped === "idle" && ["completed", "failed", "cancelled"].includes(this.agentStatus))) {
				this.setStatus(mapped)
			}
		} else if (event.type === "ended") {
			this.setStatus(mapAgentFinishReason(event.payload.reason))
		} else if (event.type === "agent_event") {
			const agentEvent = event.payload.event
			if (agentEvent.type === "done") {
				this.setStatus(mapAgentFinishReason(agentEvent.reason))
			} else if (agentEvent.type === "error" && agentEvent.recoverable === false) {
				this.setStatus("failed")
			} else if (this.agentStatus !== "running") {
				this.setStatus("running")
			}
		} else if (event.type === "chunk" && this.agentStatus !== "running") {
			this.setStatus("running")
		}
	}
	setStatus(status, notify = true) {
		this.statusObservation = {}
		if (this.agentStatus === status) {
			return
		}
		this.agentStatus = status
		if (notify) this.options.onStatusChange?.(status)
	}
	toInner(sessionId) {
		if (sessionId !== this.outerSessionId && sessionId !== this.innerSessionId) {
			Logger.warn(`[CloudSessionHost] Unexpected session id ${sessionId} for cloud session ${this.outerSessionId}`)
		}
		if (!this.innerSessionId) {
			throw new Error("This cloud session has no conversation yet.")
		}
		return this.innerSessionId
	}
	remap(event) {
		if (!this.innerSessionId || event.payload.sessionId !== this.innerSessionId) {
			return undefined
		}
		return { ...event, payload: { ...event.payload, sessionId: this.outerSessionId } }
	}
	// ---- SdkSessionHost ----
	async start(input) {
		if (this.innerSessionId) {
			throw new Error("This cloud session already has a conversation.")
		}
		// The control plane snapshots the outer session and canonical task ids
		// together. Keep that task id for every artifact this Hub session writes.
		const plannedId = this.taskId
		this.innerSessionId = plannedId
		this.setStatus("running")
		try {
			const result = await this.host.startSession({
				...input,
				config: this.sandboxSessionConfig(input.config, plannedId),
				toolPolicies: AUTO_APPROVE_ALL,
			})
			this.innerSessionId = result.sessionId
			this.innerSessionLive = true
			this.modelId = input.config.modelId
			return { ...result, sessionId: this.outerSessionId }
		} catch (error) {
			this.innerSessionId = undefined
			this.setStatus("failed")
			throw error
		}
	}
	sandboxSessionConfig(config, sessionId) {
		const workspaceRoot = this.options.workspaceRoot ?? CLOUD_WORKSPACE_ROOT
		// The same sandbox guidance (GitHub access, work branch) every cloud client sends.
		const guidance = buildCloudSessionSystemPrompt({
			id: this.outerSessionId,
			sandboxType: this.options.sandboxType,
			metadata: { taskId: this.taskId },
		})
		return {
			...config,
			sessionId,
			cwd: config.cwd?.trim() || workspaceRoot,
			workspaceRoot,
			systemPrompt: config.systemPrompt ? `${guidance}\n\n${config.systemPrompt}` : guidance,
		}
	}
	/**
	 * A resumed sandbox restarts its Hub with the conversation saved on disk but
	 * no runtime, so a turn would fail with "session not found". Rebuild the
	 * runtime from the saved messages before the first turn on this connection.
	 */
	async ensureInnerSessionLive(sessionId, restoreConfig) {
		try {
			await this.host.updateSessionConnection(sessionId, {})
		} catch (error) {
			if (!isMissingSessionError(error, sessionId)) throw error
			const initialMessages = await this.host.readSessionMessages(sessionId)
			if (initialMessages.length === 0) throw new Error("This cloud session's saved conversation is unavailable.")
			const config = this.sandboxSessionConfig(await restoreConfig(), sessionId)
			try {
				await this.host.startSession({ config, initialMessages, interactive: true, toolPolicies: AUTO_APPROVE_ALL })
			} catch (restoreError) {
				// Another client restored it first.
				if (restoreError?.code !== "session_already_exists") throw restoreError
			}
		}
		this.innerSessionLive = true
	}
	async send(input) {
		const sessionId = this.toInner(input.sessionId)
		const { restoreConfig } = this.options
		if (restoreConfig && !this.innerSessionLive) await this.ensureInnerSessionLive(sessionId, restoreConfig)
		this.setStatus("running")
		try {
			return await this.host.runTurn({
				...input,
				sessionId,
				// The sandbox runtime was built for Act; every turn must say the same.
				mode: CLOUD_SESSION_MODE,
				// Local file paths mean nothing inside the sandbox; images travel as data URLs.
				userFiles: undefined,
			})
		} catch (error) {
			// The Hub can restart under this connection when another client resumes
			// the sandbox; let the next send restore the runtime.
			if (isMissingSessionError(error, sessionId)) this.innerSessionLive = false
			// A rejected RPC proves only that this client stopped observing the turn;
			// the sandbox may still be running after a transport loss.
			if (!this.disposed && (this.agentStatus === "running" || this.agentStatus === "idle")) {
				this.setStatus("unknown")
			}
			throw error
		}
	}
	async getAccumulatedUsage(sessionId) {
		const summary = await this.host.getAccumulatedUsage?.(this.toInner(sessionId))
		return summary?.usage
	}
	async abort(sessionId, reason) {
		try {
			await this.host.abort(this.toInner(sessionId), reason)
		} catch (error) {
			if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))) {
				return
			}
			throw error
		}
	}
	/**
	 * "Stopping" a cloud session from the task view must not stop the agent:
	 * the whole point is that it keeps running after the user moves on. The
	 * connection is kept by the registry; the caller only unsubscribes.
	 */
	async stop(_sessionId) {}
	async dispose(_reason) {
		if (this.disposed) {
			return
		}
		this.disposed = true
		this.statusUnsubscribe()
		await this.host.dispose()
	}
	async get(sessionId) {
		if (!this.innerSessionId) {
			return undefined
		}
		const record = await this.host.getSession(this.toInner(sessionId))
		return record ? { ...record, sessionId: this.outerSessionId } : undefined
	}
	async list() {
		return []
	}
	async listHistory() {
		return []
	}
	async delete(_sessionId) {
		return unsupported("Deleting the sandbox conversation")
	}
	async readMessages(sessionId) {
		if (!this.innerSessionId) {
			return []
		}
		return await this.host.readSessionMessages(this.toInner(sessionId))
	}
	async readLiveMessages(sessionId) {
		return this.readMessages(sessionId)
	}
	async updateSessionCompactionState(sessionId, state) {
		return this.host.updateSessionCompactionState(this.toInner(sessionId), state)
	}
	async restore(_input) {
		return unsupported("Checkpoint restore")
	}
	async compareCheckpoint(_input) {
		return unsupported("Checkpoint comparison")
	}
	async update(sessionId, updates) {
		if (!this.innerSessionId) {
			return { updated: false }
		}
		return this.host.updateSession(this.toInner(sessionId), updates)
	}
	async handleHookEvent(payload) {
		return this.host.dispatchHookEvent(payload)
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async pendingPrompts(action, input) {
		const mapped = { ...input, sessionId: this.toInner(input.sessionId) }
		switch (action) {
			case "list":
				return await this.host.pendingPrompts.list(mapped)
			case "update":
				return { ...(await this.host.pendingPrompts.update(mapped)), sessionId: this.outerSessionId }
			case "delete":
				return { ...(await this.host.pendingPrompts.delete(mapped)), sessionId: this.outerSessionId }
			default:
				throw new Error(`Unsupported pending prompt action: ${String(action)}`)
		}
	}
	subscribe(listener) {
		return this.host.subscribe((event) => {
			const remapped = this.remap(event)
			if (remapped) {
				listener(remapped)
			}
		})
	}
}
//# sourceMappingURL=cloud-session-host.js.map
