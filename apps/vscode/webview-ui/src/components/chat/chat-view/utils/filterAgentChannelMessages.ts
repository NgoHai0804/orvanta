import type { ClineMessage } from "@shared/ExtensionMessage"

export const COORDINATION_TOOL_NAMES = new Set(["team_run_task", "orvanta_submit_handoff", "team_send_message"])

export type CoordinationCardKind = "assign" | "report"

export interface CoordinationToolInfo {
	tool: string
	senderId: string
	recipientId: string
	kind: CoordinationCardKind
	hasContent: boolean
}

function agentIdOf(message: ClineMessage): string | undefined {
	return message.agentId ?? message.agent_id
}

export function isCoordinatorChannel(agentId?: string | null): boolean {
	return canonicalAgentId(agentId) === "coordinator"
}

/** Map lead/parent/mailbox-style ids (e.g. 1793273682195_h9itp) to coordinator. */
export function canonicalAgentId(agentId?: string | null): string {
	if (!agentId || !agentId.trim()) {
		return ""
	}
	const trimmed = agentId.trim()
	const lower = trimmed.toLowerCase()
	if (
		lower === "coordinator" ||
		lower === "lead" ||
		lower === "parent" ||
		lower === "system" ||
		lower === "agent" ||
		/^\d/.test(trimmed)
	) {
		return "coordinator"
	}
	return lower
}

export function agentIdsEqual(a?: string | null, b?: string | null): boolean {
	if (!a || !b) {
		return false
	}
	return canonicalAgentId(a) === canonicalAgentId(b)
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key]
	return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function parseCoordinationToolMessage(message: ClineMessage): CoordinationToolInfo | undefined {
	if (message.say !== "tool" && message.ask !== "tool") {
		return undefined
	}
	let outer: { tool?: string; content?: unknown }
	try {
		outer = JSON.parse(message.text || "{}") as { tool?: string; content?: unknown }
	} catch {
		return undefined
	}
	if (!outer.tool || !COORDINATION_TOOL_NAMES.has(outer.tool)) {
		return undefined
	}

	let payload: Record<string, unknown> = {}
	if (typeof outer.content === "string") {
		try {
			payload = asRecord(JSON.parse(outer.content))
		} catch {
			payload = {}
		}
	} else {
		payload = asRecord(outer.content)
	}

	const senderId =
		canonicalAgentId(stringField(payload, "fromAgentId") || stringField(payload, "from") || agentIdOf(message)) ||
		"coordinator"

	const explicitRecipient =
		stringField(payload, "toAgentId") ||
		stringField(payload, "assignee") ||
		stringField(payload, "to") ||
		stringField(payload, "recipient") ||
		(outer.tool === "team_run_task" ? stringField(payload, "agentId") : undefined)

	const fallbackRecipient =
		outer.tool === "orvanta_submit_handoff" || (outer.tool === "team_send_message" && senderId !== "coordinator")
			? "coordinator"
			: ""
	const resolvedRecipient = canonicalAgentId(explicitRecipient || fallbackRecipient)

	const hasContent = Boolean(
		stringField(payload, "task") ||
			stringField(payload, "instruction") ||
			stringField(payload, "description") ||
			stringField(payload, "prompt") ||
			stringField(payload, "summary") ||
			stringField(payload, "body") ||
			stringField(payload, "content") ||
			stringField(payload, "subject") ||
			stringField(payload, "message") ||
			stringField(payload, "title") ||
			stringField(payload, "taskTitle") ||
			stringField(payload, "taskId"),
	)

	return {
		tool: outer.tool,
		senderId,
		recipientId: resolvedRecipient,
		kind: getCoordinationCardKind(outer.tool, senderId, resolvedRecipient),
		hasContent,
	}
}

export function getCoordinationCardKind(tool: string, senderId: string, recipientId: string): CoordinationCardKind {
	if (tool === "team_run_task") {
		return "assign"
	}
	if (tool === "orvanta_submit_handoff") {
		return "report"
	}
	if (isCoordinatorChannel(senderId) && !isCoordinatorChannel(recipientId)) {
		return "assign"
	}
	return "report"
}

const HIDDEN_TEAM_TOOL_PREFIX = "team_"

export function isNonVisualToolMessage(message: ClineMessage): boolean {
	if (message.say !== "tool" && message.ask !== "tool") {
		return false
	}
	let toolName = ""
	try {
		toolName = String((JSON.parse(message.text || "{}") as { tool?: string }).tool || "")
	} catch {
		return false
	}
	if (!toolName) {
		return true
	}
	const coordination = parseCoordinationToolMessage(message)
	if (coordination) {
		return !coordination.hasContent || !coordination.recipientId || coordination.recipientId.toLowerCase() === "agent"
	}
	return toolName.startsWith(HIDDEN_TEAM_TOOL_PREFIX)
}

export function coordinationToolInvolvesAgent(info: CoordinationToolInfo, selectedAgentId: string): boolean {
	if (agentIdsEqual(info.senderId, selectedAgentId) || agentIdsEqual(info.recipientId, selectedAgentId)) {
		return true
	}
	if (!isCoordinatorChannel(selectedAgentId)) {
		return false
	}
	return (
		info.tool === "team_run_task" ||
		info.tool === "orvanta_submit_handoff" ||
		(info.kind === "report" && isCoordinatorChannel(info.recipientId))
	)
}

export function isStickyAnchorMessage(message: ClineMessage): boolean {
	if (message.say === "user_feedback") {
		return true
	}
	const coordination = parseCoordinationToolMessage(message)
	return coordination?.kind === "assign"
}

export function filterMessagesForAgentChannel(messages: ClineMessage[], selectedAgentId?: string): ClineMessage[] {
	if (!selectedAgentId || selectedAgentId === "team-feed") {
		return messages
	}

	const coordinatorChannel = isCoordinatorChannel(selectedAgentId)
	const filtered = messages.filter((message) => {
		const coordination = parseCoordinationToolMessage(message)
		if (coordination) {
			return coordinationToolInvolvesAgent(coordination, selectedAgentId)
		}
		if (coordinatorChannel) {
			const messageAgentId = agentIdOf(message)
			return !messageAgentId || isCoordinatorChannel(messageAgentId) || message.say === "task" || message.type === "ask"
		}
		return agentIdsEqual(agentIdOf(message), selectedAgentId)
	})

	if (coordinatorChannel) {
		return filtered
	}

	const initialTask = messages.find((message) => message.say === "task")
	if (initialTask && !filtered.includes(initialTask)) {
		return [initialTask, ...filtered]
	}
	return filtered
}
