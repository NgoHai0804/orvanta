import { WebviewProvider } from "@/core/webview"
export class ExternalWebviewProvider extends WebviewProvider {
	// This hostname cannot be changed without updating the external webview handler.
	RESOURCE_HOSTNAME = "internal.resources"
	getWebviewUrl(path) {
		const url = new URL(`https://${this.RESOURCE_HOSTNAME}/`)
		url.pathname = path
		return url.toString()
	}
	getCspSource() {
		return `'self' https://${this.RESOURCE_HOSTNAME}`
	}
	isVisible() {
		return true
	}
}
//# sourceMappingURL=ExternalWebviewProvider.js.map
