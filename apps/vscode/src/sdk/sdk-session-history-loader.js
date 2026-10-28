import { Logger } from "@/shared/services/Logger"
import { sanitizeInitialMessagesForSessionStart } from "./initial-message-sanitizer"
import { readCurrentMessages } from "./session-host"
export class SdkSessionHistoryLoader {
	async loadInitialMessages(sessionHost, taskId) {
		try {
			// A rebuild right after aborting a turn (e.g. a plan/act mode switch
			// mid-approval) would read an empty persisted transcript and drop
			// the task context, so read the current conversation.
			const sdkMessages = await readCurrentMessages(sessionHost, taskId)
			if (sdkMessages.length > 0) {
				const sanitizedMessages = sanitizeInitialMessagesForSessionStart(sdkMessages)
				if (sanitizedMessages !== sdkMessages) {
					Logger.log(
						`[SdkController] Sanitized legacy pairing in SDK-persisted history for task: ${taskId} (${sdkMessages.length} → ${sanitizedMessages.length} messages)`,
					)
				}
				Logger.log(`[SdkController] Loaded ${sanitizedMessages.length} SDK-persisted messages for task: ${taskId}`)
				return sanitizedMessages
			}
		} catch (error) {
			Logger.warn("[SdkController] Failed to read SDK-persisted messages:", error)
		}
		try {
			const { getSavedApiConversationHistory } = await import("@core/storage/disk")
			const apiHistory = await getSavedApiConversationHistory(taskId)
			if (apiHistory.length > 0) {
				const sanitizedMessages = sanitizeInitialMessagesForSessionStart(apiHistory)
				if (sanitizedMessages !== apiHistory) {
					Logger.log(
						`[SdkController] Sanitized legacy pairing in classic API history for task: ${taskId} (${apiHistory.length} → ${sanitizedMessages.length} messages)`,
					)
				}
				Logger.log(`[SdkController] Loaded ${sanitizedMessages.length} classic API messages for task: ${taskId}`)
				return sanitizedMessages
			}
		} catch (error) {
			Logger.warn("[SdkController] Failed to read classic API conversation history:", error)
		}
		return undefined
	}
}
//# sourceMappingURL=sdk-session-history-loader.js.map
