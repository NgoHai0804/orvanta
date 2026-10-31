import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { WORKSPACE_DIRNAME } from "./paths";
import { validateSessionId } from "./session-history-store";

async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

export type CeoPauseStatus =
	| "none"
	| "pause_requested"
	| "paused"
	| "partial";

export type CeoParticipantPauseState = "draining" | "safe" | "failed";

export interface CeoNeedsAttentionItem {
	agentId: string;
	reason: string;
	at: string;
}

export interface CeoSessionPauseRecord {
	sessionId: string;
	status: CeoPauseStatus;
	requestedAt?: string;
	acknowledgedAt?: string;
	participants: Record<string, CeoParticipantPauseState>;
	/** Side effects / interrupted runs that must not be blindly replayed. */
	needsAttention?: CeoNeedsAttentionItem[];
}

const PAUSE_FILE = "local/db/ceo-session-pause.json";

export class CeoSessionPauseError extends Error {
	constructor(
		readonly code:
			| "NOT_FOUND"
			| "WORKSPACE_MISMATCH"
			| "CORRUPT"
			| "IO",
		message: string,
	) {
		super(message);
		this.name = "CeoSessionPauseError";
	}
}

function pauseFilePath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, PAUSE_FILE);
}

async function readPauseMap(
	workspaceRoot: string,
): Promise<Record<string, CeoSessionPauseRecord>> {
	const filePath = pauseFilePath(workspaceRoot);
	if (!(await pathExists(filePath))) {
		return {};
	}
	try {
		const raw = await readFile(filePath, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new CeoSessionPauseError("CORRUPT", "Pause store JSON is not an object");
		}
		return parsed as Record<string, CeoSessionPauseRecord>;
	} catch (error) {
		if (error instanceof CeoSessionPauseError) throw error;
		throw new CeoSessionPauseError(
			"CORRUPT",
			error instanceof Error ? error.message : "Failed to read pause store",
		);
	}
}

async function writePauseMap(
	workspaceRoot: string,
	map: Record<string, CeoSessionPauseRecord>,
): Promise<void> {
	const filePath = pauseFilePath(workspaceRoot);
	await mkdir(join(workspaceRoot, WORKSPACE_DIRNAME, "local", "db"), {
		recursive: true,
	});
	const tmp = `${filePath}.tmp`;
	await writeFile(tmp, `${JSON.stringify(map, null, "\t")}\n`, "utf8");
	await rename(tmp, filePath);
}

export async function getCeoSessionPause(
	workspaceRoot: string,
	sessionId: string,
): Promise<CeoSessionPauseRecord | undefined> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	return map[id];
}

export async function requestCeoSessionPause(
	workspaceRoot: string,
	sessionId: string,
): Promise<CeoSessionPauseRecord> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	const existing = map[id];
	const record: CeoSessionPauseRecord = {
		sessionId: id,
		status: "pause_requested",
		requestedAt: existing?.requestedAt ?? new Date().toISOString(),
		participants: existing?.participants ?? {},
	};
	map[id] = record;
	await writePauseMap(workspaceRoot, map);
	return record;
}

export async function acknowledgeCeoSessionPause(
	workspaceRoot: string,
	sessionId: string,
	participants: Record<string, CeoParticipantPauseState>,
): Promise<CeoSessionPauseRecord> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	const existing = map[id];
	if (!existing) {
		throw new CeoSessionPauseError(
			"NOT_FOUND",
			`No pause request for session '${id}'`,
		);
	}
	const values = Object.values(participants);
	const allSafe = values.length > 0 && values.every((state) => state === "safe");
	const anyFailed = values.some((state) => state === "failed");
	const record: CeoSessionPauseRecord = {
		...existing,
		participants,
		status: anyFailed || !allSafe ? "partial" : "paused",
		acknowledgedAt: allSafe && !anyFailed ? new Date().toISOString() : existing.acknowledgedAt,
	};
	map[id] = record;
	await writePauseMap(workspaceRoot, map);
	return record;
}

export function isCeoSessionDispatchBlocked(
	record: CeoSessionPauseRecord | undefined,
): boolean {
	return record?.status === "pause_requested" || record?.status === "paused";
}

/**
 * Clears pause for a CEO session so dispatch can resume.
 * Idempotent when there is no pause record (returns status "none").
 */
export async function resumeCeoSessionPause(
	workspaceRoot: string,
	sessionId: string,
): Promise<CeoSessionPauseRecord> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	const existing = map[id];
	const preservedAttention = existing?.needsAttention?.length
		? existing.needsAttention
		: undefined;
	if (!existing || existing.status === "none") {
		return {
			sessionId: id,
			status: "none",
			participants: {},
			...(preservedAttention ? { needsAttention: preservedAttention } : {}),
		};
	}
	const record: CeoSessionPauseRecord = {
		sessionId: id,
		status: "none",
		participants: {},
		// Preserve needs-attention until CEO explicitly clears / handles them.
		...(preservedAttention ? { needsAttention: preservedAttention } : {}),
	};
	map[id] = record;
	await writePauseMap(workspaceRoot, map);
	return record;
}

/**
 * Record unclear side-effect / interrupted-run items that must not be
 * auto-replayed. Does not change pause status by itself.
 */
export async function reportCeoSessionNeedsAttention(
	workspaceRoot: string,
	sessionId: string,
	items: Array<{ agentId: string; reason: string }>,
): Promise<CeoSessionPauseRecord> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	const existing = map[id] ?? {
		sessionId: id,
		status: "none" as const,
		participants: {},
	};
	const at = new Date().toISOString();
	const merged = [...(existing.needsAttention ?? [])];
	for (const item of items) {
		const agentId = item.agentId.trim();
		const reason = item.reason.trim();
		if (!agentId || !reason) continue;
		if (merged.some((m) => m.agentId === agentId && m.reason === reason)) continue;
		merged.push({ agentId, reason, at });
	}
	const record: CeoSessionPauseRecord = {
		...existing,
		sessionId: id,
		needsAttention: merged,
	};
	map[id] = record;
	await writePauseMap(workspaceRoot, map);
	return record;
}

export async function clearCeoSessionNeedsAttention(
	workspaceRoot: string,
	sessionId: string,
): Promise<CeoSessionPauseRecord> {
	const id = validateSessionId(sessionId);
	const map = await readPauseMap(workspaceRoot);
	const existing = map[id];
	if (!existing) {
		return { sessionId: id, status: "none", participants: {} };
	}
	const { needsAttention: _drop, ...rest } = existing;
	const record: CeoSessionPauseRecord = { ...rest, needsAttention: [] };
	map[id] = record;
	await writePauseMap(workspaceRoot, map);
	return record;
}
