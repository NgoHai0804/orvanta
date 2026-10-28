import * as vscode from "vscode"
export async function openProblemsPanel(_) {
	vscode.commands.executeCommand("workbench.actions.view.problems")
	return {}
}
//# sourceMappingURL=openProblemsPanel.js.map
