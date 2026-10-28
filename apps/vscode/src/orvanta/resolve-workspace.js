import { HostProvider } from "@/hosts/host-provider"
import { pickWorkspaceRoot } from "./workspace-store"
export async function resolveOrvantaWorkspaceRoot() {
	const { paths } = await HostProvider.workspace.getWorkspacePaths({})
	return pickWorkspaceRoot(paths)
}
//# sourceMappingURL=resolve-workspace.js.map
