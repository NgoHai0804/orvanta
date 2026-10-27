import { z } from "zod";
import { SCHEMA_VERSION } from "./paths";

export const DecisionTypeSchema = z.enum([
	"hire_agent",
	"fire_agent",
	"change_purpose",
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
