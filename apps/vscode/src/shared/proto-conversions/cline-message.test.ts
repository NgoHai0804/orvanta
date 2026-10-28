import { describe, expect, it } from "bun:test"
import { ClineMessage as AppClineMessage } from "@shared/ExtensionMessage"
import { convertClineMessageToProto, convertProtoToClineMessage } from "./cline-message"

describe("cline-message proto conversion with agent attribution (v0.0.4)", () => {
	it("converts AppClineMessage with agent attribution to proto and back", () => {
		const original: AppClineMessage = {
			ts: 1714000000000,
			type: "say",
			say: "text",
			text: "Hello from Dave",
			agentId: "implementer",
			agentDisplayName: "Dave",
			agentRole: "implementer",
		}

		const proto = convertClineMessageToProto(original)
		expect(proto.agentId).toBe("implementer")
		expect(proto.agentDisplayName).toBe("Dave")
		expect(proto.agentRole).toBe("implementer")

		const roundTripped = convertProtoToClineMessage(proto)
		expect(roundTripped.agentId).toBe("implementer")
		expect(roundTripped.agentDisplayName).toBe("Dave")
		expect(roundTripped.agentRole).toBe("implementer")
		expect(roundTripped.agent_id).toBe("implementer")
		expect(roundTripped.agent_display_name).toBe("Dave")
		expect(roundTripped.agent_role).toBe("implementer")
	})

	it("supports snake_case fields on AppClineMessage when converting to proto", () => {
		const original: AppClineMessage = {
			ts: 1714000000001,
			type: "say",
			say: "text",
			text: "Working on task",
			agent_id: "reviewer",
			agent_display_name: "Sherlock",
			agent_role: "reviewer",
		}

		const proto = convertClineMessageToProto(original)
		expect(proto.agentId).toBe("reviewer")
		expect(proto.agentDisplayName).toBe("Sherlock")
		expect(proto.agentRole).toBe("reviewer")
	})
})
