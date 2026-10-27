import { OrvantaCompanyResponse, OrvantaLoadLibraryRequest } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { NeedsReplaceError, UserLibraryStore } from "@/orvanta/user-library-store"
import type { Controller } from ".."

export async function loadCompanyFromLibrary(
	_controller: Controller,
	request: OrvantaLoadLibraryRequest,
): Promise<OrvantaCompanyResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	const store = new UserLibraryStore()
	try {
		const load = await store.load(root, request.slug, { replace: request.replace })
		return toCompanyResponse(load)
	} catch (error) {
		if (error instanceof NeedsReplaceError) {
			return OrvantaCompanyResponse.create({
				status: "needs_replace",
				errors: ["needs_replace"],
				id: "",
				name: "",
				purpose: "",
				teamName: "",
				agents: [],
			})
		}
		const message = error instanceof Error ? error.message : String(error)
		return OrvantaCompanyResponse.create({
			status: "broken",
			errors: [message],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})
	}
}
