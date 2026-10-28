import { getProviderDefaultModelId, getProviderModelIdKey } from "@/shared/storage/provider-keys"

function readString(config, key) {
	const value = config[key]
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}
export function resolveActiveModelIdFromApiConfiguration(config, mode) {
	const provider = mode === "plan" ? config.planModeApiProvider : config.actModeApiProvider
	const genericModelKey = mode === "plan" ? "planModeApiModelId" : "actModeApiModelId"
	if (provider) {
		const providerModelKey = getProviderModelIdKey(provider, mode)
		return (
			readString(config, providerModelKey) ??
			readString(config, genericModelKey) ??
			getProviderDefaultModelId(provider) ??
			"unknown"
		)
	}
	return readString(config, genericModelKey) ?? "unknown"
}
export function createTaskApiModelShim(modelId) {
	return {
		getModel: () => ({ id: modelId }),
	}
}
//# sourceMappingURL=taskApiModel.js.map
