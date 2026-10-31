import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RosterJson } from "./company-schema";
import { HISTORY_SESSIONS_FILE, WORKSPACE_DIRNAME } from "./paths";
import {
	type OrvantaParticipantRole,
	type OrvantaParticipantStatus,
	type OrvantaSessionManifest,
	type OrvantaSessionParticipant,
	type OrvantaUsage,
	SessionConflictError,
	SessionNotFoundError,
	createSession,
	getSession,
	upsertParticipant,
	validateSessionId,
	validateTaskId,
	withHistoryLock,
} from "./session-history-store";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TaskSessionBindingInfo {
	sessionId: string;
	agentNumericId: number;
	workspaceRoot: string;
	boundAt: string;
}

export interface BindTaskToSessionInput {
	workspaceRoot: string;
	companyId: string;
	sessionId?: string;
	taskId: string;
	agentNumericId: number;
	agentSlug: string;
	displayName: string;
	role: OrvantaParticipantRole;
	prompt?: string;
	lastMessagePreview?: string;
	usage?: OrvantaUsage;
	/** Canonical SDK transcript id for this participant. Never inferred from run/task aliases. */
	sdkSessionId?: string;
}

export interface BindTaskToSessionResult {
	session: OrvantaSessionManifest;
	isNewSession: boolean;
	participant: OrvantaSessionParticipant;
}

export interface RecordTaskTurnEventInput {
	workspaceRoot: string;
	taskId: string;
	sessionId?: string;
	agentNumericId?: number;
	status?: OrvantaParticipantStatus;
	usage?: OrvantaUsage;
	lastMessagePreview?: string;
}

export interface ReconcileSpawnedTaskInput {
	workspaceRoot: string;
	companyId: string;
	sessionId: string;
	parentTaskId: string;
	childTaskId: string;
	targetAgentNumericId: number;
	targetAgentSlug: string;
	targetDisplayName: string;
	targetRole?: OrvantaParticipantRole;
	lastMessagePreview?: string;
}

export interface RecordTeamRunTranscriptLinkInput {
	workspaceRoot: string;
	sessionId: string;
	participant: Pick<OrvantaSessionParticipant, "agentNumericId" | "agentSlugAtJoin" | "displayNameAtJoin" | "roleAtJoin" | "taskId">;
	runId: string;
	transcript: {
		runtimeAgentId?: string;
		conversationId?: string;
		sdkSessionId?: string;
	};
}
export interface ParticipantDisplayIdentity {
	agentNumericId: number;
	currentSlug: string;
	currentDisplayName: string;
	snapshotSlug: string;
	snapshotDisplayName: string;
	isRenamed: boolean;
	isRetired: boolean;
}



// ============================================================================
// Active In-Memory Registry (Webview Reload / Task Switch Coordination)
// ============================================================================

/**
 * Registry holding active task-to-session associations.
 * Keyed by taskId. Allows instant resolution during task events and webview reconnections.
 */
const activeTaskBindings = new Map<string, TaskSessionBindingInfo>();

export function getActiveTaskBinding(taskId: string): TaskSessionBindingInfo | undefined {
	return activeTaskBindings.get(taskId);
}

export function setActiveTaskBinding(taskId: string, info: TaskSessionBindingInfo): void {
	activeTaskBindings.set(taskId, info);
}

export function removeActiveTaskBinding(taskId: string): void {
	activeTaskBindings.delete(taskId);
}

export function clearActiveTaskBindings(): void {
	activeTaskBindings.clear();
}

// ============================================================================
// Legacy Pre-Cutover Task Defense (No Migration / No Pre-v0.1.1 Resumption)
// ============================================================================

/**
 * Checks whether a task belongs to pre-v0.1.1 legacy history.
 * Legacy tasks (e.g. found in legacy sessions.json or legacy tasks store)
 * MUST NOT be bound or resumed as v0.1.1 sessions.
 */
export async function isLegacyPreCutoverTask(
	workspaceRoot: string,
	taskId: string,
): Promise<boolean> {
	validateTaskId(taskId);
	const legacySessionsPath = join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_SESSIONS_FILE);
	try {
		const raw = await readFile(legacySessionsPath, "utf8");
		const data = JSON.parse(raw);
		if (Array.isArray(data)) {
			return data.some((item) => item && (item.id === taskId || item.taskId === taskId));
		}
	} catch {
		// Legacy file missing or unparseable: not in legacy sessions.json
	}
	return false;
}

export async function assertNotLegacyTask(
	workspaceRoot: string,
	taskId: string,
): Promise<void> {
	if (await isLegacyPreCutoverTask(workspaceRoot, taskId)) {
		throw new Error(
			`Cannot bind or resume legacy task '${taskId}' in v0.1.1 session history. Pre-v0.1.1 tasks are preserved on disk but isolated from v0.1.1 history store.`,
		);
	}
}


// ============================================================================
// Core Binding Operations
// ============================================================================

/**
 * Binds a Cline task to an Orvanta session and an Agent identity.
 * Creates the session if it doesn't exist, and upserts the participant snapshot.
 * Guarantees no whole-roster fallback: ONLY the actual participating agent is recorded.
 */
