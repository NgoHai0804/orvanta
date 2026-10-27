import { HostProvider } from "@/hosts/host-provider"
import { pickWorkspaceRoot } from "./workspace-store"

export async function resolveOrvantaWorkspaceRoot(): Promise<string | undefined> {
	const { paths } = await HostProvider.workspace.getWorkspacePaths({})
	return pickWorkspaceRoot(paths)
}
