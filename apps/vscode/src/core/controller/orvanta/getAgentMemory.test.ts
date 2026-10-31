import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { StringRequest } from "@shared/proto/cline/common"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCompany, saveAgentMemory } from "@/orvanta/workspace-store"
import type { Controller } from ".."
import { getAgentMemory } from "./getAgentMemory"

const resolveRoot = vi.hoisted(() => vi.fn())

vi.mock("@/orvanta/resolve-workspace", () => ({
	resolveOrvantaWorkspaceRoot: () => resolveRoot(),
}))

describe("getAgentMemory controller", () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "orvanta-mem-ctrl-"))
		await createCompany(root, {
			name: "Orvanta",
			purpose: "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.",
		})
		resolveRoot.mockResolvedValue(root)
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it("returns ready memory content for an agent", async () => {
		await saveAgentMemory(root, "coordinator", "accepted-memory")
		const resp = await getAgentMemory({} as Controller, StringRequest.create({ value: "coordinator" }))
		expect(resp.success).toBe(true)
		expect(resp.status).toBe("ready")
		expect(resp.content).toBe("accepted-memory")
	})

	it("returns missing when no accepted memory exists", async () => {
		const resp = await getAgentMemory({} as Controller, StringRequest.create({ value: "coordinator" }))
		expect(resp.success).toBe(true)
		expect(resp.status).toBe("missing")
		expect(resp.content).toBe("")
	})

	it("fails closed when agentId is empty", async () => {
		const resp = await getAgentMemory({} as Controller, StringRequest.create({ value: "  " }))
		expect(resp.success).toBe(false)
		expect(resp.status).toBe("empty")
	})
})
