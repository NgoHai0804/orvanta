import { OrvantaAgentProfileList } from "@shared/proto/cline/orvanta"
import { toOrvantaAgentProfile } from "@/orvanta/agent-proto-conversions"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { listAgentProfiles as listProfilesFromStore } from "@/orvanta/workspace-store"
export async function listAgentProfiles(_controller, _request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaAgentProfileList.create({ profiles: [] })
	}
	const profiles = await listProfilesFromStore(root)
	return OrvantaAgentProfileList.create({
		profiles: profiles.map(toOrvantaAgentProfile),
	})
}
//# sourceMappingURL=listAgentProfiles.js.map
