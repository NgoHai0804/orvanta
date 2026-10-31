import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { makeTeamTaskSubSessionId } from "@cline/core"
import { bindTaskToSession, createCompany, getSession, upsertAgent } from "@cline/shared"
import { afterEach, describe, expect, it } from "vitest"
import { clearCeoTranscriptBinding, linkTeamRunFromEvent, registerCeoTranscriptBinding } from "./team-run-transcript-linker"

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu."

describe("team-run-transcript-linker", () => {
	const temps: string[] = []
	afterEach(async () => {
		for (const root of temps.splice(0)) {
			await rm(root, { recursive: true, force: true })
		}
		clearCeoTranscriptBinding("ceo_link_1")
	})

	it("maps multiple runs of the same agent to one sdkSessionId and appends runIds", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-linker-"))
		temps.push(root)
		const companyLoad = await createCompany(root, { name: "LinkerCo", purpose: PURPOSE })
		expect(companyLoad.status).toBe("ready")
		if (companyLoad.status !== "ready") throw new Error("company not ready")
		await upsertAgent(root, {
			id: "reviewer",
			displayName: "Reviewer",
			role: "teammate",
			description: "Reviews code",
			instructions: "Review carefully",
		})
		const orvantaSessionId = "ceo_link_1"
		const rootSdkSessionId = "sdk_root_abc"
		await bindTaskToSession({
			workspaceRoot: root,
			companyId: companyLoad.company.id,
			sessionId: orvantaSessionId,
			taskId: rootSdkSessionId,
			agentNumericId: 1,
			agentSlug: "coordinator",
			displayName: "Coordinator",
			role: "lead",
			sdkSessionId: rootSdkSessionId,
		})
		registerCeoTranscriptBinding({
			workspaceRoot: root,
			companyId: companyLoad.company.id,
			orvantaSessionId,
			rootSdkSessionId,
		})
		const binding = {
			workspaceRoot: root,
			companyId: companyLoad.company.id,
			orvantaSessionId,
			rootSdkSessionId,
		}
		const baseRun = {
			agentId: "reviewer",
			status: "running" as const,
			message: "review",
			priority: 0,
			retryCount: 0,
			maxRetries: 0,
			startedAt: new Date(),
		}
		await linkTeamRunFromEvent(binding, {
			type: "run_started",
			run: { ...baseRun, id: "run_00001" },
		} as never)
		await linkTeamRunFromEvent(binding, {
			type: "run_started",
			run: { ...baseRun, id: "run_00002", message: "second" },
		} as never)

		const session = await getSession(root, orvantaSessionId)
		const reviewer = session.participants.find((p) => p.agentSlugAtJoin === "reviewer")
		expect(reviewer?.transcript?.sdkSessionId).toBe(makeTeamTaskSubSessionId(rootSdkSessionId, "reviewer"))
		expect(reviewer?.transcript?.runIds).toEqual(["run_00001", "run_00002"])
		expect(session.participants.filter((p) => p.agentSlugAtJoin === "reviewer")).toHaveLength(1)
	})
})
