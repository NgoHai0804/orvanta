import { ProviderListingsResponse } from "@/shared/proto/cline/models"
import { toProviderListingProto } from "./providerCatalogShared"
export async function listProviders(controller, _request) {
	const providers = await controller.getProviderCatalog().listProviders()
	return ProviderListingsResponse.create({
		providers: providers.map(toProviderListingProto),
	})
}
//# sourceMappingURL=listProviders.js.map
