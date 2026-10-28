import { StateManager } from "@/core/storage/StateManager"
import { getProviderSettingsManager } from "../provider-migration"
import { toSdkProviderId } from "./sdk-provider-id"

const apiKeyFields = {
	anthropic: "apiKey",
	openrouter: "openRouterApiKey",
	openai: "openAiApiKey",
	"openai-native": "openAiNativeApiKey",
	"openai-codex": "openAiNativeApiKey",
	bedrock: "awsBedrockApiKey",
	gemini: "geminiApiKey",
	deepseek: "deepSeekApiKey",
	ollama: "ollamaApiKey",
	requesty: "requestyApiKey",
	together: "togetherApiKey",
	fireworks: "fireworksApiKey",
	qwen: "qwenApiKey",
	"qwen-code": "qwenApiKey",
	doubao: "doubaoApiKey",
	mistral: "mistralApiKey",
	litellm: "liteLlmApiKey",
	asksage: "asksageApiKey",
	xai: "xaiApiKey",
	moonshot: "moonshotApiKey",
	zai: "zaiApiKey",
	huggingface: "huggingFaceApiKey",
	nebius: "nebiusApiKey",
	sambanova: "sambanovaApiKey",
	cerebras: "cerebrasApiKey",
	groq: "groqApiKey",
	baseten: "basetenApiKey",
	"huawei-cloud-maas": "huaweiCloudMaasApiKey",
	dify: "difyApiKey",
	minimax: "minimaxApiKey",
	hicap: "hicapApiKey",
	aihubmix: "aihubmixApiKey",
	nousresearch: "nousResearchApiKey",
	"vercel-ai-gateway": "vercelAiGatewayApiKey",
	wandb: "wandbApiKey",
	oca: "ocaApiKey",
	cline: "clineApiKey",
}
const baseUrlFields = {
	anthropic: "anthropicBaseUrl",
	openai: "openAiBaseUrl",
	ollama: "ollamaBaseUrl",
	lmstudio: "lmStudioBaseUrl",
	gemini: "geminiBaseUrl",
	requesty: "requestyBaseUrl",
	asksage: "asksageApiUrl",
	litellm: "liteLlmBaseUrl",
	sapaicore: "sapAiCoreBaseUrl",
	dify: "difyBaseUrl",
	oca: "ocaBaseUrl",
	aihubmix: "aihubmixBaseUrl",
}
const apiLineFields = {
	qwen: "qwenApiLine",
	moonshot: "moonshotApiLine",
	zai: "zaiApiLine",
	minimax: "minimaxApiLine",
}
const regionFields = {
	bedrock: "awsRegion",
	vertex: "vertexRegion",
}
const gcpProjectFields = {
	vertex: "vertexProjectId",
}
const gcpRegionFields = {
	vertex: "vertexRegion",
}
const headerFields = {
	openai: "openAiHeaders",
}
const extrasFields = {
	lmstudio: { lmStudioMaxTokens: "lmStudioMaxTokens" },
	litellm: { liteLlmUsePromptCache: "liteLlmUsePromptCache" },
	openrouter: { openRouterProviderSorting: "openRouterProviderSorting" },
	bedrock: {
		awsAuthentication: "awsAuthentication",
		awsBedrockEndpoint: "awsBedrockEndpoint",
		awsBedrockUsePromptCache: "awsBedrockUsePromptCache",
		awsProfile: "awsProfile",
		awsUseProfile: "awsUseProfile",
	},
}
function isPlainRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}
function readString(record, key) {
	const value = record[key]
	return typeof value === "string" && value.length > 0 ? value : undefined
}
function readHeaders(record, key) {
	const value = record[key]
	if (!isPlainRecord(value)) {
		return undefined
	}
	const headers = {}
	for (const [headerName, headerValue] of Object.entries(value)) {
		if (typeof headerValue !== "string") {
			return undefined
		}
		headers[headerName] = headerValue
	}
	return Object.keys(headers).length > 0 ? headers : undefined
}
function readAuth(record) {
	const auth = record.auth
	if (!isPlainRecord(auth)) {
		return undefined
	}
	const accessToken = readString(auth, "accessToken")
	const refreshToken = readString(auth, "refreshToken")
	const accountId = readString(auth, "accountId")
	return accessToken || refreshToken || accountId ? { accessToken, refreshToken, accountId } : undefined
}
function readBoolean(record, key) {
	const value = record[key]
	return typeof value === "boolean" ? value : undefined
}
function readPositiveInteger(value) {
	const parsed = typeof value === "string" ? Number(value) : value
	if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
		return Math.floor(parsed)
	}
	return undefined
}
function readGcp(record) {
	const gcp = record.gcp
	if (!isPlainRecord(gcp)) {
		return undefined
	}
	const result = {
		projectId: readString(gcp, "projectId"),
		region: readString(gcp, "region"),
	}
	return Object.values(result).some((value) => value !== undefined) ? result : undefined
}
function readAws(record) {
	const aws = record.aws
	if (!isPlainRecord(aws)) {
		return undefined
	}
	const result = {
		accessKey: readString(aws, "accessKey"),
		secretKey: readString(aws, "secretKey"),
		sessionToken: readString(aws, "sessionToken"),
		authentication: readString(aws, "authentication"),
		profile: readString(aws, "profile"),
		usePromptCache: readBoolean(aws, "usePromptCache"),
		endpoint: readString(aws, "endpoint"),
		customModelBaseId: readString(aws, "customModelBaseId"),
		useCrossRegionInference: readBoolean(aws, "useCrossRegionInference") ?? readBoolean(record, "useCrossRegionInference"),
		useGlobalInference: readBoolean(aws, "useGlobalInference") ?? readBoolean(record, "useGlobalInference"),
	}
	return Object.values(result).some((value) => value !== undefined) ? result : undefined
}
function readProviderSettings(providerId) {
	try {
		const settings = getProviderSettingsManager().getProviderSettings(toSdkProviderId(providerId))
		if (!isPlainRecord(settings)) {
			return {}
		}
		return {
			apiKey: readString(settings, "apiKey"),
			baseUrl: readString(settings, "baseUrl"),
			apiLine: readString(settings, "apiLine"),
			headers: readHeaders(settings, "headers"),
			region: readString(settings, "region"),
			aws: readAws(settings),
			gcp: readGcp(settings),
			contextWindow: readPositiveInteger(settings.contextWindow),
			auth: readAuth(settings),
			extras: isPlainRecord(settings.extras) ? settings.extras : undefined,
		}
	} catch {
		return {}
	}
}
function readStringFromConfig(config, field) {
	if (!field) {
		return undefined
	}
	const value = config[field]
	return typeof value === "string" && value.length > 0 ? value : undefined
}
function readHeadersFromConfig(config, field) {
	if (!field) {
		return undefined
	}
	const value = config[field]
	return isPlainRecord(value) ? readHeaders({ value }, "value") : undefined
}
function readStateExtras(provider, config) {
	const fieldMap = extrasFields[provider]
	if (!fieldMap) {
		return undefined
	}
	const extras = {}
	for (const [extraName, configField] of Object.entries(fieldMap)) {
		if (configField === undefined) {
			continue
		}
		const value = config[configField]
		if (value !== undefined) {
			extras[extraName] = value
		}
	}
	return Object.keys(extras).length > 0 ? extras : undefined
}
function readStateAuth(provider, config) {
	if (provider !== "cline") {
		return undefined
	}
	const accessToken = readStringFromConfig(config, "clineApiKey")
	const accountId = readStringFromConfig(config, "clineAccountId")
	return accessToken || accountId ? { accessToken, accountId } : undefined
}
function readStateBoolean(config, field) {
	const value = config[field]
	return typeof value === "boolean" ? value : undefined
}
function readStateGcp(provider, config) {
	if (provider !== "vertex") {
		return undefined
	}
	const gcp = {
		projectId: readStringFromConfig(config, gcpProjectFields[provider]),
		region: readStringFromConfig(config, gcpRegionFields[provider]),
	}
	return Object.values(gcp).some((value) => value !== undefined) ? gcp : undefined
}
function readStateAws(provider, config) {
	if (provider !== "bedrock") {
		return undefined
	}
	const aws = {
		accessKey: readStringFromConfig(config, "awsAccessKey"),
		secretKey: readStringFromConfig(config, "awsSecretKey"),
		sessionToken: readStringFromConfig(config, "awsSessionToken"),
		authentication: readStringFromConfig(config, "awsAuthentication"),
		profile: readStringFromConfig(config, "awsProfile"),
		usePromptCache: readStateBoolean(config, "awsBedrockUsePromptCache"),
		endpoint: readStringFromConfig(config, "awsBedrockEndpoint"),
		useCrossRegionInference: readStateBoolean(config, "awsUseCrossRegionInference"),
		useGlobalInference: readStateBoolean(config, "awsUseGlobalInference"),
	}
	return Object.values(aws).some((value) => value !== undefined) ? aws : undefined
}
function readStateContextWindow(provider, config) {
	// Only Ollama has a legacy context-window state key; other providers keep
	// theirs in providers.json exclusively.
	if (provider !== "ollama") {
		return undefined
	}
	return readPositiveInteger(config.ollamaApiOptionsCtxNum)
}
function readStateConfig(providerId, config) {
	const provider = providerId.toString()
	return {
		apiKey: readStringFromConfig(config, apiKeyFields[provider]),
		baseUrl: readStringFromConfig(config, baseUrlFields[provider]),
		apiLine: readStringFromConfig(config, apiLineFields[provider]),
		headers: readHeadersFromConfig(config, headerFields[provider]),
		region: readStringFromConfig(config, regionFields[provider]),
		aws: readStateAws(provider, config),
		gcp: readStateGcp(provider, config),
		contextWindow: readStateContextWindow(provider, config),
		auth: readStateAuth(provider, config),
		extras: readStateExtras(provider, config),
	}
}
function mergeExtras(first, second) {
	if (!first) {
		return second
	}
	if (!second) {
		return first
	}
	return { ...first, ...second }
}
function mergeGcp(first, second) {
	if (!first) {
		return second
	}
	if (!second) {
		return first
	}
	return { ...first, ...second }
}
function mergeAws(first, second) {
	if (!first) {
		return second
	}
	if (!second) {
		return first
	}
	return { ...first, ...second }
}
function assignIfDefined(target, key, value) {
	if (value !== undefined) {
		target[key] = value
	}
}
/**
 * Build an {@link EffectiveProviderConfig} by merging provider-owned settings
 * from SDK `providers.json` with the current StateManager effective API
 * configuration. StateManager's `getApiConfiguration()` already applies
 * task/session/remote-config overlays for legacy fields, so those values win.
 *
 * Mode-dependent model selection is intentionally excluded; callers use
 * `ProviderConfigStore.readSelection(providerId, mode)` for that.
 */
