import * as vscode from "vscode"
export async function openInFileExplorerPanel(request) {
	vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(request.path || ""))
	return {}
}
//# sourceMappingURL=openInFileExplorerPanel.js.map
