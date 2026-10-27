import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	type CompanyJson,
	type CompanyLoad,
	type CreateCompanyInput,
	CreateCompanyInputSchema,
	DEFAULT_COMPANY_POLICIES,
	defaultCoordinatorRoster,
	slugifyTeamName,
	validateLoadedCompany,
} from "./company-schema";
import {
	COMPANY_FILE,
	COORDINATOR_MEMORY_FILE,
	COORDINATOR_PROFILE_FILE,
	PURPOSE_FILE,
	ROSTER_FILE,
	SCHEMA_VERSION,
	VERSION_FILE,
	VERSION_FILE_CONTENTS,
	WORKSPACE_DIRNAME,
	WORKSPACE_TMP_DIRNAME,
} from "./paths";
import { COORDINATOR_PROFILE_TEMPLATE } from "./templates/coordinator";

export class CompanyAlreadyExistsError extends Error {
	constructor(workspaceRoot: string) {
		super(`Công ty đã tồn tại trong ${workspaceRoot}`);
		this.name = "CompanyAlreadyExistsError";
	}
}

export async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

export async function pickWorkspaceRoot(
	folders: string[],
): Promise<string | undefined> {
	if (folders.length === 0) {
		return undefined;
	}
	for (const folder of folders) {
		if (await pathExists(join(folder, WORKSPACE_DIRNAME))) {
			return folder;
		}
	}
	return folders[0];
}

async function readJsonIfPresent(filePath: string): Promise<unknown> {
	try {
		const raw = await readFile(filePath, "utf8");
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

async function readTextIfPresent(filePath: string): Promise<string | undefined> {
	try {
		return await readFile(filePath, "utf8");
	} catch {
		return undefined;
	}
}

export async function loadCompany(workspaceRoot: string): Promise<CompanyLoad> {
	const root = join(workspaceRoot, WORKSPACE_DIRNAME);
	if (!(await pathExists(root))) {
		return { status: "missing" };
	}
	const company = await readJsonIfPresent(join(root, COMPANY_FILE));
	const roster = await readJsonIfPresent(join(root, ROSTER_FILE));
	const purpose = await readTextIfPresent(join(root, PURPOSE_FILE));
	const validated = validateLoadedCompany({ company, purpose, roster });
	if (!validated.ok) {
		return { status: "broken", errors: validated.errors };
	}
	return {
		status: "ready",
		company: validated.company,
		purpose: validated.purpose,
		roster: validated.roster,
	};
}

async function writeTree(
	tmpRoot: string,
	company: CompanyJson,
	purpose: string,
): Promise<void> {
	const files: Array<[string, string]> = [
		[COMPANY_FILE, `${JSON.stringify(company, null, "\t")}\n`],
		[PURPOSE_FILE, purpose.endsWith("\n") ? purpose : `${purpose}\n`],
		[VERSION_FILE, VERSION_FILE_CONTENTS],
		[
			ROSTER_FILE,
			`${JSON.stringify(defaultCoordinatorRoster(company.createdAt), null, "\t")}\n`,
		],
		[COORDINATOR_PROFILE_FILE, COORDINATOR_PROFILE_TEMPLATE],
		[COORDINATOR_MEMORY_FILE, ""],
	];
	for (const [relative, contents] of files) {
		const filePath = join(tmpRoot, relative);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, contents, "utf8");
	}
}

export async function createCompany(
	workspaceRoot: string,
	input: CreateCompanyInput,
): Promise<CompanyLoad> {
	const parsed = CreateCompanyInputSchema.parse(input);
	const dest = join(workspaceRoot, WORKSPACE_DIRNAME);
	const tmp = join(workspaceRoot, WORKSPACE_TMP_DIRNAME);
	if (await pathExists(dest)) {
		throw new CompanyAlreadyExistsError(workspaceRoot);
	}
	if (await pathExists(tmp)) {
		await rm(tmp, { recursive: true, force: true });
	}

	const now = new Date().toISOString();
	const company: CompanyJson = {
		schemaVersion: SCHEMA_VERSION,
		id: `orvanta-local-${crypto.randomUUID()}`,
		name: parsed.name,
		createdAt: now,
		updatedAt: now,
		workspaceRoot: ".",
		teamName: slugifyTeamName(parsed.name),
		policies: DEFAULT_COMPANY_POLICIES,
		coordinatorAgentId: "coordinator",
	};

	try {
		await mkdir(tmp, { recursive: true });
		await writeTree(tmp, company, parsed.purpose);
		await rename(tmp, dest);
	} catch (error) {
		await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
		throw error;
	}

	return loadCompany(workspaceRoot);
}
