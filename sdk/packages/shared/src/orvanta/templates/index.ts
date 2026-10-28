import { BLANK_PROFILE_TEMPLATE } from "./blank";
import { CONTENT_REVIEWER_PROFILE_TEMPLATE } from "./content-reviewer";
import {
	COORDINATOR_PROFILE_TEMPLATE,
	PURPOSE_TEMPLATE,
} from "./coordinator";
import { COPYWRITER_PROFILE_TEMPLATE } from "./copywriter";
import { IMPLEMENTER_PROFILE_TEMPLATE } from "./implementer";
import { RESEARCHER_PROFILE_TEMPLATE } from "./researcher";
import { REVIEWER_PROFILE_TEMPLATE } from "./reviewer";
import { SALES_REP_PROFILE_TEMPLATE } from "./sales-rep";
import { SKEPTIC_PROFILE_TEMPLATE } from "./skeptic";

export {
	BLANK_PROFILE_TEMPLATE,
	CONTENT_REVIEWER_PROFILE_TEMPLATE,
	COORDINATOR_PROFILE_TEMPLATE,
	COPYWRITER_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	PURPOSE_TEMPLATE,
	RESEARCHER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
	SALES_REP_PROFILE_TEMPLATE,
	SKEPTIC_PROFILE_TEMPLATE,
};

export type AgentTemplateId =
	| "implementer"
	| "reviewer"
	| "researcher"
	| "skeptic"
	| "copywriter"
	| "sales-rep"
	| "content-reviewer"
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
		id: "copywriter",
		label: "Copywriter",
		description:
			"Soạn thảo nội dung bài viết, kịch bản email, landing page và tài liệu marketing",
		template: COPYWRITER_PROFILE_TEMPLATE,
	},
	{
		id: "sales-rep",
		label: "Sales Rep",
		description:
			"Tìm kiếm khách hàng tiềm năng, nghiên cứu đối tác và tạo kịch bản tiếp cận",
		template: SALES_REP_PROFILE_TEMPLATE,
	},
	{
		id: "content-reviewer",
		label: "Content Reviewer",
		description:
			"Thẩm định độc lập bài viết, kịch bản marketing, đối chiếu Brand Voice và DoD",
		template: CONTENT_REVIEWER_PROFILE_TEMPLATE,
	},
	{
		id: "blank",
		label: "Blank",
		description: "Tạo agent trống từ đầu",
		template: BLANK_PROFILE_TEMPLATE,
	},
];

