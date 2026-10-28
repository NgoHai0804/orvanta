import { listLocalProviders, resolveProviderConfig } from "@cline/core"
import { resolveProviderUsageCostDisplay } from "@cline/llms"
import { getProviderSettingsManager } from "../provider-migration"
import { providerAllowsCustomModelIds } from "./custom-model-ids"
import { computeConfigFingerprint } from "./fingerprint"
import { applyHostModelInfoOverrides } from "./host-overrides"
import { parseProviderId } from "./provider-id"
import { toSdkProviderId } from "./sdk-provider-id"
import { adaptSdkModelInfo, CatalogShapeError } from "./shape-adapter"

const DEFAULT_MODEL_CACHE_TTL_MS = 5 * 60 * 1000
const DEFAULT_MODEL_CATALOG_CONFIG = {
	loadLatestOnInit: true,
	loadPrivateOnAuth: true,
	failOnError: false,
	cacheTtlMs: 0,
}
/**
 * Read the SDK's usage-cost-display answer for a provider. The SDK
 * function takes a provider id (not metadata) and consults its own
 * registry; we forward the id and trust the answer rather than
 * re-parsing the metadata bag.
 */
function readUsageCostDisplay(providerId) {
	return resolveProviderUsageCostDisplay(providerId)
}
function makeCacheKey(providerId, fingerprint) {
	return `${providerId}:${fingerprint}`
}
function assertRecordMatchesRequest(record, providerId, fingerprint) {
	if (record.providerId !== providerId || record.configFingerprint !== fingerprint) {
		throw new Error(
			`ProviderCatalog cache invariant failed: loaded record ${record.providerId}/${record.configFingerprint} does not match requested ${providerId}/${fingerprint}`,
		)
	}
}
function createProviderModelsCache(options) {
	const records = new Map()
	const inFlight = new Map()
	function get(providerId, fingerprint) {
		const key = makeCacheKey(providerId, fingerprint)
		const entry = records.get(key)
		if (!entry) {
			return undefined
		}
		if (entry.expiresAt <= options.now()) {
			records.delete(key)
			return undefined
		}
		return entry.record
	}
	function set(record, providerId = record.providerId, fingerprint = record.configFingerprint) {
		assertRecordMatchesRequest(record, providerId, fingerprint)
		records.set(makeCacheKey(record.providerId, record.configFingerprint), {
			record,
			expiresAt: options.now() + options.ttlMs,
		})
	}
	function invalidateProviderExcept(providerId, fingerprintToKeep) {
		for (const [key, entry] of records) {
			if (entry.record.providerId === providerId && entry.record.configFingerprint !== fingerprintToKeep) {
				records.delete(key)
			}
		}
	}
	function resolve(optionsForRecord) {
		if (!optionsForRecord.forceRefresh) {
			const cached = get(optionsForRecord.providerId, optionsForRecord.fingerprint)
			if (cached) {
				return Promise.resolve(cached)
			}
		}
		const key = makeCacheKey(optionsForRecord.providerId, optionsForRecord.fingerprint)
		const existing = inFlight.get(key)
		if (existing) {
			return existing
		}
		const promise = optionsForRecord
			.load()
			.then((record) => {
				set(record, optionsForRecord.providerId, optionsForRecord.fingerprint)
				return record
			})
			.finally(() => {
				inFlight.delete(key)
			})
		inFlight.set(key, promise)
		return promise
	}
	return {
		get,
		set,
		invalidateProviderExcept,
		resolve,
		peek: get,
		_inFlightSize: () => inFlight.size,
		_cacheSize: () => records.size,
	}
}
function toSdkProviderConfig(config, selection) {
	return {
		providerId: toSdkProviderId(config.providerId),
		modelId: selection?.modelId ?? "",
		apiKey: config.apiKey,
		baseUrl: config.baseUrl,
		headers: config.headers ? { ...config.headers } : undefined,
		accessToken: config.auth?.accessToken,
		refreshToken: config.auth?.refreshToken,
		accountId: config.auth?.accountId,
		apiLine: config.apiLine === "china" || config.apiLine === "international" ? config.apiLine : undefined,
		region: config.gcp?.region ?? config.region,
		gcp: config.gcp ? { ...config.gcp } : undefined,
	}
}
function chooseDefaultModelId(sdkDefaultModelId, models) {
	if (sdkDefaultModelId && models.has(sdkDefaultModelId)) {
		return sdkDefaultModelId
	}
	return models.keys().next().value ?? ""
}
function optionalNonEmpty(value) {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}
function toProviderListing(provider) {
	return {
		id: parseProviderId(provider.id),
		name: provider.name,
		defaultModelId: optionalNonEmpty(provider.defaultModelId),
		protocol: provider.protocol,
		// ProviderListing intentionally does not include full model-list data.
		// Reuse the lightweight description slot until the RPC-facing picker
		// contract decides whether it needs a generic provider description field.
		authDescription: optionalNonEmpty(provider.authDescription),
		// The SDK has the right signal for this on each provider (e.g.
		// `modelsSourceUrl` for ollama/lmstudio, or the `openai-compatible`
		// family with no curated catalog), but does not yet expose it
		// through a public helper. Until then this set is the host-side
		// fallback; remove it as soon as upstream exposes the signal.
		allowsCustomModelIds: providerAllowsCustomModelIds(provider.id),
		usageCostDisplay: readUsageCostDisplay(provider.id),
	}
}
async function listSdkProviderListings() {
	const manager = getProviderSettingsManager()
	const { providers } = await listLocalProviders(manager, {
		isClinePassEnabled: true,
	})
	return providers.map(toProviderListing)
}
async function resolveSdkModels(providerId, fingerprint, config, selection, now) {
	const sdkProviderId = toSdkProviderId(providerId)
	const resolved = await resolveProviderConfig(
		sdkProviderId,
		DEFAULT_MODEL_CATALOG_CONFIG,
		toSdkProviderConfig(config, selection),
	)
	const sdkModels = resolved?.knownModels ?? {}
	const models = new Map(
		Object.entries(sdkModels).map(([modelId, sdkInfo]) => [
			modelId,
			applyHostModelInfoOverrides(providerId, modelId, adaptSdkModelInfo(sdkInfo)),
		]),
	)
	return {
		ok: true,
		providerId,
		configFingerprint: fingerprint,
		models,
		defaultModelId: chooseDefaultModelId(resolved?.modelId, models),
		source: "sdk-dynamic",
		fetchedAt: now(),
	}
}
function toCatalogError(error) {
	if (error instanceof CatalogShapeError) {
		return {
			kind: "shape",
			message: error.message,
		}
	}
	if (error instanceof Error) {
		return {
			kind: "unknown",
			message: error.message,
		}
	}
	return {
		kind: "unknown",
		message: String(error),
	}
}
/**
 * Internal test hook for cache/in-flight behavior. Not part of the public
 * model-catalog API; production callers should use createProviderCatalog.
 */
