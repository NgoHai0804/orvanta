import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"
import { fromOrvantaAgentProfile, toOrvantaAgentProfile } from "@/orvanta/agent-proto-conversions"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { upsertAgent } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function upsertAgentProfile(_controller: Controller, request: OrvantaAgentProfile): Promise<OrvantaAgentProfile> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		throw new Error("No workspace folder open")
	}
	const input = fromOrvantaAgentProfile(request)
	const saved = await upsertAgent(root, input)
	return toOrvantaAgentProfile(saved)
}
