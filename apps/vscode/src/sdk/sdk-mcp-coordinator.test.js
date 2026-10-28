import { beforeEach, describe, expect, it, vi } from "vitest"
import { SdkMcpCoordinator } from "./sdk-mcp-coordinator"

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))
describe("SdkMcpCoordinator", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	it("does nothing when MCP tools change without an active session", () => {
		const { coordinator, options } = makeCoordinator()
		coordinator.handleToolListChanged()
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
	})
	it("schedules MCP restart while the active session is running", () => {
		const activeSession = makeActiveSession({ isRunning: true })
		const { coordinator, options } = makeCoordinator({ activeSession })
		coordinator.handleToolListChanged()
		expect(options.sessions.replaceActiveSession).not.toHaveBeenCalled()
		expect(options.rebuilds.request).toHaveBeenCalledWith("mcpTools", expect.any(Function))
	})
	it("restarts immediately when MCP tools change while the active session is idle", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		coordinator.handleToolListChanged()
		await vi.waitFor(() => expect(options.sessions.replaceActiveSession).toHaveBeenCalledOnce())
		// Reloading tools is silent: only a status transition is emitted, no chat message.
		expect(options.messages.emitSessionEvents).toHaveBeenCalledWith([], {
			type: "status",
			payload: { sessionId: "old-session", status: "running" },
		})
		expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
	})
	it("rebuilds the active session with the current mode and preserved messages", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession, mode: "plan" })
		await coordinator.restartSessionForMcpTools()
		expect(options.sessionConfigBuilder.build).toHaveBeenCalledWith({ cwd: "/workspace", mode: "plan" })
		expect(options.loadInitialMessages).toHaveBeenCalledWith(activeSession.sdkHost, "old-session")
		expect(options.buildStartSessionInput).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "old-session" }), {
			cwd: "/workspace",
			mode: "plan",
		})
		expect(options.sessions.replaceActiveSession).toHaveBeenCalledWith({
			expectedSession: activeSession,
			startInput: { prompt: "start" },
			initialMessages: [{ role: "user", content: "hello" }],
			disposeReason: "mcpToolRestart",
		})
		// Success is silent: only a status transition back to idle, no chat
		// message or completion banner.
		expect(options.messages.emitSessionEvents).toHaveBeenCalledWith([], {
			type: "status",
			payload: { sessionId: "new-session", status: "idle" },
		})
		expect(options.messages.appendAndEmit).not.toHaveBeenCalled()
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})
	it("emits an error message when restart fails", async () => {
		const activeSession = makeActiveSession()
		const { coordinator, options } = makeCoordinator({ activeSession })
		options.sessions.replaceActiveSession.mockRejectedValue(new Error("boom"))
		await coordinator.restartSessionForMcpTools()
		expect(options.messages.appendAndEmit).toHaveBeenLastCalledWith(
			[
				expect.objectContaining({
					type: "say",
					say: "error",
					text: "Failed to reload MCP tools: boom. MCP tools may be outdated.",
				}),
			],
			{ type: "status", payload: { sessionId: "old-session", status: "error" } },
		)
		expect(options.postStateToWebview).toHaveBeenCalledOnce()
	})
})
function makeCoordinator(input = {}) {
	const activeSession = input.activeSession
	const config = {
		providerId: "anthropic",
		modelId: "claude",
		apiKey: "key",
	}
	const options = {
		stateManager: {
			getGlobalSettingsKey: vi.fn(() => input.mode ?? "act"),
		},
		sessions: {
			getActiveSession: vi.fn(() => activeSession),
			replaceActiveSession: vi.fn().mockResolvedValue({
				startResult: { sessionId: "new-session" },
				sdkHost: { send: vi.fn() },
			}),
		},
		messages: {
			appendAndEmit: vi.fn(),
			emitSessionEvents: vi.fn(),
		},
		sessionConfigBuilder: {
			build: vi.fn().mockResolvedValue(config),
		},
		getWorkspaceRoot: vi.fn().mockResolvedValue("/workspace"),
		loadInitialMessages: vi.fn().mockResolvedValue([{ role: "user", content: "hello" }]),
		buildStartSessionInput: vi.fn(() => ({ prompt: "start" })),
		postStateToWebview: vi.fn().mockResolvedValue(undefined),
		rebuilds: {
			request: vi.fn((_reason, rebuild) => {
				if (!activeSession?.isRunning) {
					void rebuild()
				}
			}),
		},
	}
	return {
		coordinator: new SdkMcpCoordinator(options),
		options,
	}
}
function makeActiveSession(input = {}) {
	return {
		sessionId: "old-session",
		sdkHost: {
			send: vi.fn(),
			stop: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
		},
		unsubscribe: vi.fn(),
		startResult: { sessionId: "old-session" },
		isRunning: input.isRunning ?? false,
	}
}
//# sourceMappingURL=sdk-mcp-coordinator.test.js.map
