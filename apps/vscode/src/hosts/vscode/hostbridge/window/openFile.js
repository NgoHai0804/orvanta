import * as vscode from "vscode"
import { OpenFileResponse } from "@/shared/proto/host/window"
export async function openFile(request) {
	await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(request.filePath))
	return OpenFileResponse.create({})
}
//# sourceMappingURL=openFile.js.map
