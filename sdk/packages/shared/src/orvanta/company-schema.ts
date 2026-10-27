import { z } from "zod";
import {
	COORDINATOR_AGENT_ID,
	COORDINATOR_PROFILE_FILE,
	MAX_COMPANY_NAME_LENGTH,
	MIN_PURPOSE_LENGTH,
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
	hiredAt: z.string().datetime(),
	hiredBy: z.enum(["ceo", "policy"]),
	modelId: z.string().nullable(),
	maxIterations: z.number().int().min(1).max(200),
});
export type RosterAgent = z.infer<typeof RosterAgentSchema>;

export const RosterJsonSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	agents: z.array(RosterAgentSchema),
});
export type RosterJson = z.infer<typeof RosterJsonSchema>;

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
		schemaVersion: SCHEMA_VERSION,
		agents: [
			{
				id: COORDINATOR_AGENT_ID,
				displayName: "Coordinator",
				role: "lead",
				status: "idle",
				agentFile: COORDINATOR_PROFILE_FILE,
				hiredAt: nowIso,
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
		],
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
	const rosterResult = RosterJsonSchema.safeParse(input.roster);
	if (!rosterResult.success) {
		errors.push("org/roster.json không hợp lệ");
	} else {
		const leads = rosterResult.data.agents.filter((a) => a.role === "lead");
		if (leads.length !== 1) {
			errors.push("roster phải có đúng một lead");
		}
		const coordinatorId =
			companyResult.success
				? companyResult.data.coordinatorAgentId
				: COORDINATOR_AGENT_ID;
		if (!rosterResult.data.agents.some((a) => a.id === coordinatorId)) {
			errors.push("thiếu coordinator trên roster");
		}
	}
	if (errors.length > 0 || !companyResult.success || !rosterResult.success) {
		return { ok: false, errors };
	}
	return {
		ok: true,
		company: companyResult.data,
		purpose,
		roster: rosterResult.data,
	};
}
