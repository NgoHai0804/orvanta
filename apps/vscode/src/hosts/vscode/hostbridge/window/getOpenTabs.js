import { window } from "vscode"
import { GetOpenTabsResponse } from "@/shared/proto/host/window"
export async function getOpenTabs(_) {
	const openTabPaths = window.tabGroups.all
		.flatMap((group) => group.tabs)
		.map((tab) => tab.input?.uri?.fsPath)
		.filter(Boolean)
	return GetOpenTabsResponse.create({ paths: openTabPaths ?? [] })
}
//# sourceMappingURL=getOpenTabs.js.map
