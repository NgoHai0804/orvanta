import { formatModeSwitchNotice } from "@cline/shared"
import { StateManager } from "@/core/storage/StateManager"
import { Logger } from "@/shared/services/Logger"
import { buildToolPolicies } from "./sdk-tool-policies"
import { VscodeSessionHost } from "./vscode-session-host"

function toSessionMode(mode) {
	return mode === "plan" || mode === "act" ? mode : undefined
}
export class SdkSessionLifecycle {
	options
	activeSession
	sharedHost
	sharedHostPromise
	sharedHostUnsubscribe
	/**
	 * Stops still in flight, keyed by sessionId. Mode/MCP rebuilds and
	 * follow-up resumes reuse the sessionId of the session they replace, and
	 * core cleanup is keyed by sessionId, so a same-id start that overlaps a
	 * stop would be torn down by the old session's late cleanup.
	 * startNewSession consults this map to enforce stop-before-start, the same
	 * sequencing the CLI uses.
	 */
	pendingStops = new Map()
	/**
	 * Counts turns started on the active session. A send whose promise settles
	 * after a newer turn began (Core drained a queued prompt) must not mark the
	 * session idle, or a passive rebuild could replace it mid-turn.
	 */
	turnGeneration = 0
	/**
	 * Session starts that read the mode setting outside the rebuild lock (new
	 * task, edited message, checkpoint restore). Until one settles, the session
	 * it is building is not active yet, so a mode toggle waits for it instead
	 * of mistaking "no active session" for "nothing to rebuild".
	 */
	pendingStarts = new Set()
	/**
	 * Settles with each session's latest turn send. Core adds the prompt to the
	 * conversation only when its agent loop picks the turn up, so a turn
	 * aborted right after its send is missing from the session's messages
	 * until the send settles.
	 */
	turnSends = new WeakMap()
	constructor(options) {
		this.options = options
	}
	/**
	 * Runs a session start, from reading the mode setting until the new
	 * session is active and its first turn is sent, as one tracked unit.
	 */
	async trackSessionStart(operation) {
		const run = operation()
		const settled = run.then(
			() => undefined,
			() => undefined,
		)
		this.pendingStarts.add(settled)
		try {
			return await run
		} finally {
			this.pendingStarts.delete(settled)
		}
	}
	/** Resolves once no tracked session start is in flight. */
	async waitForSessionStarts() {
		while (this.pendingStarts.size > 0) {
			await Promise.all(this.pendingStarts)
		}
	}
	/** Waits for `session`'s latest turn send to settle; false if it is still in flight after `timeoutMs`. */
	async waitForTurnSend(session, timeoutMs = 3000) {
		const send = this.turnSends.get(session)
		if (send && !(await this.waitForStop(send, timeoutMs))) {
			Logger.warn(`[SdkController] Timed out after ${timeoutMs}ms waiting for the turn of ${session.sessionId} to settle`)
			return false
		}
		return true
	}
	getActiveSession() {
		return this.activeSession
	}
	setRunning(isRunning) {
		const activeSession = this.activeSession
		if (!activeSession || activeSession.isRunning === isRunning) {
			return
		}
		activeSession.isRunning = isRunning
		if (isRunning) {
			this.turnGeneration += 1
		} else {
			this.options.onDidBecomeIdle?.()
		}
	}
	/** Records Core's queue length for the active session; see ActiveSession.queuedPromptCount. */
	setQueuedPromptCount(count) {
		const activeSession = this.activeSession
		if (!activeSession || activeSession.queuedPromptCount === count) {
			return
		}
		activeSession.queuedPromptCount = count
		if (count === 0 && !activeSession.isRunning) {
			this.options.onDidBecomeIdle?.()
		}
	}
	clearActiveSessionReference() {
		const activeSession = this.activeSession
		this.activeSession = undefined
		return activeSession
	}
	async endActiveSession(reason, options = {}) {
		const activeSession = this.clearActiveSessionReference()
		if (!activeSession) {
			return undefined
		}
		this.safeUnsubscribe(activeSession, reason)
		const stopPromise = this.trackSessionStop(activeSession.sdkHost, activeSession.sessionId, reason)
		if (options.awaitStop) {
			const timeoutMs = options.timeoutMs ?? 3000
			const stopped = await this.waitForStop(stopPromise, timeoutMs)
			if (!stopped) {
				Logger.warn(
					`[SdkController] Timed out stopping SDK session ${activeSession.sessionId} after ${timeoutMs}ms (${reason})`,
				)
			}
		}
		return activeSession
	}
	/**
	 * Resolves once any in-flight stop for `sessionId` has settled. Callers that
	 * start a session outside startNewSession (e.g. on an isolated host) must
	 * wait here first, or the old session's late cleanup tears down the new one.
	 */
	async waitForPendingStop(sessionId) {
		const pendingStop = this.pendingStops.get(sessionId)
		if (pendingStop) {
			Logger.log(`[SdkController] Waiting for session ${sessionId} to stop before restarting it`)
			await pendingStop
		}
	}
	async updateActiveSessionModel(modelId) {
		const activeSession = this.activeSession
		if (!activeSession?.sdkHost.updateSessionModel) {
			return false
		}
		await activeSession.sdkHost.updateSessionModel(activeSession.sessionId, modelId)
		return true
	}
	async startNewSession(
		startInput,
		/**
		 * Session-scoped host (e.g. a CloudSessionHost) to start on instead of the
		 * shared local host. Its events are routed to onSessionEvent for as long
		 * as the session is active; tool policies are left to the host.
		 */
		hostOverride,
		/** Rechecked at every suspension point so a stale start cannot replace its successor. */
		shouldContinue = () => true,
	) {
		if (!shouldContinue()) {
			throw new SessionStartSupersededError()
		}
		if (this.activeSession) {
			await this.endActiveSession("startNewSession")
		}
		// Same-id starts must wait for the previous session's stop to finish;
		// see pendingStops. A fresh id cannot conflict, so it never waits.
		const requestedSessionId = startInput.config?.sessionId?.trim()
		if (requestedSessionId) {
			await this.waitForPendingStop(requestedSessionId)
		}
		if (!shouldContinue()) {
			throw new SessionStartSupersededError()
		}
		const autoApprovalSettings = StateManager.get().getGlobalSettingsKey("autoApprovalSettings")
		const toolPolicies =
			!hostOverride && autoApprovalSettings ? buildToolPolicies(autoApprovalSettings, this.options.mcpHub) : undefined
		const sdkHost = hostOverride ?? (await this.getOrCreateSharedHost())
		if (!shouldContinue()) {
			throw new SessionStartSupersededError()
		}
		const startResult = await sdkHost.start({
			...startInput,
			...(toolPolicies ? { toolPolicies } : {}),
		})
		if (!shouldContinue()) {
			await sdkHost.stop(startResult.sessionId)
			throw new SessionStartSupersededError()
		}
		this.activeSession = {
			sessionId: startResult.sessionId,
			startConfig: startInput.config
				? {
						providerId: startInput.config.providerId,
						modelId: startInput.config.modelId,
					}
				: undefined,
			mode: toSessionMode(startInput.config?.mode),
			sdkHost,
			unsubscribe: hostOverride ? this.subscribeSessionHost(hostOverride) : () => {},
			startResult,
			isRunning: true,
			queuedPromptCount: 0,
		}
		return { startResult, sdkHost }
	}
	/**
	 * Makes an already-running conversation on a session-scoped host the active
	 * session without starting a new one (e.g. reopening a cloud session that
	 * keeps running in its sandbox). Events flow to onSessionEvent until the
	 * session is ended; the host itself is not stopped when it is.
	 */
	async attachExistingSession(input) {
		if (input.shouldContinue?.() === false) {
			throw new SessionStartSupersededError()
		}
		if (this.activeSession) {
			await this.endActiveSession("attachExistingSession")
		}
		if (input.shouldContinue?.() === false) {
			throw new SessionStartSupersededError()
		}
		const session = {
			sessionId: input.sessionId,
			startConfig: input.startConfig,
			sdkHost: input.sdkHost,
			unsubscribe: this.subscribeSessionHost(input.sdkHost),
			isRunning: input.isRunning,
			queuedPromptCount: 0,
		}
		this.activeSession = session
		return session
	}
	async endActiveSessionIfHost(host, reason) {
		if (this.activeSession?.sdkHost === host) {
			await this.endActiveSession(reason)
		}
	}
	subscribeSessionHost(sdkHost) {
		return this.createSafeUnsubscribe(sdkHost.subscribe(this.options.onSessionEvent), "session-host")
	}
	async replaceActiveSession(options) {
		const oldSession = this.activeSession
		if (!oldSession || oldSession !== options.expectedSession || oldSession.isRunning) {
			return undefined
		}
		const { sessionId: oldSessionId } = oldSession
		// No need to await the stop here: callers reuse oldSessionId in the
		// startInput, and startNewSession waits on the pending stop for it.
		await this.endActiveSession(options.disposeReason)
		const { startResult, sdkHost } = await this.startNewSession({
			...options.startInput,
			...(options.initialMessages ? { initialMessages: options.initialMessages } : {}),
		})
		this.setRunning(false)
		return { oldSessionId, startResult, sdkHost }
	}
	async restoreActiveSession(input) {
		const activeSession = this.activeSession
		if (!activeSession) {
			throw new Error("No active SDK session to restore")
		}
		const sourceSessionId = activeSession.sessionId
		const restored = await activeSession.sdkHost.restore(input)
		if (!restored.startResult || !restored.sessionId) {
			return restored
		}
		this.activeSession = {
			...activeSession,
			sessionId: restored.sessionId,
			startConfig: input.start?.config
				? {
						providerId: input.start.config.providerId,
						modelId: input.start.config.modelId,
					}
				: activeSession.startConfig,
			mode: toSessionMode(input.start?.config?.mode) ?? activeSession.mode,
			startResult: restored.startResult,
			isRunning: false,
			queuedPromptCount: 0,
		}
		if (restored.sessionId !== sourceSessionId) {
			const stopPromise = this.trackSessionStop(activeSession.sdkHost, sourceSessionId, "restoreActiveSession")
			stopPromise.catch((error) => {
				Logger.warn(`[SdkController] Failed to stop source session after checkpoint restore: ${sourceSessionId}`, error)
			})
		}
		return restored
	}
	async dispose(reason = "SdkSessionLifecycle.dispose") {
		await this.endActiveSession(reason, { awaitStop: true })
		const sharedHost = this.sharedHost ?? (await this.sharedHostPromise?.catch(() => undefined))
		this.sharedHost = undefined
		this.sharedHostPromise = undefined
		this.sharedHostUnsubscribe?.()
		this.sharedHostUnsubscribe = undefined
		await sharedHost?.dispose(reason)
	}
	createSafeUnsubscribe(unsubscribe, label) {
		let unsubscribed = false
		return () => {
			if (unsubscribed) {
				return
			}
			unsubscribed = true
			try {
				unsubscribe()
			} catch (error) {
				Logger.warn(`[SdkController] Failed to unsubscribe SDK session listener (${label}):`, error)
			}
		}
	}
	safeUnsubscribe(activeSession, reason) {
		activeSession.unsubscribe()
		Logger.debug(`[SdkController] Unsubscribed SDK session listener: ${activeSession.sessionId} (${reason})`)
	}
	ensureSharedHostSubscription(sdkHost) {
		if (this.sharedHostUnsubscribe) {
			return
		}
		this.sharedHostUnsubscribe = this.createSafeUnsubscribe(sdkHost.subscribe(this.options.onSessionEvent), "shared-host")
	}
	/**
	 * Starts the session's stop and records it in pendingStops until it
	 * settles. The returned promise never rejects.
	 */
	trackSessionStop(sdkHost, sessionId, reason) {
		const startedAt = Date.now()
		const stopPromise = sdkHost
			.stop(sessionId)
			.then(() => {
				const elapsed = Date.now() - startedAt
				if (elapsed > 250) {
					Logger.log(`[SdkController] SDK session ${sessionId} stopped in ${elapsed}ms (${reason})`)
				}
			})
			.catch((error) => {
				Logger.warn(`[SdkController] Failed to stop SDK session ${sessionId} (${reason}):`, error)
			})
			.finally(() => {
				if (this.pendingStops.get(sessionId) === stopPromise) {
					this.pendingStops.delete(sessionId)
				}
			})
		this.pendingStops.set(sessionId, stopPromise)
		return stopPromise
	}
	async waitForStop(stopPromise, timeoutMs) {
		let timeoutHandle
		try {
			const timeout = new Promise((resolve) => {
				timeoutHandle = setTimeout(() => resolve("timeout"), timeoutMs)
			})
			const result = await Promise.race([stopPromise.then(() => "stopped"), timeout])
			return result === "stopped"
		} finally {
			clearTimeout(timeoutHandle)
		}
	}
	async getOrCreateSharedHost() {
		if (this.sharedHost) {
			this.ensureSharedHostSubscription(this.sharedHost)
			return this.sharedHost
		}
		if (!this.sharedHostPromise) {
			// Host-lifetime dependencies only. Anything task/session-specific must be
			// supplied to sdkHost.start(...), otherwise it can leak across reused sessions.
			this.sharedHostPromise = VscodeSessionHost.create({
				mcpHub: this.options.mcpHub,
				requestToolApproval: this.options.requestToolApproval,
				askQuestion: this.options.askQuestion,
				editorExecutor: this.options.editorExecutor,
				applyPatchExecutor: this.options.applyPatchExecutor,
				readFileExecutor: this.options.readFileExecutor,
				getTerminalManager: this.options.getTerminalManager,
				foregroundCommands: this.options.foregroundCommands,
				beforeStartSession: this.options.beforeStartSession,
				getRemoteConfigIntegration: this.options.getRemoteConfigIntegration,
				telemetry: this.options.telemetry,
			})
				.then((sdkHost) => {
					this.ensureSharedHostSubscription(sdkHost)
					this.sharedHost = sdkHost
					return sdkHost
				})
				.finally(() => {
					this.sharedHostPromise = undefined
				})
		}
		return this.sharedHostPromise
	}
	fireAndForgetSend(sdkHost, sessionId, prompt, images, files, delivery) {
		// Captured by object identity, not sessionId: rebuilds (mode change) reuse
		// the same sessionId for the replacement session, so only reference
		// equality can tell this send's session apart from a successor. If the
		// session was replaced by the time the send settles, the settle callbacks
		// must not run bookkeeping against the successor (e.g. flipping a live
		// auto-continued run to isRunning=false, which makes the event coordinator
		// treat the new turn's completion as a cancelled-turn straggler). The
		// same applies within one session when Core drains a queued prompt into
		// a new turn before this send's promise settles.
		const sessionAtSend = this.activeSession
		const turnAtSend = this.turnGeneration
		const isSuperseded = (label) => {
			if (this.activeSession === sessionAtSend && this.turnGeneration === turnAtSend) {
				return false
			}
			Logger.debug(`[SdkController] Ignoring ${label} of superseded send for session: ${sessionId}`)
			return true
		}
		// Mark a preceding user-initiated mode switch on this message so the model
		// sees exactly when the rules changed, instead of only inferring it from
		// the user_input mode attribute flipping (mirrors the CLI's
		// run-interactive stamping). The notice survives prepareTurnInput's
		// normalizeUserInput sanitize and is hidden from display surfaces by
		// stripModeNotices.
		const notice = this.options.consumeModeSwitchNotice?.(sessionId)
		const noticedPrompt = notice ? `${formatModeSwitchNotice(notice.from, notice.to)}\n${prompt}` : prompt
		this.options.onSendStart?.(sessionId)
		const send = sdkHost.send({
			sessionId,
			prompt: noticedPrompt,
			userImages: images,
			userFiles: files,
			delivery,
		})
		if (sessionAtSend && delivery !== "queue" && delivery !== "steer") {
			this.turnSends.set(
				sessionAtSend,
				send.then(
					() => undefined,
					() => undefined,
				),
			)
		}
		send.then(async () => {
			if (delivery === "queue" || delivery === "steer") {
				Logger.log(`[SdkController] Message queued for session: ${sessionId}`)
				return
			}
			if (isSuperseded("completion")) {
				return
			}
			Logger.log(`[SdkController] Agent turn completed for session: ${sessionId}`)
			this.setRunning(false)
			await this.options.onSendComplete(sessionId)
		}).catch(async (error) => {
			if (isAbortError(error)) {
				Logger.debug(`[SdkController] Agent turn aborted (expected): ${sessionId}`)
				return
			}
			if (isSuperseded("failure")) {
				return
			}
			Logger.error("[SdkController] Agent turn failed:", error)
			this.setRunning(false)
			await this.options.onSendError(error, sessionId)
		})
	}
}
export class SessionStartSupersededError extends Error {
	constructor() {
		super("Session start was superseded")
		this.name = "SessionStartSupersededError"
	}
}
export function isAbortError(error) {
	if (error instanceof Error) {
		return error.name === "AbortError" || error.message.toLowerCase().includes("aborted")
	}
	return false
}
//# sourceMappingURL=sdk-session-lifecycle.js.map
