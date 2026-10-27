import { describe, expect, it } from "bun:test"
import type { CompanyLoad } from "@cline/shared"
import { toCompanyResponse } from "./to-company-response"

describe("toCompanyResponse", () => {
	const mockReadyLoad: CompanyLoad = {
		status: "ready",
		company: {
			id: "comp-1",
			name: "Test Co",
			teamName: "test-co",
			createdAt: "2026-10-27T10:00:00.000Z",
			updatedAt: "2026-10-27T10:00:00.000Z",
			workspaceRoot: "/workspace",
			schemaVersion: 1,
			coordinatorAgentId: "coordinator",
			policies: {
				hire: "ceo_approve",
				fire: "ceo_approve",
				changePurpose: "ceo_approve",
				changeScope: "ceo_approve",
				merge: "ceo_approve",
				spawnEphemeral: "ceo_approve",
				firstHireFast: false,
				budgetUsdPerDay: null,
			},
		},
		purpose: "Do great work",
		roster: {
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
					modelId: null,
					maxIterations: 40,
				},
				{
					id: "stopped-agent",
					displayName: "Stopped Agent",
					role: "teammate",
					status: "stopped",
					agentFile: "org/agents/stopped/profile.md",
					hiredAt: "2026-10-27T10:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
			],
		},
	}

	it("maps idle agents when runningAgentIds is empty", () => {
		const res = toCompanyResponse(mockReadyLoad)
		expect(res.status).toBe("ready")
		expect(res.agents.find((a) => a.id === "implementer")?.status).toBe("idle")
	})

	it("marks running agent when its id is in runningAgentIds", () => {
		const res = toCompanyResponse(mockReadyLoad, [], ["implementer"])
		expect(res.status).toBe("ready")
		expect(res.agents.find((a) => a.id === "implementer")?.status).toBe("running")
		expect(res.agents.find((a) => a.id === "coordinator")?.status).toBe("idle")
	})

	it("does not override stopped agents even if reported in runningAgentIds", () => {
		const res = toCompanyResponse(mockReadyLoad, [], ["stopped-agent"])
		expect(res.agents.find((a) => a.id === "stopped-agent")?.status).toBe("stopped")
	})

	it("maps missing and broken company statuses", () => {
		const missingRes = toCompanyResponse({ status: "missing" }, ["no_folder"])
		expect(missingRes.status).toBe("missing")
		expect(missingRes.errors).toEqual(["no_folder"])

		const brokenRes = toCompanyResponse({ status: "broken", errors: ["bad_json"] })
		expect(brokenRes.status).toBe("broken")
		expect(brokenRes.errors).toEqual(["bad_json"])
	})
})
