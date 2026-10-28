import { getGeneratedModelsForProvider, MODEL_COLLECTIONS_BY_PROVIDER_ID } from "@cline/llms"
import { parseProviderId } from "@/sdk/model-catalog/provider-id"
import { toSdkProviderId } from "@/sdk/model-catalog/sdk-provider-id"
import { getProviderModelIdKey } from "@/shared/storage/provider-keys"

const modeFields = {
	plan: {
		provider: "planModeApiProvider",
		modelId: "planModeApiModelId",
	},
	act: {
		provider: "actModeApiProvider",
		modelId: "actModeApiModelId",
	},
}
function toProviderId(provider) {
	const trimmed = provider?.trim()
	return trimmed ? parseProviderId(trimmed) : undefined
}
function resolveProviderSwitchModelId(store, providerId, mode, currentModelId) {
	const sdkProviderId = toSdkProviderId(providerId)
	const generatedModels = getGeneratedModelsForProvider(sdkProviderId)
	const collection = MODEL_COLLECTIONS_BY_PROVIDER_ID[sdkProviderId]
	const collectionModels = collection?.models ?? {}
	if (currentModelId && (generatedModels[currentModelId] || collectionModels[currentModelId])) {
		return currentModelId
	}
	const selection = store.readSelection(providerId, mode)
	if (selection?.modelId) {
		return selection.modelId
	}
	const sdkDefaultModelId = collection?.provider.defaultModelId?.trim()
	if (sdkDefaultModelId && (generatedModels[sdkDefaultModelId] || collectionModels[sdkDefaultModelId])) {
		return sdkDefaultModelId
	}
	return Object.keys(generatedModels)[0] || Object.keys(collectionModels)[0] || ""
}
/**
 * Keep generic legacy model-id slots coherent when switching to an SDK-catalog
 * provider. DeepSeek currently stores its model id in `*ModeApiModelId`; without
 * this normalization, switching Anthropic/Cline/etc. → DeepSeek can leave the
 * generic slot pointing at a previous provider's model.
 */
export function normalizeProviderSwitchModel(store, previous, next) {
	const normalized = { ...next }
	for (const [mode, fields] of Object.entries(modeFields)) {
		const previousProvider = previous[fields.provider]
		const nextProvider = normalized[fields.provider] ?? previousProvider
		if (!nextProvider || nextProvider === previousProvider) {
			continue
		}
		const providerId = toProviderId(nextProvider)
		if (!providerId) {
			continue
		}
		// Only normalize providers that share the common `apiModelId` slot.
		// Providers that maintain their own model-id field
		// (planModeOpenRouterModelId, planModeOllamaModelId, …) are skipped
		// here because their writers already produce coherent state and
		// snapping the generic slot would clobber an unrelated value.
		const genericModelKey = getProviderModelIdKey(nextProvider, mode)
		if (genericModelKey !== fields.modelId) {
			continue
		}
		// Only normalize providers the SDK actually knows about. For
		// custom/unregistered providers there is no catalog to resolve
		// against and no useful default to write here.
		if (!MODEL_COLLECTIONS_BY_PROVIDER_ID[toSdkProviderId(providerId)]) {
			continue
		}
		const currentModelId = normalized[fields.modelId] ?? previous[fields.modelId]
		const resolvedModelId = resolveProviderSwitchModelId(store, providerId, mode, currentModelId)
		if (resolvedModelId) {
			normalized[fields.modelId] = resolvedModelId
		}
	}
	return normalized
}
//# sourceMappingURL=providerSwitchNormalization.js.map
