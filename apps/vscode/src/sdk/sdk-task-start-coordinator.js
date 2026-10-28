import { getProviderAuthStorageId } from "@cline/core"
import { createSessionId } from "@cline/shared"
import { CLINE_ACCOUNT_AUTH_ERROR_MESSAGE } from "@shared/ClineAccount"
import { Logger } from "@/shared/services/Logger"
import { isDirectory } from "@/utils/fs"
import { PROVIDER_FAILURE_ERROR_TYPE, PROVIDER_FAILURE_PHASE } from "./provider-failure-telemetry"
import { historyItemToSessionMetadata } from "./sdk-task-history"
import { createTaskProxy } from "./task-proxy"

function usesClineAccountAuth(providerId) {
	return getProviderAuthStorageId(providerId) === "cline"
}
export class SdkTaskStartCoordinator {
	options
	constructor(options) {
		this.options = options
	}
	async initTask(prompt, images, files, historyItem, taskSettings) {
		Logger.log(`[SdkController] initTask called: "${prompt?.substring(0, 50)}"`)
		let taskSessionId
		let providerId
		let modelId
		try {
			await this.options.clearTask()
			// Tracked from the mode read until the first prompt is sent, so a mode
			// toggle in between waits for this session instead of missing it.
			return await this.options.sessions.trackSessionStart(async () => {
				const cwd = await this.options.getWorkspaceRoot()
				const mode = this.getCurrentMode()
				Logger.log(`[SdkController] Building session config: mode=${mode}, cwd=${cwd}`)
				const config = await this.options.sessionConfigBuilder.build({
					prompt,
					images,
					files,
					historyItem,
					taskSettings,
					cwd,
					mode,
				})
				providerId = config.providerId
				modelId = config.modelId
				Logger.log(
					`[SdkController] Session config: provider=${config.providerId}, model=${config.modelId}, hasApiKey=${!!config.apiKey}`,
				)
				if (usesClineAccountAuth(config.providerId) && !config.apiKey) {
					Logger.warn(
						`[SdkController] ${config.providerId} provider selected but no Cline auth token — emitting auth error`,
					)
					// No task/session id exists yet, so this preflight auth UI path is
					// intentionally not recorded as task-joinable provider error telemetry.
					this.options.emitClineAuthError(prompt)
					return undefined
				}
				taskSessionId = config.sessionId?.trim() || createSessionId()
				const configWithSessionId = {
					...config,
					sessionId: taskSessionId,
				}
				const startInput = this.options.buildStartSessionInput(configWithSessionId, {
					prompt: prompt,
					images,
					files,
					historyItem,
					taskSettings,
					cwd,
					mode,
				})
				const task = this.createAndSetTask(taskSessionId)
				this.emitInitialTaskMessage(taskSessionId, prompt ?? "", images, files)
				// The turn phase was already set to "streaming" (in SdkController.initTask), but the
				// webview only learns the phase through a full state post. Ship one now, in parallel
				// with the potentially slow session startup below, so the chat shows the thinking
				// indicator as soon as the task message lands instead of after startNewSession settles.
				this.options.postStateToWebview().catch((error) => {
					Logger.error("[SdkController] Failed to post state after emitting initial task message:", error)
				})
				const { startResult, sdkHost } = await this.options.sessions.startNewSession(startInput)
				if (startResult.sessionId !== taskSessionId) {
					Logger.warn(
						`[SdkController] SDK returned session id ${startResult.sessionId} after requested id ${taskSessionId}`,
					)
					task.taskId = startResult.sessionId
					taskSessionId = startResult.sessionId
				}
				const newHistoryItem = this.options.createHistoryItemFromSession(
					taskSessionId,
					prompt ?? "",
					configWithSessionId.modelId,
					cwd,
				)
				await this.options.taskHistory.updateTaskHistoryItem(newHistoryItem)
				await this.options.postStateToWebview()
				if (prompt?.trim() || images?.length || files?.length) {
					Logger.log(`[SdkController] Sending prompt to session: ${taskSessionId}`)
					const resolvedTask = await this.options.resolveContextMentions(prompt || "")
					this.options.sessions.fireAndForgetSend(sdkHost, taskSessionId, resolvedTask, images, files)
				}
				Logger.log(`[SdkController] Task initialized: ${taskSessionId}`)
				return taskSessionId
			})
		} catch (error) {
			this.options.captureProviderApiError?.({
				sessionId: taskSessionId,
				error,
				providerId,
				modelId,
				errorType: PROVIDER_FAILURE_ERROR_TYPE.TASK_INIT,
				failurePhase: PROVIDER_FAILURE_PHASE.PREFLIGHT,
			})
			this.handleInitError(error, taskSessionId)
			await this.options.postStateToWebview().catch((postError) => {
				Logger.error("[SdkController] Failed to post state after init error:", postError)
			})
			return undefined
		}
	}
	async reinitExistingTaskFromId(taskId) {
		try {
			await this.options.clearTask()
			const historyItem = await this.options.taskHistory.findHistoryItem(taskId)
			if (!historyItem) {
				Logger.error(`[SdkController] Task not found in history: ${taskId}`)
				return
			}
			// A task's stored cwd may have been deleted/moved since the task ran
			// (or migrated from another machine) — feeding a stale path into the
			// session bootstrap makes workspace init fail. Fall back to the live
			// workspace root instead.
			const storedCwd = historyItem.cwdOnTaskInitialization
			const cwd = storedCwd && (await isDirectory(storedCwd)) ? storedCwd : await this.options.getWorkspaceRoot()
			const config = await this.options.sessionConfigBuilder.build({
				cwd,
				mode: "act",
			})
			const tempManager = await this.options.createTempSessionHost()
			const initialMessages = await this.options.loadInitialMessages(tempManager, taskId)
			await tempManager.dispose("readMessages")
			const { startResult } = await this.options.sessions.startNewSession({
				config,
				interactive: true,
				...(initialMessages ? { initialMessages: initialMessages } : {}),
				sessionMetadata: historyItemToSessionMetadata(historyItem, config.modelId),
			})
			this.createAndSetTask(startResult.sessionId)
			await this.options.postStateToWebview()
			Logger.log(`[SdkController] Task resumed: ${taskId} → ${startResult.sessionId}`)
		} catch (error) {
			this.handleReinitError(taskId, error)
		}
	}
	getCurrentMode() {
		const m = this.options.stateManager.getGlobalSettingsKey("mode")
		return m === "plan" ? m : "act"
	}
	createAndSetTask(sessionId) {
		const task = createTaskProxy(
			sessionId,
			(text, images, files) => this.options.onAskResponse(text, images, files),
			() => this.options.onCancelTask(),
		)
		this.options.setTask(task)
		return task
	}
	emitInitialTaskMessage(sessionId, task, images, files) {
		// Attachments must ride on the authoritative task message: the webview's
		// optimistic pending copy is only cleared once an identical message (text
		// AND images/files) arrives from the extension. Omitting them left the
		// optimistic message unconfirmed forever, so it was re-injected into the
		// transcript even after "New Task" cleared it (#12924).
		const taskMessage = {
			ts: Date.now(),
			type: "say",
			say: "task",
			text: task,
			...(images?.length ? { images } : {}),
			...(files?.length ? { files } : {}),
			partial: false,
		}
		this.options.messages.appendAndEmit([taskMessage], {
			type: "status",
			payload: { sessionId, status: "running" },
		})
	}
	handleInitError(error, sessionId) {
		const errorDetails =
			error instanceof Error ? `${error.name}: ${error.message}\n${error.stack?.substring(0, 500)}` : String(error)
		Logger.error(`[SdkController] Failed to init task: ${errorDetails}`)
		globalThis.__cline_last_init_error = errorDetails
		globalThis.__cline_last_init_error_raw = error
		this.options.messages.appendAndEmit(
			[
				{
					ts: Date.now(),
					type: "say",
					say: "error",
					text: `Failed to start task: ${error instanceof Error ? error.message : String(error)}`,
					partial: false,
				},
			],
			{ type: "status", payload: { sessionId: sessionId ?? "", status: "error" } },
		)
	}
	handleReinitError(taskId, error) {
		Logger.error("[SdkController] Failed to reinit task:", error)
		const reinitErrorMsg = error instanceof Error ? error.message : String(error)
		const isClineAuthReinit =
			this.options.isClineManagedProviderActive() &&
			(reinitErrorMsg.includes(CLINE_ACCOUNT_AUTH_ERROR_MESSAGE) ||
				reinitErrorMsg.toLowerCase().includes("missing api key") ||
				reinitErrorMsg.toLowerCase().includes("unauthorized"))
		if (isClineAuthReinit) {
			this.options.emitClineAuthError()
			return
		}
		this.options.messages.emitSessionEvents(
			[
				{
					ts: Date.now(),
					type: "say",
					say: "error",
					text: `Failed to resume task: ${reinitErrorMsg}`,
					partial: false,
				},
			],
			{ type: "status", payload: { sessionId: taskId, status: "error" } },
		)
	}
}
//# sourceMappingURL=sdk-task-start-coordinator.js.map
