export const REASONING_DETAILS_PROVIDERS = ["cline", "openrouter"]
/**
 * Converts ClineStorageMessage to Anthropic.MessageParam by removing Cline-specific fields
 * Cline-specific fields (like modelInfo, reasoning_details) are properly omitted.
 */
export function convertClineStorageToAnthropicMessage(clineMessage, provider = "anthropic") {
	const { role, content } = clineMessage
	// Handle string content - fast path
	if (typeof content === "string") {
		return { role, content }
	}
	// Removes thinking block that has no signature (invalid thinking block that's incompatible with Anthropic API)
	const filteredContent = content.filter((b) => b.type !== "thinking" || !!b.signature)
	// Handle array content - strip Cline-specific fields for non-reasoning_details providers
	const shouldCleanContent = !REASONING_DETAILS_PROVIDERS.includes(provider)
	const cleanedContent = shouldCleanContent ? filteredContent.map(cleanContentBlock) : filteredContent
	return { role, content: cleanedContent }
}
/**
 * Cline stores images as base64, so an image block's source is always a base64 source.
 * The Anthropic SDK types the source as a Base64ImageSource | URLImageSource union, so this
 * narrows to the base64 variant for the transform layer. URL sources are not produced by Cline,
 * so they degrade to empty values rather than throwing.
 */
export function getBase64ImageSource(source) {
	if (source.type === "base64") {
		return { mediaType: source.media_type, data: source.data }
	}
	return { mediaType: "", data: "" }
}
/**
 * Builds a base64 data URL from an image block's source. See getBase64ImageSource.
 */
export function getImageDataUrl(source) {
	const { mediaType, data } = getBase64ImageSource(source)
	return `data:${mediaType};base64,${data}`
}
/**
 * Clean a content block by removing Cline-specific fields and returning only Anthropic-compatible fields
 */
export function cleanContentBlock(block) {
	// Fast path: if no Cline-specific fields exist, return as-is
	const hasClineFields =
		"reasoning_details" in block ||
		"call_id" in block ||
		"summary" in block ||
		(block.type !== "thinking" && "signature" in block)
	if (!hasClineFields) {
		return block
	}
	// Removes Cline-specific fields & the signature field that's added for Gemini.
	const { reasoning_details, call_id, summary, ...rest } = block
	// Remove signature from non-thinking blocks that were added for Gemini
	if (block.type !== "thinking" && rest.signature) {
		rest.signature = undefined
	}
	return rest
}
//# sourceMappingURL=content.js.map
