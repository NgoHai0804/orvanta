import path from "path"
import * as vscode from "vscode"
import { OpenMultiFileDiffRequest, OpenMultiFileDiffResponse } from "@/shared/proto/index.host"
import { getCwd } from "@/utils/path"
import { DIFF_VIEW_URI_SCHEME } from "../../VscodeDiffContentProvider"

export async function openMultiFileDiff(request: OpenMultiFileDiffRequest): Promise<OpenMultiFileDiffResponse> {
	const cwd = await getCwd()
	await vscode.commands.executeCommand(
		"vscode.changes",
		request.title,
		request.diffs.map((diff) => {
			const file = vscode.Uri.file(diff.filePath || "")
			const rawRelative = path.relative(cwd, diff.filePath || "")
			// Normalize Windows backslashes so URI path is always well-formed
			const normalizedRelative = rawRelative.split(path.sep).join("/")
			const left = diff.leftContent ?? ""
			const right = diff.rightContent ?? ""
			return [
				file,
				vscode.Uri.from({
					scheme: DIFF_VIEW_URI_SCHEME,
					path: `/${normalizedRelative}`,
					query: Buffer.from(left).toString("base64"),
				}),
				vscode.Uri.from({
					scheme: DIFF_VIEW_URI_SCHEME,
					path: `/${normalizedRelative}`,
					query: Buffer.from(right).toString("base64"),
				}),
			]
		}),
	)

	// Hide the bottom panel to give more room for the diff view
	vscode.commands.executeCommand("workbench.action.closePanel")

	return {}
}
