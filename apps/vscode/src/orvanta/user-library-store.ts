import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import {
	COMPANY_FILE,
	COMPANY_SLUG_REGEX,
	type CompanyJson,
	type CompanyLoad,
	LIBRARY_DIRNAME,
	LIBRARY_INDEX_FILE,
	LIBRARY_META_FILE,
	type LibraryCompanyEntry,
	type LibraryMeta,
	LibraryMetaSchema,
	PURPOSE_FILE,
	ROSTER_FILE,
	ROSTER_SCHEMA_VERSION,
	type RosterJson,
	SCHEMA_VERSION,
	slugify,
	VERSION_FILE,
	VERSION_FILE_CONTENTS,
	validateLoadedCompany,
	WORKSPACE_DIRNAME,
} from "@cline/shared"
import { loadCompany, pathExists } from "./workspace-store"

export class SlugAlreadyExistsError extends Error {
	constructor(public readonly slug: string) {
		super(`Bản lưu '${slug}' đã tồn tại trong thư viện`)
		this.name = "SlugAlreadyExistsError"
	}
}

export class NeedsReplaceError extends Error {
	constructor(message = "needs_replace") {
		super(message)
		this.name = "NeedsReplaceError"
	}
}

export function userOrvantaRoot(baseDir: string = homedir()): string {
	return join(baseDir, ".orvanta")
}

export function companySnapshotDir(slug: string, root: string = userOrvantaRoot()): string {
	return join(root, LIBRARY_DIRNAME, slug)
}

export interface SaveLibraryInput {
	name: string
	slug?: string
	overwrite?: boolean
}

