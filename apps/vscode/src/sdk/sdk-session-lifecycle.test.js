import { beforeEach, describe, expect, it, vi } from "vitest"
import { isAbortError, SdkSessionLifecycle } from "./sdk-session-lifecycle"

const mockCreateSessionHost = vi.hoisted(() => vi.fn())
vi.mock("@/core/storage/StateManager", () => ({
	StateManager: {
		get: () => ({
			getGlobalSettingsKey: () => undefined,
		}),
	},
}))
vi.mock("./vscode-session-host", () => ({
	VscodeSessionHost: {
		create: mockCreateSessionHost,
	},
}))
describe("SdkSessionLifecycle", () => {
	beforeEach(() => {
		mockCreateSessionHost.mockReset()
	})
	it("starts a session and stores active session state", async () => {
		const unsubscribe = vi.fn()
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" }, unsubscribe })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		const result = await lifecycle.startNewSession({})
		expect(result.startResult.sessionId).toBe("session-123")
		expect(result.sdkHost).toBe(sdkHost)
		expect(sdkHost.subscribe).toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.sessionId).toBe("session-123")
		expect(lifecycle.getActiveSession()?.isRunning).toBe(true)
	})
	it("does not start a host when the caller is superseded", async () => {
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-stale" } })
		const lifecycle = makeLifecycle()
		await expect(lifecycle.startNewSession({}, sdkHost, () => false)).rejects.toMatchObject({
			name: "SessionStartSupersededError",
		})
		expect(sdkHost.start).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()).toBeUndefined()
	})
	it("records the mode the active session was built for", async () => {
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" } })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({
			config: { providerId: "anthropic", modelId: "claude-sonnet-4", mode: "plan" },
		})
		expect(lifecycle.getActiveSession()?.mode).toBe("plan")
	})
	it("waits for tracked session starts, including ones that fail", async () => {
		const lifecycle = makeLifecycle()
		let finishStart
		const start = lifecycle.trackSessionStart(
			() =>
				new Promise((resolve) => {
					finishStart = resolve
				}),
		)
		let waited = false
		const waiting = lifecycle.waitForSessionStarts().then(() => {
			waited = true
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(waited).toBe(false)
		finishStart()
		await start
		await waiting
		expect(waited).toBe(true)
		// A waiter already in place when a start fails is released, not rejected:
		// a mode toggle waiting on a failed new-task start must still go ahead.
		let failStart
		const failing = lifecycle.trackSessionStart(
			() =>
				new Promise((_resolve, reject) => {
					failStart = reject
				}),
		)
		const waitingOnFailure = lifecycle.waitForSessionStarts()
		failStart(new Error("start failed"))
		await expect(failing).rejects.toThrow("start failed")
		await expect(waitingOnFailure).resolves.toBeUndefined()
		await expect(lifecycle.waitForSessionStarts()).resolves.toBeUndefined()
	})
	it("stores the provider and model config used to start the active session", async () => {
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" } })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({
			config: {
				providerId: "anthropic",
				modelId: "claude-sonnet-4",
			},
		})
		expect(lifecycle.getActiveSession()?.startConfig).toEqual({
			providerId: "anthropic",
			modelId: "claude-sonnet-4",
		})
	})
	it("reuses the shared session host across sessions", async () => {
		const sdkHost = makeSdkHost({
			start: vi.fn().mockResolvedValueOnce({ sessionId: "session-1" }).mockResolvedValueOnce({ sessionId: "session-2" }),
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		await lifecycle.endActiveSession("test")
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		expect(mockCreateSessionHost).toHaveBeenCalledOnce()
		expect(sdkHost.subscribe).toHaveBeenCalledOnce()
		expect(sdkHost.start).toHaveBeenCalledTimes(2)
		expect(sdkHost.stop).toHaveBeenCalledWith("session-1")
		expect(sdkHost.dispose).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.sessionId).toBe("session-2")
	})
	it("replaces an existing active session before starting another without resubscribing", async () => {
		const unsubscribe = vi.fn()
		const sdkHost = makeSdkHost({
			start: vi.fn().mockResolvedValueOnce({ sessionId: "session-1" }).mockResolvedValueOnce({ sessionId: "session-2" }),
			unsubscribe,
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		expect(mockCreateSessionHost).toHaveBeenCalledOnce()
		expect(sdkHost.subscribe).toHaveBeenCalledOnce()
		expect(sdkHost.stop).toHaveBeenCalledWith("session-1")
		expect(unsubscribe).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.sessionId).toBe("session-2")
		await lifecycle.dispose("testDispose")
		expect(unsubscribe).toHaveBeenCalledOnce()
	})
	it("unsubscribes if session start fails", async () => {
		const unsubscribe = vi.fn()
		const error = new Error("start failed")
		const sdkHost = makeSdkHost({ start: vi.fn().mockRejectedValue(error), unsubscribe })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await expect(lifecycle.startNewSession({})).rejects.toBe(error)
		expect(unsubscribe).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()).toBeUndefined()
		await lifecycle.dispose("testDispose")
		expect(unsubscribe).toHaveBeenCalledOnce()
	})
	it("disposes the shared host only when the lifecycle is disposed", async () => {
		const unsubscribe = vi.fn()
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" }, unsubscribe })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		await lifecycle.dispose("testDispose")
		expect(unsubscribe).toHaveBeenCalledOnce()
		expect(sdkHost.stop).toHaveBeenCalledWith("session-123")
		expect(sdkHost.dispose).toHaveBeenCalledWith("testDispose")
		expect(lifecycle.getActiveSession()).toBeUndefined()
	})
	it("passes the policy readiness gate to the shared session host", async () => {
		const beforeStartSession = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" } })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ beforeStartSession })
		await lifecycle.startNewSession({})
		expect(mockCreateSessionHost).toHaveBeenCalledWith(expect.objectContaining({ beforeStartSession }))
	})
	it("passes shared telemetry to the VSCode session host", async () => {
		const telemetry = { capture: vi.fn() }
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" } })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		const lifecycle = makeLifecycle({ telemetry: telemetry })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		expect(mockCreateSessionHost).toHaveBeenCalledWith(expect.objectContaining({ telemetry }))
	})
	it("marks the active session idle after a non-queued send completes", async () => {
		const onSendComplete = vi.fn()
		const sdkHost = makeSdkHost({ send: vi.fn().mockResolvedValue(undefined) })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendComplete })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello")
		await vi.waitFor(() => expect(onSendComplete).toHaveBeenCalledWith("session-123"))
		expect(lifecycle.getActiveSession()?.isRunning).toBe(false)
	})
	it("keeps the session running when a send settles after Core started the next queued turn", async () => {
		const onDidBecomeIdle = vi.fn()
		let resolveSend = () => {}
		const sdkHost = makeSdkHost({
			send: vi.fn(
				() =>
					new Promise((resolve) => {
						resolveSend = resolve
					}),
			),
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onDidBecomeIdle })
		await lifecycle.startNewSession({})
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "first")
		// Core emits idle for the first turn and immediately drains a queued prompt.
		lifecycle.setRunning(false)
		lifecycle.setRunning(true)
		resolveSend()
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(lifecycle.getActiveSession()?.isRunning).toBe(true)
		expect(onDidBecomeIdle).toHaveBeenCalledOnce()
	})
	it("waits for the active session's turn send to settle, even when it is aborted", async () => {
		let rejectSend = () => {}
		const sdkHost = makeSdkHost({
			send: vi.fn(
				() =>
					new Promise((_, reject) => {
						rejectSend = reject
					}),
			),
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		const session = lifecycle.getActiveSession()
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "first")
		let settled = false
		const wait = lifecycle.waitForTurnSend(session).then((result) => {
			settled = true
			return result
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(settled).toBe(false)
		const abortError = new Error("aborted")
		abortError.name = "AbortError"
		rejectSend(abortError)
		await expect(wait).resolves.toBe(true)
		expect(settled).toBe(true)
	})
	it("reports a turn send that is still in flight after the timeout", async () => {
		const sdkHost = makeSdkHost({ send: vi.fn(() => new Promise(() => {})) })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		const session = lifecycle.getActiveSession()
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "first")
		await expect(lifecycle.waitForTurnSend(session, 10)).resolves.toBe(false)
	})
	it("treats an emptied prompt queue on an idle session as becoming idle", async () => {
		const onDidBecomeIdle = vi.fn()
		const sdkHost = makeSdkHost()
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onDidBecomeIdle })
		await lifecycle.startNewSession({})
		lifecycle.setQueuedPromptCount(2)
		lifecycle.setRunning(false)
		expect(onDidBecomeIdle).toHaveBeenCalledTimes(1)
		expect(lifecycle.getActiveSession()?.queuedPromptCount).toBe(2)
		lifecycle.setQueuedPromptCount(0)
		expect(onDidBecomeIdle).toHaveBeenCalledTimes(2)
	})
	it("notifies idle listeners after a send fails", async () => {
		const onDidBecomeIdle = vi.fn()
		const onSendError = vi.fn()
		const sdkHost = makeSdkHost({ send: vi.fn().mockRejectedValue(new Error("provider failed")) })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onDidBecomeIdle, onSendError })
		await lifecycle.startNewSession({})
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello")
		await vi.waitFor(() => expect(onSendError).toHaveBeenCalledWith(expect.any(Error), "session-123"))
		expect(onDidBecomeIdle).toHaveBeenCalledOnce()
		expect(lifecycle.getActiveSession()?.isRunning).toBe(false)
	})
	it("notifies idle listeners only on a running-to-idle transition", async () => {
		const onDidBecomeIdle = vi.fn()
		const sdkHost = makeSdkHost()
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onDidBecomeIdle })
		await lifecycle.startNewSession({})
		lifecycle.setRunning(false)
		lifecycle.setRunning(false)
		expect(onDidBecomeIdle).toHaveBeenCalledOnce()
	})
	it("calls the send-start hook before sending to the SDK host", async () => {
		const onSendStart = vi.fn()
		const send = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ send })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendStart })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello")
		await vi.waitFor(() => expect(send).toHaveBeenCalled())
		expect(onSendStart).toHaveBeenCalledWith("session-123")
		expect(onSendStart.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0])
	})
	it("leaves the active session running when a message is queued", async () => {
		const onSendComplete = vi.fn()
		const send = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ send })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendComplete })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello", undefined, undefined, "queue")
		await vi.waitFor(() => expect(send).toHaveBeenCalled())
		expect(onSendComplete).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.isRunning).toBe(true)
	})
	it("marks the active session idle and reports non-abort send errors", async () => {
		const onSendError = vi.fn()
		const error = new Error("boom")
		const sdkHost = makeSdkHost({ send: vi.fn().mockRejectedValue(error) })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendError })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello")
		await vi.waitFor(() => expect(onSendError).toHaveBeenCalledWith(error, "session-123"))
		expect(lifecycle.getActiveSession()?.isRunning).toBe(false)
	})
	it("skips completion bookkeeping when the session was replaced before the send settled", async () => {
		const onSendComplete = vi.fn()
		let resolveSend = () => {}
		const send = vi.fn(
			() =>
				new Promise((resolve) => {
					resolveSend = resolve
				}),
		)
		const sdkHost = makeSdkHost({
			start: vi
				.fn()
				.mockResolvedValueOnce({ sessionId: "plan-session" })
				.mockResolvedValueOnce({ sessionId: "plan-session" }),
			send,
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendComplete })
		await lifecycle.startNewSession({})
		const expectedSession = lifecycle.getActiveSession()
		lifecycle.fireAndForgetSend(sdkHost, "plan-session", "make a plan")
		lifecycle.setRunning(false)
		// A mode-change rebuild replaces the session, reusing the SAME sessionId,
		// and starts an auto-continued turn on it.
		await lifecycle.replaceActiveSession({
			expectedSession,
			startInput: { config: {} },
			disposeReason: "modeChange",
		})
		lifecycle.setRunning(true)
		// The old send settles only now; its bookkeeping must not touch the successor.
		resolveSend()
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(onSendComplete).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.isRunning).toBe(true)
	})
	it("skips error bookkeeping when the session was replaced before the send failed", async () => {
		const onSendError = vi.fn()
		let rejectSend = () => {}
		const send = vi.fn(
			() =>
				new Promise((_resolve, reject) => {
					rejectSend = reject
				}),
		)
		const sdkHost = makeSdkHost({
			start: vi
				.fn()
				.mockResolvedValueOnce({ sessionId: "plan-session" })
				.mockResolvedValueOnce({ sessionId: "plan-session" }),
			send,
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ onSendError })
		await lifecycle.startNewSession({})
		const expectedSession = lifecycle.getActiveSession()
		lifecycle.fireAndForgetSend(sdkHost, "plan-session", "make a plan")
		lifecycle.setRunning(false)
		await lifecycle.replaceActiveSession({
			expectedSession,
			startInput: { config: {} },
			disposeReason: "modeChange",
		})
		lifecycle.setRunning(true)
		rejectSend(new Error("boom"))
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(onSendError).not.toHaveBeenCalled()
		expect(lifecycle.getActiveSession()?.isRunning).toBe(true)
	})
	it("completes the old session stop before starting a same-id replacement", async () => {
		let resolveStop = () => {}
		const stop = vi.fn(
			() =>
				new Promise((resolve) => {
					resolveStop = resolve
				}),
		)
		const start = vi
			.fn()
			.mockResolvedValueOnce({ sessionId: "plan-session" })
			.mockResolvedValueOnce({ sessionId: "plan-session" })
		const sdkHost = makeSdkHost({ start, stop })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		lifecycle.setRunning(false)
		const expectedSession = lifecycle.getActiveSession()
		const replacePromise = lifecycle.replaceActiveSession({
			expectedSession,
			startInput: { config: { sessionId: "plan-session" } },
			disposeReason: "modeChange",
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		// Core cleanup deletes by sessionId, so the same-id replacement must not
		// start while the old stop is still in flight.
		expect(start).toHaveBeenCalledTimes(1)
		resolveStop()
		const result = await replacePromise
		expect(start).toHaveBeenCalledTimes(2)
		expect(result?.startResult.sessionId).toBe("plan-session")
	})
	it("passes compacted initial messages after a same-id replacement stop completes", async () => {
		let resolveStop = () => {}
		const stop = vi.fn(
			() =>
				new Promise((resolve) => {
					resolveStop = resolve
				}),
		)
		const start = vi
			.fn()
			.mockResolvedValueOnce({ sessionId: "task-session" })
			.mockResolvedValueOnce({ sessionId: "task-session" })
		const sdkHost = makeSdkHost({ start, stop })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({ config: { sessionId: "task-session" } })
		lifecycle.setRunning(false)
		const expectedSession = lifecycle.getActiveSession()
		const initialMessages = [{ role: "user", content: "compacted summary" }]
		const replacePromise = lifecycle.replaceActiveSession({
			expectedSession,
			startInput: {
				config: { sessionId: "task-session" },
				prompt: undefined,
				interactive: true,
			},
			initialMessages: initialMessages,
			disposeReason: "compactTask",
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(start).toHaveBeenCalledTimes(1)
		resolveStop()
		const result = await replacePromise
		expect(result?.startResult.sessionId).toBe("task-session")
		expect(start).toHaveBeenLastCalledWith({
			config: { sessionId: "task-session" },
			prompt: undefined,
			interactive: true,
			initialMessages,
		})
		expect(lifecycle.getActiveSession()?.isRunning).toBe(false)
	})
	it("waits for a fire-and-forget stop before resuming the same sessionId", async () => {
		let resolveStop = () => {}
		const stop = vi.fn(
			() =>
				new Promise((resolve) => {
					resolveStop = resolve
				}),
		)
		const start = vi.fn().mockResolvedValueOnce({ sessionId: "task-1" }).mockResolvedValueOnce({ sessionId: "task-1" })
		const sdkHost = makeSdkHost({ start, stop })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		// The follow-up resume path ends the idle session without awaiting the
		// stop, then starts a new session reusing the taskId as the sessionId.
		await lifecycle.endActiveSession("askResponse")
		const resumePromise = lifecycle.startNewSession({ config: { sessionId: "task-1" } })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(start).toHaveBeenCalledTimes(1)
		resolveStop()
		const result = await resumePromise
		expect(start).toHaveBeenCalledTimes(2)
		expect(result.startResult.sessionId).toBe("task-1")
	})
	it("starts a fresh-id session without waiting for an unrelated hung stop", async () => {
		const stop = vi.fn(() => new Promise(() => {}))
		const start = vi.fn().mockResolvedValueOnce({ sessionId: "task-1" }).mockResolvedValueOnce({ sessionId: "task-2" })
		const sdkHost = makeSdkHost({ start, stop })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		// A brand-new task does not reuse the old sessionId, so it must not be
		// delayed by the old session's stop.
		const result = await lifecycle.startNewSession({ config: {} })
		expect(result.startResult.sessionId).toBe("task-2")
		expect(stop).toHaveBeenCalledWith("task-1")
	})
	it("replaces the active session by stopping the old session and reusing the shared host", async () => {
		const oldUnsubscribe = vi.fn()
		const sdkHost = makeSdkHost({
			start: vi
				.fn()
				.mockResolvedValueOnce({ sessionId: "old-session" })
				.mockResolvedValueOnce({ sessionId: "new-session" }),
			unsubscribe: oldUnsubscribe,
			stop: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		lifecycle.setRunning(false)
		const expectedSession = lifecycle.getActiveSession()
		const result = await lifecycle.replaceActiveSession({
			expectedSession,
			// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
			startInput: { config: {} },
			// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
			initialMessages: [{ role: "user", content: "hello" }],
			disposeReason: "testReplace",
		})
		expect(result?.oldSessionId).toBe("old-session")
		expect(result?.startResult.sessionId).toBe("new-session")
		expect(oldUnsubscribe).not.toHaveBeenCalled()
		expect(sdkHost.stop).toHaveBeenCalledWith("old-session")
		expect(sdkHost.dispose).not.toHaveBeenCalled()
		expect(mockCreateSessionHost).toHaveBeenCalledOnce()
		expect(sdkHost.subscribe).toHaveBeenCalledOnce()
		expect(sdkHost.start).toHaveBeenLastCalledWith({
			config: {},
			initialMessages: [{ role: "user", content: "hello" }],
		})
		expect(lifecycle.getActiveSession()?.sessionId).toBe("new-session")
		expect(lifecycle.getActiveSession()?.isRunning).toBe(false)
	})
	it("does not replace a session that started running", async () => {
		const sdkHost = makeSdkHost()
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({})
		const expectedSession = lifecycle.getActiveSession()
		const result = await lifecycle.replaceActiveSession({
			expectedSession,
			startInput: {},
			disposeReason: "test",
		})
		expect(result).toBeUndefined()
		expect(sdkHost.stop).not.toHaveBeenCalled()
	})
	it("adopts the restored session and stops the source session", async () => {
		const restored = {
			sessionId: "restored-session",
			startResult: { sessionId: "restored-session" },
			checkpoint: { ref: "abc", createdAt: 1, runCount: 1 },
		}
		const sdkHost = makeSdkHost({
			startResult: { sessionId: "source-session" },
			restore: vi.fn().mockResolvedValue(restored),
		})
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		await lifecycle.startNewSession({
			config: {
				sessionId: "source-session",
				providerId: "openai",
				modelId: "gpt-5",
			},
		})
		const result = await lifecycle.restoreActiveSession({
			sessionId: "source-session",
			checkpointRunCount: 1,
		})
		expect(result).toBe(restored)
		expect(lifecycle.getActiveSession()?.sessionId).toBe("restored-session")
		expect(lifecycle.getActiveSession()?.startConfig).toEqual({
			providerId: "openai",
			modelId: "gpt-5",
		})
		expect(sdkHost.stop).toHaveBeenCalledWith("source-session")
	})
	it("updates the active session model for the next turn when supported", async () => {
		const updateSessionModel = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" }, updateSessionModel })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		const didUpdate = await lifecycle.updateActiveSessionModel("deepseek-v4-flash")
		expect(didUpdate).toBe(true)
		expect(updateSessionModel).toHaveBeenCalledWith("session-123", "deepseek-v4-flash")
	})
	it("does not update active session model when no host capability is available", async () => {
		const sdkHost = makeSdkHost({ startResult: { sessionId: "session-123" } })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle()
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		const didUpdate = await lifecycle.updateActiveSessionModel("deepseek-v4-flash")
		expect(didUpdate).toBe(false)
	})
	it("detects abort errors", () => {
		const error = new Error("aborted by user")
		expect(isAbortError(error)).toBe(true)
	})
	it("stamps a pending mode-switch notice onto the outbound prompt", async () => {
		const send = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ send })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		// Real tracker semantics live in @cline/shared and SdkModeCoordinator;
		// here a one-shot stub proves the consume-once wiring: first send is
		// stamped, later sends go out untouched.
		let pending = { from: "act", to: "plan" }
		const consumeModeSwitchNotice = vi.fn((sessionId) => {
			if (sessionId !== "session-123") {
				return null
			}
			const notice = pending
			pending = null
			return notice
		})
		const lifecycle = makeLifecycle({ consumeModeSwitchNotice })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "how should we refactor this?")
		await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-123",
				prompt: "<mode_notice>The user switched from act mode to plan mode before sending this message.</mode_notice>\nhow should we refactor this?",
			}),
		)
		// The notice was consumed by the first send; the next message is clean.
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "and the tests?")
		await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
		expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ prompt: "and the tests?" }))
	})
	it("sends prompts unchanged when no mode-switch notice is pending", async () => {
		const send = vi.fn().mockResolvedValue(undefined)
		const sdkHost = makeSdkHost({ send })
		mockCreateSessionHost.mockResolvedValueOnce(sdkHost)
		const lifecycle = makeLifecycle({ consumeModeSwitchNotice: vi.fn(() => null) })
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		await lifecycle.startNewSession({})
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		lifecycle.fireAndForgetSend(sdkHost, "session-123", "hello")
		await vi.waitFor(() => expect(send).toHaveBeenCalled())
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ prompt: "hello" }))
	})
})
function makeLifecycle(overrides = {}) {
	return new SdkSessionLifecycle({
		// biome-ignore lint/suspicious/noExplicitAny: focused fake for lifecycle unit test
		mcpHub: {},
		requestToolApproval: vi.fn(),
		askQuestion: vi.fn(),
		onSessionEvent: vi.fn(),
		onSendComplete: vi.fn(),
		onSendError: vi.fn(),
		...overrides,
	})
}
function makeSdkHost(overrides = {}) {
	const startResult = overrides.startResult ?? { sessionId: "session-123" }
	return {
		start: vi.fn().mockResolvedValue(startResult),
		subscribe: vi.fn().mockReturnValue(overrides.unsubscribe ?? vi.fn()),
		send: vi.fn().mockResolvedValue(undefined),
		restore: vi.fn().mockResolvedValue({
			sessionId: "session-123",
			startResult,
			checkpoint: { ref: "abc", createdAt: 1, runCount: 1 },
		}),
		stop: vi.fn().mockResolvedValue(undefined),
		dispose: vi.fn().mockResolvedValue(undefined),
		...overrides,
	}
}
//# sourceMappingURL=sdk-session-lifecycle.test.js.map
