import { describe, expect, it } from "vitest";
import {
	CompanyJsonSchema,
	CreateCompanyInputSchema,
	DEFAULT_COMPANY_POLICIES,
	defaultCoordinatorRoster,
	RosterAgentSchema,
	RosterJsonSchema,
	OrvantaAgentIdentitySchema,
	getRosterIdentities,
	resolveLegacyAgentSlug,
	upgradeLegacyRoster,
	slugifyTeamName,
	validateLoadedCompany,
} from "./company-schema";

const now = "2026-10-27T10:00:00.000Z";

function validCompany() {
	return {
		schemaVersion: 1 as const,
		id: "orvanta-local-1",
		name: "Orvanta",
		createdAt: now,
		updatedAt: now,
		workspaceRoot: ".",
		teamName: "orvanta",
		policies: DEFAULT_COMPANY_POLICIES,
		coordinatorAgentId: "coordinator",
	};
}

describe("slugifyTeamName", () => {
	it("slugs a display name", () => {
		expect(slugifyTeamName("Orvanta Core")).toBe("orvanta-core");
	});

	it("falls back when nothing remains", () => {
		expect(slugifyTeamName("***")).toBe("company");
	});
});

describe("CreateCompanyInputSchema", () => {
	it("rejects a short purpose", () => {
		const result = CreateCompanyInputSchema.safeParse({
			name: "Orvanta",
			purpose: "too short",
		});
		expect(result.success).toBe(false);
	});

	it("accepts a trimmed valid purpose", () => {
		const result = CreateCompanyInputSchema.safeParse({
			name: "  Orvanta  ",
			purpose: "   Xây công ty AI theo từng repo.   ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Orvanta");
			expect(result.data.purpose.startsWith("Xây")).toBe(true);
		}
	});
});

describe("CompanyJsonSchema", () => {
	it("parses a valid company", () => {
		expect(CompanyJsonSchema.parse(validCompany()).name).toBe("Orvanta");
	});
});

