import { Logger } from "@/shared/services/Logger"
import { getEffectiveTerminalExecutionMode } from "./vscode-terminal-execution-mode"
export class SdkSessionConfigChangeCoordinator {
	options
	constructor(options) {
		this.options = options
	}
	handleTerminalExecutionModeChanged(previous, next) {
		if (previous === next) {
			return
		}
		this.requestRebuild({
			reason: "terminalExecutionMode",
			description: `terminal execution mode ${previous} -> ${next}`,
			disposeReason: "terminalExecutionModeChange",
			failureMessage: "Failed to reload terminal tools. Terminal mode changes may not apply until the next task.",
		})
	}
	handleCheckpointsSettingChanged(previous, next) {
		if (previous === next) {
			return
		}
		this.requestRebuild({
			reason: "checkpoints",
			description: `checkpoints ${previous ? "enabled" : "disabled"} -> ${next ? "enabled" : "disabled"}`,
			disposeReason: "checkpointsSettingChange",
			failureMessage: "Failed to reload checkpoint settings. The change may not apply until the next task.",
		})
	}
	requestRebuild(details) {
		Logger.log(`[SdkController] Session configuration changed: ${details.description}`)
		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			Logger.log("[SdkController] No active session - configuration will be picked up on next initTask")
			return
		}
		this.options.rebuilds.request(details.reason, (context) => this.restartSession(details, context))
	}
	async restartSession(details, context) {
		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			return
		}
		const { sdkHost: oldManager, sessionId: oldSessionId } = activeSession
		const terminalMode = getEffectiveTerminalExecutionMode(
			this.options.stateManager.getGlobalStateKey("vscodeTerminalExecutionMode"),
		)
		Logger.log(`[SdkController] Restarting session ${oldSessionId} for ${details.description}; terminal mode ${terminalMode}`)
		this.options.messages.emitSessionEvents([], {
			type: "status",
			payload: { sessionId: oldSessionId, status: "running" },
		})
		try {
			const cwd = await this.options.getWorkspaceRoot()
			const modeValue = this.options.stateManager.getGlobalSettingsKey("mode")
			const mode = modeValue === "plan" || modeValue === "act" ? modeValue : "act"
			const config = await this.options.sessionConfigBuilder.build({ cwd, mode })
			config.sessionId = oldSessionId
			const initialMessages = await this.options.loadInitialMessages(oldManager, oldSessionId)
			const startInput = this.options.buildStartSessionInput(config, { cwd, mode })
			// Rebuilds may preserve the session ID, so identity is the only reliable
			// way to detect that another path replaced this session while we awaited.
			const currentSession = this.options.sessions.getActiveSession()
			if (!currentSession) {
				Logger.log(`[SdkController] Active session ended during configuration restart (was ${oldSessionId}); aborting`)
				return
			}
			// A newer change for the same reason runs next, so this stale
			// configuration must not be installed.
			if (!context.isCurrent()) {
				Logger.log(`[SdkController] Configuration restart superseded before replacing ${oldSessionId}; aborting`)
				return
			}
			// The scheduler only starts a rebuild on an idle session with nothing
			// queued; a prompt the user sent while we awaited re-queues the rebuild.
			if (currentSession !== activeSession || currentSession.isRunning || currentSession.queuedPromptCount > 0) {
				Logger.log(
					`[SdkController] Active session changed or received a prompt during configuration restart (was ${oldSessionId}); deferring`,
				)
				this.options.rebuilds.request(details.reason, (nextContext) => this.restartSession(details, nextContext))
				return
			}
			// replaceActiveSession detaches the old session synchronously before its
			// first suspension, so no send can enter it after this final state check.
			const restartResult = await this.options.sessions.replaceActiveSession({
				expectedSession: activeSession,
				startInput,
				initialMessages: initialMessages,
				disposeReason: details.disposeReason,
			})
			if (!restartResult) {
				return
			}
			const { startResult, sdkHost } = restartResult
			if (startResult.sessionId !== oldSessionId) {
				Logger.warn(
					`[SdkController] Configuration restart returned a new session ID (${startResult.sessionId}); preserving task ID ${oldSessionId} for UI continuity`,
				)
			}
			this.options.messages.emitSessionEvents([], {
				type: "status",
				payload: { sessionId: startResult.sessionId, status: "idle" },
			})
			await this.options.postStateToWebview()
			Logger.log(
				`[SdkController] Session restarted for ${details.description}: ${oldSessionId} -> ${startResult.sessionId}`,
			)
		} catch (error) {
			Logger.error(`[SdkController] Failed to restart session for ${details.description}:`, error)
			const errorMessage = {
				ts: Date.now(),
				type: "say",
				say: "error",
				text: `${details.failureMessage} ${error instanceof Error ? error.message : String(error)}`,
				partial: false,
			}
			this.options.messages.appendAndEmit([errorMessage], {
				type: "status",
				payload: { sessionId: oldSessionId, status: "error" },
			})
			await this.options.postStateToWebview()
		}
	}
}
//# sourceMappingURL=sdk-session-config-change-coordinator.js.map
