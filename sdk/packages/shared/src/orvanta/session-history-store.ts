import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
	HISTORY_DIRNAME,
	HISTORY_INDEX_FILE,
	HISTORY_LOCK_FILE,
	HISTORY_SCHEMA_VERSION,
	HISTORY_SESSION_FILENAME,
	HISTORY_SESSIONS_DIR,
	WORKSPACE_DIRNAME,
} from "./paths";

// ============================================================================
// Schemas & Types
// ============================================================================

export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function validateSessionId(sessionId: string): string {
	if (!sessionId || typeof sessionId !== "string" || !SAFE_ID_REGEX.test(sessionId)) {
		throw new Error(
			`Invalid session ID '${sessionId}': must be 1-64 alphanumeric characters, dashes, or underscores without path traversal`,
		);
	}
	return sessionId;
}

export function validateTaskId(taskId: string): string {
	if (!taskId || typeof taskId !== "string" || !SAFE_ID_REGEX.test(taskId)) {
		throw new Error(
			`Invalid task ID '${taskId}': must be 1-64 alphanumeric characters, dashes, or underscores without path traversal`,
		);
	}
	return taskId;
}

export const OrvantaSessionStatusSchema = z.enum([
	"active",
	"completed",
	"interrupted",
	"error",
	"deleting",
	"archived",
]);
export type OrvantaSessionStatus = z.infer<typeof OrvantaSessionStatusSchema>;

export const OrvantaParticipantRoleSchema = z.enum(["lead", "teammate"]);
export type OrvantaParticipantRole = z.infer<typeof OrvantaParticipantRoleSchema>;

export const OrvantaParticipantStatusSchema = z.enum([
	"active",
	"completed",
	"interrupted",
	"error",
	"unknown",
]);
export type OrvantaParticipantStatus = z.infer<typeof OrvantaParticipantStatusSchema>;

export const OrvantaUsageSchema = z.object({
	tokensIn: z.number().nonnegative(),
	tokensOut: z.number().nonnegative(),
	totalCost: z.number().nonnegative(),
});
export type OrvantaUsage = z.infer<typeof OrvantaUsageSchema>;

export const OrvantaSessionAggregateUsageSchema = z.object({
	tokensIn: z.number().nonnegative(),
	tokensOut: z.number().nonnegative(),
	totalCost: z.number().nonnegative(),
	calculatedAt: z.string().datetime(),
});
export type OrvantaSessionAggregateUsage = z.infer<typeof OrvantaSessionAggregateUsageSchema>;

export const OrvantaSessionParticipantSchema = z.object({
	agentNumericId: z.number().int().positive().safe(),
	agentSlugAtJoin: z.string().min(1),
	displayNameAtJoin: z.string().min(1),
	roleAtJoin: OrvantaParticipantRoleSchema,
	taskId: z.string().regex(SAFE_ID_REGEX, "taskId must be 1-64 alphanumeric characters, dashes or underscores"),
	joinedAt: z.string().datetime(),
	lastActiveAt: z.string().datetime(),
	status: OrvantaParticipantStatusSchema.default("active"),
	lastMessagePreview: z.string().max(280).optional(),
	usage: OrvantaUsageSchema.optional(),
});
export type OrvantaSessionParticipant = z.infer<typeof OrvantaSessionParticipantSchema>;

export const OrvantaSessionManifestSchema = z.object({
	historySchemaVersion: z.literal(HISTORY_SCHEMA_VERSION),
	sessionId: z.string().regex(SAFE_ID_REGEX),
	companyId: z.string().min(1),
	title: z.string().trim().min(1).max(200),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	status: OrvantaSessionStatusSchema,
	isFavorited: z.boolean().optional(),
	activeAgentNumericId: z.number().int().positive().safe().optional(),
	participants: z.array(OrvantaSessionParticipantSchema),
	aggregateUsage: OrvantaSessionAggregateUsageSchema.optional(),
});
export type OrvantaSessionManifest = z.infer<typeof OrvantaSessionManifestSchema>;

export const OrvantaParticipantSummarySchema = z.object({
	agentNumericId: z.number().int().positive().safe(),
	agentSlugAtJoin: z.string().min(1),
	displayNameAtJoin: z.string().min(1),
	roleAtJoin: OrvantaParticipantRoleSchema,
	taskId: z.string(),
});
export type OrvantaParticipantSummary = z.infer<typeof OrvantaParticipantSummarySchema>;

export const OrvantaSessionIndexItemSchema = z.object({
	sessionId: z.string().regex(SAFE_ID_REGEX),
	companyId: z.string().min(1),
	title: z.string().min(1).max(200),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	status: OrvantaSessionStatusSchema,
	isFavorited: z.boolean().optional(),
	activeAgentNumericId: z.number().int().positive().safe().optional(),
	participantSummaries: z.array(OrvantaParticipantSummarySchema),
	aggregateUsage: OrvantaSessionAggregateUsageSchema.optional(),
});
export type OrvantaSessionIndexItem = z.infer<typeof OrvantaSessionIndexItemSchema>;

