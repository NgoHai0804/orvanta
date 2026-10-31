/**
 * Phase 9: project chat/run/agent edits must not mutate the user library.
 */

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bindTaskToSession, createCompany, pathExists, saveAgentMemory, upsertAgent, WORKSPACE_DIRNAME } from "@cline/shared"
import { afterEach, describe, expect, it } from "vitest"
import { UserLibraryStore } from "./user-library-store"

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu."

const created: string[] = []

afterEach(async () => {
	await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function tempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), prefix))
	created.push(dir)
	return dir
}

describe("Phase 9 — user library isolation", () => {
	it("project bind/upsert/memory do not write into an injectable user library root", async () => {
		const project = await tempDir("orvanta-p9-proj-")
		const libraryRoot = await tempDir("orvanta-p9-lib-")
		const store = new UserLibraryStore(libraryRoot)

		const company = await createCompany(project, { name: "ProjNine", purpose: PURPOSE })
		expect(company.status).toBe("ready")
		if (company.status !== "ready") throw new Error("company not ready")

		await upsertAgent(project, {
			id: "reviewer",
			displayName: "Reviewer",
			role: "teammate",
			instructions: "Review",
		})
		await bindTaskToSession({
			workspaceRoot: project,
			companyId: company.company.id,
			sessionId: "ceo_p9_lib_1",
			taskId: "sdk_p9_lib_1",
			agentNumericId: 1,
			agentSlug: "coordinator",
			displayName: "Coordinator",
			role: "lead",
			sdkSessionId: "sdk_p9_lib_1",
			prompt: "Hello coordinator",
		})
		await saveAgentMemory(project, "reviewer", "project-local memory")

		// User library untouched — no companies snapshot created by project ops.
		expect(await pathExists(join(libraryRoot, "companies"))).toBe(false)
		expect(await store.list()).toEqual([])

		// Explicit publish is the only path that writes the library.
		await store.save(project, { name: "ProjNine", slug: "proj-nine" })
		expect(await pathExists(join(libraryRoot, "companies", "proj-nine", "company.json"))).toBe(true)
		// Project memory must not be copied into the published template.
		expect(await pathExists(join(libraryRoot, "companies", "proj-nine", "local", "memory"))).toBe(false)
		expect(await pathExists(join(project, WORKSPACE_DIRNAME, "local", "memory"))).toBe(true)
	})

	it("editing agent in project A does not change user library templates", async () => {
		const project = await tempDir("orvanta-p9-edit-")
		const libraryRoot = await tempDir("orvanta-p9-lib2-")
		const store = new UserLibraryStore(libraryRoot)

		await createCompany(project, { name: "EditNine", purpose: PURPOSE })
		await upsertAgent(project, {
			id: "builder",
			displayName: "Builder",
			role: "teammate",
			instructions: "v1",
		})
		await store.save(project, { name: "EditNine", slug: "edit-nine" })
		const profilePath = join(libraryRoot, "companies", "edit-nine", "org", "agents", "builder", "profile.md")
		const before = await readFile(profilePath, "utf8")
		const beforeListing = await readdir(join(libraryRoot, "companies", "edit-nine", "org", "agents", "builder"))

		await upsertAgent(project, {
			id: "builder",
			displayName: "Builder v2",
			role: "teammate",
			instructions: "v2-project-only",
		})

		const afterListing = await readdir(join(libraryRoot, "companies", "edit-nine", "org", "agents", "builder"))
		expect(afterListing).toEqual(beforeListing)
		const after = await readFile(profilePath, "utf8")
		expect(after).toBe(before)
		expect(after).toContain("v1")
		expect(after).not.toContain("v2-project-only")
	})
})
