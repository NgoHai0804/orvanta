import { Empty } from "@shared/proto/cline/common"
import { openExternal } from "@/utils/env"
/** Opens the GitHub App install (or manage repository access) page in the browser. */
export async function connectGitHub(controller, _request) {
	const url = await controller.cloudSessions.getGitHubInstallUrl().catch(() => controller.cloudSessions.githubConnectUrl())
	await openExternal(url)
	return Empty.create()
}
//# sourceMappingURL=connectGitHub.js.map