export const OrvantaSessionIndexSchema = z.object({
	historySchemaVersion: z.literal(HISTORY_SCHEMA_VERSION),
	companyId: z.string().min(1),
	updatedAt: z.string().datetime(),
	sessions: z.array(OrvantaSessionIndexItemSchema),
});
export type OrvantaSessionIndex = z.infer<typeof OrvantaSessionIndexSchema>;

// ============================================================================
// Error Types
// ============================================================================

export class SessionNotFoundError extends Error {
	readonly code = "NOT_FOUND";
	constructor(public readonly sessionId: string) {
		super(`Session '${sessionId}' not found`);
		this.name = "SessionNotFoundError";
	}
}

export class SessionCorruptError extends Error {
	readonly code = "CORRUPT";
	constructor(
		public readonly sessionId: string,
		public readonly details?: string,
	) {
		super(`Session '${sessionId}' is corrupt${details ? `: ${details}` : ""}`);
		this.name = "SessionCorruptError";
	}
}

export class SessionUnsupportedVersionError extends Error {
	readonly code = "UNSUPPORTED_VERSION";
	readonly isNewerVersion: boolean;
	constructor(
		public readonly sessionId: string,
		public readonly version: unknown,
		details?: string,
	) {
		const isNewer = typeof version === "number" && version > HISTORY_SCHEMA_VERSION;
		super(
			details ||
				(isNewer
					? `Session '${sessionId}' uses historySchemaVersion ${String(version)}, which is newer than supported version ${HISTORY_SCHEMA_VERSION}. Please update Orvanta.`
					: `Session '${sessionId}' has unsupported history schema version '${String(version)}'`),
		);
		this.name = "SessionUnsupportedVersionError";
		this.isNewerVersion = isNewer;
	}
}

export class SessionPermissionDeniedError extends Error {
	readonly code = "PERMISSION_DENIED";
	constructor(
		public readonly path: string,
		message = "Permission denied",
	) {
		super(`Permission denied for history path '${path}': ${message}`);
		this.name = "SessionPermissionDeniedError";
	}
}

export class SessionConflictError extends Error {
	readonly code = "CONFLICT";
	constructor(
		public readonly sessionId: string,
		message: string,
	) {
		super(`Conflict on session '${sessionId}': ${message}`);
		this.name = "SessionConflictError";
	}
}

export type SessionStoreError =
	| SessionNotFoundError
	| SessionCorruptError
	| SessionUnsupportedVersionError
	| SessionPermissionDeniedError
	| SessionConflictError;



// ============================================================================
// Paths & Utilities
// ============================================================================

export function getHistoryDirPath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_DIRNAME);
}

export function getHistoryIndexFilePath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_INDEX_FILE);
}

export function getHistorySessionsDirPath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_SESSIONS_DIR);
}

export function getSessionDirPath(workspaceRoot: string, sessionId: string): string {
	return join(getHistorySessionsDirPath(workspaceRoot), validateSessionId(sessionId));
}

export function getSessionManifestFilePath(workspaceRoot: string, sessionId: string): string {
	return join(getSessionDirPath(workspaceRoot, sessionId), HISTORY_SESSION_FILENAME);
}

export function getHistoryLockFilePath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_LOCK_FILE);
}

