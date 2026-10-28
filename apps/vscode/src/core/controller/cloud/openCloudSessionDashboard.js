import { isPersistedCloudSessionId } from "@shared/cloud/cloud-sessions"
import { Empty } from "@shared/proto/cline/common"
import { openExternal } from "@/utils/env"
export async function openCloudSessionDashboard(controller, request) {
	if (!isPersistedCloudSessionId(request.value)) {
		throw new Error("The cloud session is not ready to open in the dashboard.")
	}
	await openExternal(controller.cloudSessions.dashboardUrl(request.value))
	return Empty.create()
}
//# sourceMappingURL=openCloudSessionDashboard.js.map
