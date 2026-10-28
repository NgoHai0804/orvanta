import { ApiFormat } from "@shared/proto/cline/models"
export function finiteNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
export function positiveFiniteNumber(value) {
	const number = finiteNumber(value)
	return number !== undefined && number > 0 ? number : undefined
}
export function nonNegativeFiniteNumber(value) {
	const number = finiteNumber(value)
	return number !== undefined && number >= 0 ? number : undefined
}
export function toSdkApiFormat(apiFormat) {
	switch (apiFormat) {
		case ApiFormat.R1_CHAT:
			return "r1"
		case ApiFormat.OPENAI_RESPONSES:
			return "openai-responses"
		case ApiFormat.OPENAI_CHAT:
			return "default"
		default:
			return undefined
	}
}
export function fromSdkApiFormat(apiFormat) {
	switch (apiFormat) {
		case "r1":
			return ApiFormat.R1_CHAT
		case "openai-responses":
			return ApiFormat.OPENAI_RESPONSES
		case "default":
			return ApiFormat.OPENAI_CHAT
		default:
			return undefined
	}
}
//# sourceMappingURL=model-values.js.map
