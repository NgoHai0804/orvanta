import { fromOrvantaAgentProfile, toOrvantaAgentProfile } from "@/orvanta/agent-proto-conversions"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { upsertAgent } from "@/orvanta/workspace-store"
export async function upsertAgentProfile(_controller, request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		throw new Error("No workspace folder open")
	}
	const input = fromOrvantaAgentProfile(request)
	const saved = await upsertAgent(root, input)
	return toOrvantaAgentProfile(saved)
}
//# sourceMappingURL=upsertAgentProfile.js.map
