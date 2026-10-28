import { RemoteConfigType } from "@/shared/proto/index.cline"
import { getRemoteConfigSetting } from "./settings"

function toggleKey(type) {
	switch (type) {
		case RemoteConfigType.RULE:
			return "remoteRulesToggles"
		case RemoteConfigType.WORKFLOW:
			return "remoteWorkflowToggles"
		case RemoteConfigType.SKILL:
			return "remoteSkillsToggles"
		default:
			throw new Error(`Invalid remote config type: ${type}`)
	}
}
export async function toggleRemoteConfigSetting(controller, request) {
	if (!request.name) {
		throw new Error("Managed setting name is required")
	}
	const current = getRemoteConfigSetting(controller, request.type, request.name)
	if (current.locked && !request.enabled) {
		throw new Error(`Managed setting is locked and cannot be disabled: ${request.name}`)
	}
	const key = toggleKey(request.type)
	const toggles = controller.stateManager.getGlobalStateKey(key) || {}
	controller.stateManager.setGlobalState(key, { ...toggles, [request.name]: request.enabled })
	await controller.rematerializeRemoteConfig()
	return getRemoteConfigSetting(controller, request.type, request.name)
}
//# sourceMappingURL=toggleRemoteConfigSetting.js.map
