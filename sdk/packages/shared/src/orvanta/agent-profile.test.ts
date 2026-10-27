import { describe, expect, it } from "vitest";
import {
	AGENT_ID_RE,
	ensureMandatoryDenyWrite,
	MANDATORY_DENY_WRITE_PATHS,
	parseAgentProfile,
	serializeAgentProfile,
} from "./agent-profile";
import {
	BLANK_PROFILE_TEMPLATE,
	COORDINATOR_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	RESEARCHER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
	SKEPTIC_PROFILE_TEMPLATE,
} from "./templates";

describe("agent-profile schema & serialization", () => {
	it("parses coordinator profile template correctly", () => {
		const profile = parseAgentProfile(COORDINATOR_PROFILE_TEMPLATE);
		expect(profile.id).toBe("coordinator");
		expect(profile.displayName).toBe("Coordinator");
		expect(profile.role).toBe("lead");
		expect(profile.providerId).toBeNull();
		expect(profile.modelId).toBeNull();
		expect(profile.maxIterations).toBe(40);
		expect(profile.temperature).toBeNull();
		expect(profile.tools.allow).toEqual(["read_files", "list_files", "grep"]);
		expect(profile.tools.deny).toEqual(["write_to_file", "apply_diff"]);
		expect(profile.scopePaths.allow).toEqual(["**/*"]);
		expect(profile.scopePaths.denyWrite).toEqual(
			expect.arrayContaining([...MANDATORY_DENY_WRITE_PATHS]),
		);
		expect(profile.instructions).toContain("Bạn là coordinator");
	});

	it("parses all templates cleanly", () => {
		const templates = [
			IMPLEMENTER_PROFILE_TEMPLATE,
			REVIEWER_PROFILE_TEMPLATE,
			RESEARCHER_PROFILE_TEMPLATE,
			SKEPTIC_PROFILE_TEMPLATE,
			BLANK_PROFILE_TEMPLATE,
		];
		for (const t of templates) {
			const profile = parseAgentProfile(t);
			expect(AGENT_ID_RE.test(profile.id)).toBe(true);
			expect(profile.role).toBe("teammate");
			expect(profile.instructions.length).toBeGreaterThan(0);
			expect(profile.scopePaths.denyWrite).toEqual(
				expect.arrayContaining([...MANDATORY_DENY_WRITE_PATHS]),
			);
		}
	});

	it("round-trips serialize and parse without loss", () => {
		const original = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const serialized = serializeAgentProfile(original);
		const roundTripped = parseAgentProfile(serialized);

		expect(roundTripped.id).toBe(original.id);
		expect(roundTripped.displayName).toBe(original.displayName);
		expect(roundTripped.description).toBe(original.description);
		expect(roundTripped.role).toBe(original.role);
		expect(roundTripped.providerId).toBe(original.providerId);
		expect(roundTripped.modelId).toBe(original.modelId);
		expect(roundTripped.maxIterations).toBe(original.maxIterations);
		expect(roundTripped.temperature).toBe(original.temperature);
		expect(roundTripped.tools).toEqual(original.tools);
		expect(roundTripped.scopePaths.allow).toEqual(original.scopePaths.allow);
		expect(roundTripped.scopePaths.denyWrite).toEqual(
			original.scopePaths.denyWrite,
		);
		expect(roundTripped.instructions).toBe(original.instructions);
	});

	it("serializes null model and provider as literal null, not string 'null'", () => {
		const original = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const serialized = serializeAgentProfile(original);
		expect(serialized).toContain("providerId: null");
		expect(serialized).toContain("modelId: null");
		expect(serialized).toContain("temperature: null");
		expect(serialized).not.toContain('providerId: "null"');
		expect(serialized).not.toContain('modelId: "null"');
	});

	it("prepends mandatory denyWrite paths if user omits them", () => {
		const original = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const customized = {
			...original,
			scopePaths: {
				allow: ["src/**"],
				denyWrite: ["secret.env"],
			},
		};
		const serialized = serializeAgentProfile(customized);
		const parsed = parseAgentProfile(serialized);

		expect(parsed.scopePaths.denyWrite[0]).toBe(".orvanta/purpose.md");
		expect(parsed.scopePaths.denyWrite[1]).toBe(".orvanta/company.json");
		expect(parsed.scopePaths.denyWrite[2]).toBe(".orvanta/org/roster.json");
		expect(parsed.scopePaths.denyWrite).toContain("secret.env");
	});

	it("rejects uppercase letters in agent id", () => {
		expect(AGENT_ID_RE.test("Reviewer")).toBe(false);
		expect(AGENT_ID_RE.test("Coordinator")).toBe(false);
		expect(AGENT_ID_RE.test("myAgent")).toBe(false);
		expect(AGENT_ID_RE.test("agent_1")).toBe(true);
		expect(AGENT_ID_RE.test("code-reviewer")).toBe(true);

		const invalid = IMPLEMENTER_PROFILE_TEMPLATE.replace(
			"id: implementer",
			"id: Implementer",
		);
		expect(() => parseAgentProfile(invalid)).toThrow();
	});

	it("rejects empty instructions", () => {
		const emptyInstructions = `---
id: reviewer
displayName: Reviewer
description: ""
role: teammate
providerId: null
modelId: null
maxIterations: 40
temperature: null
tools:
  allow: []
  deny: []
scopePaths:
  allow: ["**/*"]
  denyWrite: []
---

   
`;
		expect(() => parseAgentProfile(emptyInstructions)).toThrow(
			"Instructions không được rỗng",
		);
	});

	it("rejects invalid role or iterations out of range", () => {
		const badRole = IMPLEMENTER_PROFILE_TEMPLATE.replace(
			"role: teammate",
			"role: ceo",
		);
		expect(() => parseAgentProfile(badRole)).toThrow();

		const badIterations = IMPLEMENTER_PROFILE_TEMPLATE.replace(
			"maxIterations: 40",
			"maxIterations: 500",
		);
		expect(() => parseAgentProfile(badIterations)).toThrow();
	});

	it("rejects missing frontmatter delimiter", () => {
		expect(() =>
			parseAgentProfile("Không có frontmatter delimiter"),
		).toThrow("Missing frontmatter delimiter");
	});
});
