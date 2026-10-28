import { beforeEach, describe, expect, it } from "bun:test"
import type { CoreSessionEvent } from "@cline/core"
import { globalWarRoomTracker } from "@/orvanta/war-room-tracker"
import { MessageTranslatorState, translateSessionEvent } from "./message-translator"

describe("message-translator agent attribution (Orvanta v0.0.4)", () => {
	let state: MessageTranslatorState

	beforeEach(() => {
		state = new MessageTranslatorState()
		globalWarRoomTracker.reset()
	})

	it("stamps agent_id, agent_display_name, and agent_role when agentId is present in metadata", () => {
		const event: CoreSessionEvent = {
			type: "agent_event",
			payload: {
				sessionId: "sess-1",
				event: {
					type: "content_start",
					contentType: "text",
					text: "Implementing feature X...",
					agentId: "implementer",
				} as any,
			},
		}

		const result = translateSessionEvent(event, state)
		expect(result.messages.length).toBeGreaterThan(0)
		const msg = result.messages[0]
		expect(msg.agentId).toBe("implementer")
		expect(msg.agent_id).toBe("implementer")
		expect(msg.agentDisplayName).toBe("Dave")
		expect(msg.agent_display_name).toBe("Dave")
		expect(msg.agentRole).toBe("implementer")
		expect(msg.agent_role).toBe("implementer")
	})

	it("uses roster card displayName and role from globalWarRoomTracker", () => {
		globalWarRoomTracker.syncRoster([{ id: "custom-bot", displayName: "Alice Analyzer", role: "auditor", status: "idle" }])

		const event: CoreSessionEvent = {
			type: "agent_event",
			payload: {
				sessionId: "sess-1",
				event: {
					type: "content_start",
					contentType: "text",
					text: "Audit in progress...",
					agentId: "custom-bot",
				} as any,
			},
		}

		const result = translateSessionEvent(event, state)
		expect(result.messages.length).toBeGreaterThan(0)
		const msg = result.messages[0]
		expect(msg.agentId).toBe("custom-bot")
		expect(msg.agentDisplayName).toBe("Alice Analyzer")
		expect(msg.agentRole).toBe("auditor")
	})

	it("extracts teamAgentId and teamRole from payload if not on agentEvent", () => {
		const event: CoreSessionEvent = {
			type: "agent_event",
			payload: {
				sessionId: "sess-1",
				teamAgentId: "reviewer",
				teamRole: "teammate",
				event: {
					type: "content_start",
					contentType: "text",
					text: "Review complete, looks good.",
				} as any,
			},
		}

		const result = translateSessionEvent(event, state)
		expect(result.messages.length).toBeGreaterThan(0)
		const msg = result.messages[0]
		expect(msg.agentId).toBe("reviewer")
		expect(msg.agentDisplayName).toBe("Reviewer")
		expect(msg.agentRole).toBe("reviewer")
	})

	it("propagates active agent attribution to streaming content_end events", () => {
		// content_start has agentId
		const startEvent: CoreSessionEvent = {
			type: "agent_event",
			payload: {
				sessionId: "sess-1",
				event: {
					type: "content_start",
					contentType: "text",
					text: "Start chunk",
					agentId: "implementer",
				} as any,
			},
		}
		translateSessionEvent(startEvent, state)

		// content_end without agentId repeats the active agent attribution
		const endEvent: CoreSessionEvent = {
			type: "agent_event",
			payload: {
				sessionId: "sess-1",
				event: {
					type: "content_end",
					contentType: "text",
					text: "Start chunk final",
				} as any,
			},
		}
		const endResult = translateSessionEvent(endEvent, state)
		expect(endResult.messages.length).toBeGreaterThan(0)
		const msg = endResult.messages[0]
		expect(msg.agentId).toBe("implementer")
		expect(msg.agentDisplayName).toBe("Dave")
	})
})
