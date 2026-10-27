import type { TeamTeammateSpec } from "../team/schema";
import type { AgentProfile } from "./agent-profile";
import type { RosterJson } from "./company-schema";


export type AgentProfileLookup =
	| Map<string, AgentProfile>
	| Record<string, AgentProfile>
	| ((agentId: string) => AgentProfile | undefined);

export interface BuildTeammateSpecsOptions {
	fallbackModelId?: string;
}

function resolveProfile(
	lookup: AgentProfileLookup,
	agentId: string,
): AgentProfile | undefined {
	if (typeof lookup === "function") {
		return lookup(agentId);
	}
	if (lookup instanceof Map) {
		return lookup.get(agentId);
	}
	return lookup[agentId];
}

/**
 * Maps roster agents to TeamTeammateSpec instances for agent-teams runtime bootstrap.
 *
 * Rules (P5):
 * - Role must be "teammate" (lead/coordinator is skipped)
 * - Status must NOT be pending_* (e.g. pending_hire, pending_fire)
 * - Status must NOT be stopped
 * - rolePrompt is taken from profile.instructions
 * - modelId is taken from profile.modelId ?? roster.modelId ?? fallbackModelId
 * - maxIterations is taken from profile.maxIterations ?? roster.maxIterations
 */
export function buildTeammateSpecs(
	roster: RosterJson,
	profiles: AgentProfileLookup,
	options: BuildTeammateSpecsOptions = {},
): TeamTeammateSpec[] {
	const specs: TeamTeammateSpec[] = [];

	for (const agent of roster.agents) {
		if (agent.role !== "teammate") {
			continue;
		}
		if (agent.status.startsWith("pending_") || agent.status === "stopped") {
			continue;
		}

		const profile = resolveProfile(profiles, agent.id);
		const rolePrompt = profile?.instructions?.trim() || "";

		const rawModelId = profile?.modelId ?? agent.modelId ?? options.fallbackModelId;
		const modelId =
			typeof rawModelId === "string" && rawModelId.trim().length > 0
				? rawModelId.trim()
				: undefined;

		const maxIterations =
			profile?.maxIterations ?? agent.maxIterations ?? undefined;

		specs.push({
			agentId: agent.id,
			rolePrompt,
			...(modelId ? { modelId } : {}),
			...(maxIterations !== undefined ? { maxIterations } : {}),
		});
	}

	return specs;
}
