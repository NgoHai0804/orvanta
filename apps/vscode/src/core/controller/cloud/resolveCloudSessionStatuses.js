import { CloudSessionStatusItem, CloudSessionStatusList } from "@shared/proto/cline/cloud"
/** Resolves live agent status for only the cloud sessions named by the visible UI surface. */
export async function resolveCloudSessionStatuses(controller, request) {
	const statuses = await controller.resolveCloudSessionStatuses(request.sessionIds)
	return CloudSessionStatusList.create({
		statuses: statuses.map(({ sessionId, status }) => CloudSessionStatusItem.create({ sessionId, status })),
	})
}
//# sourceMappingURL=resolveCloudSessionStatuses.js.map
