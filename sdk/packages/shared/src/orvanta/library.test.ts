import { describe, expect, it } from "vitest";
import {
	COMPANY_SLUG_REGEX,
	LibraryCompanyEntrySchema,
	LibraryIndexSchema,
	LibraryMetaSchema,
	slugify,
} from "./library";

describe("slugify", () => {
	it("slugs 'Orvanta Core' to 'orvanta-core'", () => {
		expect(slugify("Orvanta Core")).toBe("orvanta-core");
	});

	it("preserves already valid slugs", () => {
		expect(slugify("orvanta-core")).toBe("orvanta-core");
	});

	it("prefixes non-letter leading characters with co-", () => {
		const s = slugify("123 Company");
		expect(s).toBe("co-123-company");
		expect(s).toMatch(COMPANY_SLUG_REGEX);
	});

	it("falls back to 'company' when input has no valid characters", () => {
		const s = slugify("!@#$%^&*()");
		expect(s).toBe("company");
		expect(s).toMatch(COMPANY_SLUG_REGEX);
	});

	it("expands single-character input to at least 2 characters", () => {
		const s = slugify("a");
		expect(s).toBe("a-co");
		expect(s).toMatch(COMPANY_SLUG_REGEX);
	});

	it("caps length to 48 characters and matches slug regex", () => {
		const s = slugify("A".repeat(100));
		expect(s.length).toBeLessThanOrEqual(48);
		expect(s).toMatch(COMPANY_SLUG_REGEX);
	});

	it("normalizes diacritics", () => {
		expect(slugify("Công ty Cổ phần")).toBe("cong-ty-co-phan");
	});
});

describe("Library schemas", () => {
	it("validates a valid LibraryIndex", () => {
		const valid = {
			schemaVersion: 1,
			companies: [
				{
					slug: "orvanta-core",
					name: "Orvanta",
					savedAt: "2026-10-27T12:00:00.000Z",
					agentCount: 3,
					purposePreview: "Xây dựng AI agent",
				},
			],
		};
		const parsed = LibraryIndexSchema.safeParse(valid);
		expect(parsed.success).toBe(true);
	});

	it("validates a valid LibraryMeta", () => {
		const valid = {
			schemaVersion: 1,
			slug: "orvanta-core",
			name: "Orvanta",
			savedAt: "2026-10-27T12:00:00.000Z",
			sourceWorkspace: "D:\\orvanta",
			orvantaSchemaVersion: 1,
		};
		const parsed = LibraryMetaSchema.safeParse(valid);
		expect(parsed.success).toBe(true);
	});

	it("rejects invalid slug in LibraryCompanyEntry", () => {
		const invalid = {
			slug: "-invalid-leading-dash",
			name: "Orvanta",
			savedAt: "2026-10-27T12:00:00.000Z",
			agentCount: 3,
			purposePreview: "preview",
		};
		const parsed = LibraryCompanyEntrySchema.safeParse(invalid);
		expect(parsed.success).toBe(false);
	});
});
