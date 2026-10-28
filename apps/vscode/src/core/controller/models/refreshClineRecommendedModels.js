import { FALLBACK_CLINE_RECOMMENDED_MODELS, fetchClineRecommendedModels } from "@cline/core"
import { ClineEnv } from "@/config"
import { fetch } from "@/shared/net"

const RECOMMENDED_MODELS_CACHE_TTL_MS = 60 * 60 * 1000
let pendingRefresh = null
let inMemoryCache = null
export async function refreshClineRecommendedModels() {
	if (inMemoryCache && Date.now() - inMemoryCache.timestamp <= RECOMMENDED_MODELS_CACHE_TTL_MS) {
		return inMemoryCache.data
	}
	if (pendingRefresh) {
		return pendingRefresh
	}
	pendingRefresh = (async () => {
		try {
			return await fetchAndCacheClineRecommendedModels()
		} finally {
			pendingRefresh = null
		}
	})()
	return pendingRefresh
}
/** The last successfully fetched list, without fetching; undefined before the first success. */
export function getCachedClineRecommendedModels() {
	return inMemoryCache?.data
}
export function resetClineRecommendedModelsCacheForTests() {
	pendingRefresh = null
	inMemoryCache = null
}
function isFallbackRecommendedModels(data) {
	return JSON.stringify(data) === JSON.stringify(FALLBACK_CLINE_RECOMMENDED_MODELS)
}
async function fetchAndCacheClineRecommendedModels() {
	// Delegate the actual HTTP fetch + response normalization + offline fallback
	// to the SDK so the CLI/JetBrains and the extension share one implementation.
	// We pass the proxy-aware fetch (per .clinerules/network.md) and the
	// extension's configured API base URL. On failure the SDK returns its own
	// fallback list.
	const result = await fetchClineRecommendedModels({
		baseUrl: ClineEnv.config().apiBaseUrl,
		fetchImpl: fetch,
	})
	// Only pin a populated, non-fallback result in memory for the full TTL; a
	// transient failure (SDK returns a clone of its fallback) should be retried
	// next call.
	if ((result.recommended.length > 0 || result.free.length > 0) && !isFallbackRecommendedModels(result)) {
		inMemoryCache = { data: result, timestamp: Date.now() }
	}
	return result
}
//# sourceMappingURL=refreshClineRecommendedModels.js.map
