import { String } from "@shared/proto/cline/common"
import { WebviewProvider } from "@/core/webview"
/**
 * Returns the HTML content of the webview.
 *
 * This is only used by the standalone service. The Vscode extension gets the HTML directly from the webview when it
 * resolved through `resolveWebviewView()`.
 */
export async function getWebviewHtml(_controller, _) {
	const webview = WebviewProvider.getInstance()
	return Promise.resolve(String.create({ value: webview.getHtmlContent() }))
}
//# sourceMappingURL=getWebviewHtml.js.map
