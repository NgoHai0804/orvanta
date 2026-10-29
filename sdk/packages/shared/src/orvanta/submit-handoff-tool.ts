import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { createTool } from "../tools/create";

export const OrvantaSubmitHandoffInputSchema = z.object({
	taskId: z.string().min(1, "taskId is required").describe("Task identifier"),
	content: z
		.string()
		.min(1, "content is required")
		.describe("Handoff markdown content"),
});
export type OrvantaSubmitHandoffInput = z.infer<
	typeof OrvantaSubmitHandoffInputSchema
>;

export interface SubmitHandoffToolOutput {
	ok: boolean;
	path?: string;
	error?: string;
}

export function createOrvantaSubmitHandoffTool(options: {
	workspaceRoot: string;
	requesterId?: string;
}) {
	return createTool<
		typeof OrvantaSubmitHandoffInputSchema,
		SubmitHandoffToolOutput
	>({
		name: "orvanta_submit_handoff",
		description:
			"Nộp bài bàn giao kết quả (handoff) cho task. Host ghi vào .orvanta/shared/handoffs/<taskId>/<requesterId>.md. Đặt toàn bộ báo cáo vào content. Gọi thành công sẽ kết thúc lượt — không viết thêm tin chat và không gọi submit_and_exit.",
		inputSchema: OrvantaSubmitHandoffInputSchema,
		lifecycle: { completesRun: true },
		execute: async (input) => {
			try {
				const requesterId = options.requesterId || "agent";
				const sanitizedTaskId = input.taskId.replace(
					/[^a-zA-Z0-9._-]/g,
					"-",
				);
				const sanitizedRequester = requesterId.replace(
					/[^a-zA-Z0-9._-]/g,
					"-",
				);
				const relPath = `.orvanta/shared/handoffs/${sanitizedTaskId}/${sanitizedRequester}.md`;
				const fullPath = join(options.workspaceRoot, relPath);
				await mkdir(dirname(fullPath), { recursive: true });
				await writeFile(fullPath, input.content, "utf8");
				return { ok: true, path: relPath };
			} catch (err: any) {
				return { ok: false, error: err?.message || String(err) };
			}
		},
	});
}
