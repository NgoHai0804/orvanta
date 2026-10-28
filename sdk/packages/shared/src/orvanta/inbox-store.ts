import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	CannotFireCoordinatorError,
	DecisionNotFoundError,
	DecisionItemSchema,
	MergeRejectNoteRequiredError,
	type DecisionItem,
	type DecisionType,
	type DecisionUrgency,
	type HistoryInboxEntry,
	HistoryInboxEntrySchema,
	type PendingInbox,
	PendingInboxSchema,
} from "./inbox-schema";
export { MergeRejectNoteRequiredError } from "./inbox-schema";

import {
	COORDINATOR_AGENT_ID,
	INBOX_HISTORY_FILE,
	INBOX_PENDING_FILE,
	SCHEMA_VERSION,
	WORKSPACE_DIRNAME,
} from "./paths";
import { pathExists } from "./workspace-store";

export interface CreateDecisionInput {
	type: DecisionType;
	title: string;
	summary: string;
	payload: Record<string, unknown>;
	urgency?: DecisionUrgency;
	createdBy?: string;
}

export interface ResolveDecisionInput {
	id: string;
	action: "approve" | "reject" | "defer" | "reopen";
	note?: string;
	resolvedBy?: string;
}

export function getPendingInboxPath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, INBOX_PENDING_FILE);
}

export function getHistoryInboxPath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, INBOX_HISTORY_FILE);
}

export async function loadPendingInbox(
	workspaceRoot: string,
): Promise<PendingInbox> {
	const pendingPath = getPendingInboxPath(workspaceRoot);
	if (!(await pathExists(pendingPath))) {
		return { schemaVersion: SCHEMA_VERSION, items: [] };
	}
	try {
		const raw = await readFile(pendingPath, "utf-8");
		const parsed = JSON.parse(raw);
		const directValidation = PendingInboxSchema.safeParse(parsed);
		if (directValidation.success) {
			return directValidation.data;
		}

		// Graceful recovery for individual items if whole array parse fails
		if (parsed && Array.isArray(parsed.items)) {
			const sanitizedItems: DecisionItem[] = [];
			for (const rawItem of parsed.items) {
				if (!rawItem || typeof rawItem !== "object") continue;
				const title =
					typeof rawItem.title === "string" && rawItem.title.trim().length > 0
						? rawItem.title.trim()
						: typeof rawItem.summary === "string" && rawItem.summary.trim().length > 0
							? rawItem.summary.trim()
							: "Quyết định mới";
				const summary =
					typeof rawItem.summary === "string" ? rawItem.summary : title;
				const payload =
					rawItem.payload && typeof rawItem.payload === "object"
						? rawItem.payload
						: {};
				const candidate = {
					...rawItem,
					title,
					summary,
					payload,
				};
				const itemVal = DecisionItemSchema.safeParse(candidate);

				if (itemVal.success) {
					sanitizedItems.push(itemVal.data);
				}
			}
			return {
				schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
				items: sanitizedItems,
			};
		}

		return { schemaVersion: SCHEMA_VERSION, items: [] };
	} catch {
		return { schemaVersion: SCHEMA_VERSION, items: [] };
	}
}

export async function savePendingInbox(
	workspaceRoot: string,
	inbox: PendingInbox,
): Promise<void> {
	const pendingPath = getPendingInboxPath(workspaceRoot);
	await mkdir(dirname(pendingPath), { recursive: true });
	await writeFile(pendingPath, JSON.stringify(inbox, null, 2) + "\n", "utf-8");
}

export async function loadHistoryInbox(
	workspaceRoot: string,
): Promise<HistoryInboxEntry[]> {
	const historyPath = getHistoryInboxPath(workspaceRoot);
	if (!(await pathExists(historyPath))) {
		return [];
	}
	try {
		const raw = await readFile(historyPath, "utf-8");
		const lines = raw.split("\n").filter((line) => line.trim().length > 0);
		const entries: HistoryInboxEntry[] = [];
		for (const line of lines) {
			try {
				const validated = HistoryInboxEntrySchema.safeParse(JSON.parse(line));
				if (validated.success) {
					entries.push(validated.data);
				}
			} catch {
				// skip line
			}
		}
		return entries;
	} catch {
		return [];
	}
}

export async function appendHistoryInbox(
	workspaceRoot: string,
	entry: HistoryInboxEntry,
): Promise<void> {
	const historyPath = getHistoryInboxPath(workspaceRoot);
	await mkdir(dirname(historyPath), { recursive: true });
	await appendFile(historyPath, JSON.stringify(entry) + "\n", "utf-8");
}

