import type { AgentProfile } from "@cline/shared"
import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"

export function toOrvantaAgentProfile(profile: AgentProfile): OrvantaAgentProfile {
	return OrvantaAgentProfile.create({
		id: profile.id,
		displayName: profile.displayName,
		role: profile.role,
		description: profile.description,
		reportsTo: profile.reportsTo ?? undefined,
		providerId: profile.providerId ?? undefined,
		modelId: profile.modelId ?? undefined,
		maxIterations: profile.maxIterations,
		temperature: profile.temperature ?? undefined,
		reasoningEffort: profile.reasoningEffort ?? undefined,
		supportsImages: profile.supportsImages ?? undefined,
		contextWindow: profile.contextWindow ?? undefined,
		maxOutputTokens: profile.maxOutputTokens ?? undefined,
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
		rules: profile.rules ?? [],
		skills: profile.skills ?? [],
		autoApprovalJson: profile.autoApproval ? JSON.stringify(profile.autoApproval) : undefined,
		mcpServers: profile.mcpServers ?? [],
	})
}

export function fromOrvantaAgentProfile(proto: OrvantaAgentProfile): AgentProfile {
	return {
		id: proto.id,
		displayName: proto.displayName,
		role: (proto.role === "lead" ? "lead" : "teammate") as "lead" | "teammate",
		description: proto.description,
		reportsTo: proto.reportsTo ?? null,
		providerId: proto.providerId ?? null,
		modelId: proto.modelId ?? null,
		maxIterations: proto.maxIterations ?? 40,
		temperature: proto.temperature ?? null,
		reasoningEffort: (proto.reasoningEffort as AgentProfile["reasoningEffort"]) ?? null,
		supportsImages: proto.supportsImages ?? null,
		contextWindow: proto.contextWindow ?? null,
		maxOutputTokens: proto.maxOutputTokens ?? null,
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
		rules: proto.rules ?? [],
		skills: proto.skills ?? [],
		autoApproval: proto.autoApprovalJson
			? (() => {
					try {
						return JSON.parse(proto.autoApprovalJson)
					} catch {
						return undefined
					}
				})()
			: undefined,
		mcpServers: proto.mcpServers ?? [],
	}
}
