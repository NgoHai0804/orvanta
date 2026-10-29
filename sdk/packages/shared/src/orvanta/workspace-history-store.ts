import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	HISTORY_SESSIONS_FILE,
	HISTORY_TASKS_DIR,
	WORKSPACE_DIRNAME,
} from "./paths";

export interface OrvantaSessionAgentInfo {
	id: string;
	displayName: string;
	role: "lead" | "teammate";
	avatarUrl?: string;
	model?: string;
}

export interface OrvantaSessionAgentConversation {
	agentId: string;
	displayName: string;
	role: "lead" | "teammate";
	taskId: string;
	lastMessage?: string;
	tokensIn?: number;
	tokensOut?: number;
	totalCost?: number;
	updatedAt: number;
}

export interface OrvantaSessionRecord {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	tokensIn?: number;
	tokensOut?: number;
	totalCost?: number;
	agentIds?: string[];
	agents?: OrvantaSessionAgentInfo[];
	/** Map between agentId and taskId within this session */
	agentTasks?: Record<string, string>;
	/** Detailed conversations per agent */
	agentConversations?: OrvantaSessionAgentConversation[];
	activeAgentId?: string;
	status?: "running" | "completed" | "interrupted" | "error";
	isFavorited?: boolean;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export function getWorkspaceHistoryPath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME);
}

export function getSessionsFilePath(workspaceRoot: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_SESSIONS_FILE);
}

export function getTaskDirPath(workspaceRoot: string, taskId: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, HISTORY_TASKS_DIR, taskId);
}

export function getTaskUiMessagesFilePath(
	workspaceRoot: string,
	taskId: string,
): string {
	return join(getTaskDirPath(workspaceRoot, taskId), "ui_messages.json");
}

export function getTaskMetadataFilePath(
	workspaceRoot: string,
	taskId: string,
): string {
	return join(getTaskDirPath(workspaceRoot, taskId), "metadata.json");
}

export async function loadWorkspaceSessions(
	workspaceRoot: string,
): Promise<OrvantaSessionRecord[]> {
	const filePath = getSessionsFilePath(workspaceRoot);
	if (!(await pathExists(filePath))) {
		return [];
	}
	try {
		const raw = await readFile(filePath, "utf8");
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

export async function saveWorkspaceSession(
	workspaceRoot: string,
	session: OrvantaSessionRecord,
): Promise<void> {
	const sessions = await loadWorkspaceSessions(workspaceRoot);
	const index = sessions.findIndex((s) => s.id === session.id);
	if (index >= 0) {
		sessions[index] = {
			...sessions[index],
			...session,
			updatedAt: session.updatedAt || Date.now(),
		};
	} else {
		sessions.unshift({
			...session,
			createdAt: session.createdAt || Date.now(),
			updatedAt: session.updatedAt || Date.now(),
		});
	}

	const filePath = getSessionsFilePath(workspaceRoot);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(sessions, null, 2), "utf8");
}

export async function saveWorkspaceTaskMessages(
	workspaceRoot: string,
	taskId: string,
	messages: unknown[],
): Promise<void> {
	const filePath = getTaskUiMessagesFilePath(workspaceRoot, taskId);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
}

export async function saveWorkspaceTaskMetadata(
	workspaceRoot: string,
	taskId: string,
	metadata: unknown,
): Promise<void> {
	const filePath = getTaskMetadataFilePath(workspaceRoot, taskId);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(metadata, null, 2), "utf8");
}

export async function loadWorkspaceTaskMetadata<T = unknown>(
	workspaceRoot: string,
	taskId: string,
): Promise<T | undefined> {
	const filePath = getTaskMetadataFilePath(workspaceRoot, taskId);
	if (!(await pathExists(filePath))) {
		return undefined;
	}
	try {
		const raw = await readFile(filePath, "utf8");
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
}

export async function loadWorkspaceTaskMessages<T = unknown>(
	workspaceRoot: string,
	taskId: string,
): Promise<T[] | undefined> {
	const filePath = getTaskUiMessagesFilePath(workspaceRoot, taskId);
	if (!(await pathExists(filePath))) {
		return undefined;
	}
	try {
		const raw = await readFile(filePath, "utf8");
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data : undefined;
	} catch {
		return undefined;
	}
}

export async function deleteWorkspaceSession(
	workspaceRoot: string,
	taskId: string,
): Promise<void> {
	const sessions = await loadWorkspaceSessions(workspaceRoot);
	const filtered = sessions.filter((s) => s.id !== taskId);
	const filePath = getSessionsFilePath(workspaceRoot);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(filtered, null, 2), "utf8");

	const taskDir = getTaskDirPath(workspaceRoot, taskId);
	if (await pathExists(taskDir)) {
		await rm(taskDir, { recursive: true, force: true });
	}
}
