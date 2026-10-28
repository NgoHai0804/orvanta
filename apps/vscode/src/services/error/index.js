export { ErrorService } from "./ErrorService"
export function getErrorLevelFromString(level) {
	switch (level) {
		case "disabled":
		case "off":
			return "off"
		case "error":
		case "crash":
			return "error"
		default:
			return "all"
	}
}
//# sourceMappingURL=index.js.map
