import type {
	AgentBeforeToolContext,
	AgentBeforeToolResult,
	AgentTool,
	AgentToolContext,
} from "../agent";
import type { AgentHooks } from "../agents/types";

import { WORKSPACE_DIRNAME } from "./paths";

export interface PurposeLockCheckResult {
	allowed: boolean;
	code?: "purpose_lock_denied";
	reason?: string;
	path?: string;
}

export interface CheckPurposeLockOptions {
	targetPath: string;
	workspaceRoot?: string;
	requesterId?: string;
}

export function normalizeTargetPath(
	targetPath: string,
	workspaceRoot?: string,
): string {
	let normalized = targetPath.replace(/\\/g, "/").trim();
	if (workspaceRoot) {
		const normRoot = workspaceRoot.replace(/\\/g, "/").replace(/\/+$/, "");
		if (normalized.toLowerCase().startsWith(`${normRoot.toLowerCase()}/`)) {
			normalized = normalized.slice(normRoot.length + 1);
		} else if (normalized.toLowerCase() === normRoot.toLowerCase()) {
			normalized = "";
		}
	}
	while (normalized.startsWith("./")) {
		normalized = normalized.slice(2);
	}
	return normalized;
}

export function checkPurposeLockPath(
	options: CheckPurposeLockOptions,
): PurposeLockCheckResult {
	const relPath = normalizeTargetPath(options.targetPath, options.workspaceRoot);
	const lower = relPath.toLowerCase();

	const isInsideOrvanta =
		lower === WORKSPACE_DIRNAME || lower.startsWith(`${WORKSPACE_DIRNAME}/`);

	if (!isInsideOrvanta) {
		return { allowed: true, path: relPath };
	}

	const subPath = lower.slice(WORKSPACE_DIRNAME.length + 1);

	// Agent's own space: org/agents/<requesterId>/workspace/**
	if (options.requesterId) {
		const ownPrefix = `org/agents/${options.requesterId.toLowerCase()}/workspace/`;
		if (subPath.startsWith(ownPrefix)) {
			return { allowed: true, path: relPath };
		}
	}

	// Hand-offs folder requires orvanta_submit_handoff
	if (subPath === "shared/handoffs" || subPath.startsWith("shared/handoffs/")) {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason:
				"Ghi trực tiếp vào shared/handoffs bằng write_to_file bị cấm. Phải dùng orvanta_submit_handoff để nộp bài.",
			path: relPath,
		};
	}

	// 3 mandatory deny write paths
	if (lower === ".orvanta/purpose.md") {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason: "Sửa .orvanta/purpose.md bị cấm bởi Purpose-lock (lớp 2).",
			path: relPath,
		};
	}
	if (lower === ".orvanta/company.json") {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason: "Sửa .orvanta/company.json bị cấm bởi Purpose-lock (lớp 2).",
			path: relPath,
		};
	}
	if (lower === ".orvanta/org/roster.json") {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason: "Sửa .orvanta/org/roster.json bị cấm bởi Purpose-lock (lớp 2).",
			path: relPath,
		};
	}

	// Profile files (identity)
	if (subPath.startsWith("org/agents/") && subPath.endsWith("/profile.md")) {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason:
				"Sửa profile.md của chính mình hoặc agent khác bị cấm bởi Purpose-lock.",
			path: relPath,
		};
	}

	// Other agents' workspaces
	if (subPath.startsWith("org/agents/") && subPath.includes("/workspace/")) {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			reason: "Không được ghi vào không gian làm việc của agent khác.",
			path: relPath,
		};
	}

	return {
		allowed: false,
		code: "purpose_lock_denied",
		reason: "Vùng hệ thống .orvanta được bảo vệ bởi Purpose-lock.",
		path: relPath,
	};
}

export const WRITE_TOOL_NAMES = new Set([
	"write_to_file",
	"editor",
	"apply_patch",
	"apply_diff",
	"write_file",
]);

function extractTargetPaths(input: unknown): string[] {
	if (!input || typeof input !== "object") return [];
	const rec = input as Record<string, unknown>;
	const paths: string[] = [];
	for (const key of ["path", "filePath", "targetPath"]) {
		if (typeof rec[key] === "string" && (rec[key] as string).trim()) {
			paths.push((rec[key] as string).trim());
		}
	}
	return paths;
}

export function createPurposeLockHook(
	options: { workspaceRoot?: string; requesterId?: string } = {},
): AgentHooks {
	return {
		beforeTool: async (
			context: AgentBeforeToolContext,
		): Promise<AgentBeforeToolResult | undefined> => {
			if (!WRITE_TOOL_NAMES.has(context.tool.name.toLowerCase())) {
				return undefined;
			}
			const paths = extractTargetPaths(context.input);
			const requesterId = options.requesterId ?? context.snapshot.agentId;
			for (const p of paths) {
				const check = checkPurposeLockPath({
					targetPath: p,
					workspaceRoot: options.workspaceRoot,
					requesterId,
				});
				if (!check.allowed) {
					return {
						skip: true,
						reason: JSON.stringify({
							ok: false,
							code: check.code,
							path: p,
							reason: check.reason,
						}),
					};
				}
			}
			return undefined;
		},
	};
}

export function wrapToolWithPurposeLock<TInput, TOutput>(
	tool: AgentTool<TInput, TOutput>,
	options: { workspaceRoot?: string; requesterId?: string } = {},
): AgentTool<TInput, TOutput> {
	if (!WRITE_TOOL_NAMES.has(tool.name.toLowerCase())) {
		return tool;
	}
	return {
		...tool,
		execute: async (input: TInput, context: AgentToolContext): Promise<TOutput> => {
			const paths = extractTargetPaths(input);
			const requesterId = options.requesterId ?? context.agentId;
			for (const p of paths) {
				const check = checkPurposeLockPath({
					targetPath: p,
					workspaceRoot: options.workspaceRoot,
					requesterId,
				});
				if (!check.allowed) {
					return {
						ok: false,
						code: check.code,
						path: p,
						reason: check.reason,
					} as unknown as TOutput;
				}
			}
			return tool.execute(input, context);
		},
	};
}
