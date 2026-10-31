import type { AgentProfile } from "@cline/shared"
import { describe, expect, it } from "vitest"
import { fromOrvantaAgentProfile, toOrvantaAgentProfile } from "./agent-proto-conversions"

describe("agent-proto-conversions", () => {
	it("round-trips full AgentProfile to OrvantaAgentProfile proto and back", () => {
		const original: AgentProfile = {
			id: "implementer",
			displayName: "Lead Implementer",
			description: "Implement features.",
			role: "teammate",
			reportsTo: "coordinator",
			providerId: "anthropic",
			modelId: "claude-3-7-sonnet-20250219",
			maxIterations: 40,
			temperature: 0.2,
			reasoningEffort: "medium",
			supportsImages: true,
			contextWindow: 200000,
			maxOutputTokens: 16384,
			tools: {
				allow: ["read_files", "write_to_file"],
				deny: ["team_spawn_teammate"],
			},
			scopePaths: {
				allow: ["**/*"],
				denyWrite: [".orvanta/purpose.md"],
			},
			rules: ["code-simplification", "test-driven-development"],
			skills: ["code-review-and-quality"],
			mcpServers: ["github", "postgres"],
			instructions: "Write clean code.",
			filePath: "org/agents/implementer/profile.md",
		}

		const proto = toOrvantaAgentProfile(original)
		expect(proto.id).toBe("implementer")
		expect(proto.displayName).toBe("Lead Implementer")
		expect(proto.reportsTo).toBe("coordinator")
		expect(proto.providerId).toBe("anthropic")
		expect(proto.modelId).toBe("claude-3-7-sonnet-20250219")
		expect(proto.maxIterations).toBe(40)
		expect(proto.temperature).toBe(0.2)
		expect(proto.reasoningEffort).toBe("medium")
		expect(proto.supportsImages).toBe(true)
		expect(proto.contextWindow).toBe(200000)
		expect(proto.maxOutputTokens).toBe(16384)
		expect(proto.rules).toEqual(["code-simplification", "test-driven-development"])
		expect(proto.skills).toEqual(["code-review-and-quality"])

		const back = fromOrvantaAgentProfile(proto)
		expect(back).toEqual(original)
	})

	it("handles null and undefined fields gracefully", () => {
		const minimal: AgentProfile = {
			id: "coordinator",
			displayName: "Coordinator",
			description: "Lead",
			role: "lead",
			reportsTo: null,
			providerId: null,
			modelId: null,
			maxIterations: 40,
			temperature: null,
			reasoningEffort: null,
			supportsImages: null,
			contextWindow: null,
			maxOutputTokens: null,
			tools: { allow: [], deny: [] },
			scopePaths: { allow: ["**/*"], denyWrite: [] },
			rules: [],
			skills: [],
			mcpServers: [],
			instructions: "Coordinate tasks.",
			filePath: "org/agents/coordinator/profile.md",
		}

		const proto = toOrvantaAgentProfile(minimal)
		expect(proto.reportsTo).toBeUndefined()
		expect(proto.providerId).toBeUndefined()
		expect(proto.modelId).toBeUndefined()
		expect(proto.reasoningEffort).toBeUndefined()
		expect(proto.supportsImages).toBeUndefined()
		expect(proto.contextWindow).toBeUndefined()
		expect(proto.maxOutputTokens).toBeUndefined()

		const back = fromOrvantaAgentProfile(proto)
		expect(back.reportsTo).toBeNull()
		expect(back.providerId).toBeNull()
		expect(back.modelId).toBeNull()
		expect(back.reasoningEffort).toBeNull()
		expect(back.supportsImages).toBeNull()
		expect(back.contextWindow).toBeNull()
		expect(back.maxOutputTokens).toBeNull()
		expect(back.rules).toEqual([])
		expect(back.skills).toEqual([])
	})
})
