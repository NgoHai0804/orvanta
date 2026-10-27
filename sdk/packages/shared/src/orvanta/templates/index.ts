import { BLANK_PROFILE_TEMPLATE } from "./blank";
import {
	COORDINATOR_PROFILE_TEMPLATE,
	PURPOSE_TEMPLATE,
} from "./coordinator";
import { IMPLEMENTER_PROFILE_TEMPLATE } from "./implementer";
import { RESEARCHER_PROFILE_TEMPLATE } from "./researcher";
import { REVIEWER_PROFILE_TEMPLATE } from "./reviewer";
import { SKEPTIC_PROFILE_TEMPLATE } from "./skeptic";

export {
	BLANK_PROFILE_TEMPLATE,
	COORDINATOR_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	PURPOSE_TEMPLATE,
	RESEARCHER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
	SKEPTIC_PROFILE_TEMPLATE,
};

export type AgentTemplateId =
	| "implementer"
	| "reviewer"
	| "researcher"
	| "skeptic"
	| "blank";

export interface AgentTemplateInfo {
	id: AgentTemplateId;
	label: string;
	description: string;
	template: string;
}

export const AGENT_TEMPLATES: AgentTemplateInfo[] = [
	{
		id: "implementer",
		label: "Implementer",
		description: "Viết code trong scope task, không nới epic",
		template: IMPLEMENTER_PROFILE_TEMPLATE,
	},
	{
		id: "reviewer",
		label: "Reviewer",
		description:
			"Review code và kết quả theo purpose và tiêu chuẩn chất lượng",
		template: REVIEWER_PROFILE_TEMPLATE,
	},
	{
		id: "researcher",
		label: "Researcher",
		description:
			"Nghiên cứu tài liệu, kiến trúc, công nghệ và phân tích giải pháp",
		template: RESEARCHER_PROFILE_TEMPLATE,
	},
	{
		id: "skeptic",
		label: "Skeptic",
		description:
			"Chỉ trích phản biện, tìm điểm yếu, edge cases và rủi ro kiến trúc",
		template: SKEPTIC_PROFILE_TEMPLATE,
	},
	{
		id: "blank",
		label: "Blank",
		description: "Tạo agent trống từ đầu",
		template: BLANK_PROFILE_TEMPLATE,
	},
];

