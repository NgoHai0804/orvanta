import { z } from "zod";
import {
	COORDINATOR_AGENT_ID,
	COORDINATOR_PROFILE_FILE,
	MAX_COMPANY_NAME_LENGTH,
	MIN_PURPOSE_LENGTH,
	ROSTER_SCHEMA_VERSION,
	SCHEMA_VERSION,
} from "./paths";

export const PolicyModeSchema = z.enum(["ceo_approve", "lead_only", "allow"]);
export type PolicyMode = z.infer<typeof PolicyModeSchema>;

export const CompanyPoliciesSchema = z.object({
	hire: PolicyModeSchema,
	fire: PolicyModeSchema,
	changePurpose: PolicyModeSchema,
	changeScope: PolicyModeSchema,
	merge: PolicyModeSchema,
	spawnEphemeral: PolicyModeSchema,
	firstHireFast: z.boolean(),
	budgetUsdPerDay: z.number().nullable(),
});
export type CompanyPolicies = z.infer<typeof CompanyPoliciesSchema>;

export const CompanyJsonSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	id: z.string().min(1),
	name: z.string().min(1).max(MAX_COMPANY_NAME_LENGTH),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	workspaceRoot: z.string(),
	teamName: z.string().min(1),
	policies: CompanyPoliciesSchema,
	coordinatorAgentId: z.string().min(1),
});
export type CompanyJson = z.infer<typeof CompanyJsonSchema>;

export const RosterAgentSchema = z.object({
	id: z.string().min(1),
	agentNumericId: z.number().int().positive().safe(),
	legacySlugs: z.array(z.string().min(1)).default([]),
	displayName: z.string().min(1),
	role: z.enum(["lead", "teammate"]),
	status: z.enum([
		"idle",
		"running",
		"stopped",
		"pending_hire",
		"pending_fire",
	]),
	agentFile: z.string().min(1),
	reportsTo: z.string().nullable().default(null).optional(),
	hiredAt: z.string().datetime(),
	hiredBy: z.enum(["ceo", "policy"]),
	modelId: z.string().nullable(),
	maxIterations: z.number().int().min(1).max(200),
});
export type RosterAgent = z.infer<typeof RosterAgentSchema>;

export const RetiredAgentIdentitySchema = z.object({
	agentNumericId: z.number().int().positive().safe(),
	id: z.string().min(1),
	displayName: z.string().min(1),
	legacySlugs: z.array(z.string().min(1)).default([]),
	retiredAt: z.string().datetime(),
});
export type RetiredAgentIdentity = z.infer<typeof RetiredAgentIdentitySchema>;

export const OrvantaAgentIdentitySchema = z.object({
	agentNumericId: z.number().int().positive().safe(),
	agentSlug: z.string().min(1),
	displayName: z.string().min(1),
	status: z.enum(["active", "retired"]),
});
export type OrvantaAgentIdentity = z.infer<typeof OrvantaAgentIdentitySchema>;