const SECRET_PATTERNS = [
	/sk-[a-zA-Z0-9_-]{20,}/g,
	/ghp_[a-zA-Z0-9]{20,}/g,
	/gho_[a-zA-Z0-9]{20,}/g,
	/bearer\s+[a-zA-Z0-9_.\-~+/]+=*/gi,
	/api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{16,}["']?/gi,
];

/**
 * Sanitizes and caps message preview text to ensure no sensitive tokens/secrets
 * are committed to session manifests or index summaries.
 */
export function redactMessagePreview(text: string, maxLength = 280): string {
	if (!text) return "";
	let cleaned = text;
	for (const pattern of SECRET_PATTERNS) {
		cleaned = cleaned.replace(pattern, "[REDACTED]");
	}
	// Redact newlines/control chars to keep preview single-line and concise
	cleaned = cleaned.replace(/[\r\n\t]+/g, " ").trim();
	if (cleaned.length > maxLength) {
		return cleaned.slice(0, maxLength - 3) + "...";
	}
	return cleaned;
}

/**
 * Normalizes any timestamp (numeric millisecond, legacy string, or Date)
 * into a strict ISO 8601 UTC string.
 */
export function normalizeTimestampToIso(ts: unknown): string {
	if (typeof ts === "number" && Number.isFinite(ts)) {
		return new Date(ts).toISOString();
	}
	if (typeof ts === "string" && ts.trim()) {
		const parsed = new Date(ts);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
	}
	if (ts instanceof Date && !Number.isNaN(ts.getTime())) {
		return ts.toISOString();
	}
	return new Date().toISOString();
}

export function computeAggregateUsage(
	participants: OrvantaSessionParticipant[],
): OrvantaSessionAggregateUsage | undefined {
	const withUsage = participants.filter((p) => p.usage !== undefined);
	if (withUsage.length === 0) {
		return undefined;
	}
	let tokensIn = 0;
	let tokensOut = 0;
	let totalCost = 0;
	for (const p of withUsage) {
		tokensIn += p.usage!.tokensIn;
		tokensOut += p.usage!.tokensOut;
		totalCost += p.usage!.totalCost;
	}
	return {
		tokensIn,
		tokensOut,
		totalCost: Math.round(totalCost * 10_000) / 10_000,
		calculatedAt: new Date().toISOString(),
	};
}

export function manifestToIndexItem(manifest: OrvantaSessionManifest): OrvantaSessionIndexItem {
	return {
		sessionId: manifest.sessionId,
		companyId: manifest.companyId,
		title: manifest.title,
		createdAt: manifest.createdAt,
		updatedAt: manifest.updatedAt,
		status: manifest.status,
		isFavorited: manifest.isFavorited,
		activeAgentNumericId: manifest.activeAgentNumericId,
		participantSummaries: manifest.participants.map((p) => ({
			agentNumericId: p.agentNumericId,
			agentSlugAtJoin: p.agentSlugAtJoin,
			displayNameAtJoin: p.displayNameAtJoin,
			roleAtJoin: p.roleAtJoin,
			taskId: p.taskId,
		})),
		aggregateUsage: manifest.aggregateUsage,
	};
}


// ============================================================================
// Concurrency & Locking
// ============================================================================

const workspaceHistoryQueues = new Map<string, Promise<void>>();
const HISTORY_LOCK_TIMEOUT_MS = 15_000;
const HISTORY_LOCK_RETRY_INTERVAL_MS = 60;
const HISTORY_LOCK_MAX_RETRIES = 250;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid: number): boolean {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (error: unknown) {
		const nodeError = error as NodeJS.ErrnoException;
		return nodeError.code === "EPERM";
	}
}

async function acquireCrossProcessHistoryLock(
	workspaceRoot: string,
): Promise<{ lockFilePath: string; token: string }> {
	const lockFilePath = getHistoryLockFilePath(workspaceRoot);
	await mkdir(dirname(lockFilePath), { recursive: true });
	const token = randomUUID();

	for (let attempt = 0; attempt < HISTORY_LOCK_MAX_RETRIES; attempt++) {
		try {
			const handle = await open(lockFilePath, "wx");
			try {
				const payload = JSON.stringify({
					pid: process.pid,
					createdAt: Date.now(),
					token,
				});
				await handle.writeFile(payload, "utf8");
			} finally {
				await handle.close();
			}
			return { lockFilePath, token };
		} catch (error: unknown) {
			const nodeError = error as NodeJS.ErrnoException;
			if (nodeError.code !== "EEXIST") {
				if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
					throw new SessionPermissionDeniedError(lockFilePath, nodeError.message);
				}
				throw error;
			}

			// Stale lock check
			try {
				const existingRaw = await readFile(lockFilePath, "utf8");
				const parsed = JSON.parse(existingRaw) as {
					pid?: number;
					createdAt?: number;
					token?: string;
				};
				const age = Date.now() - (parsed.createdAt ?? 0);
				const ownerPid = parsed.pid;
				const isDead = typeof ownerPid === "number" && !isProcessAlive(ownerPid);

				if (isDead || age > HISTORY_LOCK_TIMEOUT_MS) {
					await rm(lockFilePath, { force: true });
					continue;
				}
			} catch {
				// Failed to inspect existing lock, wait for next attempt
			}

			const jitter = Math.floor(Math.random() * 20);
			await sleep(HISTORY_LOCK_RETRY_INTERVAL_MS + jitter);
		}
	}

	throw new Error(`Timed out waiting for Orvanta history lock at ${lockFilePath}`);
}

async function releaseCrossProcessHistoryLock(
	lockFilePath: string,
	token: string,
): Promise<void> {
	try {
		const raw = await readFile(lockFilePath, "utf8");
		const parsed = JSON.parse(raw) as { token?: string };
		if (parsed.token === token) {
			await unlink(lockFilePath);
		}
	} catch {
		// Ignore release failure if already unlinked
	}
}

const historyLockContext = new AsyncLocalStorage<Set<string>>();

/**
 * Runs a transactional operation with in-process and cross-process history locking.
 * Re-entrant within the same asynchronous execution context.
 */
