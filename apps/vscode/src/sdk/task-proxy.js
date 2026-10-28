// Replaces classic src/core/task/index.ts task object (see origin/main)
//
// When handlers call controller.task.handleWebviewAskResponse(), controller.task.ulid,
// controller.task.abortTask(), etc., this proxy delegates to the SdkController's
// session methods. This allows existing gRPC handlers to work without modification.
//
// Not all classic Task methods are implemented here — only those called by
// the gRPC handler modules in src/core/controller/. Missing methods log a warning
// and return safe defaults.
import { EventEmitter } from "node:events"
import { Logger } from "@shared/services/Logger"
/**
 * Message state handler that accumulates ClineMessages and emits change events.
 * Extends EventEmitter for compatibility with consumers that use the
 * on/off event subscription pattern.
 *
 * The classic Task had a full MessageStateHandler; this provides the
 * getClineMessages() and event emitter interface that consumers expect.
 */
export class MessageStateHandler extends EventEmitter {
	messages = []
	/** Add or update messages from a session event.
	 *  If a message with the same `ts` already exists, update it in-place
	 *  (this handles partial→final streaming updates). Otherwise append.
	 *  This prevents duplicate messages when both partial message stream
	 *  and state updates carry the same content.
	 */
	addMessages(messages) {
		for (const message of messages) {
			const existingIndex = this.messages.findIndex((m) => m.ts === message.ts)
			if (existingIndex !== -1) {
				// Update existing message in-place (e.g., partial=true → partial=false)
				this.messages[existingIndex] = message
				this.emit("clineMessagesChanged", {
					type: "update",
					messages: this.messages,
					index: existingIndex,
					message,
				})
			} else {
				this.messages.push(message)
				this.emit("clineMessagesChanged", { type: "add", messages: this.messages, message })
			}
		}
	}
	/** Get all accumulated messages (returns a copy) */
	getClineMessages() {
		return [...this.messages]
	}
	/** Clear all messages (e.g., on task clear) */
	clear() {
		this.messages = []
	}
	/** Replace the full message list, preserving the classic set-change event. */
	replaceMessages(messages) {
		this.messages = [...messages]
		this.emit("clineMessagesChanged", { type: "set", messages: this.messages })
	}
}
/**
 * Create a task proxy that delegates to the SdkController.
 *
 * @param sessionId The SDK session ID
 * @param onAskResponse Callback to send a response to the active session
 * @param onCancelTask Callback to cancel the active session
 * @returns A TaskProxy object
 */
export function createTaskProxy(sessionId, onAskResponse, onCancelTask) {
	const state = {}
	const messageStateHandler = new MessageStateHandler()
	// Mutable session ID — updated when the session is restarted (e.g., MCP tool reload)
	let currentSessionId = sessionId
	// Mutable API handler — updateSettings() replaces it when switching models
	let currentApi = {
		getModel: () => ({ id: "unknown" }),
	}
	// Terminal manager stub — safely no-ops for settings compatibility
	const terminalManagerStub = {
		setDefaultTerminalProfile: () => ({ closedCount: 0, busyTerminals: [] }),
		setShellIntegrationTimeout: () => {},
		setTerminalReuseEnabled: () => {},
	}
	const proxy = {
		get ulid() {
			return currentSessionId
		},
		get taskId() {
			return currentSessionId
		},
		set taskId(newId) {
			currentSessionId = newId
		},
		async handleWebviewAskResponse(askResponse, text, images, files) {
			// Store the response type in task state (some handlers check this)
			state.askResponse = askResponse
			switch (askResponse) {
				case "yesButtonClicked":
				case "noButtonClicked":
					// For approval responses, we just send an empty continuation
					// The SDK handles approval differently than the classic Task
					await onAskResponse(text, images, files)
					break
				case "messageResponse":
					// User sent a follow-up message
					await onAskResponse(text, images, files)
					break
				default:
					Logger.warn(`[TaskProxy] Unhandled askResponse type: ${askResponse}`)
					await onAskResponse(text, images, files)
					break
			}
		},
		async abortTask() {
			await onCancelTask()
		},
		get api() {
			return currentApi
		},
		set api(handler) {
			// updateSettings() replaces the API handler when switching models/providers
			currentApi = handler
		},
		get browserSession() {
			// Browser automation is not part of the SDK adapter.
			return undefined
		},
		get terminalManager() {
			return terminalManagerStub
		},
		get taskState() {
			return state
		},
		get messageStateHandler() {
			return messageStateHandler
		},
	}
	return proxy
}
//# sourceMappingURL=task-proxy.js.map
