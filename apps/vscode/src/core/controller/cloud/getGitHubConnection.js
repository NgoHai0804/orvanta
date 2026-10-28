import { GitHubConnection, GitHubRepository } from "@shared/proto/cline/cloud"
/**
 * GitHub App connection status for the active account scope, with the
 * repositories the Cline GitHub App can access. Served from the same cache
 * the task target resolves against, so the panel and the composer agree.
 */
export async function getGitHubConnection(controller, request) {
	const status = await controller.cloudTaskTarget.connectionStatus(request.refresh)
	return GitHubConnection.create({
		...status,
		repositories: status.repositories.map((repository) => GitHubRepository.create(repository)),
	})
}
//# sourceMappingURL=getGitHubConnection.js.map
