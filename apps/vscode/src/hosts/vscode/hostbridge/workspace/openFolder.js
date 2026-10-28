import * as vscode from "vscode"
import { OpenFolderResponse } from "@/shared/proto/host/workspace"
import { Logger } from "@/shared/services/Logger"
export async function openFolder(request) {
	try {
		const uri = vscode.Uri.file(request.path)
		await vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: request.newWindow })
		return OpenFolderResponse.create({ success: true })
	} catch (error) {
		Logger.error("Failed to open folder:", error)
		return OpenFolderResponse.create({ success: false })
	}
}
//# sourceMappingURL=openFolder.js.map
