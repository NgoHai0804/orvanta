import { RemoteConfigSettingsResponse } from "@/shared/proto/index.cline"
import { getAllRemoteConfigSettings } from "./settings"
export async function getRemoteConfigSettings(controller, _request) {
	await controller.waitForInitialRemoteConfig()
	return RemoteConfigSettingsResponse.create({ settings: getAllRemoteConfigSettings(controller) })
}
//# sourceMappingURL=getRemoteConfigSettings.js.map
