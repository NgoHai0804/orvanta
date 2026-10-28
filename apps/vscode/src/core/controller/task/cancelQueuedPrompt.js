import { Empty } from "@shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
/**
 * Cancels a queued prompt for the active SDK session.
 *
 * @param controller The controller instance
 * @param request The request containing the queued prompt ID
 * @returns Empty response
 */
export async function cancelQueuedPrompt(controller, request) {
	try {
		await controller.cancelQueuedPrompt(request.value)
		return Empty.create()
	} catch (error) {
		Logger.error("Error in cancelQueuedPrompt handler:", error)
		throw error
	}
}
//# sourceMappingURL=cancelQueuedPrompt.js.map
