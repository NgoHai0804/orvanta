import { existsSync } from "node:fs"
import path from "node:path"
import type { ClineCoreListHistoryOptions, SessionHistoryRecord } from "@cline/core"
import type { MessageWithMetadata as SdkMessage } from "@cline/llms"
import {
	bindTaskToSession,
	deleteWorkspaceSession,
	formatDisplayUserInput,
	getActiveTaskBinding,
	loadWorkspaceTaskMessages,
	parseUserInputMode,
	recordTaskTurnEvent,
	saveWorkspaceSession,
	saveWorkspaceTaskMessages,
} from "@cline/shared"
import { resolveSessionDataDir } from "@cline/shared/storage"
import type { ClineMessage } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"
import getFolderSize from "get-folder-size"
import { loadCompany } from "@/orvanta/workspace-store"
import type { McpHub } from "@/services/mcp/McpHub"
import type { TelemetryService } from "@/services/telemetry/TelemetryService"
import { Logger } from "@/shared/services/Logger"
import { deleteLegacyTask, readApiConversationHistory, readTaskHistory, readUiMessages, taskDirPath } from "./legacy-state-reader"
import {
	appendLegacyResumeWarning,
	legacyApiHistoryToSdkMessages,
	mergeLegacyUiMessagesWithResumedSdkMessages,
} from "./legacy-task-handling"
import type { MessageIdMinter } from "./message-id-minter"
import { sdkMessagesToClineMessages } from "./message-translator"
import type { SdkSessionLifecycle } from "./sdk-session-lifecycle"
import type { VscodeSessionHost } from "./vscode-session-host"

export interface TaskUsage {
	tokensIn: number
	tokensOut: number
	totalCost?: number
	cacheReads?: number
	cacheWrites?: number
}

export interface SdkTaskHistoryOptions {
	mcpHub: McpHub
	sessions: SdkSessionLifecycle
	/**
	 * VS Code's legacy global storage root. Pre-SDK VS Code tasks lived here under
	 * state/taskHistory.json and tasks/<id>/ instead of ~/.cline/data.
	 */
	legacyExtensionStorageDir?: string
	/**
	 * The process-wide id/seq/epoch authority. When provided, history rendering mints ids from
	 * it so regenerated history ids never overlap live-session ids. Optional for tests.
	 */
	getMinter?: () => MessageIdMinter
	telemetry?: TelemetryService
	/**
	 * Cline Cloud sessions live in the cloud control plane, not the local SDK
	 * store. When provided, they are merged into history listings and lookups
	 * (identified by their `ses-…` ids) so History is the one place for every task.
	 */
	cloud?: CloudHistorySource
	/**
	 * Cutover flag for v0.1.1: isolates legacy pre-v0.1.1 tasks completely.
	 * When true (default), legacy tasks are excluded from listing, cannot be opened/resumed,
	 * and no legacy files are modified or migrated.
	 */
	enableLegacyCutover?: boolean
}

export interface CloudHistorySource {
	isCloudSessionId: (id: string) => boolean
	list: () => Promise<SessionHistoryRecord[]>
	find: (id: string) => Promise<SessionHistoryRecord | undefined>
	delete: (id: string) => Promise<void>
}

type SdkTaskHistoryListOptions = ClineCoreListHistoryOptions & {
	offset?: number
}

