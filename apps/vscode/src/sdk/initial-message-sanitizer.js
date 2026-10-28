function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}
function toBlocks(content) {
	if (Array.isArray(content)) {
		return content.filter(isRecord)
	}
	if (typeof content === "string") {
		return [{ type: "text", text: content }]
	}
	return []
}
function getToolUses(content) {
	if (!Array.isArray(content)) {
		return []
	}
	const toolUses = []
	for (const block of content) {
		if (!isRecord(block)) {
			continue
		}
		if (block.type === "tool_use" && typeof block.id === "string") {
			toolUses.push({
				id: block.id,
				name: typeof block.name === "string" && block.name.length > 0 ? block.name : undefined,
			})
		}
	}
	return toolUses
}
function isToolResultForId(block, toolUseId) {
	return block.type === "tool_result" && block.tool_use_id === toolUseId
}
const MIGRATION_MISSING_TOOL_RESULT_TEXT = "[migration] Tool result missing in legacy conversation history."
function createMissingToolResult(toolUseId, toolName) {
	return {
		type: "tool_result",
		tool_use_id: toolUseId,
		...(toolName ? { name: toolName } : {}),
		content: MIGRATION_MISSING_TOOL_RESULT_TEXT,
	}
}
function withToolResultName(block, toolName) {
	if (!toolName || typeof block.name === "string") {
		return block
	}
	return { ...block, name: toolName }
}
function isMigrationPlaceholderToolResult(block) {
	return block.type === "tool_result" && block.content === MIGRATION_MISSING_TOOL_RESULT_TEXT
}
export function sanitizeInitialMessagesForSessionStart(messages) {
	if (messages.length === 0) {
		return messages
	}
	const sanitized = [...messages]
	let changed = false
	for (let i = 0; i < sanitized.length; i++) {
		const assistantMessage = sanitized[i]
		if (!isRecord(assistantMessage) || assistantMessage.role !== "assistant") {
			continue
		}
		const toolUses = getToolUses(assistantMessage.content)
		if (toolUses.length === 0) {
			continue
		}
		const toolUseIds = toolUses.map((toolUse) => toolUse.id)
		const toolUseNames = new Map(toolUses.map((toolUse) => [toolUse.id, toolUse.name]))
		const next = sanitized[i + 1]
		if (!isRecord(next) || next.role !== "user") {
			// Insert a synthetic user message with placeholder tool results so
			// the message stream remains valid for SDK parsing.
			sanitized.splice(i + 1, 0, {
				role: "user",
				content: toolUses.map((toolUse) => createMissingToolResult(toolUse.id, toolUse.name)),
			})
			changed = true
			i += 1
			continue
		}
		// Collect tool_result blocks from ALL consecutive user messages after
		// the assistant.  The SDK persists each parallel tool result as a
		// separate user message, so we must scan beyond just `i + 1`.
		const toolUseIdSet = new Set(toolUseIds)
		const matchingToolResults = new Map()
		const otherBlocks = []
		let userSpan = 0 // how many consecutive user messages we consumed
		for (let j = i + 1; j < sanitized.length; j++) {
			const msg = sanitized[j]
			if (!isRecord(msg) || msg.role !== "user") {
				break
			}
			const blocks = toBlocks(msg.content)
			for (const block of blocks) {
				let matched = false
				for (const toolUseId of toolUseIds) {
					if (!matchingToolResults.has(toolUseId) && isToolResultForId(block, toolUseId)) {
						matchingToolResults.set(toolUseId, withToolResultName(block, toolUseNames.get(toolUseId)))
						matched = true
						break
					}
				}
				if (!matched) {
					// Keep non-matching tool_results (for other tool_use IDs)
					// and any non-tool content.
					if (
						block.type === "tool_result" &&
						typeof block.tool_use_id === "string" &&
						toolUseIdSet.has(block.tool_use_id)
					) {
						// Duplicate tool_result for an ID we already matched — skip it
					} else {
						otherBlocks.push(block)
					}
				}
			}
			userSpan++
		}
		const missingToolResultIds = toolUseIds.filter((toolUseId) => !matchingToolResults.has(toolUseId))
		const orderedToolResults = toolUseIds.map(
			(toolUseId) => matchingToolResults.get(toolUseId) ?? createMissingToolResult(toolUseId, toolUseNames.get(toolUseId)),
		)
		// If we had to synthesize missing tool_result blocks (or are carrying the
		// migration placeholder from a previous resume attempt), keep the immediate
		// response message strictly tool_result-only for maximum provider compatibility.
		// Move any existing non-tool-result content into a follow-up user message.
		const hasMigrationPlaceholder = orderedToolResults.some(isMigrationPlaceholderToolResult)
		if (missingToolResultIds.length > 0 || hasMigrationPlaceholder || userSpan > 1) {
			// Replace the span of user messages with a single consolidated message
			sanitized.splice(i + 1, userSpan, {
				...next,
				content: orderedToolResults,
			})
			if (otherBlocks.length > 0) {
				sanitized.splice(i + 2, 0, {
					role: "user",
					content: otherBlocks,
				})
				i += 1
			}
			changed = true
			continue
		}
		const newContent = [...orderedToolResults, ...otherBlocks]
		const originalBlocks = toBlocks(next.content)
		const differsInLength = newContent.length !== originalBlocks.length
		const differsInOrder = !differsInLength && newContent.some((block, index) => block !== originalBlocks[index])
		if (differsInLength || differsInOrder) {
			sanitized[i + 1] = {
				...next,
				content: newContent,
			}
			changed = true
		}
	}
	return changed ? sanitized : messages
}
//# sourceMappingURL=initial-message-sanitizer.js.map
