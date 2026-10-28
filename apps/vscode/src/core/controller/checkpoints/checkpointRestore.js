import { Empty } from "@shared/proto/cline/common"
export async function checkpointRestore(controller, request) {
	const sdkRestoreCheckpoint = controller.restoreCheckpoint
	if (sdkRestoreCheckpoint) {
		if (request.number) {
			await sdkRestoreCheckpoint.call(controller, {
				checkpointRunCount: Number(request.number),
				restoreType: request.restoreType,
			})
		}
		return Empty.create({})
	}
	return Empty.create({})
}
//# sourceMappingURL=checkpointRestore.js.map
