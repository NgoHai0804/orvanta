import { describe, expect, it } from "vitest";
import {
	CompanyJsonSchema,
	CreateCompanyInputSchema,
	DEFAULT_COMPANY_POLICIES,
	defaultCoordinatorRoster,
	slugifyTeamName,
	validateLoadedCompany,
} from "./company-schema";

const now = "2026-10-27T10:00:00.000Z";

function validCompany() {
	return {
		schemaVersion: 1 as const,
		id: "orvanta-local-1",
		name: "Orvanta",
		createdAt: now,
		updatedAt: now,
		workspaceRoot: ".",
		teamName: "orvanta",
		policies: DEFAULT_COMPANY_POLICIES,
		coordinatorAgentId: "coordinator",
	};
}

describe("slugifyTeamName", () => {
	it("slugs a display name", () => {
		expect(slugifyTeamName("Orvanta Core")).toBe("orvanta-core");
	});

	it("falls back when nothing remains", () => {
		expect(slugifyTeamName("***")).toBe("company");
	});
});

describe("CreateCompanyInputSchema", () => {
	it("rejects a short purpose", () => {
		const result = CreateCompanyInputSchema.safeParse({
			name: "Orvanta",
			purpose: "too short",
		});
		expect(result.success).toBe(false);
	});

	it("accepts a trimmed valid purpose", () => {
		const result = CreateCompanyInputSchema.safeParse({
			name: "  Orvanta  ",
			purpose: "   Xây công ty AI theo từng repo.   ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Orvanta");
			expect(result.data.purpose.startsWith("Xây")).toBe(true);
		}
	});
});

describe("CompanyJsonSchema", () => {
	it("parses a valid company", () => {
		expect(CompanyJsonSchema.parse(validCompany()).name).toBe("Orvanta");
	});
});

describe("validateLoadedCompany", () => {
	it("accepts a complete company", () => {
		const result = validateLoadedCompany({
			company: validCompany(),
			purpose: "Xây công ty AI theo từng repo.",
			roster: defaultCoordinatorRoster(now),
		});
		expect(result.ok).toBe(true);
	});

	it("reports a missing purpose", () => {
		const result = validateLoadedCompany({
			company: validCompany(),
			purpose: "   ",
			roster: defaultCoordinatorRoster(now),
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors).toContain("thiếu purpose.md");
		}
	});
});
