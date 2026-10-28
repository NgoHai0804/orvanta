import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
export async function openClineSidebarPanel(_) {
	await vscode.commands.executeCommand(`${ExtensionRegistryInfo.views.Sidebar}.focus`)
	return {}
}
//# sourceMappingURL=openClineSidebarPanel.js.map
