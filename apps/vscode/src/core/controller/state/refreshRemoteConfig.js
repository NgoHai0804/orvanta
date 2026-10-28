import { Empty } from "@shared/proto/cline/common"
/**
 * fetches the remote config
 * @param controller The controller instance
 * @param request Empty request
 * @returns Empty response
 */
export async function refreshRemoteConfig(controller, _) {
	await controller.refreshRemoteConfig()
	return Empty.create()
}
//# sourceMappingURL=refreshRemoteConfig.js.map
