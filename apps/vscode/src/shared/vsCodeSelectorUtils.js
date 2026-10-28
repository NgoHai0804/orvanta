export const SELECTOR_SEPARATOR = "/"
function encodeSelectorSegment(value) {
	return encodeURIComponent(value)
}
function decodeSelectorSegment(value) {
	try {
		return decodeURIComponent(value)
	} catch {
		// A segment that isn't valid percent-encoding is passed through as-is, so
		// a malformed or hand-written selector string still yields a usable value.
		return value
	}
}
export function stringifyVsCodeLmModelSelector(selector) {
	return [selector.vendor, selector.family, selector.version, selector.id]
		.filter((part) => Boolean(part))
		.map(encodeSelectorSegment)
		.join(SELECTOR_SEPARATOR)
}
/**
 * Parse a stringified VS Code LM selector (`vendor/family[/version/id]`) back
 * into a `LanguageModelChatSelector`.
 *
 * Selector segments are URI-encoded by stringifyVsCodeLmModelSelector so model
 * family/id values can themselves contain `/` (common for BYOK providers such as
 * `openai/gpt-4o`). Splitting on the separator therefore yields up to four
 * positional segments (vendor, family, version, id); each is decoded
 * independently, and missing trailing segments are simply omitted.
 */
export function parseVsCodeLmModelSelector(modelId) {
	if (!modelId) {
		return {}
	}
	const parts = modelId.split(SELECTOR_SEPARATOR)
	const [vendor, family, version, id] = parts.map(decodeSelectorSegment)
	const selector = {}
	if (vendor) {
		selector.vendor = vendor
	}
	if (family) {
		selector.family = family
	}
	if (version) {
		selector.version = version
	}
	if (id) {
		selector.id = id
	}
	return selector
}
//# sourceMappingURL=vsCodeSelectorUtils.js.map