export async function withHistoryLock<T>(
	workspaceRoot: string,
	operation: () => Promise<T>,
): Promise<T> {
	const currentLocks = historyLockContext.getStore();
	if (currentLocks?.has(workspaceRoot)) {
		// Re-entrant within the same async context: already holding the lock!
		return await operation();
	}

	const previousQueue = workspaceHistoryQueues.get(workspaceRoot) ?? Promise.resolve();
	let releaseQueue: () => void = () => {};
	const currentQueue = new Promise<void>((resolve) => {
		releaseQueue = resolve;
	});
	workspaceHistoryQueues.set(workspaceRoot, currentQueue);

	await previousQueue;

	let crossProcessLock: { lockFilePath: string; token: string } | undefined;
	try {
		crossProcessLock = await acquireCrossProcessHistoryLock(workspaceRoot);
		const newLocks = new Set(currentLocks ? [...currentLocks, workspaceRoot] : [workspaceRoot]);
		return await historyLockContext.run(newLocks, () => operation());
	} finally {
		if (crossProcessLock) {
			await releaseCrossProcessHistoryLock(
				crossProcessLock.lockFilePath,
				crossProcessLock.token,
			);
		}
		releaseQueue();
		if (workspaceHistoryQueues.get(workspaceRoot) === currentQueue) {
			workspaceHistoryQueues.delete(workspaceRoot);
		}
	}
}

// ============================================================================
// Atomic File Operations
// ============================================================================

export async function atomicWriteJson<T>(filePath: string, data: T): Promise<void> {
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });
	const tempPath = `${filePath}.tmp-${randomUUID()}`;

	try {
		const serialized = JSON.stringify(data, null, 2) + "\n";
		await writeFile(tempPath, serialized, "utf8");
		await rename(tempPath, filePath);
	} catch (error: unknown) {
		await unlink(tempPath).catch(() => {});
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
			throw new SessionPermissionDeniedError(filePath, nodeError.message);
		}
		throw error;
	}
}

