import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { deleteCompany as deleteCompanyOnDisk, loadCompany } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function deleteCompany(_controller: Controller, request: StringRequest): Promise<OrvantaCompanyResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	const current = await loadCompany(root)
	try {
		await deleteCompanyOnDisk(root, request.value || "")
		return toCompanyResponse({ status: "missing" })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return toCompanyResponse(current, [message])
	}
}
