import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
	COMPANY_FILE,
	getPendingInboxPath,
	loadHistoryInbox,
	loadPendingInbox,
	PURPOSE_FILE,
	ROSTER_FILE,
	requestDecision as requestDecisionInStore,
	WORKSPACE_DIRNAME,
} from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaRequestDecisionRequest, OrvantaResolveDecisionRequest } from "@shared/proto/cline/orvanta"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Controller } from "@/core/controller"
import { listInbox } from "@/core/controller/orvanta/listInbox"
import { requestDecision } from "@/core/controller/orvanta/requestDecision"
import { resolveDecision } from "@/core/controller/orvanta/resolveDecision"
import { HostProvider } from "@/hosts/host-provider"
import { globalInboxBadgeTracker } from "./inbox-badge-tracker"
import { createCompany, loadCompany } from "./workspace-store"

describe("inbox controller handlers", () => {
	let tempDir: string
	let workspacePaths: string[]
	const additionalDirs: string[] = []
	const mockController = {} as unknown as Controller

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "orvanta-inbox-ctrl-"))
		workspacePaths = [tempDir]
		globalInboxBadgeTracker.reset()

		Object.defineProperty(HostProvider, "workspace", {
			value: {
				getWorkspacePaths: async () => ({ paths: workspacePaths }),
			},
			configurable: true,
		})

		// Create a ready company
		await createCompany(tempDir, {
			name: "Test Corp",
			purpose: "Building autonomous systems for everyone",
		})
	})

	afterEach(async () => {
		await Promise.all([tempDir, ...additionalDirs.splice(0)].map((dir) => rm(dir, { recursive: true, force: true })))
	})

	it("listInbox returns pending, deferred, and history items", async () => {
		// Request a decision
		await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Hire tester",
			summary: "QA",
			payload: { agentId: "tester" },
		})

		const resp = await listInbox(mockController, EmptyRequest.create({}))
		expect(resp.pendingCount).toBe(1)
		expect(resp.pending).toHaveLength(1)
		expect(resp.pending[0].title).toBe("Hire tester")
		expect(globalInboxBadgeTracker.getPendingCount()).toBe(1)
	})

	it("listInbox includes items from every open workspace", async () => {
		const otherWorkspace = await mkdtemp(join(tmpdir(), "orvanta-inbox-list-"))
		additionalDirs.push(otherWorkspace)
		await createCompany(otherWorkspace, {
			name: "Other Corp",
			purpose: "Building autonomous systems for everyone",
		})
		await requestDecisionInStore(otherWorkspace, {
			type: "hire_agent",
			title: "Hire workspace-two agent",
			summary: "Workspace two",
			payload: { agentId: "workspace-two-agent" },
		})
		workspacePaths = [tempDir, otherWorkspace]

		const response = await listInbox(mockController, EmptyRequest.create({}))

		expect(response.pendingCount).toBe(1)
		expect(response.pending.map((item) => item.title)).toContain("Hire workspace-two agent")
	})

	it("requestDecision creates pending item and updates badge", async () => {
		const req = OrvantaRequestDecisionRequest.create({
			type: "change_purpose",
			title: "New mission",
			summary: "Mission change",
			payloadJson: JSON.stringify({ from: "Old", to: "New goal" }),
		})

		const item = await requestDecision(mockController, req)
		expect(item.id).toMatch(/^dec_/)
		expect(item.urgency).toBe("high")
		expect(globalInboxBadgeTracker.getPendingCount()).toBe(1)

		const pending = await loadPendingInbox(tempDir)
		expect(pending.items).toHaveLength(1)
	})

	it("resolveDecision approve hire_agent upserts agent to roster", async () => {
		const { item } = await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Hire reviewer",
			summary: "Reviewer",
			payload: {
				agentId: "reviewer",
				displayName: "Code Reviewer",
				instructions: "Review all PRs carefully",
			},
		})

		const resolveReq = OrvantaResolveDecisionRequest.create({
			id: item.id,
			action: "approve",
			note: "Looks good",
		})

		const resp = await resolveDecision(mockController, resolveReq)
		expect(resp.success).toBe(true)
		expect(globalInboxBadgeTracker.getPendingCount()).toBe(0)

		const company = await loadCompany(tempDir)
		expect(company.status).toBe("ready")
		if (company.status === "ready") {
			const reviewer = company.roster.agents.find((a) => a.id === "reviewer")
			expect(reviewer).toBeDefined()
			expect(reviewer?.displayName).toBe("Code Reviewer")
			expect(reviewer?.status).toBe("idle")
		}
	})

	it("approves legacy role/count hire decisions by creating an Agent ID", async () => {
		const { item } = await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Tuyển 1 Dev",
			summary: "CEO requests one Dev teammate",
			payload: { role: "Dev", count: 1, requestedBy: "CEO" },
		})

		const response = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)

		expect(response.success).toBe(true)
		const company = await loadCompany(tempDir)
		expect(company.status).toBe("ready")
		if (company.status === "ready") {
			const dev = company.roster.agents.find((agent) => agent.displayName === "Dev" && agent.id.startsWith("dev-"))
			expect(dev?.id).toMatch(/^dev-[a-z0-9_-]+$/)
			expect(await readFile(join(tempDir, WORKSPACE_DIRNAME, dev!.agentFile), "utf8")).toContain("Dev teammate")
		}
	})

	it("persists stable IDs for multi-agent legacy hires so a failed approval can be retried", async () => {
		const rosterPath = join(tempDir, WORKSPACE_DIRNAME, ROSTER_FILE)
		const validRoster = await readFile(rosterPath, "utf8")
		const { item } = await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Tuyển 3 Reviewer",
			summary: "CEO requests three Reviewers",
			payload: { role: "Reviewer", count: 3, requestedBy: "CEO" },
		})
		await rm(rosterPath)

		const failedResponse = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)
		expect(failedResponse.success).toBe(false)
		const pendingAfterFailure = await loadPendingInbox(tempDir)
		const pendingHire = pendingAfterFailure.items.find((decision) => decision.id === item.id)
		const assignedIds = pendingHire?.payload.agentIds
		expect(Array.isArray(assignedIds)).toBe(true)
		expect(assignedIds).toHaveLength(3)

		await writeFile(rosterPath, validRoster, "utf8")
		const retryResponse = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)
		expect(retryResponse.success).toBe(true)
		const retryPending = await loadPendingInbox(tempDir)
		expect(retryPending.items.some((decision) => decision.id === item.id)).toBe(false)
		const company = await loadCompany(tempDir)
		expect(company.status).toBe("ready")
		if (company.status === "ready" && Array.isArray(assignedIds)) {
			for (const id of assignedIds) {
				expect(company.roster.agents.filter((agent) => agent.id === id)).toHaveLength(1)
			}
		}
	})

	it("resolves a hire decision in the workspace that owns it, not the first workspace", async () => {
		const otherWorkspace = await mkdtemp(join(tmpdir(), "orvanta-inbox-other-"))
		additionalDirs.push(otherWorkspace)
		await createCompany(otherWorkspace, {
			name: "Other Corp",
			purpose: "Building autonomous systems for everyone",
		})
		workspacePaths = [tempDir, otherWorkspace]

		const { item } = await requestDecisionInStore(otherWorkspace, {
			type: "hire_agent",
			title: "Hire researcher",
			summary: "Research",
			payload: { agentId: "researcher", instructions: "Research carefully." },
		})
		const response = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)

		expect(response.success).toBe(true)
		const firstCompany = await loadCompany(tempDir)
		const owningCompany = await loadCompany(otherWorkspace)
		expect(firstCompany.status).toBe("ready")
		expect(owningCompany.status).toBe("ready")
		if (firstCompany.status === "ready" && owningCompany.status === "ready") {
			expect(firstCompany.roster.agents.some((agent) => agent.id === "researcher")).toBe(false)
			const agent = owningCompany.roster.agents.find((rosterAgent) => rosterAgent.id === "researcher")
			expect(agent).toBeDefined()
			expect(await readFile(join(otherWorkspace, WORKSPACE_DIRNAME, agent!.agentFile), "utf8")).toContain(
				"Research carefully.",
			)
			expect(
				await readFile(
					join(otherWorkspace, WORKSPACE_DIRNAME, "org", "agents", "researcher", "workspace", "memory.md"),
					"utf8",
				),
			).toBe("")
		}
	})

	it("refuses to resolve a decision ID found in more than one open workspace", async () => {
		const otherWorkspace = await mkdtemp(join(tmpdir(), "orvanta-inbox-duplicate-"))
		additionalDirs.push(otherWorkspace)
		await createCompany(otherWorkspace, {
			name: "Duplicate Corp",
			purpose: "Building autonomous systems for everyone",
		})
		const { item } = await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Hire duplicate test agent",
			summary: "Testing ambiguity",
			payload: { agentId: "duplicate-test" },
		})
		const otherPendingPath = getPendingInboxPath(otherWorkspace)
		await mkdir(join(otherWorkspace, WORKSPACE_DIRNAME, "inbox"), { recursive: true })
		await writeFile(otherPendingPath, JSON.stringify({ schemaVersion: 1, items: [item] }), "utf8")
		workspacePaths = [tempDir, otherWorkspace]

		const response = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)

		expect(response.success).toBe(false)
		expect(response.error).toContain("multiple open workspaces")
		expect((await loadPendingInbox(tempDir)).items.some((decision) => decision.id === item.id)).toBe(true)
		expect((await loadPendingInbox(otherWorkspace)).items.some((decision) => decision.id === item.id)).toBe(true)
	})

	it("keeps a hire decision pending when saving the agent fails", async () => {
		const rosterPath = join(tempDir, WORKSPACE_DIRNAME, ROSTER_FILE)
		const validRoster = await readFile(rosterPath, "utf8")
		const { item } = await requestDecisionInStore(tempDir, {
			type: "hire_agent",
			title: "Rehire reviewer",
			summary: "Reviewer",
			payload: { agentId: "reviewer", instructions: "Updated reviewer." },
		})
		await rm(join(tempDir, WORKSPACE_DIRNAME, ROSTER_FILE))

		const response = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)

		expect(response.success).toBe(false)
		expect((await loadPendingInbox(tempDir)).items.some((decision) => decision.id === item.id)).toBe(true)
		expect(await loadHistoryInbox(tempDir)).toHaveLength(0)

		await writeFile(rosterPath, validRoster, "utf8")
		const retryResponse = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)
		expect(retryResponse.success).toBe(true)
		const duplicateResponse = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item.id, action: "approve" }),
		)
		expect(duplicateResponse.success).toBe(false)
		expect(await loadHistoryInbox(tempDir)).toHaveLength(1)
		const company = await loadCompany(tempDir)
		expect(company.status).toBe("ready")
		if (company.status === "ready") {
			expect(company.roster.agents.filter((agent) => agent.id === "reviewer")).toHaveLength(1)
		}
	})

	it("resolveDecision approve change_purpose modifies purpose.md", async () => {
		const newPurpose = "Brand new company purpose after CEO approval."
		const { item } = await requestDecisionInStore(tempDir, {
			type: "change_purpose",
			title: "Update purpose",
			summary: "Change",
			payload: {
				from: "Building autonomous systems for everyone",
				to: newPurpose,
			},
		})

		const resolveReq = OrvantaResolveDecisionRequest.create({
			id: item.id,
			action: "approve",
		})

		const resp = await resolveDecision(mockController, resolveReq)
		expect(resp.success).toBe(true)

		const purposeContent = await readFile(join(tempDir, WORKSPACE_DIRNAME, PURPOSE_FILE), "utf8")
		expect(purposeContent).toBe(newPurpose)
	})

	it("resolveDecision reject change_purpose does not modify purpose.md", async () => {
		const originalPurpose = "Building autonomous systems for everyone"
		const { item } = await requestDecisionInStore(tempDir, {
			type: "change_purpose",
			title: "Update purpose rejected",
			summary: "Change",
			payload: {
				from: originalPurpose,
				to: "Should not be saved",
			},
		})

		const resolveReq = OrvantaResolveDecisionRequest.create({
			id: item.id,
			action: "reject",
		})

		const resp = await resolveDecision(mockController, resolveReq)
		expect(resp.success).toBe(true)

		const purposeContent = await readFile(join(tempDir, WORKSPACE_DIRNAME, PURPOSE_FILE), "utf8")
		expect(purposeContent.trim()).toBe(originalPurpose)
	})
	it("resolveDecision approve change_policy modifies company.json policies", async () => {
		const { item } = await requestDecisionInStore(tempDir, {
			type: "change_policy",
			title: "Allow spawn teammate",
			summary: "Policy change",
			payload: {
				key: "spawn_teammate",
				from: "ceo_approve",
				to: "allow",
			},
		})

		const resolveReq = OrvantaResolveDecisionRequest.create({
			id: item.id,
			action: "approve",
		})

		const resp = await resolveDecision(mockController, resolveReq)
		expect(resp.success).toBe(true)

		const companyRaw = await readFile(join(tempDir, WORKSPACE_DIRNAME, COMPANY_FILE), "utf8")
		const companyData = JSON.parse(companyRaw)
		expect(companyData.policies?.spawn_teammate).toBe("allow")
	})

	it("resolveDecision reject merge fails if note is shorter than 8 chars", async () => {
		const { item } = await requestDecisionInStore(tempDir, {
			type: "merge",
			title: "Merge PR",
			summary: "Merge changes",
			payload: { outcomeId: "out-1", files: ["index.ts"] },
		})

		const resolveReq = OrvantaResolveDecisionRequest.create({
			id: item.id,
			action: "reject",
			note: "Too short", // < 8 chars or empty
		})

		// note: "No" < 8 chars
		resolveReq.note = "No"
		const resp = await resolveDecision(mockController, resolveReq)
		expect(resp.success).toBe(false)
		expect(resp.error).toContain("tối thiểu 8 ký tự")

		// note >= 8 chars succeeds
		resolveReq.note = "Reject because tests are missing"
		const resp2 = await resolveDecision(mockController, resolveReq)
		expect(resp2.success).toBe(true)
	})
	it("resolveDecision approve and reject change_scope updates task status in team tasks.json", async () => {
		const teamDir = join(tempDir, WORKSPACE_DIRNAME, "state", "team")
		await mkdir(teamDir, { recursive: true })
		const taskFile = join(teamDir, "tasks.json")
		await writeFile(
			taskFile,
			JSON.stringify({
				tasks: [
					{ id: "task-101", status: "blocked" },
					{ id: "task-102", status: "blocked" },
				],
			}),
			"utf8",
		)

		// Approve change_scope for task-101 -> pending
		const { item: item1 } = await requestDecisionInStore(tempDir, {
			type: "change_scope",
			title: "Expand scope 101",
			summary: "Scope",
			payload: { taskId: "task-101", whyOutsidePurpose: "Need DB" },
		})
		const resp1 = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item1.id, action: "approve" }),
		)
		expect(resp1.success).toBe(true)

		let tasksData = JSON.parse(await readFile(taskFile, "utf8"))
		expect(tasksData.tasks.find((t: any) => t.id === "task-101").status).toBe("pending")

		// Reject change_scope for task-102 -> canceled
		const { item: item2 } = await requestDecisionInStore(tempDir, {
			type: "change_scope",
			title: "Expand scope 102",
			summary: "Scope",
			payload: { taskId: "task-102", whyOutsidePurpose: "Need Rust" },
		})
		const resp2 = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: item2.id, action: "reject", note: "Reject scope expansion" }),
		)
		expect(resp2.success).toBe(true)

		tasksData = JSON.parse(await readFile(taskFile, "utf8"))
		expect(tasksData.tasks.find((t: any) => t.id === "task-102").status).toBe("canceled")
	})

	it("resolveDecision approve merge finalizes outcome, reject sends note to mailbox", async () => {
		const teamDir = join(tempDir, WORKSPACE_DIRNAME, "state", "team")
		const mailDir = join(teamDir, "mailboxes")
		await mkdir(mailDir, { recursive: true })
		const outcomesFile = join(teamDir, "outcomes.json")
		await writeFile(outcomesFile, JSON.stringify({ outcomes: [{ id: "out-auth", status: "in_review" }] }), "utf8")

		// Approve merge -> status finalized
		const { item: itemApprove } = await requestDecisionInStore(tempDir, {
			type: "merge",
			title: "Merge auth",
			summary: "Auth complete",
			payload: { outcomeId: "out-auth", files: ["auth.ts"] },
		})
		const respApprove = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: itemApprove.id, action: "approve" }),
		)

		expect(respApprove.success).toBe(true)

		const outcomesData = JSON.parse(await readFile(outcomesFile, "utf8"))
		expect(outcomesData.outcomes[0].status).toBe("finalized")

		// Reject merge -> writes to mailbox
		const { item: itemReject } = await requestDecisionInStore(tempDir, {
			type: "merge",
			title: "Merge payments",
			summary: "Payments",
			payload: { outcomeId: "out-pay", authorAgentId: "implementer", files: ["pay.ts"] },
		})
		const rejectNote = "Please fix failing unit tests before merge."
		const respReject = await resolveDecision(
			mockController,
			OrvantaResolveDecisionRequest.create({ id: itemReject.id, action: "reject", note: rejectNote }),
		)
		expect(respReject.success).toBe(true)

		const mailContent = await readFile(join(mailDir, "implementer.jsonl"), "utf8")
		expect(mailContent).toContain("merge_rejected")
		expect(mailContent).toContain(rejectNote)
	})
})
