import { z } from "zod";
import { SCHEMA_VERSION } from "./paths";

export const DecisionTypeSchema = z.enum([
	"hire_agent",
	"fire_agent",
	"change_role",
	"change_purpose",
	"change_scope",
	"merge",
	"over_budget",
	"over_ephemeral",
	"escalate_blocked",
	"change_policy",
]);
export type DecisionType = z.infer<typeof DecisionTypeSchema>;

export const DecisionStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"deferred",
]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const DecisionUrgencySchema = z.enum(["low", "normal", "high"]);
export type DecisionUrgency = z.infer<typeof DecisionUrgencySchema>;

export const HireAgentPayloadSchema = z.object({
	agentId: z.string().min(1),
	displayName: z.string().optional(),
	rolePromptPreview: z.string().optional(),
	tools: z
		.object({
			allow: z.array(z.string()).optional(),
			deny: z.array(z.string()).optional(),
		})
		.optional(),
	modelId: z.string().optional(),
	maxIterations: z.number().int().positive().optional(),
	profile: z.record(z.string(), z.unknown()).optional(),
});
export type HireAgentPayload = z.infer<typeof HireAgentPayloadSchema>;

export const FireAgentPayloadSchema = z.object({
	agentId: z.string().min(1),
	reason: z.string().min(1),
	reassignTasks: z.boolean().optional(),
});
export type FireAgentPayload = z.infer<typeof FireAgentPayloadSchema>;

export const ChangePurposePayloadSchema = z.object({
	from: z.string(),
	to: z.string().min(1),
});
export type ChangePurposePayload = z.infer<typeof ChangePurposePayloadSchema>;
export const ChangeRolePayloadSchema = z.object({
	agentId: z.string().min(1),
	fromFrontmatter: z.record(z.string(), z.unknown()).optional(),
	toFrontmatter: z.record(z.string(), z.unknown()).optional(),
	profile: z.record(z.string(), z.unknown()).optional(),
	tools: z
		.object({
			allow: z.array(z.string()).optional(),
			deny: z.array(z.string()).optional(),
		})
		.optional(),
});
export type ChangeRolePayload = z.infer<typeof ChangeRolePayloadSchema>;

export const ChangeScopePayloadSchema = z.object({
	taskId: z.string().min(1),
	title: z.string().min(1),
	whyOutsidePurpose: z.string().min(1),
	proposedScope: z.string().optional(),
});
export type ChangeScopePayload = z.infer<typeof ChangeScopePayloadSchema>;

export const MergePayloadSchema = z.object({
	outcomeId: z.string().optional(),
	diffSummary: z.string().optional(),
	files: z.array(z.string()).default([]),
	risk: z.string().optional(),
	authorAgentId: z.string().optional(),
});
export type MergePayload = z.infer<typeof MergePayloadSchema>;

export const OverBudgetPayloadSchema = z.object({
	spentUsd: z.number().nonnegative(),
	limitUsd: z.number().positive(),
	window: z.string().min(1),
});
export type OverBudgetPayload = z.infer<typeof OverBudgetPayloadSchema>;

export const OverEphemeralPayloadSchema = z.object({
	count: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
});
export type OverEphemeralPayload = z.infer<typeof OverEphemeralPayloadSchema>;

export const EscalateBlockedPayloadSchema = z.object({
	taskId: z.string().min(1),
	blocker: z.string().min(1),
	askedAt: z.string().min(1),
	agentId: z.string().optional(),
});
export type EscalateBlockedPayload = z.infer<typeof EscalateBlockedPayloadSchema>;

export const ChangePolicyPayloadSchema = z.object({
	key: z.string().min(1),
	from: z.string(),
	to: z.string().min(1),
});
export type ChangePolicyPayload = z.infer<typeof ChangePolicyPayloadSchema>;


export const DecisionItemSchema = z.object({
	id: z.string().min(1),
	type: DecisionTypeSchema,
	status: DecisionStatusSchema,
	createdAt: z.string(),
	createdBy: z.string().min(1),
	title: z.string().min(1),
	summary: z.string(),
	payload: z.record(z.string(), z.unknown()),
	urgency: DecisionUrgencySchema,
});
export type DecisionItem = z.infer<typeof DecisionItemSchema>;

export const PendingInboxSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	items: z.array(DecisionItemSchema),
});
export type PendingInbox = z.infer<typeof PendingInboxSchema>;

export const HistoryInboxEntrySchema = z.object({
	id: z.string().min(1),
	type: DecisionTypeSchema,
	status: z.enum(["approved", "rejected", "deferred"]),
	resolvedAt: z.string(),
	resolvedBy: z.string().min(1),
	note: z.string().optional(),
	title: z.string().optional(),
	summary: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	urgency: DecisionUrgencySchema.optional(),
	createdAt: z.string().optional(),
	createdBy: z.string().optional(),
});
export type HistoryInboxEntry = z.infer<typeof HistoryInboxEntrySchema>;

export class CannotFireCoordinatorError extends Error {
	constructor(agentId: string = "coordinator") {
		super(`Không thể sa thải coordinator/lead '${agentId}'`);
		this.name = "CannotFireCoordinatorError";
	}
}

export class DecisionNotFoundError extends Error {
	constructor(id: string) {
		super(`Không tìm thấy quyết định '${id}' trong pending inbox`);
		this.name = "DecisionNotFoundError";
	}
}


export class MergeRejectNoteRequiredError extends Error {
	constructor() {
		super("Từ chối merge bắt buộc phải có lý do (tối thiểu 8 ký tự).");
		this.name = "MergeRejectNoteRequiredError";
	}
}
