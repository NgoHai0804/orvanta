import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { loadCompany, removeAgent } from "@/orvanta/workspace-store"
export async function deleteAgentProfile(_controller, request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	try {
		const updated = await removeAgent(root, request.value)
		return toCompanyResponse(updated)
	} catch (error) {
		const current = await loadCompany(root)
		const message = error instanceof Error ? error.message : String(error)
		return toCompanyResponse(current, [message])
	}
}
//# sourceMappingURL=deleteAgentProfile.js.map
