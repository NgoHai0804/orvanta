import { beforeEach, describe, expect, it } from "bun:test"
import { TeamMessageType } from "@cline/shared"
import { WarRoomTracker } from "./war-room-tracker"

describe("WarRoomTracker", () => {
	let tracker
	beforeEach(() => {
		tracker = new WarRoomTracker()
	})
	it("syncRoster seeds cards from agents", () => {
		tracker.syncRoster([
			{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
			{ id: "implementer", displayName: "Coder", role: "teammate", status: "idle" },
		])
		const snap = tracker.getSnapshot()
		expect(snap).toHaveLength(2)
		expect(snap.find((c) => c.id === "coordinator")?.displayName).toBe("Coordinator")
	})
	it("RunStarted sets status running and clears buffer", () => {
		tracker.syncRoster([{ id: "coder", displayName: "Coder", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({
			type: TeamMessageType.RunStarted,
			run: { agentId: "coder", taskTitle: "Build feature" },
		})
		const card = tracker.getSnapshot().find((c) => c.id === "coder")
		expect(card.status).toBe("running")
		expect(card.buffer).toHaveLength(0)
	})
	it("RunProgress appends to buffer (max 20 lines)", () => {
		tracker.syncRoster([{ id: "coder", displayName: "Coder", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "coder" } })
		for (let i = 0; i < 25; i++) {
			tracker.handleTeamEvent({ type: TeamMessageType.RunProgress, run: { agentId: "coder" }, message: `step ${i}` })
		}
		const card = tracker.getSnapshot().find((c) => c.id === "coder")
		expect(card.buffer).toHaveLength(20)
		expect(card.buffer[0].text).toBe("step 5")
	})
	it("RunCompleted sets status completed; RunFailed sets failed with error line", () => {
		tracker.syncRoster([{ id: "rev", displayName: "Rev", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "rev" } })
		tracker.handleTeamEvent({ type: TeamMessageType.RunCompleted, run: { agentId: "rev" } })
		expect(tracker.getSnapshot().find((c) => c.id === "rev")?.status).toBe("completed")
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "rev" } })
		tracker.handleTeamEvent({ type: TeamMessageType.RunFailed, run: { agentId: "rev", error: "Out of memory" } })
		const card = tracker.getSnapshot().find((c) => c.id === "rev")
		expect(card.status).toBe("failed")
		expect(card.buffer.some((l) => l.kind === "error")).toBe(true)
	})
	it("RunCancelled and RunInterrupted update status correctly", () => {
		tracker.syncRoster([{ id: "a", displayName: "A", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "a" } })
		tracker.handleTeamEvent({ type: TeamMessageType.RunCancelled, run: { agentId: "a" } })
		expect(tracker.getSnapshot().find((c) => c.id === "a")?.status).toBe("cancelled")
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "a" } })
		tracker.handleTeamEvent({ type: TeamMessageType.RunInterrupted, run: { agentId: "a" } })
		expect(tracker.getSnapshot().find((c) => c.id === "a")?.status).toBe("interrupted")
	})
	it("notifies listeners on state change", () => {
		let count = 0
		tracker.subscribeChange(() => {
			count++
		})
		tracker.syncRoster([{ id: "x", displayName: "X", role: "teammate", status: "idle" }])
		expect(count).toBeGreaterThan(0)
		const before = count
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "x" } })
		expect(count).toBeGreaterThan(before)
	})
	it("unsubscribe stops notifications", () => {
		let count = 0
		const unsub = tracker.subscribeChange(() => {
			count++
		})
		tracker.syncRoster([{ id: "y", displayName: "Y", role: "teammate", status: "idle" }])
		const after = count
		unsub()
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "y" } })
		expect(count).toBe(after)
	})
	it("reset clears all cards and notifies", () => {
		tracker.syncRoster([{ id: "z", displayName: "Z", role: "teammate", status: "idle" }])
		let count = 0
		tracker.subscribeChange(() => {
			count++
		})
		tracker.reset()
		expect(tracker.getSnapshot()).toHaveLength(0)
		expect(count).toBeGreaterThan(0)
	})
	it("AgentEvent content_start streams text into buffer lines", () => {
		tracker.syncRoster([{ id: "coder", displayName: "Coder", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "coder" } })
		tracker.handleTeamEvent({
			type: TeamMessageType.AgentEvent,
			agentId: "coder",
			event: { type: "content_start", contentType: "text", text: "Hello " },
		})
		tracker.handleTeamEvent({
			type: TeamMessageType.AgentEvent,
			agentId: "coder",
			event: { type: "content_start", contentType: "text", text: "world!\nNext line" },
		})
		const card = tracker.getSnapshot().find((c) => c.id === "coder")
		expect(card.buffer).toHaveLength(2)
		expect(card.buffer[0].text).toBe("Hello world!")
		expect(card.buffer[1].text).toBe("Next line")
	})
	it("AgentEvent content_start reasoning streams think lines", () => {
		tracker.syncRoster([{ id: "thinker", displayName: "Thinker", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "thinker" } })
		tracker.handleTeamEvent({
			type: TeamMessageType.AgentEvent,
			agentId: "thinker",
			event: { type: "content_start", contentType: "reasoning", reasoning: "analyzing code" },
		})
		const card = tracker.getSnapshot().find((c) => c.id === "thinker")
		expect(card.buffer[0].kind).toBe("think")
		expect(card.buffer[0].text).toContain("think: analyzing code")
	})
	it("AgentEvent usage updates inputTokens, outputTokens, cost", () => {
		tracker.syncRoster([{ id: "acc", displayName: "Acc", role: "teammate", status: "idle" }])
		tracker.handleTeamEvent({ type: TeamMessageType.RunStarted, run: { agentId: "acc" } })
		tracker.handleTeamEvent({
			type: TeamMessageType.AgentEvent,
			agentId: "acc",
			event: {
				type: "usage",
				totalInputTokens: 1250,
				totalOutputTokens: 350,
				totalCost: 0.0042,
			},
		})
		const card = tracker.getSnapshot().find((c) => c.id === "acc")
		expect(card.inputTokens).toBe(1250)
		expect(card.outputTokens).toBe(350)
		expect(card.cost).toBeCloseTo(0.0042)
	})
})
//# sourceMappingURL=war-room-tracker.test.js.map
