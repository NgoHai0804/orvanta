import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { loadCompany } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function getCompany(_controller: Controller, _request: EmptyRequest): Promise<OrvantaCompanyResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	return toCompanyResponse(await loadCompany(root))
}