export async function bindTaskToSession(
	input: BindTaskToSessionInput,
): Promise<BindTaskToSessionResult> {
	validateTaskId(input.taskId);
	await assertNotLegacyTask(input.workspaceRoot, input.taskId);

	const sessionId = input.sessionId ? validateSessionId(input.sessionId) : `session-${randomUUID()}`;

	return withHistoryLock(input.workspaceRoot, async () => {
		let isNewSession = false;

		try {
			await getSession(input.workspaceRoot, sessionId, {
				expectedCompanyId: input.companyId,
			});
		} catch (error: unknown) {
			if (error instanceof SessionNotFoundError) {
				isNewSession = true;
				await createSession(input.workspaceRoot, {
					sessionId,
					companyId: input.companyId,
					title: (input.prompt || "New Session").trim().slice(0, 200),
					activeAgentNumericId: input.agentNumericId,
				});
			} else {
				throw error;
			}
		}

		// Upsert the specific participating agent
		const updatedSession = await upsertParticipant(input.workspaceRoot, sessionId, {
			agentNumericId: input.agentNumericId,
			agentSlugAtJoin: input.agentSlug,
			displayNameAtJoin: input.displayName,
			roleAtJoin: input.role,
			taskId: input.taskId,
			lastMessagePreview: input.lastMessagePreview,
			usage: input.usage,
			transcript: input.sdkSessionId
				? { sdkSessionId: input.sdkSessionId, runIds: [] }
				: undefined,
		});

		const participant = updatedSession.participants.find(
			(p) => p.agentNumericId === input.agentNumericId,
		);
		if (!participant) {
			throw new Error(
				`Failed to locate participant ${input.agentNumericId} after upserting in session '${sessionId}'`,
			);
		}

		// Register in active memory for rapid turn/event resolution
		setActiveTaskBinding(input.taskId, {
			sessionId,
			agentNumericId: input.agentNumericId,
			workspaceRoot: input.workspaceRoot,
			boundAt: new Date().toISOString(),
		});

		return {
			session: updatedSession,
			isNewSession,
			participant,
		};
	});
}

/**
 * Idempotently associates a durable Team run with its explicitly identified
 * Orvanta participant. This records identifiers only; it never reads or copies
 * transcript messages and never infers the SDK session ID from the run ID.
 */
export async function recordTeamRunTranscriptLink(
	input: RecordTeamRunTranscriptLinkInput,
): Promise<OrvantaSessionManifest> {
	validateSessionId(input.sessionId);
	if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input.runId)) {
		throw new Error("runId must be 1-64 alphanumeric characters, dashes or underscores");
	}
	return upsertParticipant(input.workspaceRoot, input.sessionId, {
		...input.participant,
		transcript: { ...input.transcript, runIds: [input.runId] },
	});
}

/**
 * Updates a task turn event (status, usage, preview) idempotently.
 * Resolves the session and participant identity, updates timestamps and aggregate usage.
 */
export async function recordTaskTurnEvent(
	input: RecordTaskTurnEventInput,
): Promise<OrvantaSessionManifest> {
	validateTaskId(input.taskId);

	// Resolve sessionId and agentNumericId from input or active binding registry
	let sessionId = input.sessionId;
	let agentNumericId = input.agentNumericId;

	if (!sessionId || !agentNumericId) {
		const activeBinding = getActiveTaskBinding(input.taskId);
		if (activeBinding) {
			sessionId = sessionId || activeBinding.sessionId;
			agentNumericId = agentNumericId || activeBinding.agentNumericId;
		}
	}

	if (!sessionId) {
		throw new Error(
			`Cannot record task turn event: no sessionId provided or bound for task '${input.taskId}'`,
		);
	}

	validateSessionId(sessionId);

	return withHistoryLock(input.workspaceRoot, async () => {
		const session = await getSession(input.workspaceRoot, sessionId!);
		const existingParticipant = session.participants.find((p) => p.taskId === input.taskId);

		if (!existingParticipant) {
			throw new Error(
				`Cannot record task turn event: task '${input.taskId}' is not bound to any participant in session '${sessionId}'`,
			);
		}

		const resolvedAgentId = agentNumericId || existingParticipant.agentNumericId;

		return upsertParticipant(input.workspaceRoot, sessionId!, {
			agentNumericId: resolvedAgentId,
			agentSlugAtJoin: existingParticipant.agentSlugAtJoin,
			displayNameAtJoin: existingParticipant.displayNameAtJoin,
			roleAtJoin: existingParticipant.roleAtJoin,
			taskId: input.taskId,
			status: input.status ?? existingParticipant.status,
			usage: input.usage ?? existingParticipant.usage,
			lastMessagePreview: input.lastMessagePreview ?? existingParticipant.lastMessagePreview,
			lastActiveAt: new Date().toISOString(),
		});
	});
}

// ============================================================================
// Child/Spawned Task Reconciliation & Missing Task Handling
// ============================================================================

/**
 * Reconciles a spawned/subtask or teammate handoff task within the parent session.
 * Records the child task as a teammate participant under the existing session.
 */
