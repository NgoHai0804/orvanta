import { Empty } from "@shared/proto/cline/common"
/** Saves the Cline model new cloud tasks run on; a running cloud task keeps its own. */
export async function setCloudModel(controller, request) {
	controller.stateManager.setGlobalState("cloudModelId", request.value.trim() || undefined)
	await controller.postStateToWebview()
	return Empty.create()
}
//# sourceMappingURL=setCloudModel.js.map
