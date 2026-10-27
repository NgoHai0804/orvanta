import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaLibraryList } from "@shared/proto/cline/orvanta"
import { UserLibraryStore } from "@/orvanta/user-library-store"
import type { Controller } from ".."

export async function listLibrary(_controller: Controller, _request: EmptyRequest): Promise<OrvantaLibraryList> {
	const store = new UserLibraryStore()
	const entries = await store.list()
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