function makePurposePreview(purpose: string): string {
	const lines = purpose
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
	const line = lines.find((l) => !/^#\s*purpose$/i.test(l)) || lines[0] || ""
	return line.replace(/^#+\s*/, "").slice(0, 120)
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

export class UserLibraryStore {
	constructor(private readonly root: string = userOrvantaRoot()) {}

	private get companiesDir(): string {
		return join(this.root, LIBRARY_DIRNAME)
	}

	private get libraryIndexFile(): string {
		return join(this.root, LIBRARY_INDEX_FILE)
	}

	async list(): Promise<LibraryCompanyEntry[]> {
		if (!(await pathExists(this.companiesDir))) {
			return []
		}

		const entries = await readdir(this.companiesDir, { withFileTypes: true })
		const result: LibraryCompanyEntry[] = []

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue
			}
			const slug = entry.name
			const snapshotDir = join(this.companiesDir, slug)

			const purposePath = join(snapshotDir, PURPOSE_FILE)
			const companyPath = join(snapshotDir, COMPANY_FILE)
			const rosterPath = join(snapshotDir, ROSTER_FILE)
			const metaPath = join(snapshotDir, LIBRARY_META_FILE)

			const purpose = await readTextIfPresent(purposePath)
			const company = await readJsonIfPresent(companyPath)
			const roster = await readJsonIfPresent(rosterPath)
			const meta = await readJsonIfPresent(metaPath)

			const metaParsed = LibraryMetaSchema.safeParse(meta)
			const validated = validateLoadedCompany({ company, purpose, roster })

			const hasPurpose = Boolean(purpose && purpose.trim().length > 0)
			const isBroken = !hasPurpose || !validated.ok

			let name = metaParsed.success ? metaParsed.data.name : ""
			if (!name && validated.ok) {
				name = validated.company.name
			}
			if (!name) {
				name = slug
			}

			const savedAt = metaParsed.success
				? metaParsed.data.savedAt
				: await stat(snapshotDir)
						.then((s) => s.mtime.toISOString())
						.catch(() => new Date().toISOString())

			const agentCount = validated.ok ? validated.roster.agents.length : 0
			const purposePreview = purpose ? makePurposePreview(purpose) : ""

			const entryData: LibraryCompanyEntry = {
				slug,
				name,
				savedAt,
				agentCount,
				purposePreview,
				...(isBroken ? { isBroken: true, error: !hasPurpose ? "Thiếu purpose.md" : "Bản lưu bị hỏng" } : {}),
			}

			result.push(entryData)
		}

		result.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())

		const validToSave = result.filter((e) => !e.isBroken)
		const newIndex = {
			schemaVersion: SCHEMA_VERSION,
			companies: validToSave,
		}
		const tmpIndex = `${this.libraryIndexFile}.tmp`
		await mkdir(this.root, { recursive: true })
		await writeFile(tmpIndex, `${JSON.stringify(newIndex, null, "\t")}\n`, "utf8")
		await rename(tmpIndex, this.libraryIndexFile)

		return result
	}

	async save(workspaceRoot: string, input: SaveLibraryInput): Promise<LibraryCompanyEntry[]> {
		const load = await loadCompany(workspaceRoot)
		if (load.status !== "ready") {
			throw new Error("Công ty workspace chưa sẵn sàng hoặc bị lỗi")
		}

		const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name)
		if (!COMPANY_SLUG_REGEX.test(slug)) {
			throw new Error(`Slug '${slug}' không hợp lệ`)
		}

		await mkdir(this.companiesDir, { recursive: true })
		const destDir = join(this.companiesDir, slug)

		if ((await pathExists(destDir)) && !input.overwrite) {
			throw new SlugAlreadyExistsError(slug)
		}

		const tmpDir = join(this.companiesDir, `${slug}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
		await mkdir(tmpDir, { recursive: true })

		try {
			const now = new Date().toISOString()

			// 1. Snapshot company.json: remove workspaceRoot or set to ""
			const snapshotCompany: CompanyJson = {
				...load.company,
				workspaceRoot: "",
				updatedAt: now,
			}
			await writeFile(join(tmpDir, COMPANY_FILE), `${JSON.stringify(snapshotCompany, null, "\t")}\n`, "utf8")

			// 2. Snapshot purpose.md
			await writeFile(join(tmpDir, PURPOSE_FILE), load.purpose.endsWith("\n") ? load.purpose : `${load.purpose}\n`, "utf8")

			// 3. Snapshot constraints.md if present
			const wsConstraintsPath = join(workspaceRoot, WORKSPACE_DIRNAME, "constraints.md")
			const constraints = await readTextIfPresent(wsConstraintsPath)
			if (constraints !== undefined) {
				await writeFile(join(tmpDir, "constraints.md"), constraints, "utf8")
			}

			// 4. Snapshot org/roster.json: filter out pending_*, all statuses -> idle
			const activeAgents = load.roster.agents
				.filter((a) => a.status !== "pending_hire" && a.status !== "pending_fire")
				.map((a) => ({
					...a,
					status: "idle" as const,
				}))

			const snapshotRoster: RosterJson = {
				schemaVersion: ROSTER_SCHEMA_VERSION,
				nextAgentNumericId: load.roster.nextAgentNumericId,
				agents: activeAgents,
				retiredAgents: load.roster.retiredAgents,
			}
			await mkdir(join(tmpDir, "org"), { recursive: true })
			await writeFile(join(tmpDir, ROSTER_FILE), `${JSON.stringify(snapshotRoster, null, "\t")}\n`, "utf8")

			// 5. Snapshot agent profiles only (ALLOWLIST: no workspace/, no memory.md)
			for (const agent of activeAgents) {
				const wsProfilePath = join(workspaceRoot, WORKSPACE_DIRNAME, "org", "agents", agent.id, "profile.md")
				const profileContent = await readTextIfPresent(wsProfilePath)
				if (profileContent !== undefined) {
					const destAgentDir = join(tmpDir, "org", "agents", agent.id)
					await mkdir(destAgentDir, { recursive: true })
					await writeFile(join(destAgentDir, "profile.md"), profileContent, "utf8")
				}
			}

			// 6. Write meta.json
			const meta: LibraryMeta = {
				schemaVersion: SCHEMA_VERSION,
				slug,
				name: input.name.trim(),
				savedAt: now,
				sourceWorkspace: workspaceRoot,
				orvantaSchemaVersion: SCHEMA_VERSION,
			}
			await writeFile(join(tmpDir, LIBRARY_META_FILE), `${JSON.stringify(meta, null, "\t")}\n`, "utf8")

			// 7. Atomic rename
			if (await pathExists(destDir)) {
				const bakDir = join(this.companiesDir, `${slug}.bak-${Date.now()}`)
				await rename(destDir, bakDir)
				try {
					await rename(tmpDir, destDir)
					await rm(bakDir, { recursive: true, force: true }).catch(() => undefined)
				} catch (renameErr) {
					await rename(bakDir, destDir).catch(() => undefined)
					throw renameErr
				}
			} else {
				await rename(tmpDir, destDir)
			}
		} catch (err) {
			await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
			throw err
		}

		return this.list()
	}

	async load(workspaceRoot: string, slug: string, options?: { replace?: boolean }): Promise<CompanyLoad> {
		const snapshotDir = join(this.companiesDir, slug)
		if (!(await pathExists(snapshotDir))) {
			throw new Error(`Không tìm thấy bản lưu '${slug}'`)
		}

		// 1. Validate snapshot
		const company = await readJsonIfPresent(join(snapshotDir, COMPANY_FILE))
		const roster = await readJsonIfPresent(join(snapshotDir, ROSTER_FILE))
		const purpose = await readTextIfPresent(join(snapshotDir, PURPOSE_FILE))

		if (!purpose || purpose.trim().length === 0) {
			throw new Error("Bản lưu bị hỏng: thiếu purpose.md")
		}

		const validated = validateLoadedCompany({ company, purpose, roster })
		if (!validated.ok) {
			throw new Error(`Bản lưu bị hỏng: ${validated.errors.join(", ")}`)
		}

		const hasLead = validated.roster.agents.some((a) => a.role === "lead")
		if (!hasLead) {
			throw new Error("Bản lưu bị hỏng: không có lead trên roster")
		}

		// 2. Check workspace
		const current = await loadCompany(workspaceRoot)
		if (current.status === "ready" && !options?.replace) {
			throw new NeedsReplaceError("needs_replace")
		}

		const dest = join(workspaceRoot, WORKSPACE_DIRNAME)
		const tmp = join(workspaceRoot, `${WORKSPACE_DIRNAME}.tmp-${Date.now()}`)

		// 3. Prepare fresh company
		const now = new Date().toISOString()
		const newCompanyId = `orvanta-local-${crypto.randomUUID()}`

		const newCompany: CompanyJson = {
			...validated.company,
			id: newCompanyId,
			createdAt: now,
			updatedAt: now,
			workspaceRoot: ".",
		}

		await mkdir(tmp, { recursive: true })

		try {
			await writeFile(join(tmp, COMPANY_FILE), `${JSON.stringify(newCompany, null, "\t")}\n`, "utf8")
			await writeFile(join(tmp, PURPOSE_FILE), purpose.endsWith("\n") ? purpose : `${purpose}\n`, "utf8")
			await writeFile(join(tmp, VERSION_FILE), VERSION_FILE_CONTENTS, "utf8")

			// Constraints if present
			const snapConstraints = await readTextIfPresent(join(snapshotDir, "constraints.md"))
			if (snapConstraints !== undefined) {
				await writeFile(join(tmp, "constraints.md"), snapConstraints, "utf8")
			}

			// Roster: all agents idle
			const idleAgents = validated.roster.agents.map((a) => ({
				...a,
				status: "idle" as const,
			}))
			const newRoster: RosterJson = {
				schemaVersion: ROSTER_SCHEMA_VERSION,
				nextAgentNumericId: validated.roster.nextAgentNumericId,
				agents: idleAgents,
				retiredAgents: validated.roster.retiredAgents,
			}
			await mkdir(join(tmp, "org"), { recursive: true })
			await writeFile(join(tmp, ROSTER_FILE), `${JSON.stringify(newRoster, null, "\t")}\n`, "utf8")

			// Agent profiles and empty memory
			for (const agent of idleAgents) {
				const profileSrc = await readTextIfPresent(join(snapshotDir, "org", "agents", agent.id, "profile.md"))
				if (profileSrc !== undefined) {
					const agentDir = join(tmp, "org", "agents", agent.id)
					const wsDir = join(agentDir, "workspace")
					await mkdir(wsDir, { recursive: true })
					await writeFile(join(agentDir, "profile.md"), profileSrc, "utf8")
					await writeFile(join(wsDir, "memory.md"), "", "utf8")
				}
			}

			// If replacing, remove destination first
			if (await pathExists(dest)) {
				await rm(dest, { recursive: true, force: true })
			}
			await rename(tmp, dest)
		} catch (err) {
			await rm(tmp, { recursive: true, force: true }).catch(() => undefined)
			throw err
		}

		return loadCompany(workspaceRoot)
	}

	async remove(slug: string): Promise<LibraryCompanyEntry[]> {
		const snapshotDir = join(this.companiesDir, slug)
		if (await pathExists(snapshotDir)) {
			await rm(snapshotDir, { recursive: true, force: true })
		}
		return this.list()
	}
}