export async function reconcileSpawnedTask(
	input: ReconcileSpawnedTaskInput,
): Promise<OrvantaSessionManifest> {
	validateSessionId(input.sessionId);
	validateTaskId(input.parentTaskId);
	validateTaskId(input.childTaskId);

	return withHistoryLock(input.workspaceRoot, async () => {
		const session = await getSession(input.workspaceRoot, input.sessionId, {
			expectedCompanyId: input.companyId,
		});

		// Verify parent task is part of this session
		const parentExists = session.participants.some((p) => p.taskId === input.parentTaskId);
		if (!parentExists) {
			throw new SessionConflictError(
				input.sessionId,
				`Parent task '${input.parentTaskId}' is not a participant in session '${input.sessionId}'`,
			);
		}

		// Upsert the spawned agent task as a teammate participant
		const updated = await upsertParticipant(input.workspaceRoot, input.sessionId, {
			agentNumericId: input.targetAgentNumericId,
			agentSlugAtJoin: input.targetAgentSlug,
			displayNameAtJoin: input.targetDisplayName,
			roleAtJoin: input.targetRole || "teammate",
			taskId: input.childTaskId,
			lastMessagePreview: input.lastMessagePreview,
		});

		// Register active binding for child task
		setActiveTaskBinding(input.childTaskId, {
			sessionId: input.sessionId,
			agentNumericId: input.targetAgentNumericId,
			workspaceRoot: input.workspaceRoot,
			boundAt: new Date().toISOString(),
		});

		return updated;
	});
}

/**
 * Marks a participant's task status as "unknown" / unavailable when the SDK task
 * or transcript no longer exists on disk.
 * Preserves the session and other participants without crashing or falling back to legacy data.
 */
export async function markTaskUnavailable(
	workspaceRoot: string,
	sessionId: string,
	taskId: string,
): Promise<OrvantaSessionManifest> {
	validateSessionId(sessionId);
	validateTaskId(taskId);

	return withHistoryLock(workspaceRoot, async () => {
		const session = await getSession(workspaceRoot, sessionId);
		const participant = session.participants.find((p) => p.taskId === taskId);
		if (!participant) {
			return session;
		}

		return upsertParticipant(workspaceRoot, sessionId, {
			agentNumericId: participant.agentNumericId,
			agentSlugAtJoin: participant.agentSlugAtJoin,
			displayNameAtJoin: participant.displayNameAtJoin,
			roleAtJoin: participant.roleAtJoin,
			taskId: participant.taskId,
			status: "unknown",
			lastMessagePreview: participant.lastMessagePreview,
			usage: participant.usage,
			lastActiveAt: new Date().toISOString(),
		});
	});
}

// ============================================================================
// Agent Rename / Identity Resolution Across Sessions
// ============================================================================

/**
 * Resolves an agent's current display identity versus their historical snapshot identity.
 * If the agent was renamed or retired in roster.json after the session was created,
 * this provides both current identity and snapshot identity without altering history.
 */
export function getParticipantDisplayIdentity(
	participant: OrvantaSessionParticipant,
	currentRoster?: RosterJson,
): ParticipantDisplayIdentity {
	if (!currentRoster) {
		return {
			agentNumericId: participant.agentNumericId,
			currentSlug: participant.agentSlugAtJoin,
			currentDisplayName: participant.displayNameAtJoin,
			snapshotSlug: participant.agentSlugAtJoin,
			snapshotDisplayName: participant.displayNameAtJoin,
			isRenamed: false,
			isRetired: false,
		};
	}

	const activeAgent = currentRoster.agents.find(
		(a) => a.agentNumericId === participant.agentNumericId,
	);
	if (activeAgent) {
		const isRenamed =
			activeAgent.id !== participant.agentSlugAtJoin ||
			activeAgent.displayName !== participant.displayNameAtJoin;
		return {
			agentNumericId: participant.agentNumericId,
			currentSlug: activeAgent.id,
			currentDisplayName: activeAgent.displayName,
			snapshotSlug: participant.agentSlugAtJoin,
			snapshotDisplayName: participant.displayNameAtJoin,
			isRenamed,
			isRetired: false,
		};
	}

	const retiredAgent = currentRoster.retiredAgents?.find(
		(r) => r.agentNumericId === participant.agentNumericId,
	);
	if (retiredAgent) {
		return {
			agentNumericId: participant.agentNumericId,
			currentSlug: retiredAgent.id,
			currentDisplayName: retiredAgent.displayName,
			snapshotSlug: participant.agentSlugAtJoin,
			snapshotDisplayName: participant.displayNameAtJoin,
			isRenamed: false,
			isRetired: true,
		};
	}

	// Not found in current roster or retired list: keep historical snapshot
	return {
		agentNumericId: participant.agentNumericId,
		currentSlug: participant.agentSlugAtJoin,
		currentDisplayName: participant.displayNameAtJoin,
		snapshotSlug: participant.agentSlugAtJoin,
		snapshotDisplayName: participant.displayNameAtJoin,
		isRenamed: false,
		isRetired: false,
	};
}


