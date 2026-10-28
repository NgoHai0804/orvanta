import { OrvantaLibraryList } from "@shared/proto/cline/orvanta"
import { UserLibraryStore } from "@/orvanta/user-library-store"
export async function listLibrary(_controller, _request) {
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
//# sourceMappingURL=listLibrary.js.map
