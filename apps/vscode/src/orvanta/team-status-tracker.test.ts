import { TeamMessageType } from "@cline/shared"
import { describe, expect, it } from "vitest"
import { TeamStatusTracker } from "./team-status-tracker"

describe("TeamStatusTracker", () => {
	it("sets agent running and notifies listeners", () => {
		const tracker = new TeamStatusTracker()
		let notified = 0
		tracker.subscribeRunningChange(() => {
			notified++
		})

		expect(tracker.isAgentRunning("implementer")).toBe(false)
		tracker.setAgentRunning("implementer", true)
		expect(tracker.isAgentRunning("implementer")).toBe(true)
		expect(tracker.getRunningAgentIds()).toEqual(["implementer"])
		expect(notified).toBe(1)

		// Duplicate set does not re-notify
		tracker.setAgentRunning("implementer", true)
		expect(notified).toBe(1)

		tracker.setAgentRunning("implementer", false)
		expect(tracker.isAgentRunning("implementer")).toBe(false)
		expect(tracker.getRunningAgentIds()).toEqual([])
		expect(notified).toBe(2)
	})

	it("handles TeamMessageType events correctly", () => {
		const tracker = new TeamStatusTracker()

		tracker.handleTeamEvent({
			type: TeamMessageType.RunStarted,
			run: { id: "run-1", agentId: "reviewer" } as any,
		})
		expect(tracker.isAgentRunning("reviewer")).toBe(true)

		tracker.handleTeamEvent({
			type: TeamMessageType.RunCompleted,
			run: { id: "run-1", agentId: "reviewer" } as any,
		})
		expect(tracker.isAgentRunning("reviewer")).toBe(false)

		tracker.handleTeamEvent({
			type: TeamMessageType.RunStarted,
			run: { id: "run-2", agentId: "implementer" } as any,
		})
		expect(tracker.isAgentRunning("implementer")).toBe(true)

		tracker.handleTeamEvent({
			type: TeamMessageType.RunFailed,
			run: { id: "run-2", agentId: "implementer" } as any,
		})
		expect(tracker.isAgentRunning("implementer")).toBe(false)
	})
})
