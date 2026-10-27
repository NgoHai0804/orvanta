import type { AgentProfile } from "@cline/shared"
import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"

export function toOrvantaAgentProfile(profile: AgentProfile): OrvantaAgentProfile {
	return OrvantaAgentProfile.create({
		id: profile.id,
		displayName: profile.displayName,
		role: profile.role,
		description: profile.description,
		modelId: profile.modelId ?? undefined,
		maxIterations: profile.maxIterations,
		temperature: profile.temperature ?? undefined,
		instructions: profile.instructions,
		filePath: profile.filePath,
		tools: {
			allow: profile.tools?.allow ?? [],
			deny: profile.tools?.deny ?? [],
		},
		scopePaths: {
			allow: profile.scopePaths?.allow ?? [],
			denyWrite: profile.scopePaths?.denyWrite ?? [],
		},
	})
}

export function fromOrvantaAgentProfile(proto: OrvantaAgentProfile): AgentProfile {
	return {
		id: proto.id,
		displayName: proto.displayName,
		role: (proto.role === "lead" ? "lead" : "teammate") as "lead" | "teammate",
		description: proto.description,
		providerId: null,
		modelId: proto.modelId ?? null,
		maxIterations: proto.maxIterations ?? 50,
		temperature: proto.temperature ?? null,
		instructions: proto.instructions,
		filePath: proto.filePath || `org/agents/${proto.id}/profile.md`,
		tools: {
			allow: proto.tools?.allow ?? [],
			deny: proto.tools?.deny ?? [],
		},
		scopePaths: {
			allow: proto.scopePaths?.allow ?? [],
			denyWrite: proto.scopePaths?.denyWrite ?? [],
		},
	}
}