export const RosterJsonSchema = z.object({
	schemaVersion: z.literal(ROSTER_SCHEMA_VERSION),
	nextAgentNumericId: z.number().int().positive().safe(),
	agents: z.array(RosterAgentSchema),
	retiredAgents: z.array(RetiredAgentIdentitySchema).default([]),
}).superRefine((roster, context) => {
	const numericIds = new Set<number>();
	const activeSlugs = new Set<string>();
	for (const [index, agent] of roster.agents.entries()) {
		if (numericIds.has(agent.agentNumericId)) {
			context.addIssue({ code: "custom", path: ["agents", index, "agentNumericId"], message: "Agent numeric ID must be unique" });
		}
		numericIds.add(agent.agentNumericId);
		if (activeSlugs.has(agent.id)) {
			context.addIssue({ code: "custom", path: ["agents", index, "id"], message: "Active agent slug must be unique" });
		}
		activeSlugs.add(agent.id);
	}
	for (const [index, agent] of roster.agents.entries()) {
		for (const slug of agent.legacySlugs) {
			if (activeSlugs.has(slug)) {
				context.addIssue({ code: "custom", path: ["agents", index, "legacySlugs"], message: "Legacy alias cannot collide with an active slug" });
			}
		}
	}
	for (const [index, agent] of roster.retiredAgents.entries()) {
		if (numericIds.has(agent.agentNumericId)) {
			context.addIssue({ code: "custom", path: ["retiredAgents", index, "agentNumericId"], message: "Agent numeric ID must never be reused" });
		}
		numericIds.add(agent.agentNumericId);
		if (agent.id !== "" && activeSlugs.has(agent.id)) {
			context.addIssue({ code: "custom", path: ["retiredAgents", index, "id"], message: "Retired slug cannot be reused" });
		}
		if (agent.legacySlugs.some((slug) => activeSlugs.has(slug))) {
			context.addIssue({ code: "custom", path: ["retiredAgents", index, "legacySlugs"], message: "Retired alias cannot be reused" });
		}
	}
	if (numericIds.size > 0 && roster.nextAgentNumericId <= Math.max(...numericIds)) {
		context.addIssue({ code: "custom", path: ["nextAgentNumericId"], message: "nextAgentNumericId must exceed all allocated IDs" });
	}
});
export type RosterJson = z.infer<typeof RosterJsonSchema>;

export function upgradeLegacyRoster(input: unknown, retiredAgents: RetiredAgentIdentity[] = []): RosterJson {
	const legacy = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), agents: z.array(z.object({ id: z.string().min(1) }).passthrough()) }).parse(input);
	const legacyIds = [...new Set(legacy.agents.map((agent) => agent.id))];
	const reservedSlugs = new Set(retiredAgents.flatMap((agent) => [agent.id, ...agent.legacySlugs]));
	if (legacyIds.some((id) => reservedSlugs.has(id))) throw new Error("Legacy roster slug collides with a retired agent identity");
	const sortedIds = legacyIds.sort((a, b) => {
		if (a === COORDINATOR_AGENT_ID) return -1;
		if (b === COORDINATOR_AGENT_ID) return 1;
		return a < b ? -1 : a > b ? 1 : 0;
	});
	const numericIdBySlug = new Map(sortedIds.map((id, index) => [id, index + 1]));
	const agents = legacy.agents.map((agent) => ({
		...agent,
		agentNumericId: numericIdBySlug.get(agent.id)!,
		legacySlugs: [],
	}));
	return RosterJsonSchema.parse({
		schemaVersion: ROSTER_SCHEMA_VERSION,
		nextAgentNumericId: Math.max(sortedIds.length + 1, ...retiredAgents.map((agent) => agent.agentNumericId + 1)),
		agents,
		retiredAgents,
	});
}

export function parseRoster(input: unknown, retiredAgents: RetiredAgentIdentity[] = []): RosterJson {
	const current = RosterJsonSchema.safeParse(input);
	if (!current.success && retiredAgents.length > 0) return upgradeLegacyRoster(input, retiredAgents);
	return current.success ? current.data : upgradeLegacyRoster(input);
}

export type LegacyAgentSlugResolution =
	| { status: "resolved"; agentNumericId: number }
	| { status: "unknown" }
	| { status: "ambiguous"; agentNumericIds: number[] };

export function resolveLegacyAgentSlug(roster: RosterJson, legacySlug: string): LegacyAgentSlugResolution {
	const matches = [
		...roster.agents.filter((agent) => agent.id === legacySlug || agent.legacySlugs.includes(legacySlug)),
		...roster.retiredAgents.filter((agent) => agent.id === legacySlug || agent.legacySlugs.includes(legacySlug)),
	];
	const ids = [...new Set(matches.map((agent) => agent.agentNumericId))];
	if (ids.length === 0) return { status: "unknown" };
	if (ids.length > 1) return { status: "ambiguous", agentNumericIds: ids.sort((a, b) => a - b) };
	return { status: "resolved", agentNumericId: ids[0]! };
}

