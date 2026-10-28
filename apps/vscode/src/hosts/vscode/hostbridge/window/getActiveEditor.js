import * as vscode from "vscode"
export async function getActiveEditor(_) {
	const filePath = vscode.window.activeTextEditor?.document.uri.fsPath
	return { filePath }
}
//# sourceMappingURL=getActiveEditor.js.map
