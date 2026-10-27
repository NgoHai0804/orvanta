import { z } from "zod";
import {
	COMPANY_FILE,
	MAX_COMPANY_NAME_LENGTH,
	PURPOSE_FILE,
	ROSTER_FILE,
	SCHEMA_VERSION,
} from "./paths";

export const COMPANY_SLUG_REGEX = /^[a-z][a-z0-9-]{1,47}$/;

export function slugify(name: string): string {
	const ascii = name
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	let candidate = ascii;
	if (!candidate) {
		candidate = "company";
	} else if (!/^[a-z]/.test(candidate)) {
		candidate = `co-${candidate}`;
	}

	if (candidate.length === 1) {
		candidate = `${candidate}-co`;
	}

	if (candidate.length > 48) {
		candidate = candidate.slice(0, 48).replace(/-+$/, "");
	}

	return candidate;
}

export const SNAPSHOT_FILES = [
	COMPANY_FILE,
	PURPOSE_FILE,
	"constraints.md",
	ROSTER_FILE,
] as const;

export const SNAPSHOT_FORBIDDEN_NAMES = [
	"state",
	"inbox",
	"runs",
	"secrets",
	"memory",
	"workspace",
] as const;

export const LIBRARY_DIRNAME = "companies";
export const LIBRARY_INDEX_FILE = "library.json";
export const LIBRARY_META_FILE = "meta.json";

export const LibraryCompanyEntrySchema = z.object({
	slug: z.string().regex(COMPANY_SLUG_REGEX),
	name: z.string().min(1).max(MAX_COMPANY_NAME_LENGTH),
	savedAt: z.string().datetime(),
	agentCount: z.number().int().nonnegative(),
	purposePreview: z.string(),
	isBroken: z.boolean().optional(),
	error: z.string().optional(),
});
export type LibraryCompanyEntry = z.infer<typeof LibraryCompanyEntrySchema>;

export const LibraryIndexSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	companies: z.array(LibraryCompanyEntrySchema),
});
export type LibraryIndex = z.infer<typeof LibraryIndexSchema>;

export const LibraryMetaSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	slug: z.string().regex(COMPANY_SLUG_REGEX),
	name: z.string().min(1).max(MAX_COMPANY_NAME_LENGTH),
	savedAt: z.string().datetime(),
	sourceWorkspace: z.string(),
	orvantaSchemaVersion: z.literal(SCHEMA_VERSION),
});
export type LibraryMeta = z.infer<typeof LibraryMetaSchema>;
