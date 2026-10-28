import { parseProviderIdRequest, toProviderConfigPatch, toRedactedProviderConfigResponse } from "./providerCatalogShared"
export async function writeProviderConfig(controller, request) {
	const providerId = parseProviderIdRequest(request.providerId)
	const store = controller.getProviderConfigStore()
	const updated = store.write(providerId, toProviderConfigPatch(request.patch))
	return toRedactedProviderConfigResponse(updated, store)
}
//# sourceMappingURL=writeProviderConfig.js.map
