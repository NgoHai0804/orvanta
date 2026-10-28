import { clearOnboardingModelsCache, getClineOnboardingModels } from "@/core/controller/models/getClineOnboardingModels"
import { FEATURE_FLAGS, FeatureFlag, FeatureFlagDefaultValue } from "@/shared/services/feature-flags/feature-flags"
import { Logger } from "@/shared/services/Logger"
import { telemetryService } from "../telemetry"

// Default cache time-to-live (TTL) for feature flags - an hour
const DEFAULT_CACHE_TTL = 60 * 60 * 1000
/**
 * FeatureFlagsService provides feature flag functionality that works independently
 * of telemetry settings. Feature flags are always available to ensure proper
 * functionality of the extension regardless of user's telemetry preferences.
 * Uses an abstracted feature flags provider to support multiple backends
 */
export class FeatureFlagsService {
	provider
	/**
	 * Constructor that accepts an IFeatureFlagsProvider instance
	 * @param provider IFeatureFlagsProvider instance for retrieving feature flags
	 */
	constructor(provider) {
		this.provider = provider
	}
	cache = new Map()
	pollGeneration = 0
	/**
	 * Tracks cache update time and user ID for cache validity
	 */
	cacheInfo = { updateTime: 0, userId: null }
	/**
	 * Poll all known feature flags to update their cached values
	 */
	async poll(userId) {
		// Do not update cache if last update was less than an hour ago
		const timesNow = Date.now()
		if (timesNow - this.cacheInfo.updateTime < DEFAULT_CACHE_TTL && this.cache.size) {
			// Skip fetch if within TTL and user context is unchanged
			if (this.cacheInfo.userId === userId) {
				return
			}
		}
		const pollGeneration = ++this.pollGeneration
		try {
			const values = await this.provider.getAllFlagsAndPayloads({
				distinctId: userId || undefined,
				flagKeys: FEATURE_FLAGS,
			})
			// Authentication can change while a request is in flight. Only the newest
			// auth snapshot may become the cache observed by extension features.
			if (pollGeneration !== this.pollGeneration) {
				return
			}
			this.cacheInfo = { updateTime: timesNow, userId: userId || null, flagsPayload: values }
			Logger.log("Fetched Feature Flag values + " + JSON.stringify(values))
			for (const flag of FEATURE_FLAGS) {
				const payload = this.getFeatureFlag(flag)
				this.cache.set(flag, payload ?? false)
			}
		} catch (error) {
			// On error, clear cache info to force refresh on next poll
			if (pollGeneration === this.pollGeneration) {
				this.cacheInfo = { updateTime: 0, userId: null }
			}
			throw error
		}
		getClineOnboardingModels() // Refresh onboarding models cache if relevant flag changed
	}
	getFeatureFlag(flagName) {
		try {
			const payload = this.cacheInfo.flagsPayload?.featureFlagPayloads?.[flagName]
			const flagValue = this.cacheInfo.flagsPayload?.featureFlags?.[flagName]
			const value = payload ?? flagValue ?? FeatureFlagDefaultValue[flagName] ?? undefined
			if (!this.cache.has(flagName) || this.cache.get(flagName) !== value) {
				telemetryService.capture({
					event: "$feature_flag_called",
					properties: {
						$feature_flag: flagName,
						$feature_flag_response: flagValue,
					},
				})
			}
			Logger.info(
				`[FeatureFlagsService] resolving ${flagName}: payload=${JSON.stringify(payload)} flagValue=${JSON.stringify(flagValue)} default=${JSON.stringify(FeatureFlagDefaultValue[flagName])} final=${JSON.stringify(value)} type=${typeof value}`,
			)
			return value
		} catch (error) {
			Logger.error(`Error checking if feature flag ${flagName} is enabled:`, error)
			return FeatureFlagDefaultValue[flagName] ?? false
		}
	}
	/**
	 * Wrapper: safely get boolean flag with default fallback
	 * Only check the cached value of a feature flag. If not cached, return defaultValue.
	 * Useful for performance-sensitive paths where we don't want to await a network call.
	 * Cache is updated periodically via poll(), and is generated on extension startup,
	 * and whenever the user logs in.
	 */
	getBooleanFlagEnabled(flagName) {
		return this.cache.get(flagName) === true
	}
	/**
	 * Get a cached flag payload (or default) without triggering a network call.
	 */
	getFlagPayload(flagName) {
		return this.cache.get(flagName) ?? FeatureFlagDefaultValue[flagName]
	}
	getWorktreesEnabled() {
		return this.getBooleanFlagEnabled(FeatureFlag.WORKTREES)
	}
	getOnboardingOverrides() {
		const payload = this.cache.get(FeatureFlag.ONBOARDING_MODELS)
		// Check if payload is object
		if (payload && typeof payload === "object" && !Array.isArray(payload)) {
			return payload.models
		}
		clearOnboardingModelsCache()
		return undefined
	}
	/**
	 * Get the feature flags provider instance
	 * @returns The current feature flags provider
	 */
	getProvider() {
		return this.provider
	}
	/**
	 * Check if feature flags are currently enabled
	 * @returns Boolean indicating whether feature flags are enabled
	 */
	isEnabled() {
		return this.provider.isEnabled()
	}
	/**
	 * Get current feature flags settings
	 * @returns Current feature flags settings
	 */
	getSettings() {
		return this.provider.getSettings()
	}
	/**
	 * For testing: directly set a feature flag in the cache
	 */
	test(flagName, value) {
		if (process.env.NODE_ENV === "true") {
			this.cache.set(flagName, value)
		}
	}
	/**
	 * Clean up resources when the service is disposed
	 */
	async dispose() {
		await this.provider.dispose()
	}
}
//# sourceMappingURL=FeatureFlagsService.js.map
