import { ModelOverrides } from "@shared/proto/cline/models"
export function toProtobufModelOverrides(overrides) {
	return ModelOverrides.create({
		name: overrides.name,
		maxTokens: overrides.maxTokens,
		contextWindow: overrides.contextWindow,
		maxInputTokens: overrides.maxInputTokens,
		capabilities: overrides.capabilities ? [...overrides.capabilities] : [],
		supportsVision: overrides.supportsVision,
		supportsAttachments: overrides.supportsAttachments,
		supportsReasoning: overrides.supportsReasoning,
		inputPrice: overrides.inputPrice,
		outputPrice: overrides.outputPrice,
		cacheReadsPrice: overrides.cacheReadsPrice,
		cacheWritesPrice: overrides.cacheWritesPrice,
		temperature: overrides.temperature,
		apiFormat: overrides.apiFormat,
	})
}
/**
 * Preserves the proto tri-state: `undefined` stays `undefined` (no override
 * payload), and an empty message becomes an empty object (explicit clear).
 */
export function fromProtobufModelOverrides(overrides) {
	if (!overrides) {
		return undefined
	}
	return {
		...(overrides.name !== undefined ? { name: overrides.name } : {}),
		...(overrides.maxTokens !== undefined ? { maxTokens: overrides.maxTokens } : {}),
		...(overrides.contextWindow !== undefined ? { contextWindow: overrides.contextWindow } : {}),
		...(overrides.maxInputTokens !== undefined ? { maxInputTokens: overrides.maxInputTokens } : {}),
		...(overrides.capabilities.length > 0 ? { capabilities: [...overrides.capabilities] } : {}),
		...(overrides.supportsVision !== undefined ? { supportsVision: overrides.supportsVision } : {}),
		...(overrides.supportsAttachments !== undefined ? { supportsAttachments: overrides.supportsAttachments } : {}),
		...(overrides.supportsReasoning !== undefined ? { supportsReasoning: overrides.supportsReasoning } : {}),
		...(overrides.inputPrice !== undefined ? { inputPrice: overrides.inputPrice } : {}),
		...(overrides.outputPrice !== undefined ? { outputPrice: overrides.outputPrice } : {}),
		...(overrides.cacheReadsPrice !== undefined ? { cacheReadsPrice: overrides.cacheReadsPrice } : {}),
		...(overrides.cacheWritesPrice !== undefined ? { cacheWritesPrice: overrides.cacheWritesPrice } : {}),
		...(overrides.temperature !== undefined ? { temperature: overrides.temperature } : {}),
		...(overrides.apiFormat !== undefined ? { apiFormat: overrides.apiFormat } : {}),
	}
}
//# sourceMappingURL=modelOverrides.js.map