export async function cleanStaleTempFiles(dirPath: string, maxAgeMs = 60_000): Promise<void> {
	try {
		const entries = await readdir(dirPath, { withFileTypes: true });
		const now = Date.now();
		for (const entry of entries) {
			if (entry.isFile() && entry.name.includes(".tmp-")) {
				const fullPath = join(dirPath, entry.name);
				try {
					const info = await stat(fullPath);
					if (maxAgeMs <= 0 || now - info.mtimeMs >= maxAgeMs) {
						await unlink(fullPath).catch(() => {});
					}
				} catch {
					// Ignore per-file stat errors
				}
			}
		}
	} catch {
		// Ignore directory read errors
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

// ============================================================================
// Manifest & Index Reading
// ============================================================================

/**
 * Reads a session manifest file strictly without catching parse errors into fallback defaults.
 */
export async function readSessionManifestFile(
	filePath: string,
	sessionId: string,
): Promise<OrvantaSessionManifest> {
	let raw: string;
	try {
		raw = await readFile(filePath, "utf8");
	} catch (error: unknown) {
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code === "ENOENT") {
			throw new SessionNotFoundError(sessionId);
		}
		if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
			throw new SessionPermissionDeniedError(filePath, nodeError.message);
		}
		throw error;
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(raw);
	} catch (error: unknown) {
		throw new SessionCorruptError(
			sessionId,
			`Malformed JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (
		typeof parsedJson === "object" &&
		parsedJson !== null &&
		"historySchemaVersion" in parsedJson &&
		(parsedJson as { historySchemaVersion: unknown }).historySchemaVersion !==
			HISTORY_SCHEMA_VERSION
	) {
		throw new SessionUnsupportedVersionError(
			sessionId,
			(parsedJson as { historySchemaVersion: unknown }).historySchemaVersion,
		);
	}

	const parsed = OrvantaSessionManifestSchema.safeParse(parsedJson);
	if (!parsed.success) {
		throw new SessionCorruptError(
			sessionId,
			`Schema validation failed: ${parsed.error.message}`,
		);
	}

	return parsed.data;
}

// ============================================================================
// Public Operations
// ============================================================================

export interface CreateSessionInput {
	sessionId?: string;
	companyId: string;
	title: string;
	isFavorited?: boolean;
	activeAgentNumericId?: number;
	participants?: OrvantaSessionParticipant[];
}

export async function createSession(
	workspaceRoot: string,
	input: CreateSessionInput,
): Promise<OrvantaSessionManifest> {
	const sessionId = input.sessionId ? validateSessionId(input.sessionId) : `session-${randomUUID()}`;
	if (!input.companyId || typeof input.companyId !== "string") {
		throw new Error("companyId is required and must be a non-empty string");
	}
	const title = (input.title || "").trim();
	if (!title || title.length > 200) {
		throw new Error("title is required and must be between 1 and 200 characters");
	}

	return withHistoryLock(workspaceRoot, async () => {
		const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);

		if (await pathExists(manifestPath)) {
			// Idempotency: verify existing session
			const existing = await readSessionManifestFile(manifestPath, sessionId);
			if (existing.companyId !== input.companyId) {
				throw new SessionConflictError(
					sessionId,
					`Session '${sessionId}' belongs to company '${existing.companyId}', cannot associate with '${input.companyId}'`,
				);
			}
			return existing;
		}

		const now = new Date().toISOString();
		const participants = input.participants ?? [];
		const aggregateUsage = computeAggregateUsage(participants);

		const manifest: OrvantaSessionManifest = {
			historySchemaVersion: HISTORY_SCHEMA_VERSION,
			sessionId,
			companyId: input.companyId,
			title,
			createdAt: now,
			updatedAt: now,
			status: "active",
			isFavorited: input.isFavorited,
			activeAgentNumericId: input.activeAgentNumericId,
			participants,
			aggregateUsage,
		};

		// Validate with runtime schema
		OrvantaSessionManifestSchema.parse(manifest);

		// Atomic write
		await atomicWriteJson(manifestPath, manifest);

		// Update index
		await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));

		return manifest;
	});
}

export async function getSession(
	workspaceRoot: string,
	sessionId: string,
	options?: { expectedCompanyId?: string },
): Promise<OrvantaSessionManifest> {
	validateSessionId(sessionId);
	const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
	const manifest = await readSessionManifestFile(manifestPath, sessionId);

	if (options?.expectedCompanyId && manifest.companyId !== options.expectedCompanyId) {
		throw new SessionConflictError(
			sessionId,
			`Session '${sessionId}' belongs to company '${manifest.companyId}', expected '${options.expectedCompanyId}'`,
		);
	}

	return manifest;
}

export interface UpsertParticipantInput {
	agentNumericId: number;
	agentSlugAtJoin: string;
	displayNameAtJoin: string;
	roleAtJoin: OrvantaParticipantRole;
	taskId: string;
	joinedAt?: unknown;
	lastActiveAt?: unknown;
	status?: OrvantaParticipantStatus;
	lastMessagePreview?: string;
	usage?: OrvantaUsage;
}

export async function upsertParticipant(
	workspaceRoot: string,
	sessionId: string,
	participantInput: UpsertParticipantInput,
): Promise<OrvantaSessionManifest> {
	validateSessionId(sessionId);
	validateTaskId(participantInput.taskId);

	if (!Number.isInteger(participantInput.agentNumericId) || participantInput.agentNumericId <= 0) {
		throw new Error("agentNumericId must be a positive safe integer");
	}

	return withHistoryLock(workspaceRoot, async () => {
		const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
		const manifest = await readSessionManifestFile(manifestPath, sessionId);

		const joinedAt = normalizeTimestampToIso(participantInput.joinedAt);
		const lastActiveAt = normalizeTimestampToIso(participantInput.lastActiveAt);
		const sanitizedPreview = participantInput.lastMessagePreview
			? redactMessagePreview(participantInput.lastMessagePreview)
			: undefined;

		const existingIndex = manifest.participants.findIndex(
			(p) => p.agentNumericId === participantInput.agentNumericId,
		);

		// Check if another participant already owns this taskId
		const conflictParticipant = manifest.participants.find(
			(p) =>
				p.taskId === participantInput.taskId &&
				p.agentNumericId !== participantInput.agentNumericId,
		);
		if (conflictParticipant) {
			throw new SessionConflictError(
				sessionId,
				`Task '${participantInput.taskId}' is already assigned to participant ${conflictParticipant.agentNumericId} (${conflictParticipant.agentSlugAtJoin})`,
			);
		}

		const updatedParticipant: OrvantaSessionParticipant = {
			agentNumericId: participantInput.agentNumericId,
			agentSlugAtJoin: participantInput.agentSlugAtJoin,
			displayNameAtJoin: participantInput.displayNameAtJoin,
			roleAtJoin: participantInput.roleAtJoin,
			taskId: participantInput.taskId,
			joinedAt: existingIndex >= 0 ? manifest.participants[existingIndex].joinedAt : joinedAt,
			lastActiveAt,
			status: participantInput.status ?? (existingIndex >= 0 ? manifest.participants[existingIndex].status : "active"),
			lastMessagePreview: sanitizedPreview,
			usage: participantInput.usage,
		};

		// Validate participant schema
		OrvantaSessionParticipantSchema.parse(updatedParticipant);

		if (existingIndex >= 0) {
			manifest.participants[existingIndex] = updatedParticipant;
		} else {
			manifest.participants.push(updatedParticipant);
		}

		manifest.updatedAt = new Date().toISOString();
		manifest.aggregateUsage = computeAggregateUsage(manifest.participants);

		await atomicWriteJson(manifestPath, manifest);
		await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));

		return manifest;
	});
}

export interface UpdateSessionInput {
	title?: string;
	status?: OrvantaSessionStatus;
	isFavorited?: boolean;
	activeAgentNumericId?: number;
}

export async function updateSession(
	workspaceRoot: string,
	sessionId: string,
	updates: UpdateSessionInput,
): Promise<OrvantaSessionManifest> {
	validateSessionId(sessionId);

	return withHistoryLock(workspaceRoot, async () => {
		const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
		const manifest = await readSessionManifestFile(manifestPath, sessionId);

		if (updates.title !== undefined) {
			const trimmed = updates.title.trim();
			if (!trimmed || trimmed.length > 200) {
				throw new Error("title must be between 1 and 200 characters");
			}
			manifest.title = trimmed;
		}

		if (updates.status !== undefined) {
			OrvantaSessionStatusSchema.parse(updates.status);
			manifest.status = updates.status;
		}

		if (updates.isFavorited !== undefined) {
			manifest.isFavorited = Boolean(updates.isFavorited);
		}

		if (updates.activeAgentNumericId !== undefined) {
			if (
				!Number.isInteger(updates.activeAgentNumericId) ||
				updates.activeAgentNumericId <= 0
			) {
				throw new Error("activeAgentNumericId must be a positive safe integer");
			}
			manifest.activeAgentNumericId = updates.activeAgentNumericId;
		}

		manifest.updatedAt = new Date().toISOString();

		await atomicWriteJson(manifestPath, manifest);
		await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));

		return manifest;
	});
}

export async function renameSession(
	workspaceRoot: string,
	sessionId: string,
	newTitle: string,
): Promise<OrvantaSessionManifest> {
	return updateSession(workspaceRoot, sessionId, { title: newTitle });
}

export async function archiveSession(
	workspaceRoot: string,
	sessionId: string,
): Promise<OrvantaSessionManifest> {
	return updateSession(workspaceRoot, sessionId, { status: "archived" });
}

export interface DeleteParticipantTaskTarget {
	agentNumericId?: number;
	taskId?: string;
}

/**
 * Removes a single participant/task from a session.
 * Does not delete the session if other participants remain.
 * Recalculates aggregate usage and updates index.
 */
export async function deleteParticipantTask(
	workspaceRoot: string,
	sessionId: string,
	target: DeleteParticipantTaskTarget,
): Promise<OrvantaSessionManifest> {
	validateSessionId(sessionId);
	if (target.taskId) {
		validateTaskId(target.taskId);
	}

	return withHistoryLock(workspaceRoot, async () => {
		const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
		const manifest = await readSessionManifestFile(manifestPath, sessionId);

		const index = manifest.participants.findIndex((p) => {
			if (target.agentNumericId !== undefined && p.agentNumericId === target.agentNumericId) {
				return true;
			}
			if (target.taskId !== undefined && p.taskId === target.taskId) {
				return true;
			}
			return false;
		});

		if (index === -1) {
			throw new SessionNotFoundError(sessionId);
		}

		manifest.participants.splice(index, 1);
		manifest.aggregateUsage = computeAggregateUsage(manifest.participants);
		manifest.updatedAt = new Date().toISOString();

		await atomicWriteJson(manifestPath, manifest);
		await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));
		return manifest;
	});
}

export interface DeleteSessionOptions {
	sdkDeleteTask?: (taskId: string) => Promise<void>;
	abortOnError?: boolean;
}

/**
 * Staged multi-task deletion with tombstone and SDK rollback recovery.
 * Step 1: Sets status to "deleting" (tombstone).
 * Step 2: Deletes child tasks via SDK if provided. If SDK fails and abortOnError is set, restores manifest.
 * Step 3: Removes session directory and index item.
 */
export async function deleteSession(
	workspaceRoot: string,
	sessionId: string,
	options?: DeleteSessionOptions,
): Promise<void> {
	validateSessionId(sessionId);

	return withHistoryLock(workspaceRoot, async () => {
		const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
		let previousStatus: OrvantaSessionStatus = "completed";
		let taskIdsToDelete: string[] = [];

		try {
			const manifest = await readSessionManifestFile(manifestPath, sessionId);
			previousStatus = manifest.status;
			taskIdsToDelete = manifest.participants.map((p) => p.taskId).filter(Boolean);

			// Step 1: Tombstone / Staged delete status
			manifest.status = "deleting";
			manifest.updatedAt = new Date().toISOString();
			await atomicWriteJson(manifestPath, manifest);
			await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));
		} catch (error: unknown) {
			if (error instanceof SessionNotFoundError) {
				// Already gone, ensure removed from index
				await removeIndexItem(workspaceRoot, sessionId);
				return;
			}
			// If corrupt or other error, continue to clean up directory
		}

		// Step 2: Delete tasks via SDK callback if provided
		if (options?.sdkDeleteTask && taskIdsToDelete.length > 0) {
			const failedTasks: string[] = [];
			for (const taskId of taskIdsToDelete) {
				try {
					await options.sdkDeleteTask(taskId);
				} catch {
					failedTasks.push(taskId);
				}
			}

			if (failedTasks.length > 0 && options.abortOnError) {
				// Recovery: SDK failed to delete transcript. Restore manifest so record is not lost while transcript remains!
				try {
					const manifest = await readSessionManifestFile(manifestPath, sessionId);
					manifest.status = previousStatus;
					manifest.updatedAt = new Date().toISOString();
					await atomicWriteJson(manifestPath, manifest);
					await appendOrUpdateIndexItem(workspaceRoot, manifestToIndexItem(manifest));
				} catch {
					// Ignore manifest restore error
				}
				throw new Error(
					`Failed to delete tasks [${failedTasks.join(", ")}] for session '${sessionId}'. Session restored to previous state.`,
				);
			}
		}

		// Step 3: Remove session directory and index item
		const sessionDir = getSessionDirPath(workspaceRoot, sessionId);
		if (await pathExists(sessionDir)) {
			await rm(sessionDir, { recursive: true, force: true });
		}
		await removeIndexItem(workspaceRoot, sessionId);
	});
}

// ============================================================================
// Index Catalog & Rebuild
// ============================================================================

async function readIndexFile(workspaceRoot: string): Promise<OrvantaSessionIndex | undefined> {
	const indexPath = getHistoryIndexFilePath(workspaceRoot);
	if (!(await pathExists(indexPath))) {
		return undefined;
	}

	try {
		const raw = await readFile(indexPath, "utf8");
		const parsed = JSON.parse(raw);
		const result = OrvantaSessionIndexSchema.safeParse(parsed);
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
}

async function appendOrUpdateIndexItem(
	workspaceRoot: string,
	item: OrvantaSessionIndexItem,
): Promise<void> {
	const indexPath = getHistoryIndexFilePath(workspaceRoot);
	let index = await readIndexFile(workspaceRoot);

	if (!index) {
		index = {
			historySchemaVersion: HISTORY_SCHEMA_VERSION,
			companyId: item.companyId,
			updatedAt: new Date().toISOString(),
			sessions: [item],
		};
	} else {
		const existingIdx = index.sessions.findIndex((s) => s.sessionId === item.sessionId);
		if (existingIdx >= 0) {
			index.sessions[existingIdx] = item;
		} else {
			index.sessions.unshift(item);
		}
		// Sort by updatedAt descending
		index.sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
		index.updatedAt = new Date().toISOString();
	}

	await atomicWriteJson(indexPath, index);
}

async function removeIndexItem(workspaceRoot: string, sessionId: string): Promise<void> {
	const indexPath = getHistoryIndexFilePath(workspaceRoot);
	const index = await readIndexFile(workspaceRoot);
	if (!index) return;

	index.sessions = index.sessions.filter((s) => s.sessionId !== sessionId);
	index.updatedAt = new Date().toISOString();
	await atomicWriteJson(indexPath, index);
}

export async function rebuildIndex(
	workspaceRoot: string,
	options?: { companyId?: string },
): Promise<OrvantaSessionIndex> {
	return withHistoryLock(workspaceRoot, async () => {
		const sessionsDir = getHistorySessionsDirPath(workspaceRoot);
		const items: OrvantaSessionIndexItem[] = [];
		let targetCompanyId = options?.companyId || "";

		if (await pathExists(sessionsDir)) {
			await cleanStaleTempFiles(sessionsDir);
			const entries = await readdir(sessionsDir, { withFileTypes: true });

			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				const sessionId = entry.name;
				if (!SAFE_ID_REGEX.test(sessionId)) continue;

				const manifestPath = join(sessionsDir, sessionId, HISTORY_SESSION_FILENAME);
				if (!(await pathExists(manifestPath))) continue;

				try {
					const manifest = await readSessionManifestFile(manifestPath, sessionId);
					if (targetCompanyId && manifest.companyId !== targetCompanyId) {
						continue;
					}
					if (!targetCompanyId) {
						targetCompanyId = manifest.companyId;
					}
					items.push(manifestToIndexItem(manifest));
				} catch {
					// Do not overwrite or crash on corrupt manifests during rebuild.
					// Corrupt manifests are preserved intact on disk.
				}
			}
		}

		items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		const newIndex: OrvantaSessionIndex = {
			historySchemaVersion: HISTORY_SCHEMA_VERSION,
			companyId: targetCompanyId || "default",
			updatedAt: new Date().toISOString(),
			sessions: items,
		};

		const indexPath = getHistoryIndexFilePath(workspaceRoot);
		await atomicWriteJson(indexPath, newIndex);
		return newIndex;
	});
}

export interface ListSessionsOptions {
	companyId?: string;
	status?: OrvantaSessionStatus;
	page?: number;
	pageSize?: number;
}

export interface ListSessionsResult {
	sessions: OrvantaSessionIndexItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export async function listSessions(
	workspaceRoot: string,
	options?: ListSessionsOptions,
): Promise<ListSessionsResult> {
	let index = await readIndexFile(workspaceRoot);
	if (!index) {
		index = await rebuildIndex(workspaceRoot, { companyId: options?.companyId });
	}

	let filtered = index.sessions;
	if (options?.companyId) {
		filtered = filtered.filter((s) => s.companyId === options.companyId);
	}
	if (options?.status) {
		filtered = filtered.filter((s) => s.status === options.status);
	}

	const page = Math.max(1, options?.page ?? 1);
	const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 50));
	const total = filtered.length;
	const totalPages = Math.ceil(total / pageSize) || 1;
	const startIndex = (page - 1) * pageSize;
	const paginated = filtered.slice(startIndex, startIndex + pageSize);

	return {
		sessions: paginated,
		total,
		page,
		pageSize,
		totalPages,
	};
}

// ============================================================================
// Diagnostics, Repair & Export Operations
// ============================================================================

export interface DiagnoseAndRepairResult {
	scannedSessions: number;
	validSessions: number;
	corruptedSessions: string[];
	quarantinedFiles: string[];
	rebuiltIndex: boolean;
	issues: string[];
}

/**
 * Diagnostic command to scan, quarantine corrupted session manifests, and rebuild catalog.
 * Corrupt files are renamed to session.json.corrupt-<uuid> rather than silently deleted.
 * Cleans up stale .tmp- files.
 * Never touches or modifies legacy pre-v0.1.1 files.
 */
export async function diagnoseAndRepairHistory(
	workspaceRoot: string,
): Promise<DiagnoseAndRepairResult> {
	return withHistoryLock(workspaceRoot, async () => {
		const sessionsDir = getHistorySessionsDirPath(workspaceRoot);
		const historyDir = getHistoryDirPath(workspaceRoot);
		const result: DiagnoseAndRepairResult = {
			scannedSessions: 0,
			validSessions: 0,
			corruptedSessions: [],
			quarantinedFiles: [],
			rebuiltIndex: false,
			issues: [],
		};

		// Clean up stale temp files in history directory and subdirectories
		await cleanStaleTempFiles(historyDir, 0);

		if (!(await pathExists(sessionsDir))) {
			await rebuildIndex(workspaceRoot);
			result.rebuiltIndex = true;
			return result;
		}

		const entries = await readdir(sessionsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const sessionId = entry.name;
			if (!SAFE_ID_REGEX.test(sessionId)) continue;

			const manifestPath = getSessionManifestFilePath(workspaceRoot, sessionId);
			if (!(await pathExists(manifestPath))) continue;

			result.scannedSessions++;
			try {
				await readSessionManifestFile(manifestPath, sessionId);
				result.validSessions++;
			} catch (err: unknown) {
				result.corruptedSessions.push(sessionId);
				const errMsg = err instanceof Error ? err.message : String(err);
				result.issues.push(`Session '${sessionId}': ${errMsg}`);

				// Quarantine corrupt file (rename to session.json.corrupt-<uuid>)
				const quarantinePath = join(
					dirname(manifestPath),
					`session.json.corrupt-${randomUUID()}`,
				);
				try {
					await rename(manifestPath, quarantinePath);
					result.quarantinedFiles.push(quarantinePath);
				} catch {
					// Best effort quarantine
				}
			}
		}

		// Rebuild index catalog from remaining valid manifests
		await rebuildIndex(workspaceRoot);
		result.rebuiltIndex = true;
		return result;
	});
}

/**
 * Exports a session manifest as a clean JSON snapshot.
 */
export async function exportSession(
	workspaceRoot: string,
	sessionId: string,
): Promise<{ manifest: OrvantaSessionManifest; exportTimestamp: string }> {
	const manifest = await getSession(workspaceRoot, sessionId);
	return {
		manifest,
		exportTimestamp: new Date().toISOString(),
	};
}

/**
 * Sanitizes telemetry and logs to remove sensitive keys, prompts, and raw paths.
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
	data: T,
	workspaceRoot?: string,
): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		const lowerKey = key.toLowerCase();

		if (lowerKey === "prompt" || lowerKey === "message" || lowerKey === "instruction") {
			sanitized[key] = "[REDACTED_PROMPT]";
		} else if (
			lowerKey.includes("key") ||
			lowerKey.includes("secret") ||
			lowerKey.includes("token") ||
			lowerKey.includes("password") ||
			lowerKey.includes("auth")
		) {
			sanitized[key] = "[REDACTED_SECRET]";
		} else if (typeof value === "string") {
			let strValue = value;
			if (workspaceRoot && strValue.includes(workspaceRoot)) {
				strValue = strValue.replace(workspaceRoot, "[WORKSPACE]");
			}
			sanitized[key] = redactMessagePreview(strValue, 500);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}




