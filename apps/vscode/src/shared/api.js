export const DEFAULT_API_PROVIDER = "openrouter"
export const ANTHROPIC_MIN_THINKING_BUDGET = 1_024
export const ANTHROPIC_MAX_THINKING_BUDGET = 6_000
// OpenRouter
// https://openrouter.ai/models?order=newest&supported_parameters=tools
export const openRouterDefaultModelId = "anthropic/claude-sonnet-5.5" // will always exist in openRouterModels
export const openRouterDefaultModelInfo = {
	maxTokens: 128_000,
	// OpenRouter reports the full 1m extended context window for this model and we pass it
	// through unchanged (the legacy 200k restriction was dropped). Keep in sync with the SDK
	// model catalog and refreshOpenRouterModels.ts.
	contextWindow: 1_000_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 2.0,
	outputPrice: 10.0,
	cacheWritesPrice: 2.5,
	cacheReadsPrice: 0.1,
	description:
		"Claude Sonnet 5.5 is an Anthropic model for coding, agentic search, and AI agent workflows. It supports planning and implementation tasks across the software development lifecycle.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
}
export const clinePassDefaultModelId = "cline-pass/glm-5.2"
export const clinePassModelInfoSaneDefaults = {
	maxTokens: 8_192,
	contextWindow: 128_000,
	supportsImages: false,
	supportsPromptCache: false,
	supportsReasoning: true,
	inputPrice: 0,
	outputPrice: 0,
	cacheReadsPrice: 0,
	cacheWritesPrice: 0,
	description: "",
}
export function getModelSlug(modelId) {
	return modelId.split("/").at(-1) ?? modelId
}
export function buildModelInfoNameMap(models) {
	const nameMap = {}
	for (const [id, info] of Object.entries(models)) {
		nameMap[getModelSlug(id)] = info
	}
	return nameMap
}
export function resolveClinePassModelInfo(modelId, modelInfoByName) {
	return modelInfoByName?.[getModelSlug(modelId)] ?? clinePassModelInfoSaneDefaults
}
export const openAiModelInfoSafeDefaults = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0,
	temperature: 0,
}
// OpenAI Codex (ChatGPT Plus/Pro subscription)
// Uses OAuth authentication via ChatGPT, routes to chatgpt.com/backend-api/codex/responses
// Subscription-based pricing (all costs are $0).
//
// The Codex catalog and default model id are sourced from the `@cline/llms`
// SDK.
// Azure OpenAI
// https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-deprecation
// https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#api-specs
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview"
// Qwen
// https://bailian.console.aliyun.com/
// The first model in the list is used as the default model for each region
export var QwenApiRegions
;((QwenApiRegions) => {
	QwenApiRegions["CHINA"] = "china"
	QwenApiRegions["INTERNATIONAL"] = "international"
})(QwenApiRegions || (QwenApiRegions = {}))
export const liteLlmDefaultModelId = "anthropic/claude-3-7-sonnet-20250219"
// Requesty
// https://requesty.ai/models
export const requestyDefaultModelId = "anthropic/claude-3-7-sonnet-latest"
export const requestyDefaultModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description: "Anthropic's most intelligent model. Highest level of intelligence and capability.",
}
//# sourceMappingURL=api.js.map
