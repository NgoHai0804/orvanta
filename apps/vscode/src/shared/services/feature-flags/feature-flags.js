export var FeatureFlag
;((FeatureFlag) => {
	FeatureFlag["WORKTREES"] = "worktree-exp"
	// Feature flag for showing the new onboarding flow or old welcome view.
	FeatureFlag["ONBOARDING_MODELS"] = "onboarding_models"
	// Feature flag for remote banner service
	FeatureFlag["REMOTE_BANNERS"] = "remote-banners"
	// Feature flag payload (milliseconds) controlling remote banner cache TTL
	FeatureFlag["EXTENSION_REMOTE_BANNERS_TTL"] = "extension_remote_banners_ttl"
	// Feature flag for DB-backed welcome banners (What's New modal)
	// When off, hardcoded welcome items are shown instead
	FeatureFlag["REMOTE_WELCOME_BANNERS"] = "remote-welcome-banners"
	// Rollout flag for Cline provider model sourcing:
	// off => OpenRouter model list, on => Cline endpoint model list.
	FeatureFlag["EXTENSION_CLINE_MODELS_ENDPOINT"] = "extension_cline_models_endpoint"
	// Rollout flag for fetching recommended Cline models from the upstream endpoint.
	FeatureFlag["CLINE_RECOMMENDED_MODELS_UPSTREAM"] = "cline_recommended_models_upstream"
	// Use the websocket mode for OpenAI native Responses API format
	FeatureFlag["OPENAI_RESPONSES_WEBSOCKET_MODE"] = "openai-responses-websocket-mode"
	// Rollout flag for Cline Cloud sessions (run a task in a hosted sandbox)
	FeatureFlag["CLOUD_SESSIONS"] = "ext-cloud-sessions"
})(FeatureFlag || (FeatureFlag = {}))
export const FeatureFlagDefaultValue = {
	[FeatureFlag.WORKTREES]: false,
	[FeatureFlag.ONBOARDING_MODELS]: process.env.E2E_TEST === "true" ? { models: {} } : undefined,
	[FeatureFlag.REMOTE_BANNERS]: process.env.E2E_TEST === "true" || process.env.IS_DEV === "true",
	[FeatureFlag.EXTENSION_REMOTE_BANNERS_TTL]: 24 * 60 * 60 * 1000,
	[FeatureFlag.REMOTE_WELCOME_BANNERS]: process.env.E2E_TEST === "true" || process.env.IS_DEV === "true",
	[FeatureFlag.EXTENSION_CLINE_MODELS_ENDPOINT]: false,
	[FeatureFlag.CLINE_RECOMMENDED_MODELS_UPSTREAM]: false,
	[FeatureFlag.OPENAI_RESPONSES_WEBSOCKET_MODE]: false,
	[FeatureFlag.CLOUD_SESSIONS]: false,
}
export const FEATURE_FLAGS = Object.values(FeatureFlag)
//# sourceMappingURL=feature-flags.js.map