describe("Agent identity schema", () => {
	it("accepts only positive safe integer numeric IDs", () => {
		const base = defaultCoordinatorRoster(now).agents[0]!;
		for (const agentNumericId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
			expect(RosterAgentSchema.safeParse({ ...base, agentNumericId }).success).toBe(false);
		}
		expect(
			RosterAgentSchema.safeParse({ ...base, agentNumericId: Number.MAX_SAFE_INTEGER }).success,
		).toBe(true);
	});

	it("rejects duplicate active slugs and duplicated active/retired numeric IDs", () => {
		const roster = defaultCoordinatorRoster(now);
		const second = { ...roster.agents[0]!, id: "reviewer", agentNumericId: 2 };
		expect(RosterJsonSchema.safeParse({ ...roster, nextAgentNumericId: 3, agents: [...roster.agents, { ...second, id: "coordinator" }] }).success).toBe(false);
		expect(RosterJsonSchema.safeParse({ ...roster, nextAgentNumericId: 3, agents: [...roster.agents, second], retiredAgents: [{ agentNumericId: 2, id: "former", displayName: "Former", legacySlugs: [], retiredAt: now }] }).success).toBe(false);
	});

	it("assigns legacy roster IDs deterministically and starts new roster at schema v2", () => {
		const legacy = {
			schemaVersion: 1,
			agents: [
				{ ...defaultCoordinatorRoster(now).agents[0]!, id: "coordinator" },
				{
					...defaultCoordinatorRoster(now).agents[0]!,
					id: "zebra",
					displayName: "Zebra",
					role: "teammate" as const,
				},
				{
					...defaultCoordinatorRoster(now).agents[0]!,
					id: "alpha",
					displayName: "Alpha",
					role: "teammate" as const,
				},
			],
		};
		const upgraded = upgradeLegacyRoster(legacy);
		expect(upgraded.schemaVersion).toBe(2);
		expect(upgraded.agents.map(({ id, agentNumericId }) => [id, agentNumericId])).toEqual([
			["coordinator", 1],
			["zebra", 3],
			["alpha", 2],
		]);
		expect(upgraded.nextAgentNumericId).toBe(4);
		expect(RosterJsonSchema.safeParse(upgraded).success).toBe(true);
	});

	it("preserves retired identity IDs when migrating a legacy roster", () => {
		const retired = [{ agentNumericId: 7, id: "old", displayName: "Old", legacySlugs: ["old"], retiredAt: now }];
		const roster = upgradeLegacyRoster({ schemaVersion: 1, agents: [{ ...defaultCoordinatorRoster(now).agents[0]!, id: "coordinator" }] }, retired);
		expect(roster.agents[0]!.agentNumericId).toBe(1);
		expect(roster.retiredAgents[0]!.agentNumericId).toBe(7);
		expect(roster.nextAgentNumericId).toBe(8);
	});

	it("resolves one slug, while unknown and ambiguous aliases fail safely", () => {
		const roster = upgradeLegacyRoster({
			schemaVersion: 1,
			agents: [
				{ ...defaultCoordinatorRoster(now).agents[0]!, id: "coordinator" },
				{
					...defaultCoordinatorRoster(now).agents[0]!,
					id: "reviewer",
					displayName: "Reviewer",
					role: "teammate",
				},
			],
		});
		roster.agents[1]!.legacySlugs = ["old-reviewer"];
		expect(resolveLegacyAgentSlug(roster, "old-reviewer")).toEqual({
			status: "resolved",
			agentNumericId: 2,
		});
		expect(resolveLegacyAgentSlug(roster, "missing")).toEqual({ status: "unknown" });
		roster.retiredAgents.push({
			agentNumericId: 3,
			id: "former-reviewer",
			displayName: "Former Reviewer",
			legacySlugs: ["old-reviewer"],
			retiredAt: now,
		});
		expect(resolveLegacyAgentSlug(roster, "old-reviewer")).toMatchObject({ status: "ambiguous" });
	});

	it("extracts OrvantaAgentIdentity list and validates schema", () => {
		const roster = defaultCoordinatorRoster(now);
		roster.agents.push({
			...roster.agents[0]!,
			id: "reviewer",
			agentNumericId: 2,
			displayName: "Code Reviewer",
			role: "teammate",
		});
		roster.retiredAgents.push({
			agentNumericId: 3,
			id: "former",
			displayName: "Former Agent",
			legacySlugs: ["old-former"],
			retiredAt: now,
		});
		roster.nextAgentNumericId = 4;

		const identities = getRosterIdentities(roster);
		expect(identities).toEqual([
			{ agentNumericId: 1, agentSlug: "coordinator", displayName: "Coordinator", status: "active" },
			{ agentNumericId: 2, agentSlug: "reviewer", displayName: "Code Reviewer", status: "active" },
			{ agentNumericId: 3, agentSlug: "former", displayName: "Former Agent", status: "retired" },
		]);
		for (const identity of identities) {
			expect(OrvantaAgentIdentitySchema.safeParse(identity).success).toBe(true);
		}
	});

	it("keeps numeric IDs stable when active agents are reordered in roster", () => {
		const baseRoster = defaultCoordinatorRoster(now);
		const agent2 = { ...baseRoster.agents[0]!, id: "architect", agentNumericId: 2, displayName: "Architect", role: "teammate" as const };
		const agent3 = { ...baseRoster.agents[0]!, id: "coder", agentNumericId: 3, displayName: "Coder", role: "teammate" as const };
		const roster = {
			...baseRoster,
			nextAgentNumericId: 4,
			agents: [baseRoster.agents[0]!, agent2, agent3],
		};

		// Reorder agents in array
		const reordered = {
			...roster,
			agents: [agent3, baseRoster.agents[0]!, agent2],
		};
		expect(RosterJsonSchema.safeParse(reordered).success).toBe(true);

		const map1 = new Map(roster.agents.map((a) => [a.id, a.agentNumericId]));
		const map2 = new Map(reordered.agents.map((a) => [a.id, a.agentNumericId]));
		expect(map2.get("coordinator")).toBe(map1.get("coordinator"));
		expect(map2.get("architect")).toBe(map1.get("architect"));
		expect(map2.get("coder")).toBe(map1.get("coder"));
	});
});

describe("validateLoadedCompany", () => {
	it("accepts a complete company", () => {
		const result = validateLoadedCompany({
			company: validCompany(),
			purpose: "Xây công ty AI theo từng repo.",
			roster: defaultCoordinatorRoster(now),
		});
		expect(result.ok).toBe(true);
	});

	it("reports a missing purpose", () => {
		const result = validateLoadedCompany({
			company: validCompany(),
			purpose: "   ",
			roster: defaultCoordinatorRoster(now),
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors).toContain("thiếu purpose.md");
		}
	});
});
