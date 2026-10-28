import { describe, expect, it } from "vitest";
import type { AgentProfile } from "./agent-profile";
import type { RosterJson } from "./company-schema";
import {
	buildOrgTreePersonnelPrompt,
	buildOrvantaPromptBlock,
	DEFAULT_ORVANTA_CONSTRAINTS,
	injectAgentMemory,
	injectOrvantaSystemPrompt,
} from "./system-prompt";

describe("Orvanta system-prompt assembly", () => {
	it("assembles the Orvanta prompt block with default constraints", () => {
		const block = buildOrvantaPromptBlock({
			companyName: "Acme Corp",
			purpose: "Build great products that empower developers worldwide.",
		});

		expect(block).toContain('# Khối Orvanta\n\nBạn là thành viên của công ty "Acme Corp". CEO là người dùng.');
		expect(block).toContain("## Purpose\n\nBuild great products that empower developers worldwide.");
		expect(block).toContain(`## Constraints\n\n${DEFAULT_ORVANTA_CONSTRAINTS}`);
		expect(block).not.toContain("## Role Instructions");
	});

	it("uses custom constraints when provided", () => {
		const customConstraints = "- Custom rule 1\n- Custom rule 2";
		const block = buildOrvantaPromptBlock({
			companyName: "Acme Corp",
			purpose: "Build great products.",
			constraints: customConstraints,
		});

		expect(block).toContain(`## Constraints\n\n${customConstraints}`);
		expect(block).not.toContain(DEFAULT_ORVANTA_CONSTRAINTS);
	});

	it("includes role instructions when provided", () => {
		const block = buildOrvantaPromptBlock({
			companyName: "Acme Corp",
			purpose: "Build great products.",
			roleInstructions: "Coordinate team activities and report blockers.",
		});

		expect(block).toContain("## Role Instructions\n\nCoordinate team activities and report blockers.");
	});

	it("matches the exact block structure snapshot", () => {
		const block = buildOrvantaPromptBlock({
			companyName: "Orvanta AI",
			purpose: "Mục đích xây dựng hệ thống đa tác tử.",
			constraints: "- Luật 1: Không phá vỡ hệ thống",
			roleInstructions: "Làm đúng phận sự điều phối.",
		});

		const expected = `# Khối Orvanta

Bạn là thành viên của công ty "Orvanta AI". CEO là người dùng.
Mọi hành động của bạn và đồng đội phải phục vụ mục tiêu tối cao của công ty được nêu trong Purpose.
Bạn tuyệt đối KHÔNG được tự ý sửa đổi purpose hoặc constraints, không được tự ý nới scope công việc ra ngoài purpose.

## Purpose

Mục đích xây dựng hệ thống đa tác tử.

## Constraints

- Luật 1: Không phá vỡ hệ thống

## Role Instructions

Làm đúng phận sự điều phối.`;

		expect(block).toBe(expected);
	});

	it("prepends the Orvanta block to the base system prompt", () => {
		const basePrompt = "You are Cline, a highly skilled software engineer.";
		const result = injectOrvantaSystemPrompt(basePrompt, {
			companyName: "Acme",
			purpose: "Our grand mission.",
		});

		expect(result.startsWith('# Khối Orvanta\n\nBạn là thành viên của công ty "Acme".')).toBe(true);
		expect(result.endsWith(basePrompt)).toBe(true);
		expect(result).toContain("\n\n## Purpose\n\nOur grand mission.\n\n");
	});

	it("returns only the Orvanta block when base system prompt is empty", () => {
		const result = injectOrvantaSystemPrompt("", {
			companyName: "Acme",
			purpose: "Our grand mission.",
		});

		expect(result).toBe(
			buildOrvantaPromptBlock({
				companyName: "Acme",
				purpose: "Our grand mission.",
			}),
		);
	});
});

