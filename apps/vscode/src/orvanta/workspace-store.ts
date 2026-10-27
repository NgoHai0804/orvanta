import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
	type AgentProfile,
	AgentProfileSchema,
	COMPANY_FILE,
	COORDINATOR_AGENT_ID,
	COORDINATOR_MEMORY_FILE,
	COORDINATOR_PROFILE_FILE,
	COORDINATOR_PROFILE_TEMPLATE,
	type CompanyJson,
	type CompanyLoad,
	type CreateCompanyInput,
	CreateCompanyInputSchema,
	DEFAULT_COMPANY_POLICIES,
	defaultCoordinatorRoster,
	ensureMandatoryDenyWrite,
	PURPOSE_FILE,
	parseAgentProfile,
	ROSTER_FILE,
	type RosterJson,
	RosterJsonSchema,
	SCHEMA_VERSION,
	serializeAgentProfile,
	slugifyTeamName,
	VERSION_FILE,
	VERSION_FILE_CONTENTS,
	validateLoadedCompany,
	WORKSPACE_DIRNAME,
	WORKSPACE_TMP_DIRNAME,
} from "@cline/shared"

export class CompanyAlreadyExistsError extends Error {
	constructor(workspaceRoot: string) {
		super(`Công ty đã tồn tại trong ${workspaceRoot}`)
		this.name = "CompanyAlreadyExistsError"
	}
}
export class CannotDeleteCoordinatorError extends Error {
	constructor(agentId: string = "coordinator") {
		super(`Không thể xóa coordinator '${agentId}' của công ty`)
		this.name = "CannotDeleteCoordinatorError"
	}
}

export interface AgentDetail {
	profile: AgentProfile
	memory: string
}

export async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target)
		return true
	} catch {
		return false
	}
}

export async function pickWorkspaceRoot(folders: string[]): Promise<string | undefined> {
	if (folders.length === 0) {
		return undefined
	}
	for (const folder of folders) {
		if (await pathExists(join(folder, WORKSPACE_DIRNAME))) {
			return folder
		}
	}
	return folders[0]
}

