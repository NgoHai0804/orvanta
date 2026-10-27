import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadPendingInbox, PURPOSE_FILE, requestDecision as requestDecisionInStore, WORKSPACE_DIRNAME } from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaRequestDecisionRequest, OrvantaResolveDecisionRequest } from "@shared/proto/cline/orvanta"
import type { Controller } from "@/core/controller"
import { listInbox } from "@/core/controller/orvanta/listInbox"
import { requestDecision } from "@/core/controller/orvanta/requestDecision"
import { resolveDecision } from "@/core/controller/orvanta/resolveDecision"
import { HostProvider } from "@/hosts/host-provider"
import { globalInboxBadgeTracker } from "./inbox-badge-tracker"
import { createCompany, loadCompany } from "./workspace-store"

describe("inbox controller handlers", () => {
	let tempDir: string
	const mockController = {} as unknown as Controller

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "orvanta-inbox-ctrl-"))
		globalInboxBadgeTracker.reset()

		Object.defineProperty(HostProvider, "workspace", {
			value: {
				getWorkspacePaths: async () => ({ paths: [tempDir] }),
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
		await rm(tempDir, { recursive: true, force: true })
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
})
