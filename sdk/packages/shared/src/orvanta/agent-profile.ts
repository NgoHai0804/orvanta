import { z } from "zod";

export const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,31}$/;

export const MANDATORY_DENY_WRITE_PATHS = [
	".orvanta/purpose.md",
	".orvanta/company.json",
	".orvanta/org/roster.json",
] as const;

export function ensureMandatoryDenyWrite(paths?: string[]): string[] {
	const set = new Set<string>(MANDATORY_DENY_WRITE_PATHS as readonly string[]);
	const result: string[] = [...MANDATORY_DENY_WRITE_PATHS];
	if (paths) {
		for (const p of paths) {
			const trimmed = p.trim();
			if (trimmed && !set.has(trimmed)) {
				set.add(trimmed);
				result.push(trimmed);
			}
		}
	}
	return result;
}

export const AgentRoleSchema = z.enum(["lead", "teammate"]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type OrvantaAgentRole = AgentRole;

export const ReasoningEffortSchema = z
	.enum(["none", "low", "medium", "high", "max"])
	.nullable()
	.default(null);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const AgentProfileFrontmatterSchema = z.object({
	id: z.string().regex(AGENT_ID_RE, {
		message:
			"Id agent phải bắt đầu bằng chữ thường a-z, 2-32 ký tự, chỉ chứa a-z, 0-9, gạch dưới hoặc gạch nối",
	}),
	displayName: z.string().trim().min(1).max(48),
	description: z.string().max(200).default(""),
	role: AgentRoleSchema,
	reportsTo: z.string().nullable().default(null),
	providerId: z.string().nullable().default(null),
	modelId: z.string().nullable().default(null),
	maxIterations: z.number().int().min(1).max(200).default(40),
	temperature: z.number().min(0).max(2).nullable().default(null),
	reasoningEffort: ReasoningEffortSchema,
	supportsImages: z.boolean().nullable().default(null),
	contextWindow: z.number().int().positive().nullable().default(null),
	maxOutputTokens: z.number().int().positive().nullable().default(null),
	tools: z
		.object({
			allow: z.array(z.string()).default([]),
			deny: z.array(z.string()).default([]),
		})
		.default({ allow: [], deny: [] }),
	scopePaths: z
		.object({
			allow: z.array(z.string()).default(["**/*"]),
			denyWrite: z.array(z.string()).default([...MANDATORY_DENY_WRITE_PATHS]),
		})
		.default({
			allow: ["**/*"],
			denyWrite: [...MANDATORY_DENY_WRITE_PATHS],
		}),
	rules: z.array(z.string()).default([]),
	skills: z.array(z.string()).default([]),
});
export type AgentProfileFrontmatter = z.infer<
	typeof AgentProfileFrontmatterSchema
>;

export const AgentProfileSchema = AgentProfileFrontmatterSchema.extend({
	instructions: z
		.string()
		.trim()
		.min(1, { message: "Instructions không được rỗng" }),
	filePath: z.string().min(1),
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

function parseScalar(val: string): unknown {
	const trimmed = val.trim();
	if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
	if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function parseFlowArray(raw: string): string[] {
	const inner = raw.trim().slice(1, -1).trim();
	if (!inner) return [];
	return inner
		.split(",")
		.map((item) => {
			const parsed = parseScalar(item);
			return parsed !== null && parsed !== undefined ? String(parsed).trim() : "";
		})
		.filter(Boolean);
}

export function parseYamlFrontmatter(content: string): {
	data: Record<string, unknown>;
	body: string;
} {
	const clean = content.replace(/^\uFEFF/, "");
	const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		throw new Error("Missing frontmatter delimiter '---'");
	}
	const yamlStr = match[1];
	const body = match[2];

	const lines = yamlStr.split(/\r?\n/);
	const data: Record<string, unknown> = {};

	let currentRootKey: string | null = null;
	let currentSubKey: string | null = null;

	for (const rawLine of lines) {
		const line = rawLine.replace(/#.*$/, "").trimEnd();
		if (!line.trim()) continue;

		const indent = rawLine.search(/\S/);

		if (indent === 0) {
			currentRootKey = null;
			currentSubKey = null;

			const colonIdx = line.indexOf(":");
			if (colonIdx === -1) continue;
			const key = line.slice(0, colonIdx).trim();
			const valStr = line.slice(colonIdx + 1).trim();

			currentRootKey = key;

			if (valStr === "") {
				data[key] = null;
			} else if (valStr.startsWith("[") && valStr.endsWith("]")) {
				data[key] = parseFlowArray(valStr);
			} else {
				data[key] = parseScalar(valStr);
			}
		} else if (currentRootKey) {
			const trimmed = line.trim();

			if (trimmed.startsWith("- ")) {
				const rawItem = trimmed.slice(2).trim();
				const itemVal = parseScalar(rawItem);
				const stringVal =
					itemVal !== null && itemVal !== undefined ? String(itemVal).trim() : "";

				if (currentSubKey) {
					const parentObj = data[currentRootKey] as Record<string, unknown>;
					if (!Array.isArray(parentObj[currentSubKey])) {
						parentObj[currentSubKey] = [];
					}
					if (stringVal) {
						(parentObj[currentSubKey] as string[]).push(stringVal);
					}
				} else {
					if (!Array.isArray(data[currentRootKey])) {
						data[currentRootKey] = [];
					}
					if (stringVal) {
						(data[currentRootKey] as string[]).push(stringVal);
					}
				}
			} else {
				const colonIdx = trimmed.indexOf(":");
				if (colonIdx !== -1) {
					if (
						typeof data[currentRootKey] !== "object" ||
						data[currentRootKey] === null ||
						Array.isArray(data[currentRootKey])
					) {
						data[currentRootKey] = {};
					}
					const parentObj = data[currentRootKey] as Record<string, unknown>;
					const subKey = trimmed.slice(0, colonIdx).trim();
					const subValStr = trimmed.slice(colonIdx + 1).trim();
					currentSubKey = subKey;

					if (subValStr === "") {
						parentObj[subKey] = [];
					} else if (subValStr.startsWith("[") && subValStr.endsWith("]")) {
						parentObj[subKey] = parseFlowArray(subValStr);
					} else {
						parentObj[subKey] = parseScalar(subValStr);
					}
				}
			}
		}
	}

	return { data, body };
}

function toNullableString(val: unknown): string | null {
	if (typeof val === "string") {
		const trimmed = val.trim();
		return trimmed && trimmed !== "null" && trimmed !== "~" ? trimmed : null;
	}
	return null;
}

function toNullableNumber(val: unknown): number | null {
	if (typeof val === "number" && !Number.isNaN(val)) {
		return val;
	}
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			const num = Number(trimmed);
			if (!Number.isNaN(num)) return num;
		}
	}
	return null;
}

function toNullableBoolean(val: unknown): boolean | null {
	if (typeof val === "boolean") return val;
	if (val === "true" || val === true) return true;
	if (val === "false" || val === false) return false;
	return null;
}

function toArrayOfStrings(val: unknown): string[] {
	if (Array.isArray(val)) {
		return val
			.map((item) => {
				if (item === null || item === undefined) return "";
				return String(item).trim();
			})
			.filter(Boolean);
	}
	if (typeof val === "string") {
		const trimmed = val.trim();
		return trimmed && trimmed !== "null" && trimmed !== "~" ? [trimmed] : [];
	}
	return [];
}


export function parseAgentProfile(
	rawMarkdown: string,
	filePath?: string,
): AgentProfile {
	const { data, body } = parseYamlFrontmatter(rawMarkdown);
	const instructions = body.trim();
	if (!instructions) {
		throw new Error("Instructions không được rỗng");
	}

	const rawTools =
		typeof data.tools === "object" && data.tools !== null
			? (data.tools as Record<string, unknown>)
			: {};
	const rawScope =
		typeof data.scopePaths === "object" && data.scopePaths !== null
			? (data.scopePaths as Record<string, unknown>)
			: {};

	const parsedFrontmatter = AgentProfileFrontmatterSchema.parse({
		id: data.id,
		displayName: data.displayName,
		description: typeof data.description === "string" ? data.description : "",
		role: data.role,
		reportsTo: toNullableString(data.reportsTo),
		providerId: toNullableString(data.providerId),
		modelId: toNullableString(data.modelId),
		maxIterations: toNullableNumber(data.maxIterations) ?? 40,
		temperature: toNullableNumber(data.temperature),
		reasoningEffort:
			(toNullableString(data.reasoningEffort) as ReasoningEffort) ?? null,
		supportsImages: toNullableBoolean(data.supportsImages),
		contextWindow: toNullableNumber(data.contextWindow),
		maxOutputTokens: toNullableNumber(data.maxOutputTokens),
		tools: {
			allow: Array.isArray(rawTools.allow) ? rawTools.allow : [],
			deny: Array.isArray(rawTools.deny) ? rawTools.deny : [],
		},
		scopePaths: {
			allow: Array.isArray(rawScope.allow) ? rawScope.allow : ["**/*"],
			denyWrite: ensureMandatoryDenyWrite(
				Array.isArray(rawScope.denyWrite)
					? (rawScope.denyWrite as string[])
					: [],
			),
		},
		rules: toArrayOfStrings(data.rules),
		skills: toArrayOfStrings(data.skills),
	});

	const computedFilePath =
		filePath ?? `org/agents/${parsedFrontmatter.id}/profile.md`;

	return {
		...parsedFrontmatter,
		instructions,
		filePath: computedFilePath,
	};
}

export function serializeAgentProfile(
	profile: AgentProfileFrontmatter & { instructions: string },
): string {
	const valid = AgentProfileFrontmatterSchema.parse({
		...profile,
		scopePaths: {
			allow: profile.scopePaths.allow,
			denyWrite: ensureMandatoryDenyWrite(profile.scopePaths.denyWrite),
		},
	});

	const instructions = profile.instructions.trim();
	if (!instructions) {
		throw new Error("Instructions không được rỗng");
	}

	const lines: string[] = ["---"];
	lines.push(`id: ${valid.id}`);
	lines.push(`displayName: ${valid.displayName}`);
	lines.push(
		valid.description
			? `description: ${JSON.stringify(valid.description)}`
			: 'description: ""',
	);
	lines.push(`role: ${valid.role}`);
	lines.push(
		`reportsTo: ${valid.reportsTo === null ? "null" : /^[a-zA-Z0-9_\-]+$/.test(valid.reportsTo) ? valid.reportsTo : JSON.stringify(valid.reportsTo)}`,
	);
	lines.push(
		`providerId: ${valid.providerId === null ? "null" : JSON.stringify(valid.providerId)}`,
	);
	lines.push(
		`modelId: ${valid.modelId === null ? "null" : JSON.stringify(valid.modelId)}`,
	);
	lines.push(`maxIterations: ${valid.maxIterations}`);
	lines.push(
		`temperature: ${valid.temperature === null ? "null" : valid.temperature}`,
	);
	lines.push(
		`reasoningEffort: ${valid.reasoningEffort === null ? "null" : valid.reasoningEffort}`,
	);
	lines.push(
		`supportsImages: ${valid.supportsImages === null ? "null" : valid.supportsImages}`,
	);
	lines.push(
		`contextWindow: ${valid.contextWindow === null ? "null" : valid.contextWindow}`,
	);
	lines.push(
		`maxOutputTokens: ${valid.maxOutputTokens === null ? "null" : valid.maxOutputTokens}`,
	);
	lines.push("tools:");
	lines.push(`  allow: [${valid.tools.allow.join(", ")}]`);
	lines.push(`  deny: [${valid.tools.deny.join(", ")}]`);
	lines.push("scopePaths:");
	lines.push("  allow:");
	for (const p of valid.scopePaths.allow) {
		lines.push(`    - ${JSON.stringify(p)}`);
	}
	lines.push("  denyWrite:");
	for (const p of valid.scopePaths.denyWrite) {
		lines.push(`    - ${JSON.stringify(p)}`);
	}
	if (valid.rules.length === 0) {
		lines.push("rules: []");
	} else {
		lines.push("rules:");
		for (const r of valid.rules) {
			lines.push(`  - ${/^[a-zA-Z0-9_\-\.\/]+$/.test(r) ? r : JSON.stringify(r)}`);
		}
	}
	if (valid.skills.length === 0) {
		lines.push("skills: []");
	} else {
		lines.push("skills:");
		for (const s of valid.skills) {
			lines.push(`  - ${/^[a-zA-Z0-9_\-\.\/]+$/.test(s) ? s : JSON.stringify(s)}`);
		}
	}
	lines.push("---");
	lines.push("");
	lines.push(instructions);
	lines.push("");

	return lines.join("\n");
}

