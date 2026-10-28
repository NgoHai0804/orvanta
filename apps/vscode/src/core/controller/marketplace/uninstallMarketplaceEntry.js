import { uninstallMarketplaceEntryFromCatalog } from "./marketplace-helpers"
export async function uninstallMarketplaceEntry(controller, request) {
	if (!request.entry) {
		throw new Error("Marketplace entry is required.")
	}
	const result = await uninstallMarketplaceEntryFromCatalog(controller, request.entry)
	if (request.entry.type === "skill" || request.entry.type === "plugin") {
		await controller.invalidateUserInstructionService()
	}
	return result
}
//# sourceMappingURL=uninstallMarketplaceEntry.js.map
