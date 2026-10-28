import { CloudBranchList } from "@shared/proto/cline/cloud"
export async function getRepositoryBranches(controller, request) {
	const branches = await controller.cloudSessions.listBranches(Number(request.repositoryId), request.query)
	return CloudBranchList.create({ branches })
}
//# sourceMappingURL=getRepositoryBranches.js.map