export function getRosterIdentities(roster: RosterJson): OrvantaAgentIdentity[] {
	return [
		...roster.agents.map((agent) => ({
			agentNumericId: agent.agentNumericId,
			agentSlug: agent.id,
			displayName: agent.displayName,
			status: "active" as const,
		})),
		...roster.retiredAgents.map((agent) => ({
			agentNumericId: agent.agentNumericId,
			agentSlug: agent.id,
			displayName: agent.displayName,
			status: "retired" as const,
		})),
	];
}

export type CompanyLoad =
	| { status: "missing" }
	| { status: "broken"; errors: string[] }
	| { status: "ready"; company: CompanyJson; purpose: string; roster: RosterJson };

export const CreateCompanyInputSchema = z.object({
	name: z.string().trim().min(1).max(MAX_COMPANY_NAME_LENGTH),
	purpose: z.string().trim().min(MIN_PURPOSE_LENGTH),
});
export type CreateCompanyInput = z.infer<typeof CreateCompanyInputSchema>;

export const DEFAULT_COMPANY_POLICIES: CompanyPolicies = {
	hire: "ceo_approve",
	fire: "ceo_approve",
	changePurpose: "ceo_approve",
	changeScope: "ceo_approve",
	merge: "ceo_approve",
	spawnEphemeral: "lead_only",
	firstHireFast: false,
	budgetUsdPerDay: null,
};

export function slugifyTeamName(name: string): string {
	const collapsed = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
	let start = 0;
	let end = collapsed.length;
	while (start < end && collapsed[start] === "-") start++;
	while (end > start && collapsed[end - 1] === "-") end--;
	const slug = collapsed.slice(start, end);
	return slug || "company";
}

export function defaultCoordinatorRoster(nowIso: string): RosterJson {
	return {
		schemaVersion: ROSTER_SCHEMA_VERSION,
		nextAgentNumericId: 2,
		agents: [
			{
				id: COORDINATOR_AGENT_ID,
				agentNumericId: 1,
				legacySlugs: [],
				displayName: "Coordinator",
				role: "lead",
				status: "idle",
				agentFile: COORDINATOR_PROFILE_FILE,
				reportsTo: null,
				hiredAt: nowIso,
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
		],
		retiredAgents: [],
	};
}

export function validateLoadedCompany(input: {
	company: unknown;
	purpose: string | undefined;
	roster: unknown;
}):
	| { ok: true; company: CompanyJson; purpose: string; roster: RosterJson }
	| { ok: false; errors: string[] } {
	const errors: string[] = [];
	const companyResult = CompanyJsonSchema.safeParse(input.company);
	if (!companyResult.success) {
		errors.push("company.json không hợp lệ");
	}
	const purpose = input.purpose?.trim() ?? "";
	if (!purpose) {
		errors.push("thiếu purpose.md");
	}
	let roster: RosterJson | undefined;
	try {
		roster = parseRoster(input.roster);
	} catch {
		errors.push("org/roster.json không hợp lệ");
	}
	if (roster) {
		const leads = roster.agents.filter((a) => a.role === "lead");
		if (leads.length !== 1) {
			errors.push("roster phải có đúng một lead");
		}
		const coordinatorId =
			companyResult.success
				? companyResult.data.coordinatorAgentId
				: COORDINATOR_AGENT_ID;
		if (!roster.agents.some((a) => a.id === coordinatorId)) {
			errors.push("thiếu coordinator trên roster");
		}
	}
	if (errors.length > 0 || !companyResult.success || !roster) {
		return { ok: false, errors };
	}
	return {
		ok: true,
		company: companyResult.data,
		purpose,
		roster,
	};
}
