import { listInstalledMarketplaceEntries } from "./marketplace-helpers"
export async function listMarketplaceInstalledEntries(controller, request) {
	return listInstalledMarketplaceEntries(controller, request.entries)
}
//# sourceMappingURL=listMarketplaceInstalledEntries.js.map
