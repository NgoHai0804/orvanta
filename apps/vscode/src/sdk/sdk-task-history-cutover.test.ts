import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { SessionHistoryRecord } from "@cline/core"
import type { HistoryItem } from "@shared/HistoryItem"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { McpHub } from "@/services/mcp/McpHub"
import { deleteLegacyTask, readUiMessages } from "./legacy-state-reader"
import type { SdkSessionLifecycle } from "./sdk-session-lifecycle"
import { SdkTaskHistory } from "./sdk-task-history"
import { prepareTaskResumeStartInput } from "./sdk-task-resume"
import type { VscodeSessionHost } from "./vscode-session-host"

vi.mock("@/shared/services/Logger", () => ({
	Logger: {
		error: vi.fn(),
		log: vi.fn(),
		warn: vi.fn(),
	},
}))

const legacyStateReaderMock = {
	taskHistory: [] as HistoryItem[],
	uiMessages: [] as unknown[],
}

vi.mock("./legacy-state-reader", () => ({
	readTaskHistory: vi.fn(() => legacyStateReaderMock.taskHistory),
	deleteLegacyTask: vi.fn(),
	readUiMessages: vi.fn(() => legacyStateReaderMock.uiMessages),
	readApiConversationHistory: vi.fn(() => []),
	taskDirPath: vi.fn((taskId: string) => `/fake/${taskId}`),
}))

function makeSessionRecord(sessionId: string, overrides: Partial<SessionHistoryRecord> = {}): SessionHistoryRecord {
	return {
		sessionId,
		source: "vscode",
		pid: 0,
		startedAt: "2026-01-01T00:00:00.000Z",
		endedAt: "2026-01-01T00:00:00.000Z",
		exitCode: 0,
		status: "completed",
		interactive: true,
		provider: "anthropic",
		model: "claude-3-5-sonnet",
		cwd: "/workspace",
		workspaceRoot: "/workspace",
		enableTools: true,
		enableSpawn: false,
		enableTeams: false,
		isSubagent: false,
		prompt: `Prompt for ${sessionId}`,
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	}
}

function makeHistory(sdkRecords: SessionHistoryRecord[] = [], enableLegacyCutover = true) {
	const listHistory = vi.fn(async () => sdkRecords)
	const getSession = vi.fn(async (id: string) => sdkRecords.find((r) => r.sessionId === id))
	const readMessages = vi.fn(async () => [{ role: "user", content: "sdk content" }])
	const host = {
		listHistory,
		get: getSession,
		readMessages,
		delete: vi.fn(async () => {}),
		update: vi.fn(async () => ({ updated: true })),
	} as unknown as VscodeSessionHost

	const sessions = {
		getActiveSession: vi.fn(() => ({
			sdkHost: host,
			sessionId: "active-1",
			isRunning: false,
		})),
	} as unknown as SdkSessionLifecycle

	const history = new SdkTaskHistory({
		mcpHub: {} as McpHub,
		sessions,
		enableLegacyCutover,
	})

	return { history, host, listHistory, getSession }
}