describe("buildOrgTreePersonnelPrompt", () => {
	function makeMockProfile(
		id: string,
		overrides: Partial<AgentProfile> = {},
	): AgentProfile {
		return {
			id,
			displayName: id,
			description: "",
			role: "teammate",
			reportsTo: "coordinator",
			providerId: null,
			modelId: null,
			maxIterations: 40,
			temperature: null,
			reasoningEffort: null,
			supportsImages: null,
			contextWindow: null,
			maxOutputTokens: null,
			tools: { allow: [], deny: [] },
			scopePaths: { allow: ["**/*"], denyWrite: [] },
			rules: [],
			skills: [],
			instructions: "Instructions for " + id,
			filePath: `org/agents/${id}/profile.md`,
			...overrides,
		};
	}

	const mockRoster: RosterJson = {
		schemaVersion: 1,
		agents: [
			{
				id: "coordinator",
				displayName: "Coordinator",
				role: "lead",
				status: "idle",
				agentFile: "org/agents/coordinator/profile.md",
				reportsTo: null,
				hiredAt: "2026-10-28T00:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "market-researcher",
				displayName: "Market Researcher",
				role: "teammate",
				status: "idle",
				agentFile: "org/agents/market-researcher/profile.md",
				reportsTo: "coordinator",
				hiredAt: "2026-10-28T00:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "copywriter",
				displayName: "Copywriter",
				role: "teammate",
				status: "idle",
				agentFile: "org/agents/copywriter/profile.md",
				reportsTo: "coordinator",
				hiredAt: "2026-10-28T00:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
			{
				id: "reviewer",
				displayName: "Reviewer",
				role: "teammate",
				status: "idle",
				agentFile: "org/agents/reviewer/profile.md",
				reportsTo: "coordinator",
				hiredAt: "2026-10-28T00:00:00.000Z",
				hiredBy: "ceo",
				modelId: null,
				maxIterations: 40,
			},
		],
	};

	it("generates complete org tree personnel prompt matching Section 7 spec", () => {
		const profiles = new Map<string, AgentProfile>([
			[
				"market-researcher",
				makeMockProfile("market-researcher", {
					description:
						"Nghiên cứu thị trường, cào dữ liệu đối thủ, đọc tài liệu.",
					tools: {
						allow: [
							"browser_action",
							"web_fetch",
							"read_files",
							"grep",
							"list_files",
							"write_to_file",
						],
						deny: [],
					},
					scopePaths: {
						allow: [".orvanta/artifacts/research/**"],
						denyWrite: [],
					},
				}),
			],
			[
				"copywriter",
				makeMockProfile("copywriter", {
					description:
						"Viết nội dung bài viết, kịch bản email, landing page.",
					tools: {
						allow: ["read_files", "write_to_file"],
						deny: [],
					},
					scopePaths: {
						allow: [".orvanta/artifacts/marketing/**"],
						denyWrite: [],
					},
				}),
			],
			[
				"reviewer",
				makeMockProfile("reviewer", {
					description:
						"Thẩm định độc lập, bắt lỗi nội dung, kiểm tra code/bài viết theo DoD, kiểm tra chất lượng.",
					tools: {
						allow: [
							"read_files",
							"grep",
							"list_files",
							"execute_command",
							"write_to_file",
						],
						deny: [],
					},
					scopePaths: {
						allow: [".orvanta/artifacts/reviews/**"],
						denyWrite: [],
					},
				}),
			],
		]);

		const prompt = buildOrgTreePersonnelPrompt(mockRoster, profiles);

		expect(prompt).toContain(
			"# CƠ CẤU TỔ CHỨC CÔNG TY (Org Tree & Personnel Map)",
		);
		expect(prompt).toContain(
			"- [@market-researcher] (Quản lý trực tiếp bởi: coordinator)",
		);
		expect(prompt).toContain(
			"- [@copywriter] (Quản lý trực tiếp bởi: coordinator)",
		);
		expect(prompt).toContain(
			"- [@reviewer] (Quản lý trực tiếp bởi: coordinator)",
		);
		expect(prompt).toContain("QUY TẮC BẮT BUỘC KHI ĐIỀU HÀNH:");
		expect(prompt).toContain("team_run_task");
		expect(prompt).toContain(".orvanta/artifacts/");
		expect(prompt).toContain("[@reviewer]");
		expect(prompt).not.toContain("- [@coordinator]");
	});

	it("filters out stopped and pending_fire agents from the prompt", () => {
		const rosterWithStopped: RosterJson = {
			schemaVersion: 1,
			agents: [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
					agentFile: "org/agents/coordinator/profile.md",
					reportsTo: null,
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
				{
					id: "copywriter",
					displayName: "Copywriter",
					role: "teammate",
					status: "idle",
					agentFile: "org/agents/copywriter/profile.md",
					reportsTo: "coordinator",
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
				{
					id: "fired-agent",
					displayName: "Fired Agent",
					role: "teammate",
					status: "stopped",
					agentFile: "org/agents/fired-agent/profile.md",
					reportsTo: "coordinator",
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
			],
		};

		const profiles = {
			copywriter: makeMockProfile("copywriter"),
			"fired-agent": makeMockProfile("fired-agent"),
		};

		const prompt = buildOrgTreePersonnelPrompt(rosterWithStopped, profiles);
		expect(prompt).toContain("- [@copywriter]");
		expect(prompt).not.toContain("- [@fired-agent]");
	});

	it("handles empty subordinates roster gracefully", () => {
		const soloRoster: RosterJson = {
			schemaVersion: 1,
			agents: [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
					agentFile: "org/agents/coordinator/profile.md",
					reportsTo: null,
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
			],
		};

		const prompt = buildOrgTreePersonnelPrompt(soloRoster, {});
		expect(prompt).toContain("(Chưa có nhân sự chuyên trách dưới quyền)");
		expect(prompt).toContain("QUY TẮC BẮT BUỘC KHI ĐIỀU HÀNH:");
	});

	it("hides default **/* write scope when agent has no write tools", () => {
		const roster: RosterJson = {
			schemaVersion: 1,
			agents: [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
					agentFile: "org/agents/coordinator/profile.md",
					reportsTo: null,
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
				{
					id: "reader",
					displayName: "Reader",
					role: "teammate",
					status: "idle",
					agentFile: "org/agents/reader/profile.md",
					reportsTo: "coordinator",
					hiredAt: "2026-10-28T00:00:00.000Z",
					hiredBy: "ceo",
					modelId: null,
					maxIterations: 40,
				},
			],
		};

		const profiles = {
			reader: makeMockProfile("reader", {
				tools: { allow: ["read_files", "grep"], deny: ["write_to_file"] },
				scopePaths: { allow: ["**/*"], denyWrite: [] },
			}),
		};

		const prompt = buildOrgTreePersonnelPrompt(roster, profiles);
		expect(prompt).toContain("  * Thư mục được phép ghi: []");
	});
});

describe("injectAgentMemory", () => {
	it("returns original prompt when memoryContent is undefined or empty", () => {
		expect(injectAgentMemory("base prompt", undefined)).toBe("base prompt");
		expect(injectAgentMemory("base prompt", null)).toBe("base prompt");
		expect(injectAgentMemory("base prompt", "")).toBe("base prompt");
		expect(injectAgentMemory("base prompt", "   ")).toBe("base prompt");
	});

	it("appends '# Personal Memory & Learnings' when memoryContent is provided", () => {
		const base = "You are an agent.";
		const memory = "- Learned to use bun test\n- Database client at src/db";
		const result = injectAgentMemory(base, memory);

		expect(result).toBe(
			`You are an agent.\n\n# Personal Memory & Learnings\n\n- Learned to use bun test\n- Database client at src/db`,
		);
	});

	it("handles empty base prompt by returning only memory block", () => {
		const result = injectAgentMemory("", "Important lesson");
		expect(result).toBe("# Personal Memory & Learnings\n\nImportant lesson");
	});
});