async function readJsonIfPresent(filePath: string): Promise<unknown> {
	try {
		const raw = await readFile(filePath, "utf8")
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

async function readTextIfPresent(filePath: string): Promise<string | undefined> {
	try {
		return await readFile(filePath, "utf8")
	} catch {
		return undefined
	}
}

export async function loadCompany(workspaceRoot: string): Promise<CompanyLoad> {
	const root = join(workspaceRoot, WORKSPACE_DIRNAME)
	if (!(await pathExists(root))) {
		return { status: "missing" }
	}
	const company = await readJsonIfPresent(join(root, COMPANY_FILE))
	const roster = await readJsonIfPresent(join(root, ROSTER_FILE))
	const purpose = await readTextIfPresent(join(root, PURPOSE_FILE))
	const validated = validateLoadedCompany({ company, purpose, roster })
	if (!validated.ok) {
		return { status: "broken", errors: validated.errors }
	}
	return {
		status: "ready",
		company: validated.company,
		purpose: validated.purpose,
		roster: validated.roster,
	}
}

async function writeTree(tmpRoot: string, company: CompanyJson, purpose: string): Promise<void> {
	const files: Array<[string, string]> = [
		[COMPANY_FILE, `${JSON.stringify(company, null, "\t")}\n`],
		[PURPOSE_FILE, purpose.endsWith("\n") ? purpose : `${purpose}\n`],
		[VERSION_FILE, VERSION_FILE_CONTENTS],
		[ROSTER_FILE, `${JSON.stringify(defaultCoordinatorRoster(company.createdAt), null, "\t")}\n`],
		[COORDINATOR_PROFILE_FILE, COORDINATOR_PROFILE_TEMPLATE],
		[COORDINATOR_MEMORY_FILE, ""],
	]
	for (const [relative, contents] of files) {
		const filePath = join(tmpRoot, relative)
		await mkdir(dirname(filePath), { recursive: true })
		await writeFile(filePath, contents, "utf8")
	}
}

export async function createCompany(workspaceRoot: string, input: CreateCompanyInput): Promise<CompanyLoad> {
	const parsed = CreateCompanyInputSchema.parse(input)
	const dest = join(workspaceRoot, WORKSPACE_DIRNAME)
	const tmp = join(workspaceRoot, WORKSPACE_TMP_DIRNAME)
	if (await pathExists(dest)) {
		throw new CompanyAlreadyExistsError(workspaceRoot)
	}
	if (await pathExists(tmp)) {
		await rm(tmp, { recursive: true, force: true })
	}

	const now = new Date().toISOString()
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
	}

	try {
		await mkdir(tmp, { recursive: true })
		await writeTree(tmp, company, parsed.purpose)
		await rename(tmp, dest)
	} catch (error) {
		await rm(tmp, { recursive: true, force: true }).catch(() => undefined)
		throw error
	}

	return loadCompany(workspaceRoot)
}

export async function listAgentProfiles(workspaceRoot: string): Promise<AgentProfile[]> {
	const root = join(workspaceRoot, WORKSPACE_DIRNAME)
	const agentsDir = join(root, "org", "agents")
	if (!(await pathExists(agentsDir))) {
		return []
	}
	const entries = await readdir(agentsDir, { withFileTypes: true })
	const profiles: AgentProfile[] = []
	for (const entry of entries) {
		if (entry.isDirectory()) {
			const profilePath = join(agentsDir, entry.name, "profile.md")
			if (await pathExists(profilePath)) {
				try {
					const content = await readFile(profilePath, "utf8")
					const profile = parseAgentProfile(content, `org/agents/${entry.name}/profile.md`)
					profiles.push(profile)
				} catch {
					// Ignore invalid profile
				}
			}
		}
	}
	profiles.sort((a, b) => {
		if (a.role === "lead") return -1
		if (b.role === "lead") return 1
		return a.displayName.localeCompare(b.displayName)
	})
	return profiles
}

export async function getAgentProfile(workspaceRoot: string, agentId: string): Promise<AgentProfile | undefined> {
	const filePath = join(workspaceRoot, WORKSPACE_DIRNAME, "org", "agents", agentId, "profile.md")
	if (!(await pathExists(filePath))) {
		return undefined
	}
	const content = await readFile(filePath, "utf8")
	return parseAgentProfile(content, `org/agents/${agentId}/profile.md`)
}

export interface UpsertAgentInput {
	id: string
	displayName?: string
	description?: string
	role?: "lead" | "teammate"
	providerId?: string | null
	modelId?: string | null
	maxIterations?: number
	temperature?: number | null
	instructions: string
	tools?: {
		allow?: string[]
		deny?: string[]
	}
	scopePaths?: {
		allow?: string[]
		denyWrite?: string[]
	}
}

export async function upsertAgent(workspaceRoot: string, input: UpsertAgentInput): Promise<AgentProfile> {
	const load = await loadCompany(workspaceRoot)
	if (load.status !== "ready") {
		throw new Error("Công ty chưa sẵn sàng trong workspace này")
	}

	const description = input.description?.trim() || input.displayName?.trim() || input.id
	const displayName = input.displayName?.trim() || input.id
	const denyWrite = ensureMandatoryDenyWrite(input.scopePaths?.denyWrite)
	const normalizedInput = {
		...input,
		displayName,
		description,
		scopePaths: {
			allow: input.scopePaths?.allow ?? ["**/*"],
			denyWrite,
		},
	}

	const profile = AgentProfileSchema.parse({
		...normalizedInput,
		filePath: `org/agents/${input.id}/profile.md`,
	})

	const coordinatorId = load.company.coordinatorAgentId || COORDINATOR_AGENT_ID
	if (profile.role === "lead" && profile.id !== coordinatorId) {
		throw new Error("Không thể có hai lead. Lead duy nhất là coordinator.")
	}
	if (profile.id === coordinatorId && profile.role !== "lead") {
		throw new Error("Coordinator bắt buộc phải có role lead.")
	}

	const root = join(workspaceRoot, WORKSPACE_DIRNAME)
	const agentDir = join(root, "org", "agents", profile.id)
	const workspaceDir = join(agentDir, "workspace")
	await mkdir(workspaceDir, { recursive: true })

	const profilePath = join(agentDir, "profile.md")
	const serialized = serializeAgentProfile(profile)
	await writeFile(profilePath, serialized, "utf8")

	const memoryPath = join(workspaceDir, "memory.md")
	if (!(await pathExists(memoryPath))) {
		await writeFile(memoryPath, "", "utf8")
	}

	const rosterPath = join(root, ROSTER_FILE)
	const rawRoster = await readJsonIfPresent(rosterPath)
	const parsedRoster = RosterJsonSchema.safeParse(rawRoster)
	const currentRoster: RosterJson = parsedRoster.success ? parsedRoster.data : { schemaVersion: SCHEMA_VERSION, agents: [] }

	const existingIndex = currentRoster.agents.findIndex((a) => a.id === profile.id)
	const now = new Date().toISOString()
	const agentFile = `org/agents/${profile.id}/profile.md`

	if (existingIndex >= 0) {
		const existing = currentRoster.agents[existingIndex]
		currentRoster.agents[existingIndex] = {
			...existing,
			displayName: profile.displayName,
			role: profile.role,
			modelId: profile.modelId,
			maxIterations: profile.maxIterations,
			agentFile,
		}
	} else {
		currentRoster.agents.push({
			id: profile.id,
			displayName: profile.displayName,
			role: profile.role,
			status: "idle",
			agentFile,
			hiredAt: now,
			hiredBy: "ceo",
			modelId: profile.modelId,
			maxIterations: profile.maxIterations,
		})
	}

	const tmpRosterPath = join(root, "org", "roster.json.tmp")
	await writeFile(tmpRosterPath, `${JSON.stringify(currentRoster, null, "\t")}\n`, "utf8")
	await rename(tmpRosterPath, rosterPath)

	return profile
}

export async function removeAgent(workspaceRoot: string, agentId: string): Promise<CompanyLoad> {
	const load = await loadCompany(workspaceRoot)
	if (load.status !== "ready") {
		throw new Error("Công ty chưa sẵn sàng trong workspace này")
	}

	const coordinatorId = load.company.coordinatorAgentId || COORDINATOR_AGENT_ID
	if (agentId === coordinatorId) {
		throw new CannotDeleteCoordinatorError(coordinatorId)
	}

	const root = join(workspaceRoot, WORKSPACE_DIRNAME)
	const agentDir = join(root, "org", "agents", agentId)
	if (await pathExists(agentDir)) {
		await rm(agentDir, { recursive: true, force: true })
	}

	const rosterPath = join(root, ROSTER_FILE)
	const rawRoster = await readJsonIfPresent(rosterPath)
	const parsedRoster = RosterJsonSchema.safeParse(rawRoster)
	if (parsedRoster.success) {
		const updatedAgents = parsedRoster.data.agents.filter((a) => a.id !== agentId)
		const updatedRoster: RosterJson = {
			...parsedRoster.data,
			agents: updatedAgents,
		}
		const tmpRosterPath = join(root, "org", "roster.json.tmp")
		await writeFile(tmpRosterPath, `${JSON.stringify(updatedRoster, null, "\t")}\n`, "utf8")
		await rename(tmpRosterPath, rosterPath)
	}

	return loadCompany(workspaceRoot)
}

export async function getAgent(workspaceRoot: string, agentId: string): Promise<AgentDetail | undefined> {
	const profile = await getAgentProfile(workspaceRoot, agentId)
	if (!profile) {
		return undefined
	}
	const memoryPath = join(workspaceRoot, WORKSPACE_DIRNAME, "org", "agents", agentId, "workspace", "memory.md")
	const memory = (await readTextIfPresent(memoryPath)) ?? ""
	return { profile, memory }
}
