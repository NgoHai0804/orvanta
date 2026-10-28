import { Logger } from "@/shared/services/Logger"
/**
 * Deletes all task history, with an option to preserve favorites
 * @param controller The controller instance
 * @param request Request with option to preserve favorites
 * @returns Results with count of deleted tasks
 */
export async function deleteAllTaskHistory(controller) {
	try {
		return await controller.deleteAllTaskHistory()
	} catch (error) {
		Logger.error("Error in deleteAllTaskHistory:", error)
		throw error
	}
}
//# sourceMappingURL=deleteAllTaskHistory.js.map
