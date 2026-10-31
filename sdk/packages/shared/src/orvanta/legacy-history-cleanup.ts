import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import {
	COMPANY_FILE,
	HISTORY_SESSIONS_FILE,
	HISTORY_TASKS_DIR,
	PURPOSE_FILE,
	ROSTER_FILE,
	WORKSPACE_DIRNAME,
} from "./paths";

async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

export type InventoryLabel = "keep" | "migrate" | "delete";

export interface InventoryPath {
	relativePath: string;
	label: InventoryLabel;
	reason: string;
}

export interface CleanupListing {
	path: string;
	relativePath: string;
	label: InventoryLabel;
}

/** Only these relative paths may be deleted by the legacy-history cleaner. */
export const LEGACY_HISTORY_DELETE_PATHS: InventoryPath[] = [
	{
		relativePath: HISTORY_SESSIONS_FILE,
		label: "delete",
		reason: "Legacy workspace-history-store session list",
	},
	{
		relativePath: HISTORY_TASKS_DIR,
		label: "delete",
		reason: "Legacy per-task ui_messages cache",
	},
];

export const PROTECTED_KEEP_PATHS: InventoryPath[] = [
	{ relativePath: COMPANY_FILE, label: "keep", reason: "Company identity" },
	{ relativePath: PURPOSE_FILE, label: "keep", reason: "Company purpose" },
	{ relativePath: ROSTER_FILE, label: "keep", reason: "Agent roster" },
	{ relativePath: "org/agents", label: "keep", reason: "Agent profiles" },
	{ relativePath: "local/sdk", label: "keep", reason: "SDK transcripts" },
	{ relativePath: "local/memory", label: "keep", reason: "Accepted memory" },
	{ relativePath: "local/history", label: "keep", reason: "Canonical CEO history" },
	{ relativePath: "local/db", label: "keep", reason: "TeamStore" },
];

export function getLegacyHistoryInventory(): InventoryPath[] {
	return [...PROTECTED_KEEP_PATHS, ...LEGACY_HISTORY_DELETE_PATHS];
}

async function listFilesRecursive(root: string, relativeBase: string): Promise<string[]> {
	if (!(await pathExists(root))) {
		return [];
	}
	const info = await stat(root);
	if (info.isFile()) {
		return [relativeBase];
	}
	const entries = await readdir(root, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const rel = relativeBase ? join(relativeBase, entry.name) : entry.name;
		const abs = join(root, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listFilesRecursive(abs, rel)));
		} else {
			files.push(rel);
		}
	}
	return files;
}

export async function dryRunLegacyHistoryCleanup(
	workspaceRoot: string,
): Promise<CleanupListing[]> {
	const listings: CleanupListing[] = [];
	for (const item of LEGACY_HISTORY_DELETE_PATHS) {
		const abs = join(workspaceRoot, WORKSPACE_DIRNAME, item.relativePath);
		const files = await listFilesRecursive(abs, item.relativePath);
		if (files.length === 0 && (await pathExists(abs))) {
			listings.push({
				path: abs,
				relativePath: item.relativePath,
				label: "delete",
			});
			continue;
		}
		for (const relativePath of files) {
			listings.push({
				path: join(workspaceRoot, WORKSPACE_DIRNAME, relativePath),
				relativePath: relativePath.replace(/\\/g, "/"),
				label: "delete",
			});
		}
	}
	return listings;
}

export async function applyLegacyHistoryCleanup(
	workspaceRoot: string,
): Promise<CleanupListing[]> {
	const planned = await dryRunLegacyHistoryCleanup(workspaceRoot);
	for (const item of LEGACY_HISTORY_DELETE_PATHS) {
		const abs = join(workspaceRoot, WORKSPACE_DIRNAME, item.relativePath);
		if (await pathExists(abs)) {
			await rm(abs, { recursive: true, force: true });
		}
	}
	return planned;
}
