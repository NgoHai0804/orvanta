import type { AgentProfile } from "./agent-profile";
import type { RosterJson } from "./company-schema";
import { COORDINATOR_AGENT_ID } from "./paths";

export const DEFAULT_ORVANTA_CONSTRAINTS = `- Không sửa purpose.md
- Không hire/fire ngoài inbox
- Không viết code ngoài path mà task đã ghi
- Reviewer không được commit hay apply diff`;

export interface BuildOrvantaPromptOptions {
	companyName: string;
	purpose: string;
	constraints?: string | null;
	roleInstructions?: string | null;
}

/**
 * Builds the Orvanta prompt block for Layer 1 Purpose-Lock.
 *
 * Fixed section order (06-purpose-lock.md):
 * 1. Khối Orvanta (bạn là thành viên công ty X, CEO là người dùng, không sửa purpose)
 * 2. Toàn bộ purpose.md
 * 3. constraints.md (hoặc default)
 * 4. Role instructions từ profile.md nếu có
 */
export function buildOrvantaPromptBlock(
	options: BuildOrvantaPromptOptions,
): string {
	const companyName = options.companyName.trim();
	const purpose = options.purpose.trim();
	const constraints =
		options.constraints && options.constraints.trim().length > 0
			? options.constraints.trim()
			: DEFAULT_ORVANTA_CONSTRAINTS;
	const roleInstructions = options.roleInstructions?.trim();

	const sections: string[] = [
		`# Khối Orvanta\n\nBạn là thành viên của công ty "${companyName}". CEO là người dùng.\nMọi hành động của bạn và đồng đội phải phục vụ mục tiêu tối cao của công ty được nêu trong Purpose.\nBạn tuyệt đối KHÔNG được tự ý sửa đổi purpose hoặc constraints, không được tự ý nới scope công việc ra ngoài purpose.`,
		`## Purpose\n\n${purpose}`,
		`## Constraints\n\n${constraints}`,
	];

	if (roleInstructions) {
		sections.push(`## Role Instructions\n\n${roleInstructions}`);
	}

	return sections.join("\n\n");
}

/**
 * Prepends the Orvanta purpose-lock block to the session's base system prompt.
 */
export function injectOrvantaSystemPrompt(
	baseSystemPrompt: string,
	options: BuildOrvantaPromptOptions,
): string {
	const block = buildOrvantaPromptBlock(options);
	const trimmedBase = baseSystemPrompt.trim();
	if (!trimmedBase) {
		return block;
	}
	return `${block}\n\n${trimmedBase}`;
}

/**
 * Builds the Org Tree & Personnel Map prompt for the Coordinator agent.
 *
 * Shows the hierarchy of subordinates, their reportsTo relationship, expertise description,
 * allowed tools, and writable scope paths, followed by mandatory orchestration rules.
 */
export function buildOrgTreePersonnelPrompt(
	roster: RosterJson,
	profiles: Map<string, AgentProfile> | Record<string, AgentProfile>,
): string {
	const reviewerAgent = roster.agents.find((a) =>
		a.id.toLowerCase().includes("reviewer"),
	);
	const reviewerMention = reviewerAgent
		? `[@${reviewerAgent.id}]`
		: "[@reviewer]";

	const subordinates = roster.agents.filter(
		(a) =>
			a.id !== COORDINATOR_AGENT_ID &&
			a.role !== "lead" &&
			a.status !== "stopped" &&
			a.status !== "pending_fire",
	);

	const agentBlocks = subordinates.map((agent) => {
		const profile =
			profiles instanceof Map ? profiles.get(agent.id) : profiles[agent.id];
		const reportsTo = agent.reportsTo || profile?.reportsTo || "coordinator";
		const description =
			profile?.description?.trim() || agent.displayName || agent.id;
		const allowedTools = profile?.tools?.allow ?? [];

		const writeTools = ["write_to_file", "apply_diff"];
		const canWrite = allowedTools.some((t) => writeTools.includes(t));
		let writeScope = profile?.scopePaths?.allow ?? [];
		if (!canWrite && writeScope.length === 1 && writeScope[0] === "**/*") {
			writeScope = [];
		}
		const writeScopeStr = `[${writeScope.map((p) => `"${p}"`).join(", ")}]`;

		return [
			`- [@${agent.id}] (Quản lý trực tiếp bởi: ${reportsTo})`,
			`  * Chuyên môn: ${description}`,
			`  * Công cụ cho phép: [${allowedTools.join(", ")}]`,
			`  * Thư mục được phép ghi: ${writeScopeStr}`,
		].join("\n");
	});

	const personnelContent =
		agentBlocks.length > 0
			? agentBlocks.join("\n\n")
			: "(Chưa có nhân sự chuyên trách dưới quyền)";

	const rules = [
		"QUY TẮC BẮT BUỘC KHI ĐIỀU HÀNH:",
		"1. Bạn là người chỉ huy, KHÔNG tự làm thay công việc của chuyên viên. Hãy dùng `team_run_task` để giao việc.",
		"2. Mọi nhiệm vụ giao đi phải ghi rõ file sản phẩm bàn giao tại thư mục `.orvanta/artifacts/`.",
		`3. Khi chuyên viên làm xong, BẮT BUỘC phải giao cho ${reviewerMention} kiểm tra file đó trước khi báo cáo CEO.`,
		"4. Khi toàn bộ hoàn thành, tổng hợp báo cáo điều hành rõ ràng gồm: Tóm tắt việc đã làm, danh sách các file sản phẩm đã tạo, và những điểm CEO cần lưu ý.",
	].join("\n");

	return [
		"# CƠ CẤU TỔ CHỨC CÔNG TY (Org Tree & Personnel Map)",
		"Bạn là Coordinator (Root Lead) của công ty. Người dùng là CEO.\nDưới quyền quản lý của bạn gồm có các nhân sự chuyên trách sau:",
		personnelContent,
		rules,
	].join("\n\n");
}

/**
 * Injects personal memory and learnings content into an agent's prompt.
 * If memoryContent is provided and has non-empty text, it is appended under '# Personal Memory & Learnings'.
 */
export function injectAgentMemory(
	prompt: string,
	memoryContent?: string | null,
): string {
	const trimmedMemory = memoryContent?.trim();
	if (!trimmedMemory) {
		return prompt;
	}
	const memoryBlock = `# Personal Memory & Learnings\n\n${trimmedMemory}`;
	const trimmedPrompt = prompt.trim();
	if (!trimmedPrompt) {
		return memoryBlock;
	}
	return `${trimmedPrompt}\n\n${memoryBlock}`;
}
