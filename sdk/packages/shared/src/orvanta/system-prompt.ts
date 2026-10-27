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
