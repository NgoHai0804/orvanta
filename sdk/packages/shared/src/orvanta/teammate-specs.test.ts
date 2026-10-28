import { describe, expect, it } from "vitest";
import type { AgentProfile } from "./agent-profile";
import type { RosterJson } from "./company-schema";
import { buildTeammateSpecs } from "./teammate-specs";

function makeFakeProfile(id: string, overrides: Partial<AgentProfile> = {}): AgentProfile {
	return {
		id,
		displayName: id.toUpperCase(),
		description: `Description for ${id}`,
		role: "teammate",
		providerId: null,
		modelId: null,
		maxIterations: 40,
		temperature: null,
		tools: { allow: ["read_files"], deny: [] },
		scopePaths: { allow: ["**/*"], denyWrite: [] },
		instructions: `You are agent ${id}. Perform assigned tasks carefully.`,
		filePath: `org/agents/${id}/profile.md`,
		...overrides,
	};
}

describe("buildTeammateSpecs", () => {
	const mockRoster: RosterJson = {
		schemaVersion: 1,
		agents: [
			{
				id: "coordinator",
				displayName: "Coordinator",
				role: "lead",
				status: "idle",
				agentFile: "org/agents/coordinator/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "implementer",
				displayName: "Implementer",
				role: "teammate",
				status: "idle",
				agentFile: "org/agents/implementer/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: "anthropic:claude-3-5-sonnet",
				maxIterations: 50,
			},
			{
				id: "reviewer",
				displayName: "Reviewer",
				role: "teammate",
				status: "running",
				agentFile: "org/agents/reviewer/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 30,
			},
			{
				id: "hiree",
				displayName: "Pending Hire",
				role: "teammate",
				status: "pending_hire",
				agentFile: "org/agents/hiree/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "firee",
				displayName: "Pending Fire",
				role: "teammate",
				status: "pending_fire",
				agentFile: "org/agents/firee/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "stopped_agent",
				displayName: "Stopped Agent",
				role: "teammate",
				status: "stopped",
				agentFile: "org/agents/stopped_agent/profile.md",
				hiredAt: "2026-10-27T10:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
		],
	};

	const profilesMap = new Map<string, AgentProfile>([
		["implementer", makeFakeProfile("implementer", { instructions: "Write code and fix tests." })],
		[
			"reviewer",
			makeFakeProfile("reviewer", {
				instructions: "Review code thoroughly.",
				modelId: "openai:gpt-4o",
				maxIterations: 35,
			}),
		],
	]);

	it("filters out coordinator (role=lead) and pending/stopped agents", () => {
		const specs = buildTeammateSpecs(mockRoster, profilesMap);
		const ids = specs.map((s) => s.agentId);
		expect(ids).toEqual(["implementer", "reviewer"]);
	});

	it("maps instructions to rolePrompt", () => {
		const specs = buildTeammateSpecs(mockRoster, profilesMap);
		const impl = specs.find((s) => s.agentId === "implementer");
		expect(impl?.rolePrompt).toBe("Write code and fix tests.");
	});

	it("prefers profile modelId and maxIterations over roster values", () => {
		const specs = buildTeammateSpecs(mockRoster, profilesMap);
		const reviewer = specs.find((s) => s.agentId === "reviewer");
		expect(reviewer?.modelId).toBe("openai:gpt-4o");
		expect(reviewer?.maxIterations).toBe(35);

		const impl = specs.find((s) => s.agentId === "implementer");
		expect(impl?.modelId).toBe("anthropic:claude-3-5-sonnet");
		// profile default is 40, so it takes profile's 40 over roster's 50
		expect(impl?.maxIterations).toBe(40);
	});

	it("uses fallbackModelId when neither profile nor roster specifies a modelId", () => {
		const customProfiles = new Map<string, AgentProfile>([
			["implementer", makeFakeProfile("implementer", { modelId: null })],
		]);
		const rosterNoModel: RosterJson = {
			schemaVersion: 1,
			agents: [
				{
					...mockRoster.agents[1],
					modelId: null,
				},
			],
		};
		const specs = buildTeammateSpecs(rosterNoModel, customProfiles, { fallbackModelId: "default-model" });
		expect(specs[0].modelId).toBe("default-model");
	});

	it("works with Record and lookup function", () => {
		const record: Record<string, AgentProfile> = {
			implementer: makeFakeProfile("implementer", { instructions: "From record" }),
		};
		const specs1 = buildTeammateSpecs(mockRoster, record);
		expect(specs1.find((s) => s.agentId === "implementer")?.rolePrompt).toBe("From record");

		const fn = (id: string) => makeFakeProfile(id, { instructions: `From fn for ${id}` });
		const specs2 = buildTeammateSpecs(mockRoster, fn);
		expect(specs2.find((s) => s.agentId === "implementer")?.rolePrompt).toBe("From fn for implementer");
	});
});
