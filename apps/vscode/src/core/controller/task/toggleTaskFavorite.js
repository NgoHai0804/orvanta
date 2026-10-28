import { Empty } from "@shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
export async function toggleTaskFavorite(controller, request) {
	if (!request.taskId) {
		Logger.error(`[toggleTaskFavorite] Invalid request: taskId missing`)
		return Empty.create({})
	}
	try {
		await controller.toggleTaskFavorite(request.taskId, request.isFavorited)
		return Empty.create({})
	} catch (error) {
		Logger.error("Error in toggleTaskFavorite:", error)
		throw error
	}
}
//# sourceMappingURL=toggleTaskFavorite.js.map
