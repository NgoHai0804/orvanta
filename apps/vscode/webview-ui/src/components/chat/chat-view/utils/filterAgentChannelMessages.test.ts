import type { ClineMessage } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import {
	filterMessagesForAgentChannel,
	getCoordinationCardKind,
	isNonVisualToolMessage,
	isStickyAnchorMessage,
	parseCoordinationToolMessage,
} from "./filterAgentChannelMessages"

function toolMessage(params: { ts: number; tool: string; payload: Record<string, unknown>; agentId?: string }): ClineMessage {
	return {
		ts: params.ts,
		type: "say",
		say: "tool",
		agentId: params.agentId,
		text: JSON.stringify({
			tool: params.tool,
			content: JSON.stringify(params.payload),
		}),
	}
}

const task: ClineMessage = { ts: 1, type: "say", say: "task", text: "CEO request" }
const coordinatorText: ClineMessage = {
	ts: 2,
	type: "say",
	say: "text",
	agentId: "coordinator",
	text: "I'll assign this",
}
const assignment = toolMessage({
	ts: 3,
	tool: "team_run_task",
	agentId: "coordinator",
	payload: { agentId: "coder", task: "Write login", taskId: "t-1" },
})
const coderText: ClineMessage = {
	ts: 4,
	type: "say",
	say: "text",
	agentId: "coder",
	text: "Working on login",
}
const handoff = toolMessage({
	ts: 5,
	tool: "orvanta_submit_handoff",
	agentId: "coder",
	payload: { taskId: "t-1", content: "Login done", summary: "Báo cáo hoàn tất" },
})
const sendToReviewer = toolMessage({
	ts: 6,
	tool: "team_send_message",
	agentId: "coder",
	payload: { toAgentId: "reviewer", message: "Please review login.ts" },
})
const reviewerText: ClineMessage = {
	ts: 7,
	type: "say",
	say: "text",
	agentId: "reviewer",
	text: "Reviewing",
}

const transcript = [task, coordinatorText, assignment, coderText, handoff, sendToReviewer, reviewerText]

describe("parseCoordinationToolMessage", () => {
	it("reads nested JSON content for team_run_task", () => {
		expect(parseCoordinationToolMessage(assignment)).toEqual({
			tool: "team_run_task",
			senderId: "coordinator",
			recipientId: "coder",
			kind: "assign",
			hasContent: true,
		})
	})

	it("defaults handoff recipient to coordinator", () => {
		expect(parseCoordinationToolMessage(handoff)).toEqual({
			tool: "orvanta_submit_handoff",
			senderId: "coder",
			recipientId: "coordinator",
			kind: "report",
			hasContent: true,
		})
	})
})

describe("getCoordinationCardKind", () => {
	it("keeps team_run_task as assignment even when the prompt mentions báo cáo", () => {
		expect(getCoordinationCardKind("team_run_task", "coordinator", "coder")).toBe("assign")
	})

	it("treats teammate send-message as a report, never a chat message", () => {
		expect(getCoordinationCardKind("team_send_message", "reviewer", "coordinator")).toBe("report")
		expect(getCoordinationCardKind("team_send_message", "coder", "reviewer")).toBe("report")
	})
})

describe("filterMessagesForAgentChannel", () => {
	it("shows assignment cards on both Coordinator and the assigned agent", () => {
		const coordinatorView = filterMessagesForAgentChannel(transcript, "coordinator")
		const coderView = filterMessagesForAgentChannel(transcript, "coder")
		const reviewerView = filterMessagesForAgentChannel(transcript, "reviewer")

		expect(coordinatorView).toContain(assignment)
		expect(coderView).toContain(assignment)
		expect(reviewerView).not.toContain(assignment)
	})

	it("shows reports on the sender and the receiving agent", () => {
		const coordinatorView = filterMessagesForAgentChannel(transcript, "coordinator")
		const coderView = filterMessagesForAgentChannel(transcript, "coder")
		const reviewerView = filterMessagesForAgentChannel(transcript, "reviewer")

		expect(coordinatorView).toContain(handoff)
		expect(coderView).toContain(handoff)
		expect(reviewerView).not.toContain(handoff)
	})

	it("shows send-message cards on the sender and the recipient", () => {
		const coordinatorView = filterMessagesForAgentChannel(transcript, "coordinator")
		const coderView = filterMessagesForAgentChannel(transcript, "coder")
		const reviewerView = filterMessagesForAgentChannel(transcript, "reviewer")

		expect(coderView).toContain(sendToReviewer)
		expect(reviewerView).toContain(sendToReviewer)
		expect(coordinatorView).not.toContain(sendToReviewer)
	})

	it("shows teammate reports on Coordinator, including mailbox-id send-message", () => {
		const reviewerReport = toolMessage({
			ts: 9,
			tool: "team_send_message",
			agentId: "reviewer",
			payload: { toAgentId: "coordinator", subject: "PASS", body: "[REVIEW REPORT] PASS", taskId: "task_0002" },
		})
		const coderMailboxReport = toolMessage({
			ts: 11,
			tool: "team_send_message",
			agentId: "coder",
			payload: {
				toAgentId: "1793273682195_h9itp",
				subject: "Handoff task_0001",
				body: "Bàn giao hello.txt",
				taskId: "task_0001",
			},
		})
		const coordinatorView = filterMessagesForAgentChannel(
			[assignment, handoff, reviewerReport, coderMailboxReport],
			"coordinator",
		)
		expect(coordinatorView).toContain(assignment)
		expect(coordinatorView).toContain(handoff)
		expect(coordinatorView).toContain(reviewerReport)
		expect(coordinatorView).toContain(coderMailboxReport)
		expect(parseCoordinationToolMessage(reviewerReport)?.kind).toBe("report")
		expect(parseCoordinationToolMessage(coderMailboxReport)).toMatchObject({
			recipientId: "coordinator",
			kind: "report",
		})
	})

	it("pins user messages and assignment cards, not reports", () => {
		expect(isStickyAnchorMessage({ ts: 1, type: "say", say: "user_feedback", text: "hello" })).toBe(true)
		expect(isStickyAnchorMessage(assignment)).toBe(true)
		expect(isStickyAnchorMessage(handoff)).toBe(false)
		expect(isStickyAnchorMessage(coderText)).toBe(false)
	})

	it("hides internal team tools that have no card UI", () => {
		const awaitRuns = toolMessage({
			ts: 10,
			tool: "team_await_runs",
			agentId: "coordinator",
			payload: { runId: "run-1" },
		})
		expect(isNonVisualToolMessage(awaitRuns)).toBe(true)
	})

	it("keeps teammate work out of the Coordinator channel", () => {
		const coordinatorView = filterMessagesForAgentChannel(transcript, "coordinator")
		expect(coordinatorView).not.toContain(coderText)
		expect(coordinatorView).not.toContain(reviewerText)
		expect(coordinatorView).toContain(coordinatorText)
	})

	it("still shows a mis-attributed assignment on Coordinator", () => {
		const misattributed = toolMessage({
			ts: 8,
			tool: "team_run_task",
			agentId: "coder",
			payload: { agentId: "coder", task: "Write login" },
		})
		expect(filterMessagesForAgentChannel([misattributed], "coordinator")).toEqual([misattributed])
		expect(filterMessagesForAgentChannel([misattributed], "coder")).toEqual([misattributed])
		expect(filterMessagesForAgentChannel([misattributed], "reviewer")).toEqual([])
	})
})