export const _testing = {
	createProviderModelsCache,
	makeCacheKey,
	assertRecordMatchesRequest,
}
/**
 * Create a {@link ProviderCatalog}.
 *
 * Accepts a read-only {@link ProviderConfigReader} (not the full store), so
 * the catalog cannot write to the store: it has no `write`/`commitSelection`
 * access by construction.
 */
export function createProviderCatalog(reader) {
	const now = () => Date.now()
	const cache = createProviderModelsCache({ ttlMs: DEFAULT_MODEL_CACHE_TTL_MS, now })
	let providerListingsPromise
	const modelListeners = new Map()
	function notifyModelListeners(providerId, result) {
		const listeners = modelListeners.get(providerId)
		if (!listeners) {
			return
		}
		const event = { providerId, result }
		for (const listener of [...listeners]) {
			listener(event)
		}
	}
	reader.subscribe((event) => {
		if (event.kind !== "fields") {
			return
		}
		const latestConfig = reader.read(event.providerId)
		const latestFingerprint = computeConfigFingerprint(event.providerId, latestConfig)
		cache.invalidateProviderExcept(event.providerId, latestFingerprint)
	})
	return {
		async listProviders() {
			providerListingsPromise ??= listSdkProviderListings().catch((error) => {
				providerListingsPromise = undefined
				throw error
			})
			return providerListingsPromise
		},
		invalidateProviderListings() {
			providerListingsPromise = undefined
		},
		async resolveModels(providerId, options) {
			const config = reader.read(providerId)
			const fingerprint = computeConfigFingerprint(providerId, config)
			// Selection is not part of model-list identity; it is only a hint for
			// SDK config surfaces that require a model id. The cache stays keyed
			// solely by provider + effective config fingerprint.
			const selection = reader.readSelection(providerId, "act")
			let result
			try {
				result = await cache.resolve({
					providerId,
					fingerprint,
					forceRefresh: options?.forceRefresh,
					load: () => resolveSdkModels(providerId, fingerprint, config, selection, now),
				})
			} catch (error) {
				result = {
					ok: false,
					providerId,
					configFingerprint: fingerprint,
					error: toCatalogError(error),
					fetchedAt: now(),
				}
			}
			notifyModelListeners(providerId, result)
			return result
		},
		peekModels(providerId) {
			const config = reader.read(providerId)
			const fingerprint = computeConfigFingerprint(providerId, config)
			return cache.peek(providerId, fingerprint)
		},
		subscribe(providerId, listener) {
			let listeners = modelListeners.get(providerId)
			if (!listeners) {
				listeners = new Set()
				modelListeners.set(providerId, listeners)
			}
			listeners.add(listener)
			return {
				dispose() {
					listeners.delete(listener)
					if (listeners.size === 0) {
						modelListeners.delete(providerId)
					}
				},
			}
		},
	}
}
//# sourceMappingURL=catalog.js.map
