import { OrvantaLibraryList } from "@shared/proto/cline/orvanta"
import { UserLibraryStore } from "@/orvanta/user-library-store"
export async function deleteLibraryCompany(_controller, request) {
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
//# sourceMappingURL=deleteLibraryCompany.js.map