function metadataNumber(metadata: SessionHistoryRecord["metadata"] | undefined, key: string): number | undefined {
	const value = metadata?.[key]
	return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function metadataBoolean(metadata: SessionHistoryRecord["metadata"] | undefined, key: string): boolean | undefined {
	const value = metadata?.[key]
	return typeof value === "boolean" ? value : undefined
}

function metadataString(metadata: SessionHistoryRecord["metadata"] | undefined, key: string): string | undefined {
	const value = metadata?.[key]
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function dateStringToTimestamp(value: string | null | undefined): number {
	if (!value) {
		return 0
	}
	const timestamp = Date.parse(value)
	return Number.isFinite(timestamp) ? timestamp : 0
}

/**
 * Sort comparator for session history records by recency: newest first.
 *
 * Falls back through `updatedAt` → `endedAt` → `startedAt` so records that
 * haven't been touched since creation still sort deterministically. Used both
 * when merging the initial list and when re-sorting after a single-record
 * patch, so the two orderings can never diverge.
 */
function compareSessionHistoryRecordsByRecencyDesc(a: SessionHistoryRecord, b: SessionHistoryRecord): number {
	return (
		dateStringToTimestamp(b.updatedAt ?? b.endedAt ?? b.startedAt) -
		dateStringToTimestamp(a.updatedAt ?? a.endedAt ?? a.startedAt)
	)
}

export function historyItemToSessionMetadata(item: HistoryItem, fallbackModelId?: string): Record<string, unknown> {
	return {
		title: item.task,
		isFavorited: item.isFavorited ?? false,
		size: item.size ?? 0,
		totalCost: item.totalCost ?? 0,
		tokensIn: item.tokensIn ?? 0,
		tokensOut: item.tokensOut ?? 0,
		cacheWrites: item.cacheWrites ?? 0,
		cacheReads: item.cacheReads ?? 0,
		modelId: item.modelId ?? fallbackModelId ?? "",
		legacyTask: item.isLegacy ?? false,
		sessionId: item.sessionId,
		agentNumericId: item.agentNumericId,
	}
}

function historyItemToSessionHistoryRecord(item: HistoryItem): SessionHistoryRecord {
	const startedAt = new Date(item.ts || Date.now()).toISOString()
	const displayTask = formatDisplayUserInput(item.task)
	return {
		sessionId: item.id,
		source: "vscode",
		pid: 0,
		startedAt,
		endedAt: startedAt,
		exitCode: 0,
		status: "completed",
		interactive: true,
		provider: item.apiProvider ?? "",
		model: item.modelId ?? "",
		cwd: item.cwdOnTaskInitialization ?? "",
		workspaceRoot: item.cwdOnTaskInitialization ?? "",
		enableTools: true,
		enableSpawn: false,
		enableTeams: false,
		isSubagent: false,
		prompt: displayTask,
		metadata: {
			...historyItemToSessionMetadata({ ...item, task: displayTask }),
			legacyTask: true,
		},
		updatedAt: startedAt,
	}
}

/** SdkMessage plus the plan/act mode recovered from its <user_input mode="..."> wrapper. */
type SdkDisplayMessage = SdkMessage & { uiMode?: "plan" | "act" | "yolo" }

function parseUserMessageMode(content: SdkMessage["content"]): "plan" | "act" | "yolo" | undefined {
	if (typeof content === "string") {
		return parseUserInputMode(content)
	}
	for (const block of content) {
		if (block.type === "text" && typeof block.text === "string") {
			const mode = parseUserInputMode(block.text)
			if (mode) {
				return mode
			}
		}
	}
	return undefined
}

/** Renders a persisted SDK transcript as chat rows, the same way History does for local tasks. */
export function sdkMessagesToDisplayClineMessages(
	messages: SdkMessage[],
	minter: MessageIdMinter | undefined,
	options: { finalTurnCompleted: boolean; cwd?: string },
): ClineMessage[] {
	return sdkMessagesToClineMessages(sanitizeSdkUserMessagesForDisplay(messages), minter, options)
}

function sanitizeSdkUserMessagesForDisplay(messages: SdkMessage[]): SdkDisplayMessage[] {
	return messages.map((message): SdkDisplayMessage => {
		if (message.role !== "user") {
			return message
		}
		// Recover the mode BEFORE display sanitization strips the <user_input mode="..."> wrapper;
		// history rendering uses it to style each turn's inferred completion row.
		const uiMode = parseUserMessageMode(message.content)
		if (typeof message.content === "string") {
			return { ...message, content: formatDisplayUserInput(message.content), uiMode }
		}
		if (Array.isArray(message.content)) {
			return {
				...message,
				content: message.content.map((block) =>
					block.type === "text" && typeof block.text === "string"
						? { ...block, text: formatDisplayUserInput(block.text) }
						: block,
				),
				uiMode,
			}
		}
		return message
	})
}

export function sessionHistoryRecordToHistoryItem(item: SessionHistoryRecord): HistoryItem {
	const metadata = item.metadata
	return {
		id: item.sessionId,
		ts: dateStringToTimestamp(item.updatedAt ?? item.endedAt ?? item.startedAt),
		task: formatDisplayUserInput(metadataString(metadata, "title") ?? item.prompt ?? ""),
		tokensIn: metadataNumber(metadata, "tokensIn") ?? 0,
		tokensOut: metadataNumber(metadata, "tokensOut") ?? 0,
		cacheWrites: metadataNumber(metadata, "cacheWrites") ?? 0,
		cacheReads: metadataNumber(metadata, "cacheReads") ?? 0,
		totalCost: metadataNumber(metadata, "totalCost") ?? 0,
		size: metadataNumber(metadata, "size"),
		isFavorited: metadataBoolean(metadata, "isFavorited") ?? metadataBoolean(metadata, "is_favorited") ?? false,
		modelId: item.model || metadataString(metadata, "modelId") || "",
		apiProvider: item.provider || undefined,
		cwdOnTaskInitialization: item.cwd ?? item.workspaceRoot,
		isLegacy:
			metadataBoolean(metadata, "legacyTask") === true || metadataBoolean(metadata, "migratedFromLegacyTask") === true,
		sessionId: metadataString(metadata, "sessionId"),
		agentNumericId: metadataNumber(metadata, "agentNumericId"),
		...(metadataString(metadata, "executionTarget") === "cloud"
			? {
					executionTarget: "cloud" as const,
					cloudStatus: metadataString(metadata, "cloudStatus") as HistoryItem["cloudStatus"],
					cloudRepoUrl: metadataString(metadata, "repoUrl"),
					cloudBranch: metadataString(metadata, "branch"),
					cloudUsageAvailable: metadataBoolean(metadata, "usageAvailable") ?? false,
				}
			: {}),
	}
}

export class SdkTaskHistory {
	private cachedHistoryHost?: VscodeSessionHost
	private cachedHistoryHostPromise?: Promise<VscodeSessionHost>
	private cachedHistoryHostRefCount = 0
	private cachedHistoryHostIdleTimer?: NodeJS.Timeout
	private metadataHistoryCache?: {
		records: SessionHistoryRecord[]
		hostLimit: number
		createdAt: number
	}
	private disposed = false
	private readonly cachedHistoryHostIdleMs = 30_000
	private readonly pendingDisplayMessageSaves = new Map<
		string,
		{ timer: ReturnType<typeof setTimeout>; workspaceRoot: string; messages: ClineMessage[] }
	>()
	private readonly metadataHistoryCacheTtlMs = 10_000

	constructor(private readonly options: SdkTaskHistoryOptions) {}
	isCutoverActive(): boolean {
		return this.options.enableLegacyCutover === true || process.env.ORVANTA_CUTOVER === "1"
	}

	private getLegacyDataDirs(): (string | undefined)[] {
		const dirs: (string | undefined)[] = [undefined]
		const extensionStorageDir = this.options.legacyExtensionStorageDir?.trim()
		if (extensionStorageDir) {
			dirs.push(extensionStorageDir)
		}
		return dirs
	}

	private readAllLegacyTaskHistory(): {
		item: HistoryItem
		dataDir?: string
	}[] {
		const seenIds = new Set<string>()
		const tasks: { item: HistoryItem; dataDir?: string }[] = []
		for (const dataDir of this.getLegacyDataDirs()) {
			for (const item of readTaskHistory(dataDir)) {
				if (!item.id || seenIds.has(item.id)) {
					continue
				}
				seenIds.add(item.id)
				tasks.push({ item, dataDir })
			}
		}
		return tasks
	}

	private findLegacyTask(taskId: string): { item: HistoryItem; dataDir?: string } | undefined {
		return this.readAllLegacyTaskHistory().find(({ item }) => item.id === taskId)
	}

	private isCloudTask(taskId: string): boolean {
		return this.options.cloud?.isCloudSessionId(taskId) ?? false
	}

	private getActiveHistoryHost(): VscodeSessionHost | undefined {
		const sdkHost = this.options.sessions.getActiveSession()?.sdkHost
		// A cloud host only knows its own sandbox; local history always needs the local store.
		if (sdkHost && "listHistory" in sdkHost && !("isCloud" in sdkHost)) {
			return sdkHost as VscodeSessionHost
		}
		return undefined
	}

	private async getCachedHistoryHost(): Promise<VscodeSessionHost> {
		if (this.disposed) {
			throw new Error("SdkTaskHistory has been disposed")
		}

		if (this.cachedHistoryHostIdleTimer) {
			clearTimeout(this.cachedHistoryHostIdleTimer)
			this.cachedHistoryHostIdleTimer = undefined
		}

		if (this.cachedHistoryHost) {
			return this.cachedHistoryHost
		}
		if (this.cachedHistoryHostPromise) {
			return this.cachedHistoryHostPromise
		}

		this.cachedHistoryHostPromise = (async () => {
			const { VscodeSessionHost } = await import("./vscode-session-host")
			const historyHost = await VscodeSessionHost.create({
				mcpHub: this.options.mcpHub,
			})
			this.cachedHistoryHost = historyHost
			return historyHost
		})()

		try {
			return await this.cachedHistoryHostPromise
		} catch (error) {
			this.cachedHistoryHost = undefined
			throw error
		} finally {
			this.cachedHistoryHostPromise = undefined
		}
	}

	private scheduleCachedHistoryHostDispose(): void {
		if (this.disposed || this.cachedHistoryHostRefCount > 0 || !this.cachedHistoryHost) {
			return
		}

		this.cachedHistoryHostIdleTimer = setTimeout(() => {
			void this.disposeCachedHistoryHost("idle")
		}, this.cachedHistoryHostIdleMs)
		this.cachedHistoryHostIdleTimer.unref?.()
	}

	private async disposeCachedHistoryHost(reason: string): Promise<void> {
		if (this.cachedHistoryHostIdleTimer) {
			clearTimeout(this.cachedHistoryHostIdleTimer)
			this.cachedHistoryHostIdleTimer = undefined
		}

		if (this.cachedHistoryHostRefCount > 0) {
			return
		}

		const historyHost = this.cachedHistoryHost
		this.cachedHistoryHost = undefined
		if (!historyHost) {
			return
		}

		await historyHost.dispose(`taskHistory:${reason}`).catch((error) => {
			Logger.warn("[SdkTaskHistory] Failed to dispose cached history host:", error)
		})
	}

	async dispose(): Promise<void> {
		this.disposed = true
		await Promise.all([...this.pendingDisplayMessageSaves.keys()].map((taskId) => this.flushDisplayMessages(taskId)))
		this.invalidateMetadataHistoryCache()
		if (this.cachedHistoryHostPromise) {
			await this.cachedHistoryHostPromise.catch(() => undefined)
		}
		await this.disposeCachedHistoryHost("controllerDispose")
	}

	private invalidateMetadataHistoryCache(): void {
		this.metadataHistoryCache = undefined
	}

	/** Forces the next listing to re-enumerate (e.g. a cloud session changed status). */
	invalidateCache(): void {
		this.invalidateMetadataHistoryCache()
	}

	/**
	 * Mirror a persistence-layer write into the cache so the next read sees
	 * the updated record without a full re-enumeration.
	 *
	 * The persistence layer bumps `updatedAt` on every write, so the cached
	 * record is updated to match and the cache is re-sorted to preserve the
	 * descending-`updatedAt` ordering that {@link listHistory} establishes.
	 * When the session isn't in the cache (e.g. a brand-new task whose list
	 * membership/ordering may change) the cache is invalidated so the next
	 * read re-enumerates from disk.
	 */
	private updateCachedSessionRecord(
		sessionId: string,
		updates: { prompt: string; metadata: Record<string, unknown>; updatedAt: string },
	): void {
		const cache = this.metadataHistoryCache
		if (!cache) {
			return
		}
		const index = cache.records.findIndex((record) => record.sessionId === sessionId)
		if (index === -1) {
			this.invalidateMetadataHistoryCache()
			return
		}
		const existing = cache.records[index]
		cache.records[index] = {
			...existing,
			prompt: updates.prompt,
			metadata: updates.metadata,
			updatedAt: updates.updatedAt,
		}
		cache.records.sort(compareSessionHistoryRecordsByRecencyDesc)
	}

	private canUseMetadataHistoryCache(options: SdkTaskHistoryListOptions): boolean {
		return options.hydrate === false
	}

	private async withHistoryHost<T>(fn: (host: VscodeSessionHost) => Promise<T>): Promise<T> {
		const activeHistoryHost = this.getActiveHistoryHost()
		if (activeHistoryHost) {
			return fn(activeHistoryHost)
		}

		const historyHost = await this.getCachedHistoryHost()
		this.cachedHistoryHostRefCount += 1
		try {
			return await fn(historyHost)
		} finally {
			this.cachedHistoryHostRefCount = Math.max(0, this.cachedHistoryHostRefCount - 1)
			this.scheduleCachedHistoryHostDispose()
		}
	}

	async listHistory(options: SdkTaskHistoryListOptions = {}): Promise<SessionHistoryRecord[]> {
		const offset = Math.max(0, Math.floor(options.offset ?? 0))
		const limit = Math.max(0, Math.floor(options.limit ?? 10_000))
		const hostLimit = offset + limit
		const useCache = this.canUseMetadataHistoryCache(options)
		const now = Date.now()
		const cached = useCache ? this.metadataHistoryCache : undefined
		if (cached && cached.hostLimit >= hostLimit && now - cached.createdAt < this.metadataHistoryCacheTtlMs) {
			const result = cached.records.slice(offset, offset + limit)
			return result
		}

		const hostOptions: ClineCoreListHistoryOptions = { ...options }
		delete (hostOptions as { offset?: number }).offset

		const sdkHistory = await this.withHistoryHost((host) =>
			host.listHistory({
				...hostOptions,
				limit: hostLimit || 10_000,
				includeManifestFallback: true,
			}),
		)
		const visibleSdkHistory = sdkHistory.filter((item) => item.isSubagent !== true)
		const sdkIds = new Set(visibleSdkHistory.map((item) => item.sessionId))
		const legacyHistory = this.isCutoverActive()
			? []
			: this.readAllLegacyTaskHistory()
					.filter(({ item }) => item.task && !sdkIds.has(item.id))
					.map(({ item }) => historyItemToSessionHistoryRecord(item))
		// An SDK record with legacy metadata is a legacy task that was resumed,
		// i.e. migrated (historyItemToSessionMetadata stamps legacyTask on resume).
		const migratedSdkTaskCount = visibleSdkHistory.filter(
			(item) =>
				metadataBoolean(item.metadata, "migratedFromLegacyTask") === true ||
				metadataBoolean(item.metadata, "legacyTask") === true,
		).length

		const cloudHistory = this.options.cloud
			? await this.options.cloud.list().catch((error) => {
					Logger.warn("[SdkTaskHistory] Failed to list cloud sessions:", error)
					return [] as SessionHistoryRecord[]
				})
			: []

		const mergedHistory = [...visibleSdkHistory, ...legacyHistory, ...cloudHistory].sort(
			compareSessionHistoryRecordsByRecencyDesc,
		)
		if (useCache) {
			this.metadataHistoryCache = {
				records: mergedHistory,
				hostLimit,
				createdAt: Date.now(),
			}
		}

		this.options.telemetry?.safeCapture(
			() =>
				this.options.telemetry?.captureLegacyTaskMigrationBacklog({
					pendingLegacyTaskCount: legacyHistory.length,
					migratedSdkTaskCount,
					visibleSdkTaskCount: visibleSdkHistory.length,
					visibleTaskCount: mergedHistory.length,
				}),
			"SdkTaskHistory.listHistory.legacyMigrationBacklog",
		)

		const result = mergedHistory.slice(offset, offset + limit)
		return result
	}

	private async getSdkRecord(taskId: string): Promise<SessionHistoryRecord | undefined> {
		return this.withHistoryHost((host) => host.get(taskId) as Promise<SessionHistoryRecord | undefined>)
	}

	queueDisplayMessagesSave(taskId: string, workspaceRoot: string, messages: ClineMessage[]): void {
		if (this.isCloudTask(taskId) || !workspaceRoot || messages.length === 0) {
			return
		}

		const pending = this.pendingDisplayMessageSaves.get(taskId)
		if (pending) {
			clearTimeout(pending.timer)
		}
		const snapshot = messages.map((message) => ({ ...message, partial: false }))
		const timer = setTimeout(() => {
			void this.flushDisplayMessages(taskId)
		}, 250)
		this.pendingDisplayMessageSaves.set(taskId, { timer, workspaceRoot, messages: snapshot })
	}

	private async flushDisplayMessages(taskId: string): Promise<void> {
		const pending = this.pendingDisplayMessageSaves.get(taskId)
		if (!pending) return
		clearTimeout(pending.timer)
		this.pendingDisplayMessageSaves.delete(taskId)
		try {
			await saveWorkspaceTaskMessages(pending.workspaceRoot, taskId, pending.messages)
		} catch (error) {
			Logger.warn(`[SdkTaskHistory] Failed to persist display transcript for ${taskId}:`, error)
		}
	}

	async getClineMessages(taskId: string): Promise<ClineMessage[]> {
		if (this.isCloudTask(taskId)) {
			// Cloud transcripts are read through the sandbox connection (see SdkCloudSessionCoordinator).
			return []
		}
		const sdkRecord = await this.getSdkRecord(taskId)
		const legacyTask = this.findLegacyTask(taskId)
		const workspaceRoot = sdkRecord?.cwd || sdkRecord?.workspaceRoot || legacyTask?.item.cwdOnTaskInitialization
		if (sdkRecord && workspaceRoot) {
			try {
				const persistedDisplayMessages = await loadWorkspaceTaskMessages<ClineMessage>(workspaceRoot, taskId)
				// Only trust the display artifact as the richer source when it contains
				// teammate attribution. Older cache files may be Coordinator-only and
				// must not hide the SDK transcript for non-Orvanta sessions.
				if (
					persistedDisplayMessages?.some((message) => {
						const agentId = message.agentId ?? message.agent_id
						return Boolean(agentId && agentId.toLowerCase() !== "coordinator")
					})
				) {
					return persistedDisplayMessages
				}
			} catch {
				// Fall through to SDK canonical history.
			}
		}
		if (!sdkRecord && legacyTask) {
			if (this.isCutoverActive()) {
				return []
			}
			return readUiMessages(taskId, legacyTask.dataDir)
		}
		if (!sdkRecord && !legacyTask) {
			const cachedRecord = this.metadataHistoryCache?.records.find((record) => record.sessionId === taskId)
			const cwd = cachedRecord?.cwd
			if (cwd) {
				try {
					const wsMessages = await loadWorkspaceTaskMessages<ClineMessage>(cwd, taskId)
					if (wsMessages && wsMessages.length > 0) {
						return wsMessages
					}
				} catch {
					// Fall through to empty
				}
			}
		}

		const sdkMessages = await this.withHistoryHost((host) => host.readMessages(taskId) as Promise<SdkMessage[]>)
		const clineMessages = sdkMessagesToClineMessages(
			sanitizeSdkUserMessagesForDisplay(sdkMessages),
			this.options.getMinter?.(),
			{
				// Only retag the transcript's terminal text as an inferred completion when the
				// session record says its last turn ended cleanly — status "completed", written
				// by the SDK runtime host's resolveInteractiveStopStatus when the session is
				// released (task switch, clear, extension dispose). Everything else stays a
				// plain text row: "failed"/"cancelled" runs ended on a dangling response, and
				// non-terminal statuses at rest ("idle"/"running"/"pending") mean the process
				// died without recording an outcome — "idle" in particular is also the state
				// after an aborted turn (markTurnIdle runs for every finish reason), so it
				// cannot be trusted as a clean ending. A missing record is likewise an unknown
				// outcome, so it gets no completion styling either.
				finalTurnCompleted: sdkRecord?.status === "completed",
				// Relativize the absolute tool paths for display, same as the live path.
				cwd: sdkRecord?.cwd || sdkRecord?.workspaceRoot || undefined,
			},
		)
		const finalMessages =
			sdkRecord && legacyTask
				? mergeLegacyUiMessagesWithResumedSdkMessages(readUiMessages(taskId, legacyTask.dataDir), clineMessages)
				: clineMessages

		// Cache to .orvanta/history/tasks/<taskId>/ui_messages.json
		const wsRoot = sdkRecord?.cwd || sdkRecord?.workspaceRoot || legacyTask?.item.cwdOnTaskInitialization
		if (wsRoot && finalMessages.length > 0) {
			try {
				await saveWorkspaceTaskMessages(wsRoot, taskId, finalMessages)
			} catch {
				// Non-blocking
			}
		}

		return finalMessages
	}

	/**
	 * Absolute path of the directory holding the task's on-disk artifacts: the SDK
	 * session folder (manifest json + messages json) for SDK tasks, or the legacy
	 * tasks/<id> folder for pre-SDK tasks. Undefined when the task is unknown.
	 */
	async getTaskDirPath(taskId: string): Promise<string | undefined> {
		const sdkRecord = await this.getSdkRecord(taskId)
		if (sdkRecord) {
			const messagesPath = typeof sdkRecord.messagesPath === "string" ? sdkRecord.messagesPath.trim() : ""
			if (messagesPath) {
				return path.dirname(messagesPath)
			}
			// Older records may lack messagesPath; fall back to the canonical
			// session directory when it exists on disk.
			const sessionDir = path.join(resolveSessionDataDir(), taskId)
			if (existsSync(sessionDir)) {
				return sessionDir
			}
		}
		return this.getLegacyTaskDirPath(taskId)
	}

	getLegacyTaskDirPath(taskId: string): string | undefined {
		const legacyTask = this.findLegacyTask(taskId)
		return legacyTask ? taskDirPath(taskId, legacyTask.dataDir) : undefined
	}

	/**
	 * The persisted session status ("completed" | "cancelled" | "failed" | ...).
	 * Persisted messages cannot distinguish a completed conversation from one
	 * interrupted mid-stream (both just end with assistant text), so reopening a
	 * task from History uses this status to decide between the Resume Task and
	 * Start New Task affordances.
	 */
	async getSessionStatus(taskId: string): Promise<SessionHistoryRecord["status"] | undefined> {
		if (this.isCloudTask(taskId)) {
			return (await this.options.cloud?.find(taskId))?.status
		}
		const sdkRecord = await this.getSdkRecord(taskId).catch(() => undefined)
		return sdkRecord?.status
	}

	async isLegacyTask(taskId: string): Promise<boolean> {
		if (this.isCloudTask(taskId)) {
			return false
		}
		const sdkRecord = await this.getSdkRecord(taskId)
		if (sdkRecord) {
			return (
				metadataBoolean(sdkRecord.metadata, "legacyTask") === true ||
				metadataBoolean(sdkRecord.metadata, "migratedFromLegacyTask") === true
			)
		}

		return this.findLegacyTask(taskId) !== undefined
	}

	async getLegacyResumeInitialMessages(taskId: string, fallbackMessages?: unknown[]): Promise<unknown[] | undefined> {
		const sdkRecord = await this.getSdkRecord(taskId)
		const legacyTask = sdkRecord ? undefined : this.findLegacyTask(taskId)
		if (legacyTask) {
			const legacyApiHistory = readApiConversationHistory(taskId, legacyTask.dataDir)
			if (legacyApiHistory.length > 0) {
				return legacyApiHistoryToSdkMessages(legacyApiHistory, legacyTask.item)
			}
		}

		if (!fallbackMessages) {
			return undefined
		}
		return appendLegacyResumeWarning(fallbackMessages as { role: string; content: unknown }[])
	}

	private async updateSession(sessionId: string, item: HistoryItem): Promise<void> {
		const { metadata: writtenMetadata, updated } = await this.withHistoryHost(async (host) => {
			const existing = await host.get(sessionId)
			const metadata: Record<string, unknown> = {
				...(existing?.metadata ?? {}),
				...historyItemToSessionMetadata(item, existing?.model),
			}
			if (item.size === undefined) {
				const existingSize = existing?.metadata?.size
				if (existingSize !== undefined) {
					metadata.size = existingSize
				} else {
					delete metadata.size
				}
			}
			const result = await host.update(sessionId, {
				prompt: item.task,
				metadata,
				title: item.task,
			})
			return { metadata, updated: result.updated }
		})
		if (!updated) {
			// The write didn't land (e.g. the session was deleted, or an optimistic-
			// concurrency retry was exhausted by a racing writer). Patching the cache
			// here would show a fake "updated" record until the TTL expires, so
			// invalidate instead and let the next read re-enumerate from disk.
			this.invalidateMetadataHistoryCache()
			return
		}
		// The persistence adapter stamps `updatedAt` with the wall-clock write time
		// (see `nowIso()` in file-session-service.ts), not `item.ts`. Mirror that here
		// rather than deriving from `item.ts`: callers like toggleTaskFavorite() reuse
		// an old HistoryItem whose `ts` predates this write, which would otherwise let
		// the cached ordering diverge from what's on disk until the cache TTL expires.
		this.updateCachedSessionRecord(sessionId, {
			prompt: item.task,
			metadata: writtenMetadata,
			updatedAt: new Date().toISOString(),
		})
	}

	async updateTaskHistoryItem(item: HistoryItem): Promise<void> {
		if (this.isCloudTask(item.id)) {
			// Cloud records are owned by the control plane; nothing to persist locally.
			return
		}
		await this.updateSession(item.id, item)

		// Mirror to .orvanta/history/ if in an Orvanta workspace
		const cwd = item.cwdOnTaskInitialization
		if (cwd) {
			try {
				const load = await loadCompany(cwd)
				if (load.status === "ready" && !item.isLegacy) {
					const activeBinding = getActiveTaskBinding(item.id)
					if (activeBinding) {
						await recordTaskTurnEvent({
							workspaceRoot: cwd,
							taskId: item.id,
							sessionId: activeBinding.sessionId,
							agentNumericId: activeBinding.agentNumericId,
							usage: {
								tokensIn: item.tokensIn ?? 0,
								tokensOut: item.tokensOut ?? 0,
								totalCost: item.totalCost ?? 0,
							},
							lastMessagePreview: item.task,
						})
					} else {
						// Resolve single participating agent without whole-roster fallback
						const candidate = item.agents?.[0]
						const candidateSlug = candidate?.id || "coordinator"
						const candidateRole =
							candidate?.role === "lead" ? "lead" : candidateSlug === "coordinator" ? "lead" : "teammate"
						const matchingRosterAgent = load.roster.agents.find((a) => a.id === candidateSlug)
						const agentNumericId =
							candidate && "agentNumericId" in candidate && typeof (candidate as any).agentNumericId === "number"
								? (candidate as any).agentNumericId
								: (matchingRosterAgent?.agentNumericId ?? 1)
						const displayName = candidate?.displayName || matchingRosterAgent?.displayName || candidateSlug

						await bindTaskToSession({
							workspaceRoot: cwd,
							companyId: load.company.id,
							sessionId: item.sessionId,
							taskId: item.id,
							agentNumericId,
							agentSlug: candidateSlug,
							displayName,
							role: candidateRole,
							prompt: item.task,
							usage: {
								tokensIn: item.tokensIn ?? 0,
								tokensOut: item.tokensOut ?? 0,
								totalCost: item.totalCost ?? 0,
							},
							lastMessagePreview: item.task,
						})
					}
				}

				// Also update legacy format without whole roster fallback
				await saveWorkspaceSession(cwd, {
					id: item.id,
					title: item.task,
					createdAt: item.ts,
					updatedAt: Date.now(),
					tokensIn: item.tokensIn,
					tokensOut: item.tokensOut,
					totalCost: item.totalCost,
					isFavorited: item.isFavorited,
					agents: item.agents?.map((agent) => ({
						...agent,
						role: agent.role === "lead" ? "lead" : "teammate",
					})),
					agentIds: item.agentIds,
					agentTasks: item.agentTasks,
				})
			} catch {
				// Non-blocking: workspace might not have .orvanta directory or permission
			}
		}
	}

	private async deleteSession(sessionId: string): Promise<void> {
		if (this.isCloudTask(sessionId)) {
			await this.options.cloud?.delete(sessionId)
			this.invalidateMetadataHistoryCache()
			return
		}
		const legacyTask = this.findLegacyTask(sessionId)
		let cwd: string | undefined = legacyTask?.dataDir
		if (!cwd) {
			const historyItem = await this.findHistoryItem(sessionId)
			cwd = historyItem?.cwdOnTaskInitialization
		}

		try {
			await this.withHistoryHost(async (host) => {
				await host.delete(sessionId)
			})
		} catch (error) {
			if (!legacyTask) {
				throw error
			}
			Logger.warn(`[SdkTaskHistory] SDK session missing while deleting legacy task: ${sessionId}`, error)
		}
		if (legacyTask && !this.isCutoverActive()) {
			deleteLegacyTask(sessionId, legacyTask.dataDir)
		}
		if (cwd) {
			try {
				await deleteWorkspaceSession(cwd, sessionId)
			} catch {
				// Non-blocking
			}
		}
		this.invalidateMetadataHistoryCache()
	}

	async findHistoryItem(taskId: string): Promise<HistoryItem | undefined> {
		if (this.isCloudTask(taskId)) {
			const cloudRecord = await this.options.cloud?.find(taskId)
			return cloudRecord ? sessionHistoryRecordToHistoryItem(cloudRecord) : undefined
		}
		const sdkHistoryItem = await this.withHistoryHost(async (host) => {
			const sdkRecord = await host.get(taskId)
			if (!sdkRecord || sdkRecord.isSubagent === true) {
				return undefined
			}

			const historyItem = sessionHistoryRecordToHistoryItem(sdkRecord as SessionHistoryRecord)
			historyItem.size = await this.getCachedTaskSize(host, sdkRecord as SessionHistoryRecord)
			return historyItem
		})
		if (sdkHistoryItem) {
			return sdkHistoryItem
		}

		if (this.isCutoverActive()) {
			return undefined
		}

		const legacyItem = this.findLegacyTask(taskId)?.item
		return legacyItem ? { ...legacyItem, isLegacy: true } : undefined
	}

	async deleteTaskFromState(id: string): Promise<HistoryItem[]> {
		await this.deleteSession(id)
		return (await this.listHistory()).map(sessionHistoryRecordToHistoryItem)
	}

	async deleteAllTaskHistory(options: { preserveFavorites?: boolean } = {}): Promise<number> {
		// Cloud sessions are account-wide control-plane records (possibly started from
		// another client), so bulk-clearing local history must never delete them.
		const history = (await this.listHistory({ hydrate: false })).filter((item) => !this.isCloudTask(item.sessionId))
		const tasksToDelete = options.preserveFavorites
			? history.filter(
					(item) =>
						!(
							metadataBoolean(item.metadata, "isFavorited") ??
							metadataBoolean(item.metadata, "is_favorited") ??
							false
						),
				)
			: history

		let deletedCount = 0
		for (const item of tasksToDelete) {
			try {
				await this.deleteSession(item.sessionId)
				deletedCount += 1
			} catch (error) {
				Logger.error(`[SdkTaskHistory] Failed to delete task history item: ${item.sessionId}`, error)
			}
		}

		return deletedCount
	}

	async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
		await this.updateTaskHistoryItem(item)
		return (await this.listHistory()).map(sessionHistoryRecordToHistoryItem)
	}

	async updateTaskUsage(taskId: string | undefined, usage: TaskUsage): Promise<void> {
		Logger.log(
			`[SdkController] Task usage: tokensIn=${usage.tokensIn}, tokensOut=${usage.tokensOut}, cost=${usage.totalCost ?? 0}`,
		)

		if (!taskId || this.isCloudTask(taskId)) {
			return
		}

		const historyItem = await this.findHistoryItem(taskId)
		if (!historyItem) {
			return
		}

		historyItem.tokensIn = (historyItem.tokensIn || 0) + usage.tokensIn
		historyItem.tokensOut = (historyItem.tokensOut || 0) + usage.tokensOut
		historyItem.cacheReads = (historyItem.cacheReads || 0) + (usage.cacheReads ?? 0)
		historyItem.cacheWrites = (historyItem.cacheWrites || 0) + (usage.cacheWrites ?? 0)
		historyItem.totalCost = (historyItem.totalCost || 0) + (usage.totalCost ?? 0)
		historyItem.ts = Date.now()

		await this.updateTaskHistoryItem(historyItem)
	}

	private async getCachedTaskSize(host: VscodeSessionHost, record: SessionHistoryRecord): Promise<number | undefined> {
		// metadata.size is a display cache: fill it when absent, and let explicit item.size updates replace it.
		const cachedSize = metadataNumber(record.metadata, "size")
		if (cachedSize !== undefined && cachedSize >= 0) {
			return cachedSize
		}

		const artifactSize = await this.getSessionArtifactSize(record)
		if (artifactSize !== undefined) {
			await this.cacheTaskSize(host, record, artifactSize)
			return artifactSize
		}

		return undefined
	}

	private async getSessionArtifactSize(record: SessionHistoryRecord): Promise<number | undefined> {
		const messagesPath = typeof record.messagesPath === "string" ? record.messagesPath.trim() : ""
		if (!messagesPath) {
			return undefined
		}

		try {
			const size = await getFolderSize.loose(path.dirname(messagesPath), {
				bigint: false,
			})
			return Number.isFinite(size) ? size : undefined
		} catch (error) {
			Logger.warn(`[SdkTaskHistory] Failed to calculate SDK session size: ${record.sessionId}`, error)
			return undefined
		}
	}

	private async cacheTaskSize(host: VscodeSessionHost, record: SessionHistoryRecord, size: number): Promise<void> {
		if (!Number.isFinite(size) || size < 0 || metadataNumber(record.metadata, "size") === size) {
			return
		}

		await host.update(record.sessionId, {
			metadata: {
				...(record.metadata ?? {}),
				size,
			},
		})
		this.invalidateMetadataHistoryCache()
	}
}
