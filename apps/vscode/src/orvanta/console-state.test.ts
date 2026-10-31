import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaConsoleStateSnapshot, OrvantaSendAgentDirectMessageRequest } from "@shared/proto/cline/orvanta"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Controller } from "@/core/controller"
import { sendAgentDirectMessage } from "@/core/controller/orvanta/sendAgentDirectMessage"
import { subscribeConsoleState } from "@/core/controller/orvanta/subscribeConsoleState"
import { globalWarRoomTracker } from "./war-room-tracker"

describe("Console State & Direct Steering Handlers (Orvanta v0.0.4)", () => {
	beforeEach(() => {
		globalWarRoomTracker.reset()
	})

	it("subscribeConsoleState streams snapshot with #team-feed and roster channels", async () => {
		globalWarRoomTracker.syncRoster([
			{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
			{ id: "implementer", displayName: "Dave", role: "implementer", status: "idle" },
		])

		const snapshots: OrvantaConsoleStateSnapshot[] = []
		const responseStream = async (snapshot: OrvantaConsoleStateSnapshot) => {
			snapshots.push(snapshot)
		}

		const mockController = {} as unknown as Controller
		await subscribeConsoleState(mockController, EmptyRequest.create(), responseStream)

		expect(snapshots.length).toBeGreaterThan(0)
		const latest = snapshots[snapshots.length - 1]
		expect(latest.activeChannelId).toBe("team-feed")
		expect(latest.channels.length).toBe(3) // #team-feed + coordinator + implementer

		const teamFeed = latest.channels[0]
		expect(teamFeed.id).toBe("team-feed")
		expect(teamFeed.isChannel).toBe(true)

		const dave = latest.channels.find((c) => c.id === "implementer")
		expect(dave).toBeDefined()
		expect(dave?.name).toBe("Dave")
		expect(dave?.role).toBe("implementer")
	})

	it("sendAgentDirectMessage steers coordinator via controller.task.handleWebviewAskResponse", async () => {
		const handleAskResponse = vi.fn(async () => {})
		const mockController = {
			task: {
				handleWebviewAskResponse: handleAskResponse,
			},
		} as unknown as Controller

		const req = OrvantaSendAgentDirectMessageRequest.create({
			agentId: "coordinator",
			message: "Focus on task 3 first",
		})

		const response = await sendAgentDirectMessage(mockController, req)
		expect(response.success).toBe(true)
		expect(handleAskResponse).toHaveBeenCalledWith("messageResponse", "Focus on task 3 first")
	})

	it("sendAgentDirectMessage steers teammate and records into war-room transcript", async () => {
		globalWarRoomTracker.syncRoster([{ id: "implementer", displayName: "Dave", role: "implementer", status: "idle" }])

		const mockController = {} as unknown as Controller
		const req = OrvantaSendAgentDirectMessageRequest.create({
			agentId: "implementer",
			subject: "Urgent fix",
			message: "Please write unit tests before submitting handoff",
		})

		const response = await sendAgentDirectMessage(mockController, req)
		expect(response.success).toBe(true)

		const transcript = globalWarRoomTracker.getAgentTranscript("implementer")
		expect(transcript.length).toBeGreaterThan(0)
		expect(transcript[0].text).toContain("[CEO ➜ @Dave] (Urgent fix): Please write unit tests before submitting handoff")
	})
})