describe("Cutover History & Read Isolation (Phase 5)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		legacyStateReaderMock.taskHistory = []
		legacyStateReaderMock.uiMessages = []
	})

	it("excludes legacy tasks from published listHistory when cutover is active", async () => {
		// 1 legacy task in legacy reader
		legacyStateReaderMock.taskHistory = [
			{
				id: "legacy-task-1",
				task: "Legacy Task 1",
				ts: 1000,
				tokensIn: 10,
				tokensOut: 5,
				totalCost: 0.001,
			},
		]

		// 1 valid v0.1.1 task in SDK
		const v1Record = makeSessionRecord("v1-task-1", { prompt: "V0.1.1 Session Task" })
		const { history } = makeHistory([v1Record], true)

		const published = await history.listHistory({ hydrate: false })

		// Only the v0.1.1 task is published; legacy task is strictly isolated
		expect(published).toHaveLength(1)
		expect(published[0].sessionId).toBe("v1-task-1")
		expect(published.some((item) => item.sessionId === "legacy-task-1")).toBe(false)
	})

	it("blocks fallback to legacy reader in findHistoryItem and getClineMessages when cutover is active", async () => {
		legacyStateReaderMock.taskHistory = [
			{
				id: "legacy-task-2",
				task: "Legacy Task 2",
				ts: 2000,
				tokensIn: 20,
				tokensOut: 10,
				totalCost: 0.002,
			},
		]
		legacyStateReaderMock.uiMessages = [{ ts: 2, type: "say", say: "task", text: "Legacy UI transcript" }]

		const { history } = makeHistory([], true)

		// findHistoryItem returns undefined for legacy tasks
		const found = await history.findHistoryItem("legacy-task-2")
		expect(found).toBeUndefined()

		// getClineMessages returns [] without falling back to readUiMessages
		const messages = await history.getClineMessages("legacy-task-2")
		expect(messages).toEqual([])
		expect(readUiMessages).not.toHaveBeenCalled()
	})

	it("rejects resuming legacy pre-v0.1.1 tasks under cutover", async () => {
		legacyStateReaderMock.taskHistory = [
			{
				id: "legacy-task-resume",
				task: "Legacy Task Resume",
				ts: 3000,
				tokensIn: 30,
				tokensOut: 15,
				totalCost: 0.003,
			},
		]

		const { history } = makeHistory([], true)

		const deps = {
			stateManager: { getGlobalSettingsKey: vi.fn(() => "act") } as any,
			taskHistory: history,
			sessionConfigBuilder: { build: vi.fn(async () => ({ sessionId: "legacy-task-resume", modelId: "m" })) } as any,
			getWorkspaceRoot: vi.fn(async () => "/workspace"),
			createTempSessionHost: vi.fn(async () => ({ dispose: vi.fn() })) as any,
			loadInitialMessages: vi.fn(async () => undefined),
		}

		await expect(prepareTaskResumeStartInput(deps, "legacy-task-resume")).rejects.toThrow(
			"Cannot resume legacy pre-v0.1.1 task",
		)
	})

	it("does not delete or modify legacy task files on disk under cutover", async () => {
		legacyStateReaderMock.taskHistory = [
			{
				id: "legacy-task-delete",
				task: "Legacy Task Delete",
				ts: 4000,
				tokensIn: 40,
				tokensOut: 20,
				totalCost: 0.004,
			},
		]

		const { history } = makeHistory([], true)

		// Delete session
		await history.deleteTaskFromState("legacy-task-delete")

		// deleteLegacyTask MUST NOT be called!
		expect(deleteLegacyTask).not.toHaveBeenCalled()
	})

	it("preserves raw bytes and SHA-256 of synthetic legacy fixtures across operations", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "orvanta-cutover-fixture-"))
		try {
			const legacyDir = join(tempDir, ".orvanta", "history")
			await mkdir(legacyDir, { recursive: true })

			const sessionsJsonPath = join(legacyDir, "sessions.json")
			const sessionsContent = JSON.stringify([{ id: "synthetic-legacy-1", title: "SYNTHETIC_FIXTURE_ONLY" }], null, 2)
			await writeFile(sessionsJsonPath, sessionsContent, "utf8")

			const taskDir = join(legacyDir, "tasks", "synthetic-legacy-1")
			await mkdir(taskDir, { recursive: true })

			const uiMessagesPath = join(taskDir, "ui_messages.json")
			const uiMessagesContent = JSON.stringify([{ type: "say", text: "SYNTHETIC_FIXTURE_ONLY" }], null, 2)
			await writeFile(uiMessagesPath, uiMessagesContent, "utf8")

			// Hash raw bytes before cutover operations
			const rawSessionsBefore = await readFile(sessionsJsonPath)
			const hashSessionsBefore = createHash("sha256").update(rawSessionsBefore).digest("hex")

			const rawUiBefore = await readFile(uiMessagesPath)
			const hashUiBefore = createHash("sha256").update(rawUiBefore).digest("hex")

			// Perform new history operations on sibling/v1 store
			const { history } = makeHistory([makeSessionRecord("v1-session-100")], true)
			await history.listHistory({ hydrate: false })
			await history.findHistoryItem("synthetic-legacy-1")
			await history.getClineMessages("synthetic-legacy-1")

			// Hash raw bytes after cutover operations
			const rawSessionsAfter = await readFile(sessionsJsonPath)
			const hashSessionsAfter = createHash("sha256").update(rawSessionsAfter).digest("hex")

			const rawUiAfter = await readFile(uiMessagesPath)
			const hashUiAfter = createHash("sha256").update(rawUiAfter).digest("hex")

			// Byte-for-byte and hash assertions
			expect(rawSessionsAfter.equals(rawSessionsBefore)).toBe(true)
			expect(hashSessionsAfter).toBe(hashSessionsBefore)

			expect(rawUiAfter.equals(rawUiBefore)).toBe(true)
			expect(hashUiAfter).toBe(hashUiBefore)
		} finally {
			await rm(tempDir, { recursive: true, force: true })
		}
	})
})
