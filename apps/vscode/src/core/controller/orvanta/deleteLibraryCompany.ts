import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaLibraryList } from "@shared/proto/cline/orvanta"
import { UserLibraryStore } from "@/orvanta/user-library-store"
import type { Controller } from ".."

export async function deleteLibraryCompany(_controller: Controller, request: StringRequest): Promise<OrvantaLibraryList> {
	const store = new UserLibraryStore()
	const entries = await store.remove(request.value)
	return OrvantaLibraryList.create({
		entries: entries.map((e) => ({
			slug: e.slug,
			name: e.name,
			savedAt: e.savedAt,
			agentCount: e.agentCount,
			purposePreview: e.purposePreview,
			isBroken: Boolean(e.isBroken),
			error: e.error ?? "",
		})),
	})
}
