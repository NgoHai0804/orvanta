// Shared "prepare an idle session from a history task" step.
//
// Resuming a task and compacting a displayed (non-running) task both need the
// same thing: read the task's persisted transcript, convert legacy tasks into
// SDK messages, and build the start input that seeds a session with that
// transcript. Starting such a session with initialMessages persists them (see
// LocalRuntimeHost.startSession), so this is also how a pure-legacy task is
// migrated into an SDK session. Deriving both callers from one function keeps
// resume and compaction from drifting apart.
import { historyItemToSessionMetadata } from "./sdk-task-history"
/**
 * Build the start input that resumes `taskId` into a session seeded with its
 * persisted (or legacy-converted) transcript. The returned config has its
 * `sessionId` pinned to `taskId` so the resumed session reuses the task's id.
 */
export async function prepareTaskResumeStartInput(deps, taskId) {
	const historyItem = await deps.taskHistory.findHistoryItem(taskId)
	const cwd = historyItem?.cwdOnTaskInitialization ?? (await deps.getWorkspaceRoot())
	const modeValue = deps.stateManager.getGlobalSettingsKey("mode")
	const mode = modeValue === "plan" || modeValue === "act" ? modeValue : "act"
	const config = await deps.sessionConfigBuilder.build({ cwd, mode })
	config.sessionId = taskId
	const isLegacyTask = await deps.taskHistory.isLegacyTask(taskId)
	const tempManager = await deps.createTempSessionHost()
	let persistedInitialMessages
	try {
		persistedInitialMessages = await deps.loadInitialMessages(tempManager, taskId)
	} finally {
		await tempManager.dispose("readMessages")
	}
	const initialMessages = isLegacyTask
		? await deps.taskHistory.getLegacyResumeInitialMessages(taskId, persistedInitialMessages)
		: persistedInitialMessages
	return {
		config,
		...(initialMessages ? { initialMessages: initialMessages } : {}),
		...(historyItem ? { sessionMetadata: historyItemToSessionMetadata(historyItem, config.modelId) } : {}),
	}
}
//# sourceMappingURL=sdk-task-resume.js.map
