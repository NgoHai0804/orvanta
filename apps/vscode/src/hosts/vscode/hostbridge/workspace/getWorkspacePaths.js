import * as vscode from "vscode"
import { GetWorkspacePathsResponse } from "@/shared/proto/index.host"
export async function getWorkspacePaths(_) {
	const paths = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? []
	return GetWorkspacePathsResponse.create({ paths: paths })
}
//# sourceMappingURL=getWorkspacePaths.js.map
