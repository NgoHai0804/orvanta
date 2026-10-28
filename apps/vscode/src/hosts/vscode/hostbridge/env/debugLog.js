import { Empty } from "@shared/proto/cline/common"
import * as vscode from "vscode"

const CLINE_OUTPUT_CHANNEL = vscode.window.createOutputChannel("Cline")
// Appends a log message to all Cline output channels.
export async function debugLog(request) {
	CLINE_OUTPUT_CHANNEL.appendLine(request.value)
	return Empty.create({})
}
// Register the Cline output channel within the VSCode extension context.
export function registerClineOutputChannel(context) {
	context.subscriptions.push(CLINE_OUTPUT_CHANNEL)
	return CLINE_OUTPUT_CHANNEL
}
//# sourceMappingURL=debugLog.js.map
