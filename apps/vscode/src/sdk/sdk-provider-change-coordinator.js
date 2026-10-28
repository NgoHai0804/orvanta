import { toLegacyApiProvider } from "@/shared/model-catalog/provider-helpers"
import { Logger } from "@/shared/services/Logger"

function providerForMode(config, mode) {
	const provider = mode === "plan" ? config.planModeApiProvider : config.actModeApiProvider
	// Compare canonical spellings: previously-persisted snapshots can still
	// hold SDK ids like `openai-compatible` while new writes use the legacy
	// `openai` spelling; a spelling-only difference must not be treated as a
	// provider switch (it would restart the active session for nothing).
	return provider === undefined ? undefined : toLegacyApiProvider(provider)
}
export class SdkProviderChangeCoordinator {
	options
	constructor(options) {
		this.options = options
	}
	handleApiConfigurationChanged(previous, next) {
		const mode = this.getCurrentMode()
		const previousProvider = providerForMode(previous, mode)
		const nextProvider = providerForMode(next, mode)
		if (previousProvider === nextProvider) {
			return
		}
		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			Logger.log("[SdkController] Provider changed without active session; next task will use new provider")
			return
		}
		Logger.log(
			`[SdkController] Active provider changed for ${mode}: ${previousProvider ?? "none"} -> ${nextProvider ?? "none"}`,
		)
		this.options.rebuilds.request("provider", () => this.restartActiveSessionForProviderChange())
	}
	async restartActiveSessionForProviderChange() {
		await this.performRestartActiveSessionForProviderChange()
	}
	async performRestartActiveSessionForProviderChange() {
		const activeSession = this.options.sessions.getActiveSession()
		if (!activeSession) {
			return
		}
		const { sdkHost: oldManager, sessionId: oldSessionId } = activeSession
		const cwd = await this.options.getWorkspaceRoot()
		const mode = this.getCurrentMode()
		Logger.log(`[SdkController] Restarting session ${oldSessionId} for provider change`)
		try {
			const config = await this.options.sessionConfigBuilder.build({ cwd, mode })
			config.sessionId = oldSessionId
			const initialMessages = await this.options.loadInitialMessages(oldManager, oldSessionId)
			const startInput = this.options.buildStartSessionInput(config, { cwd, mode })
			const restartResult = await this.options.sessions.replaceActiveSession({
				expectedSession: activeSession,
				startInput,
				...(initialMessages ? { initialMessages } : {}),
				disposeReason: "providerChange",
			})
			if (!restartResult) {
				return
			}
			const { startResult } = restartResult
			const task = this.options.getTask()
			if (task && task.taskId !== startResult.sessionId) {
				Logger.warn(
					`[SdkController] Provider restart returned a new session ID (${startResult.sessionId}); updating task proxy`,
				)
				task.taskId = startResult.sessionId
			}
			await this.options.postStateToWebview()
			Logger.log(`[SdkController] Session restarted for provider change: ${oldSessionId} -> ${startResult.sessionId}`)
		} catch (error) {
			Logger.error("[SdkController] Failed to restart session for provider change:", error)
			this.options.messages.appendAndEmit(
				[
					{
						ts: Date.now(),
						type: "say",
						say: "error",
						text: `Failed to reload provider configuration: ${error instanceof Error ? error.message : String(error)}. The active session may still use the previous provider.`,
						partial: false,
					},
				],
				{ type: "status", payload: { sessionId: oldSessionId, status: "error" } },
			)
			await this.options.postStateToWebview()
		}
	}
	getCurrentMode() {
		return this.options.stateManager.getGlobalSettingsKey("mode") === "plan" ? "plan" : "act"
	}
}
//# sourceMappingURL=sdk-provider-change-coordinator.js.map
