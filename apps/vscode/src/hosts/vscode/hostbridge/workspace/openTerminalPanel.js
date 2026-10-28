import * as vscode from "vscode"
export async function openTerminalPanel(_) {
	vscode.commands.executeCommand("workbench.action.terminal.focus")
	return {}
}
//# sourceMappingURL=openTerminalPanel.js.map
