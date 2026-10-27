import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { loadCompany, removeAgent } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function deleteAgentProfile(_controller: Controller, request: StringRequest): Promise<OrvantaCompanyResponse> {
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
