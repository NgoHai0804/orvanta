import { z } from "zod";
import { createTool } from "../tools/create";
import {
	DecisionTypeSchema,
	DecisionUrgencySchema,
} from "./inbox-schema";
import { requestDecision } from "./inbox-store";

export const OrvantaRequestDecisionInputSchema = z.object({
	type: DecisionTypeSchema,
	title: z.string().min(1, "Title is required"),
	summary: z.string().min(1, "Summary is required"),
	payload: z.record(z.string(), z.unknown()),
	urgency: DecisionUrgencySchema.optional(),
});
export type OrvantaRequestDecisionInput = z.infer<
	typeof OrvantaRequestDecisionInputSchema
>;

export interface RequestDecisionToolOutput {
	decisionId?: string;
	status?: string;
	isDuplicate?: boolean;
	error?: string;
}

export function createOrvantaRequestDecisionTool(options: {
	workspaceRoot: string;
	createdBy?: string;
}) {
	return createTool<
		typeof OrvantaRequestDecisionInputSchema,
		RequestDecisionToolOutput
	>({
		name: "orvanta_request_decision",
		description:
			"Request a CEO decision in the Orvanta Inbox. Allowed types for P6: 'hire_agent', 'fire_agent', 'change_purpose'. Returns the decisionId and pending status.",
		inputSchema: OrvantaRequestDecisionInputSchema,
		execute: async (input) => {
			try {
				const result = await requestDecision(options.workspaceRoot, {
					type: input.type,
					title: input.title,
					summary: input.summary,
					payload: input.payload,
					urgency: input.urgency,
					createdBy: options.createdBy || "coordinator",
				});
				return {
					decisionId: result.item.id,
					status: result.item.status,
					isDuplicate: result.isDuplicate,
				};
			} catch (err: any) {
				return {
					error: err?.message || String(err),
				};
			}
		},
	});
}
