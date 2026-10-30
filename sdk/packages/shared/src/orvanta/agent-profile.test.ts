import { describe, expect, it } from "vitest";
import {
	type AgentProfile,
	AGENT_ID_RE,
	ensureMandatoryDenyWrite,
	MANDATORY_DENY_WRITE_PATHS,
	parseAgentProfile,
	serializeAgentProfile,
} from "./agent-profile";
import {
	AGENT_TEMPLATES,
	BLANK_PROFILE_TEMPLATE,
	CONTENT_REVIEWER_PROFILE_TEMPLATE,
	COORDINATOR_PROFILE_TEMPLATE,
	COPYWRITER_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	RESEARCHER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
	SALES_REP_PROFILE_TEMPLATE,
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
		expect(profile.tools.allow).toEqual([
			"read_files",
			"list_files",
			"grep",
			"team_task",
			"team_run_task",
			"team_await_runs",
			"team_status",
			"orvanta_request_decision",
			"orvanta_submit_handoff",
		]);
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
			COPYWRITER_PROFILE_TEMPLATE,
			SALES_REP_PROFILE_TEMPLATE,
			CONTENT_REVIEWER_PROFILE_TEMPLATE,
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

	it("validates specific properties of v0.0.3 preset templates", () => {
		const copywriter = parseAgentProfile(COPYWRITER_PROFILE_TEMPLATE);
		expect(copywriter.id).toBe("copywriter");
		expect(copywriter.tools.allow).toContain("read_files");
		expect(copywriter.tools.allow).toContain("write_to_file");
		expect(copywriter.scopePaths.allow).toEqual([".orvanta/artifacts/marketing/**"]);

		const salesRep = parseAgentProfile(SALES_REP_PROFILE_TEMPLATE);
		expect(salesRep.id).toBe("sales-rep");
		expect(salesRep.tools.allow).toContain("browser_action");
		expect(salesRep.tools.allow).toContain("web_fetch");
		expect(salesRep.tools.allow).toContain("write_to_file");
		expect(salesRep.scopePaths.allow).toEqual([".orvanta/artifacts/sales/**"]);

		const contentReviewer = parseAgentProfile(CONTENT_REVIEWER_PROFILE_TEMPLATE);
		expect(contentReviewer.id).toBe("content-reviewer");
		expect(contentReviewer.tools.allow).toContain("read_files");
		expect(contentReviewer.tools.allow).toContain("grep");
		expect(contentReviewer.tools.allow).toContain("write_to_file");
		expect(contentReviewer.scopePaths.allow).toEqual([".orvanta/artifacts/reviews/**"]);

		expect(AGENT_TEMPLATES.map((t) => t.id)).toEqual([
			"implementer",
			"reviewer",
			"researcher",
			"skeptic",
			"copywriter",
			"sales-rep",
			"content-reviewer",
			"blank",
		]);
	});

	it("round-trips serialize and parse without loss", () => {
		const original = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const serialized = serializeAgentProfile(original);
		const roundTripped = parseAgentProfile(serialized);

		expect(roundTripped.id).toBe(original.id);
		expect(roundTripped.displayName).toBe(original.displayName);
		expect(roundTripped.description).toBe(original.description);
		expect(roundTripped.role).toBe(original.role);
		expect(roundTripped.reportsTo).toBe(original.reportsTo);
		expect(roundTripped.providerId).toBe(original.providerId);
		expect(roundTripped.modelId).toBe(original.modelId);
		expect(roundTripped.maxIterations).toBe(original.maxIterations);
		expect(roundTripped.temperature).toBe(original.temperature);
		expect(roundTripped.reasoningEffort).toBe(original.reasoningEffort);
		expect(roundTripped.supportsImages).toBe(original.supportsImages);
		expect(roundTripped.contextWindow).toBe(original.contextWindow);
		expect(roundTripped.maxOutputTokens).toBe(original.maxOutputTokens);
		expect(roundTripped.tools).toEqual(original.tools);
		expect(roundTripped.scopePaths.allow).toEqual(original.scopePaths.allow);
		expect(roundTripped.scopePaths.denyWrite).toEqual(
			original.scopePaths.denyWrite,
		);
		expect(roundTripped.rules).toEqual(original.rules);
		expect(roundTripped.skills).toEqual(original.skills);
		expect(roundTripped.instructions).toBe(original.instructions);
	});

	it("round-trips serialize and parse with all v0.0.2 extended fields", () => {
		const fullProfile: AgentProfile = {
			id: "implementer",
			displayName: "Lead Implementer",
			description: "Viết code và thực thi các task kỹ thuật theo yêu cầu",
			role: "teammate",
			reportsTo: "coordinator",
			providerId: "anthropic",
			modelId: "claude-3-7-sonnet-20250219",
			maxIterations: 40,
			temperature: 0.2,
			reasoningEffort: "medium",
			supportsImages: true,
			contextWindow: 200000,
			maxOutputTokens: 16384,
			tools: {
				allow: ["read_files", "write_to_file", "apply_diff"],
				deny: ["team_spawn_teammate"],
			},
			scopePaths: {
				allow: ["**/*"],
				denyWrite: [
					".orvanta/purpose.md",
					".orvanta/company.json",
					".orvanta/org/roster.json",
				],
			},
			rules: ["code-simplification", "test-driven-development"],
			skills: ["code-review-and-quality"],
			instructions: "Bạn là implementer của công ty này.",
			filePath: "org/agents/implementer/profile.md",
		};

		const serialized = serializeAgentProfile(fullProfile);
		expect(serialized).toContain("reportsTo: coordinator");
		expect(serialized).toContain("reasoningEffort: medium");
		expect(serialized).toContain("supportsImages: true");
		expect(serialized).toContain("contextWindow: 200000");
		expect(serialized).toContain("maxOutputTokens: 16384");
		expect(serialized).toContain("- code-simplification");
		expect(serialized).toContain("- test-driven-development");
		expect(serialized).toContain("- code-review-and-quality");

		const parsed = parseAgentProfile(serialized);
		expect(parsed.id).toBe(fullProfile.id);
		expect(parsed.displayName).toBe(fullProfile.displayName);
		expect(parsed.description).toBe(fullProfile.description);
		expect(parsed.role).toBe(fullProfile.role);
		expect(parsed.reportsTo).toBe("coordinator");
		expect(parsed.providerId).toBe("anthropic");
		expect(parsed.modelId).toBe("claude-3-7-sonnet-20250219");
		expect(parsed.maxIterations).toBe(40);
		expect(parsed.temperature).toBe(0.2);
		expect(parsed.reasoningEffort).toBe("medium");
		expect(parsed.supportsImages).toBe(true);
		expect(parsed.contextWindow).toBe(200000);
		expect(parsed.maxOutputTokens).toBe(16384);
		expect(parsed.tools).toEqual(fullProfile.tools);
		expect(parsed.scopePaths).toEqual(fullProfile.scopePaths);
		expect(parsed.rules).toEqual(["code-simplification", "test-driven-development"]);
		expect(parsed.skills).toEqual(["code-review-and-quality"]);
		expect(parsed.instructions).toBe(fullProfile.instructions);
	});

	it("parses scalar, flow array, and block list for rules and skills", () => {
		const blockYaml = `---
id: coder
displayName: Coder
description: ""
role: teammate
rules:
  - rule-a
  - rule-b
skills:
  - skill-1
---

Do coding.
`;
		const parsedBlock = parseAgentProfile(blockYaml);
		expect(parsedBlock.rules).toEqual(["rule-a", "rule-b"]);
		expect(parsedBlock.skills).toEqual(["skill-1"]);

		const flowYaml = `---
id: coder
displayName: Coder
description: ""
role: teammate
rules: [rule-x, rule-y]
skills: [skill-z]
---

Do coding.
`;
		const parsedFlow = parseAgentProfile(flowYaml);
		expect(parsedFlow.rules).toEqual(["rule-x", "rule-y"]);
		expect(parsedFlow.skills).toEqual(["skill-z"]);

		const scalarYaml = `---
id: coder
displayName: Coder
description: ""
role: teammate
rules: single-rule
skills: single-skill
---

Do coding.
`;
		const parsedScalar = parseAgentProfile(scalarYaml);
		expect(parsedScalar.rules).toEqual(["single-rule"]);
		expect(parsedScalar.skills).toEqual(["single-skill"]);
	});

	it("correctly parses null, boolean, and numbers for new fields", () => {
		const rawYaml = `---
id: tester
displayName: Tester
description: ""
role: teammate
reportsTo: null
providerId: null
modelId: null
reasoningEffort: null
supportsImages: false
contextWindow: 128000
maxOutputTokens: 8192
temperature: 0.7
---

Testing.
`;
		const parsed = parseAgentProfile(rawYaml);
		expect(parsed.reportsTo).toBeNull();
		expect(parsed.providerId).toBeNull();
		expect(parsed.modelId).toBeNull();
		expect(parsed.reasoningEffort).toBeNull();
		expect(parsed.supportsImages).toBe(false);
		expect(parsed.contextWindow).toBe(128000);
		expect(parsed.maxOutputTokens).toBe(8192);
		expect(parsed.temperature).toBe(0.7);
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

	it("serializes and parses the optional authoritative numeric identity", () => {
		const original = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const withIdentity = { ...original, agentNumericId: 37 };
		const serialized = serializeAgentProfile(withIdentity);
		expect(serialized).toContain("agentNumericId: 37");
		expect(parseAgentProfile(serialized).agentNumericId).toBe(37);
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
