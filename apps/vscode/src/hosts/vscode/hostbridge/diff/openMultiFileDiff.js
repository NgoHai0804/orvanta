import path from "path"
import * as vscode from "vscode"
import { getCwd } from "@/utils/path"
import { DIFF_VIEW_URI_SCHEME } from "../../VscodeDiffContentProvider"
export async function openMultiFileDiff(request) {
	const cwd = await getCwd()
	await vscode.commands.executeCommand(
		"vscode.changes",
		request.title,
		request.diffs.map((diff) => {
			const file = vscode.Uri.file(diff.filePath || "")
			const relativePath = path.relative(cwd, diff.filePath || "")
			const left = diff.leftContent ?? ""
			const right = diff.rightContent ?? ""
			return [
				file,
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${relativePath}`).with({
					query: Buffer.from(left).toString("base64"),
				}),
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${relativePath}`).with({
					query: Buffer.from(right).toString("base64"),
				}),
			]
		}),
	)
	// Hide the bottom panel to give more room for the diff view
	vscode.commands.executeCommand("workbench.action.closePanel")
	return {}
}
//# sourceMappingURL=openMultiFileDiff.js.map
