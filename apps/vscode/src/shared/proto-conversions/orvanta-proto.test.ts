import { describe, expect, it } from "bun:test"
import {
	OrvantaChannelItem,
	OrvantaConsoleStateSnapshot,
	OrvantaSendAgentDirectMessageRequest,
	OrvantaSendAgentDirectMessageResponse,
} from "@shared/proto/cline/orvanta"

describe("Orvanta v0.0.4 Proto contracts", () => {
	it("encodes and decodes OrvantaChannelItem", () => {
		const item = OrvantaChannelItem.create({
			id: "implementer",
			name: "Dave",
			role: "implementer",
			status: "running",
			isChannel: false,
			isEphemeral: false,
			unreadCount: 3,
			runningElapsed: 120,
			currentTask: "Implement login",
		})

		const json = OrvantaChannelItem.toJSON(item)
		const decoded = OrvantaChannelItem.fromJSON(json)
		expect(decoded.id).toBe("implementer")
		expect(decoded.name).toBe("Dave")
		expect(decoded.role).toBe("implementer")
		expect(decoded.status).toBe("running")
		expect(decoded.isChannel).toBe(false)
		expect(decoded.unreadCount).toBe(3)
		expect(decoded.runningElapsed).toBe(120)
		expect(decoded.currentTask).toBe("Implement login")
	})

	it("encodes and decodes OrvantaConsoleStateSnapshot", () => {
		const snapshot = OrvantaConsoleStateSnapshot.create({
			activeChannelId: "team-feed",
			channels: [
				{
					id: "team-feed",
					name: "#team-feed",
					role: "channel",
					status: "idle",
					isChannel: true,
					isEphemeral: false,
					unreadCount: 0,
					runningElapsed: 0,
					currentTask: "",
				},
			],
			isSidebarCollapsed: true,
		})

		const json = OrvantaConsoleStateSnapshot.toJSON(snapshot)
		const decoded = OrvantaConsoleStateSnapshot.fromJSON(json)
		expect(decoded.activeChannelId).toBe("team-feed")
		expect(decoded.channels.length).toBe(1)
		expect(decoded.channels[0].name).toBe("#team-feed")
		expect(decoded.isSidebarCollapsed).toBe(true)
	})

	it("encodes and decodes direct message request/response", () => {
		const req = OrvantaSendAgentDirectMessageRequest.create({
			agentId: "implementer",
			message: "Please focus on unit tests",
			subject: "Directive",
		})
		const reqJson = OrvantaSendAgentDirectMessageRequest.toJSON(req)
		const reqDecoded = OrvantaSendAgentDirectMessageRequest.fromJSON(reqJson)
		expect(reqDecoded.agentId).toBe("implementer")
		expect(reqDecoded.message).toBe("Please focus on unit tests")
		expect(reqDecoded.subject).toBe("Directive")

		const res = OrvantaSendAgentDirectMessageResponse.create({
			success: true,
		})
		const resJson = OrvantaSendAgentDirectMessageResponse.toJSON(res)
		const resDecoded = OrvantaSendAgentDirectMessageResponse.fromJSON(resJson)
		expect(resDecoded.success).toBe(true)
	})
})
