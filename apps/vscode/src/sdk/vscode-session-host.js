// VscodeSessionHost — wraps ClineCore with VSCode-specific customizations
//
// Uses ClineCore.create() so the SDK owns session input normalization,
// lifecycle bootstrapping, and host selection while the VSCode extension
// still provides its custom McpHub-backed runtime builder.
import { ClineCore, toClineCoreStartInput } from "@cline/core"
import { RUNTIME_CONFIG_EXTENSION_KINDS } from "@cline/shared"
import { StateManager } from "@/core/storage/StateManager"
import { getDistinctId } from "@/services/logging/distinctId"
import { Logger } from "@/shared/services/Logger"
import { VscodeGitTelemetryManager } from "./git-telemetry"
import { createVscodeExtraTools } from "./vscode-runtime-builder"
import { getEffectiveTerminalExecutionMode } from "./vscode-terminal-execution-mode"
export class VscodeSessionHost {
	runtimeAddress
	inner
	prepareStartSessionInput
	gitTelemetry
	constructor(inner, prepareStartSessionInput, options) {
		this.inner = inner
		this.runtimeAddress = inner.runtimeAddress
		this.prepareStartSessionInput = prepareStartSessionInput
		this.gitTelemetry = new VscodeGitTelemetryManager(options.telemetry)
	}
	updateSessionModel(sessionId, modelId) {
		return this.inner.updateSessionModel(sessionId, modelId)
	}
	static async create(options) {
		// Build tool executor capabilities from options — only include keys that are provided.
		// When a terminal manager is available, suppress the SDK's built-in run_commands
		// tool by setting bash to undefined. Our custom run_commands (provided via
		// extraTools) replaces it with foreground/background terminal support.
		const toolExecutors = {}
		if (options.askQuestion) {
			toolExecutors.askQuestion = options.askQuestion
		}
		if (options.editorExecutor) {
			toolExecutors.editor = options.editorExecutor
		}
		if (options.applyPatchExecutor) {
			toolExecutors.applyPatch = options.applyPatchExecutor
		}
		if (options.readFileExecutor) {
			toolExecutors.readFile = options.readFileExecutor
		}
		if (options.getTerminalManager) {
			// Setting bash to undefined suppresses the SDK's createShellTool():
			// createDefaultTools() checks `enableBash && executors.bash` — falsy
			// bash means no built-in run_commands tool is created.
			toolExecutors.bash = undefined
		}
		// Both start and checkpoint restore use the same input preparation.
		const prepareStartSessionInput = async (input) => {
			await options.beforeStartSession?.()
			// Read only after the readiness gate: it may have atomically replaced
			// the integration that must be captured by this session.
			const remoteConfigIntegration = options.getRemoteConfigIntegration?.()
			const inputWithRemoteConfig = remoteConfigIntegration
				? await remoteConfigIntegration.applyToStartSessionInput(input)
				: input
			const requestedTerminalExecutionMode = StateManager.get().getGlobalStateKey("vscodeTerminalExecutionMode")
			const extraTools = await createVscodeExtraTools(options.mcpHub, {
				cwd: inputWithRemoteConfig.config.cwd,
				getTerminalManager: options.getTerminalManager,
				vscodeTerminalExecutionMode: getEffectiveTerminalExecutionMode(requestedTerminalExecutionMode),
				foregroundCommands: options.foregroundCommands,
			})
			const config = {
				...inputWithRemoteConfig.config,
				telemetry: inputWithRemoteConfig.config.telemetry ?? options.telemetry,
				extraTools: [...(inputWithRemoteConfig.config.extraTools ?? []), ...extraTools],
			}
			return {
				...inputWithRemoteConfig,
				source: inputWithRemoteConfig.source ?? "vscode",
				// The extension runs file hooks through its own hooks adapter
				// (status chips, hooksEnabled setting, HookFactory discovery).
				// Exclude the SDK core's file-hook extension or every hook
				// would execute twice per event.
				localRuntime: {
					...(inputWithRemoteConfig.localRuntime ?? {}),
					hooks: config.hooks,
					configExtensions: (
						inputWithRemoteConfig.localRuntime?.configExtensions ?? RUNTIME_CONFIG_EXTENSION_KINDS
					).filter((kind) => kind !== "hooks"),
				},
				config,
			}
		}
		const inner = await ClineCore.create({
			backendMode: "local",
			capabilities: {
				requestToolApproval: options.requestToolApproval,
				toolExecutors: Object.keys(toolExecutors).length > 0 ? toolExecutors : undefined,
			},
			toolPolicies: options.toolPolicies,
			telemetry: options.telemetry,
			distinctId: getDistinctId() || undefined,
		})
		Logger.log("[VscodeSessionHost] Initialized with ClineCore + VSCode extra tools")
		if (options.getTerminalManager) {
			Logger.log("[VscodeSessionHost] SDK run_commands suppressed; using custom foreground/background terminal tool")
		}
		return new VscodeSessionHost(inner, prepareStartSessionInput, options)
	}
	async start(input) {
		const prepared = await this.prepareStartSessionInput(toClineCoreStartInput(input))
		const observer = this.gitTelemetry.init(prepared)
		try {
			const result = await this.inner.start(prepared)
			this.gitTelemetry.start(result.sessionId, observer)
			return result
		} catch (error) {
			observer?.dispose()
			throw error
		}
	}
	async send(input) {
		Logger.log(`[VscodeSessionHost] send() called: sessionId=${input.sessionId}, prompt=${input.prompt?.substring(0, 50)}`)
		try {
			const result = await this.inner.send(input)
			Logger.log(
				`[VscodeSessionHost] send() completed: text=${result?.text?.substring(0, 100)}, inputTokens=${result?.usage?.inputTokens}`,
			)
			return result
		} catch (error) {
			Logger.error("[VscodeSessionHost] send() error:", error)
			throw error
		}
	}
	async getAccumulatedUsage(sessionId) {
		return (await this.inner.getAccumulatedUsage(sessionId))?.usage
	}
	async abort(sessionId, reason) {
		try {
			return await this.inner.abort(sessionId, reason)
		} catch (error) {
			// AbortError is expected when cancelling a running task —
			// AbortController.abort() fires synchronously and may cause
			// listeners to throw. Suppress it here so callers don't
			// need to handle it.
			if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))) {
				Logger.debug(`[VscodeSessionHost] AbortError during abort (expected): ${sessionId}`)
				return
			}
			throw error
		}
	}
	async stop(sessionId) {
		this.gitTelemetry.stop(sessionId)
		return this.inner.stop(sessionId)
	}
	async dispose(reason) {
		this.gitTelemetry.dispose()
		return this.inner.dispose(reason)
	}
	async get(sessionId) {
		return this.inner.get(sessionId)
	}
	async list(limit, options = {}) {
		return this.inner.list(limit, options)
	}
	async listHistory(options = {}) {
		return this.inner.listHistory(options)
	}
	async delete(sessionId) {
		return this.inner.delete(sessionId)
	}
	async readMessages(sessionId) {
		return this.inner.readMessages(sessionId)
	}
	async readLiveMessages(sessionId) {
		return this.inner.readLiveMessages(sessionId)
	}
	async updateSessionCompactionState(sessionId, state) {
		return this.inner.updateSessionCompactionState(sessionId, state)
	}
	async restore(input) {
		// Apply the same preparation to checkpoint-restore replacement sessions.
		let observer
		if (input.start) {
			const start = await this.prepareStartSessionInput(toClineCoreStartInput(input.start))
			observer = this.gitTelemetry.init(start)
			input = { ...input, start }
		}
		try {
			const result = await this.inner.restore(input)
			if (result.startResult && result.sessionId) this.gitTelemetry.start(result.sessionId, observer)
			else observer?.dispose()
			return result
		} catch (error) {
			observer?.dispose()
			throw error
		}
	}
	async compareCheckpoint(input) {
		return this.inner.compareCheckpoint(input)
	}
	async update(sessionId, updates) {
		return this.inner.update(sessionId, updates)
	}
	async handleHookEvent(payload) {
		return this.inner.ingestHookEvent(payload)
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	pendingPrompts(action, input) {
		switch (action) {
			case "list":
				return this.inner.pendingPrompts.list(input)
			case "update":
				return this.inner.pendingPrompts.update(input)
			case "delete":
				return this.inner.pendingPrompts.delete(input)
			default:
				throw new Error(`Unsupported pending prompt action: ${String(action)}`)
		}
	}
	subscribe(listener) {
		return this.inner.subscribe(listener)
	}
}
//# sourceMappingURL=vscode-session-host.js.map