export function buildEffectiveProviderConfig(providerId) {
	const providerSettings = readProviderSettings(providerId)
	const stateConfig = readStateConfig(providerId, StateManager.get().getApiConfiguration())
	const merged = {}
	assignIfDefined(merged, "apiKey", stateConfig.apiKey ?? providerSettings.apiKey)
	assignIfDefined(merged, "baseUrl", stateConfig.baseUrl ?? providerSettings.baseUrl)
	assignIfDefined(merged, "apiLine", stateConfig.apiLine ?? providerSettings.apiLine)
	assignIfDefined(merged, "headers", stateConfig.headers ?? providerSettings.headers)
	assignIfDefined(merged, "region", stateConfig.region ?? providerSettings.region)
	// Bedrock/Vertex are migrated to providers.json. Keep legacy StateManager cloud
	// fields as a fallback for old installs, but let providers.json win when both exist.
	assignIfDefined(merged, "aws", mergeAws(stateConfig.aws, providerSettings.aws))
	assignIfDefined(merged, "gcp", mergeGcp(stateConfig.gcp, providerSettings.gcp))
	// providers.json is the source of truth for the context window; the legacy
	// Ollama StateManager key is a migration fallback (the store mirrors writes
	// to both).
	assignIfDefined(merged, "contextWindow", providerSettings.contextWindow ?? stateConfig.contextWindow)
	assignIfDefined(merged, "auth", stateConfig.auth ?? providerSettings.auth)
	assignIfDefined(merged, "extras", mergeExtras(providerSettings.extras, stateConfig.extras))
	return { providerId, ...merged }
}
//# sourceMappingURL=effective-config.js.map
