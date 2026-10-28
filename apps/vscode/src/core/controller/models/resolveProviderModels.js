import { parseProviderIdRequest, toProviderModelsResponse } from "./providerCatalogShared"
export async function resolveProviderModels(controller, request) {
	const providerId = parseProviderIdRequest(request.providerId)
	const requestId = request.requestId?.trim() || crypto.randomUUID()
	const result = await controller.getProviderCatalog().resolveModels(providerId, { forceRefresh: request.forceRefresh })
	return toProviderModelsResponse(providerId, requestId, result)
}
//# sourceMappingURL=resolveProviderModels.js.map
