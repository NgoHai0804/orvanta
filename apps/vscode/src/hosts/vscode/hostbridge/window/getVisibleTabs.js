import { window } from "vscode"
import { GetVisibleTabsResponse } from "@/shared/proto/host/window"
export async function getVisibleTabs(_) {
	const visibleTabPaths = window.visibleTextEditors?.map((editor) => editor.document?.uri?.fsPath).filter(Boolean)
	return GetVisibleTabsResponse.create({ paths: visibleTabPaths ?? [] })
}
//# sourceMappingURL=getVisibleTabs.js.map
