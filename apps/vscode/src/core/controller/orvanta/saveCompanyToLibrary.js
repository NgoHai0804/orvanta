import { OrvantaLibraryList } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { UserLibraryStore } from "@/orvanta/user-library-store"
export async function saveCompanyToLibrary(_controller, request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		throw new Error("Không có workspace folder nào đang mở")
	}
	const store = new UserLibraryStore()
	const entries = await store.save(root, {
		name: request.name,
		slug: request.slug || undefined,
		overwrite: request.overwrite,
	})
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
//# sourceMappingURL=saveCompanyToLibrary.js.map
