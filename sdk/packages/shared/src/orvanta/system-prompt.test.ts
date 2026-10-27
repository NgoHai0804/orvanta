import { describe, expect, it } from "bun:test";
import {
	buildOrvantaPromptBlock,
	DEFAULT_ORVANTA_CONSTRAINTS,
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