export async function requestDecision(
	workspaceRoot: string,
	input: CreateDecisionInput,
): Promise<{ item: DecisionItem; isDuplicate: boolean }> {
	if (input.type === "fire_agent") {
		const agentId = String(input.payload.agentId || "");
		if (agentId === COORDINATOR_AGENT_ID || agentId === "lead") {
			throw new CannotFireCoordinatorError(agentId);
		}
	}

	const pending = await loadPendingInbox(workspaceRoot);

	let duplicate: DecisionItem | undefined;
	if (input.type === "hire_agent") {
		const agentId = String(input.payload.agentId || "");
		if (agentId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "hire_agent" &&
					String(i.payload.agentId || "") === agentId,
			);
		}
	} else if (input.type === "fire_agent") {
		const agentId = String(input.payload.agentId || "");
		if (agentId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "fire_agent" &&
					String(i.payload.agentId || "") === agentId,
			);
		}
	} else if (input.type === "change_role") {
		const agentId = String(input.payload.agentId || "");
		if (agentId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "change_role" &&
					String(i.payload.agentId || "") === agentId,
			);
		}
	} else if (input.type === "change_purpose") {
		duplicate = pending.items.find(
			(i) => i.status === "pending" && i.type === "change_purpose",
		);
	} else if (input.type === "change_scope") {
		const taskId = String(input.payload.taskId || "");
		if (taskId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "change_scope" &&
					String(i.payload.taskId || "") === taskId,
			);
		}
	} else if (input.type === "merge") {
		const outcomeId = String(input.payload.outcomeId || input.payload.diffSummary || "");
		if (outcomeId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "merge" &&
					String(i.payload.outcomeId || i.payload.diffSummary || "") === outcomeId,
			);
		}
	} else if (input.type === "over_budget") {
		duplicate = pending.items.find(
			(i) => i.status === "pending" && i.type === "over_budget",
		);
	} else if (input.type === "over_ephemeral") {
		duplicate = pending.items.find(
			(i) => i.status === "pending" && i.type === "over_ephemeral",
		);
	} else if (input.type === "escalate_blocked") {
		const taskId = String(input.payload.taskId || "");
		if (taskId) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "escalate_blocked" &&
					String(i.payload.taskId || "") === taskId,
			);
		}
	} else if (input.type === "change_policy") {
		const key = String(input.payload.key || "");
		if (key) {
			duplicate = pending.items.find(
				(i) =>
					i.status === "pending" &&
					i.type === "change_policy" &&
					String(i.payload.key || "") === key,
			);
		}
	}

	if (duplicate) {
		return { item: duplicate, isDuplicate: true };
	}

	let defaultUrgency: DecisionUrgency = "normal";
	if (
		input.type === "change_purpose" ||
		input.type === "merge" ||
		input.type === "over_budget"
	) {
		defaultUrgency = "high";
	} else if (
		input.type === "change_role" ||
		input.type === "escalate_blocked" ||
		input.type === "over_ephemeral"
	) {
		defaultUrgency = "low";
	}

	const newItem: DecisionItem = {
		id: `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
		type: input.type,
		status: "pending",
		createdAt: new Date().toISOString(),
		createdBy: input.createdBy || "coordinator",
		title: input.title?.trim() || input.summary?.trim() || "Quyết định mới",
		summary: input.summary?.trim() || input.title?.trim() || "",
		payload: input.payload ?? {},
		urgency: input.urgency || defaultUrgency,
	};

	pending.items.push(newItem);
	await savePendingInbox(workspaceRoot, pending);

	return { item: newItem, isDuplicate: false };
}

export async function resolveDecision(
	workspaceRoot: string,
	input: ResolveDecisionInput,
): Promise<{ resolved?: HistoryInboxEntry; item: DecisionItem }> {
	const pending = await loadPendingInbox(workspaceRoot);
	const index = pending.items.findIndex((i) => i.id === input.id);
	if (index === -1) {
		throw new DecisionNotFoundError(input.id);
	}

	const item = pending.items[index];

	if (item.type === "merge" && input.action === "reject") {
		if (!input.note || input.note.trim().length < 8) {
			throw new MergeRejectNoteRequiredError();
		}
	}

	if (input.action === "defer") {
		item.status = "deferred";
		await savePendingInbox(workspaceRoot, pending);
		return { item };
	}

	if (input.action === "reopen") {
		item.status = "pending";
		await savePendingInbox(workspaceRoot, pending);
		return { item };
	}

	pending.items.splice(index, 1);
	await savePendingInbox(workspaceRoot, pending);

	const resolvedStatus = input.action === "approve" ? "approved" : "rejected";
	const historyEntry: HistoryInboxEntry = {
		id: item.id,
		type: item.type,
		status: resolvedStatus,
		resolvedAt: new Date().toISOString(),
		resolvedBy: input.resolvedBy || "ceo",
		note: input.note || "",
		title: item.title,
		summary: item.summary,
		payload: item.payload,
		urgency: item.urgency,
		createdAt: item.createdAt,
		createdBy: item.createdBy,
	};

	await appendHistoryInbox(workspaceRoot, historyEntry);

	return {
		resolved: historyEntry,
		item: {
			...item,
			status: resolvedStatus,
		},
	};
}

