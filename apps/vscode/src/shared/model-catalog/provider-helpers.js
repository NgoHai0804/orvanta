/**
 * Convert SDK/catalog provider ids to the legacy `ApiProvider` spelling used
 * by `ApiConfiguration` keys. Most ids are identical; this helper remains as
 * the central boundary for any future spelling aliases.
 *
 * `openai-compatible` is the SDK's id for the OpenAI Compatible built-in,
 * which the extension has always stored as `openai`. Without this alias,
 * state written under the SDK spelling bypasses every `openai`-keyed code
 * path (`planModeOpenAiModelId` slots, session-factory model resolution,
 * the webview's model label), leaving the UI stuck on stale/default models.
 */
const SDK_PROVIDER_ID_TO_LEGACY_API_PROVIDER = {
	nousResearch: "nousResearch",
	nousresearch: "nousResearch",
	"openai-compatible": "openai",
}
export function toLegacyApiProvider(providerId) {
	// Alias lookup is case-insensitive (like `parseProviderId`) so ids that
	// bypassed parse-time normalization still fold; unknown ids pass through
	// with their original casing preserved.
	return (
		SDK_PROVIDER_ID_TO_LEGACY_API_PROVIDER[providerId] ??
		SDK_PROVIDER_ID_TO_LEGACY_API_PROVIDER[providerId.toLowerCase()] ??
		providerId
	)
}
//# sourceMappingURL=provider-helpers.js.map
