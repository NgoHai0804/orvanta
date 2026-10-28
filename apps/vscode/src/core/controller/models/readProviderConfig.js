import { parseProviderIdRequest, toRedactedProviderConfigResponse } from "./providerCatalogShared"
export async function readProviderConfig(controller, request) {
	const providerId = parseProviderIdRequest(request.value, "value")
	const store = controller.getProviderConfigStore()
	return toRedactedProviderConfigResponse(store.read(providerId), store)
}
//# sourceMappingURL=readProviderConfig.js.map
