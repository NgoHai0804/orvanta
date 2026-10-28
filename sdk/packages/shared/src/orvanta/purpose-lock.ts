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
export interface ToolPolicyOptions {
	allow?: string[];
	deny?: string[];
}

export interface ToolPolicyCheckResult {
	allowed: boolean;
	code?: "purpose_lock_denied";
	tool: string;
	reason?: string;
}

export function checkToolPolicy(options: {
	toolName: string;
	agentId?: string;
	policy?: ToolPolicyOptions;
}): ToolPolicyCheckResult {
	const tool = options.toolName.toLowerCase().trim();
	const agentId = options.agentId || "agent";
	const policy = options.policy;

	if (!policy) {
		return { allowed: true, tool: options.toolName };
	}

	const denyList = (policy.deny || []).map((t) => t.toLowerCase().trim());
	if (denyList.includes(tool)) {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			tool: options.toolName,
			reason: `Tool '${options.toolName}' bị từ chối bởi chính sách vai trò của ${agentId}.`,
		};
	}

	const allowList = (policy.allow || []).map((t) => t.toLowerCase().trim());
	if (allowList.length > 0 && !allowList.includes(tool)) {
		return {
			allowed: false,
			code: "purpose_lock_denied",
			tool: options.toolName,
			reason: `Tool '${options.toolName}' không nằm trong danh sách cho phép của vai trò ${agentId}.`,
		};
	}

	return { allowed: true, tool: options.toolName };
}

export const MAX_EPHEMERAL_PER_SESSION = 3;

export class EphemeralTracker {
	private count: number = 0;
	private readonly limit: number;

	constructor(limit: number = MAX_EPHEMERAL_PER_SESSION) {
		this.limit = limit;
	}

	getCount(): number {
		return this.count;
	}

	getLimit(): number {
		return this.limit;
	}

	canSpawn(): { allowed: boolean; count: number; limit: number; code?: "over_ephemeral"; reason?: string } {
		if (this.count >= this.limit) {
			return {
				allowed: false,
				count: this.count,
				limit: this.limit,
				code: "over_ephemeral",
				reason: `Đã đạt giới hạn tối đa ${this.limit} guest ephemeral trong session này.`,
			};
		}
		return { allowed: true, count: this.count, limit: this.limit };
	}

	recordSpawn(): boolean {
		const check = this.canSpawn();
		if (!check.allowed) {
			return false;
		}
		this.count++;
		return true;
	}

	reset(): void {
		this.count = 0;
	}
}

export function extractNegativePurposeMarkers(purposeText: string): string[] {
	if (!purposeText) return [];
	const lines = purposeText.split("\n");
	const markers: string[] = [];
	let inNegativeSection = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("#")) {
			const headerLower = trimmed.toLowerCase();
			if (headerLower.includes("không làm") || headerLower.includes("out of scope") || headerLower.includes("non-goals")) {
				inNegativeSection = true;
				continue;
			} else if (inNegativeSection) {
				inNegativeSection = false;
			}
		}

		if (inNegativeSection) {
			let content = trimmed;
			if (content.startsWith("- ") || content.startsWith("* ")) {
				content = content.slice(2).trim();
			}
			if (content.length > 2) {
				const lower = content.toLowerCase();
				markers.push(lower);
				const negativePrefixes = [
					"không được ",
					"không nên ",
					"không ",
					"never ",
					"do not ",
					"don't ",
					"no ",
				];
				for (const prefix of negativePrefixes) {
					if (lower.startsWith(prefix)) {
						const stripped = lower.slice(prefix.length).trim();
						if (stripped.length > 2) {
							markers.push(stripped);
						}
						break;
					}
				}
			}
		}
	}

	return markers;
}

export function classifyTaskScope(
	task: {
		title: string;
		description?: string;
		scopePaths?: string[];
		requiresScopeApproval?: boolean;
	},
	options: {
		purpose?: string;
		companyAllowScope?: string[];
	} = {},
): { outsidePurpose: boolean; reason?: string; matchedMarker?: string } {
	if (task.requiresScopeApproval === true) {
		return {
			outsidePurpose: true,
			reason: "Task được đánh dấu yêu cầu phê duyệt scope từ CEO.",
		};
	}

	if (options.companyAllowScope && options.companyAllowScope.length > 0) {
		const allow = options.companyAllowScope;
		if (task.scopePaths && task.scopePaths.length > 0) {
			for (const p of task.scopePaths) {
				const isAllowed = allow.some((a) => a === "**/*" || a === p || p.startsWith(a));
				if (!isAllowed) {
					return {
						outsidePurpose: true,
						reason: `Phạm vi file '${p}' nằm ngoài danh sách cho phép của công ty.`,
					};
				}
			}
		}
	}

	if (options.purpose) {
		const negativeMarkers = extractNegativePurposeMarkers(options.purpose);
		const fullText = `${task.title} ${task.description || ""}`.toLowerCase();
		for (const marker of negativeMarkers) {
			if (fullText.includes(marker)) {
				return {
					outsidePurpose: true,
					matchedMarker: marker,
					reason: `Task chứa nội dung thuộc mục 'Không làm' của purpose: '${marker}'.`,
				};
			}
		}
	}

	return { outsidePurpose: false };
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

export interface PurposeLockToolOptions {
	workspaceRoot?: string;
	requesterId?: string;
	toolPolicy?: ToolPolicyOptions;
}

export function createPurposeLockHook(
	options: PurposeLockToolOptions = {},
): AgentHooks {
	return {
		beforeTool: async (
			context: AgentBeforeToolContext,
		): Promise<AgentBeforeToolResult | undefined> => {
			const requesterId = options.requesterId ?? context.snapshot.agentId;

			if (options.toolPolicy) {
				const policyCheck = checkToolPolicy({
					toolName: context.tool.name,
					agentId: requesterId,
					policy: options.toolPolicy,
				});
				if (!policyCheck.allowed) {
					return {
						skip: true,
						reason: JSON.stringify({
							ok: false,
							code: policyCheck.code,
							tool: context.tool.name,
							reason: policyCheck.reason,
						}),
					};
				}
			}

			if (!WRITE_TOOL_NAMES.has(context.tool.name.toLowerCase())) {
				return undefined;
			}
			const paths = extractTargetPaths(context.input);
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
	options: PurposeLockToolOptions = {},
): AgentTool<TInput, TOutput> {
	const isWrite = WRITE_TOOL_NAMES.has(tool.name.toLowerCase());
	const hasPolicy = !!options.toolPolicy;

	if (!isWrite && !hasPolicy) {
		return tool;
	}

	return {
		...tool,
		execute: async (input: TInput, context: AgentToolContext): Promise<TOutput> => {
			const requesterId = options.requesterId ?? context.agentId;

			if (options.toolPolicy) {
				const policyCheck = checkToolPolicy({
					toolName: tool.name,
					agentId: requesterId,
					policy: options.toolPolicy,
				});
				if (!policyCheck.allowed) {
					return {
						ok: false,
						code: policyCheck.code,
						tool: tool.name,
						reason: policyCheck.reason,
					} as unknown as TOutput;
				}
			}

			if (isWrite) {
				const paths = extractTargetPaths(input);
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
			}

			return tool.execute(input, context);
		},
	};
}
