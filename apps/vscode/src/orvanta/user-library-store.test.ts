import { afterEach, describe, expect, it } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { slugify, WORKSPACE_DIRNAME } from "@cline/shared"
import { NeedsReplaceError, SlugAlreadyExistsError, UserLibraryStore, userOrvantaRoot } from "./user-library-store"
import { createCompany, pathExists, removeAgent, upsertAgent } from "./workspace-store"

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu."

const created: string[] = []

afterEach(async () => {
	await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function tempDir(prefix = "orvanta-test-"): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), prefix))
	created.push(dir)
	return dir
}

describe("userOrvantaRoot & slugify", () => {
	it("userOrvantaRoot() ends with .orvanta under homedir()", () => {
		const root = userOrvantaRoot()
		expect(root.endsWith(".orvanta")).toBe(true)
		expect(root).toBe(join(homedir(), ".orvanta"))
	})

	it("slugify: 'Orvanta Core' -> 'orvanta-core'", () => {
		expect(slugify("Orvanta Core")).toBe("orvanta-core")
	})
})

describe("UserLibraryStore", () => {
	it("save temp workspace -> dest does not contain inbox / state / memory / runs", async () => {
		const ws = await tempDir("ws-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(ws, { name: "Orvanta Core", purpose: PURPOSE })
		await upsertAgent(ws, {
			id: "developer",
			displayName: "Developer",
			role: "teammate",
			instructions: "Code features",
		})

		const wsOrvanta = join(ws, WORKSPACE_DIRNAME)
		await mkdir(join(wsOrvanta, "inbox"), { recursive: true })
		await writeFile(join(wsOrvanta, "inbox", "task1.json"), "{}")
		await mkdir(join(wsOrvanta, "state"), { recursive: true })
		await writeFile(join(wsOrvanta, "state", "run.json"), "{}")
		await mkdir(join(wsOrvanta, "runs"), { recursive: true })
		await writeFile(join(wsOrvanta, "runs", "1.log"), "log")
		await mkdir(join(wsOrvanta, "secrets"), { recursive: true })
		await writeFile(join(wsOrvanta, "secrets", "api-key"), "key")

		const list = await store.save(ws, { name: "Orvanta Core" })
		expect(list.length).toBe(1)
		expect(list[0].slug).toBe("orvanta-core")
		expect(list[0].agentCount).toBe(2)

		const snapshotDir = join(fakeRoot, "companies", "orvanta-core")
		expect(await pathExists(join(snapshotDir, "company.json"))).toBe(true)
		expect(await pathExists(join(snapshotDir, "purpose.md"))).toBe(true)
		expect(await pathExists(join(snapshotDir, "org", "roster.json"))).toBe(true)
		expect(await pathExists(join(snapshotDir, "org", "agents", "developer", "profile.md"))).toBe(true)

		expect(await pathExists(join(snapshotDir, "inbox"))).toBe(false)
		expect(await pathExists(join(snapshotDir, "state"))).toBe(false)
		expect(await pathExists(join(snapshotDir, "runs"))).toBe(false)
		expect(await pathExists(join(snapshotDir, "secrets"))).toBe(false)
		expect(await pathExists(join(snapshotDir, "org", "agents", "developer", "workspace"))).toBe(false)
	})

	it("save two slugs isolated", async () => {
		const ws1 = await tempDir("ws1-")
		const ws2 = await tempDir("ws2-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(ws1, { name: "First Co", purpose: PURPOSE })
		await createCompany(ws2, { name: "Second Co", purpose: "Purpose of the second company here." })

		await store.save(ws1, { name: "First Co", slug: "first-co" })
		const list = await store.save(ws2, { name: "Second Co", slug: "second-co" })

		expect(list.length).toBe(2)
		expect(await pathExists(join(fakeRoot, "companies", "first-co", "company.json"))).toBe(true)
		expect(await pathExists(join(fakeRoot, "companies", "second-co", "company.json"))).toBe(true)
	})

	it("overwrite false + exists -> error", async () => {
		const ws = await tempDir("ws-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(ws, { name: "Orvanta", purpose: PURPOSE })
		await store.save(ws, { name: "Orvanta", slug: "orvanta" })

		expect(store.save(ws, { name: "Orvanta", slug: "orvanta", overwrite: false })).rejects.toBeInstanceOf(
			SlugAlreadyExistsError,
		)

		const updated = await store.save(ws, { name: "Orvanta Updated", slug: "orvanta", overwrite: true })
		expect(updated.find((e) => e.slug === "orvanta")?.name).toBe("Orvanta Updated")
	})

	it("load -> new id, idle, purpose equal", async () => {
		const wsSrc = await tempDir("ws-src-")
		const wsDest = await tempDir("ws-dest-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		const srcCreated = await createCompany(wsSrc, { name: "Source Co", purpose: PURPOSE })
		if (srcCreated.status !== "ready") throw new Error("Expected ready")
		const originalId = srcCreated.company.id

		await store.save(wsSrc, { name: "Source Co", slug: "source-co" })

		const loaded = await store.load(wsDest, "source-co")
		if (loaded.status !== "ready") throw new Error("Expected ready after load")

		expect(loaded.company.id).not.toBe(originalId)
		expect(loaded.purpose).toBe(PURPOSE)
		expect(loaded.company.name).toBe("Source Co")
		expect(loaded.roster.agents.every((a) => a.status === "idle")).toBe(true)
		expect(loaded.roster.agents.length).toBe(1)
	})

	it("load replace false when workspace ready throws needs_replace", async () => {
		const wsSrc = await tempDir("ws-src-")
		const wsDest = await tempDir("ws-dest-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(wsSrc, { name: "Source Co", purpose: PURPOSE })
		await store.save(wsSrc, { name: "Source Co", slug: "source-co" })

		await createCompany(wsDest, { name: "Existing Co", purpose: "Existing company purpose here." })

		expect(store.load(wsDest, "source-co", { replace: false })).rejects.toBeInstanceOf(NeedsReplaceError)
	})

	it("load replace true deletes old inbox/task", async () => {
		const wsSrc = await tempDir("ws-src-")
		const wsDest = await tempDir("ws-dest-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(wsSrc, { name: "Source Co", purpose: PURPOSE })
		await store.save(wsSrc, { name: "Source Co", slug: "source-co" })

		await createCompany(wsDest, { name: "Existing Co", purpose: "Existing company purpose here." })
		const wsDestOrvanta = join(wsDest, WORKSPACE_DIRNAME)
		await mkdir(join(wsDestOrvanta, "inbox"), { recursive: true })
		await writeFile(join(wsDestOrvanta, "inbox", "old-task.json"), "{}")

		const loaded = await store.load(wsDest, "source-co", { replace: true })
		if (loaded.status !== "ready") throw new Error("Expected ready after replace load")

		expect(loaded.company.name).toBe("Source Co")
		expect(await pathExists(join(wsDestOrvanta, "inbox"))).toBe(false)
	})

	it("remove removes company snapshot and updates list", async () => {
		const ws = await tempDir("ws-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(ws, { name: "To Delete", purpose: PURPOSE })
		await store.save(ws, { name: "To Delete", slug: "to-delete" })

		expect(await pathExists(join(fakeRoot, "companies", "to-delete"))).toBe(true)
		const afterRemove = await store.remove("to-delete")
		expect(afterRemove.length).toBe(0)
		expect(await pathExists(join(fakeRoot, "companies", "to-delete"))).toBe(false)
	})

	it("preserves ROSTER_SCHEMA_VERSION, nextAgentNumericId, and retiredAgents across library save & load", async () => {
		const wsSrc = await tempDir("ws-src-")
		const wsDest = await tempDir("ws-dest-")
		const fakeRoot = await tempDir("lib-")
		const store = new UserLibraryStore(fakeRoot)

		await createCompany(wsSrc, { name: "Template Co", purpose: PURPOSE })
		const reviewer = await upsertAgent(wsSrc, { id: "reviewer", role: "teammate", instructions: "Review." })
		expect(reviewer.agentNumericId).toBe(2)

		// Retire reviewer (enters retiredAgents with ID 2)
		await removeAgent(wsSrc, "reviewer")

		// Hire implementer (gets ID 3)
		const implementer = await upsertAgent(wsSrc, { id: "implementer", role: "teammate", instructions: "Code." })
		expect(implementer.agentNumericId).toBe(3)

		// Save company to library
		await store.save(wsSrc, { name: "Template Co", slug: "template-co" })

		// Load template into wsDest
		const loaded = await store.load(wsDest, "template-co")
		expect(loaded.status).toBe("ready")
		if (loaded.status === "ready") {
			expect(loaded.roster.schemaVersion).toBe(2)
			expect(loaded.roster.nextAgentNumericId).toBe(4)
			expect(loaded.roster.agents.find((a) => a.id === "coordinator")?.agentNumericId).toBe(1)
			expect(loaded.roster.agents.find((a) => a.id === "implementer")?.agentNumericId).toBe(3)
			expect(loaded.roster.retiredAgents.find((a) => a.id === "reviewer")?.agentNumericId).toBe(2)
		}
	})
})
