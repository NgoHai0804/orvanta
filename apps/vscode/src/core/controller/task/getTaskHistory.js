import { Logger } from "@/shared/services/Logger"
/**
 * Gets filtered task history.
 * Task history retrieval/filtering is delegated to the SDK-backed controller.
 * @param controller The controller instance
 * @param request Filter parameters for task history
 * @returns TaskHistoryArray with filtered task list
 */
export async function getTaskHistory(controller, request) {
	try {
		return await controller.getTaskHistory(request)
	} catch (error) {
		Logger.error("Error in getTaskHistory:", error)
		throw error
	}
}
//# sourceMappingURL=getTaskHistory.js.map
