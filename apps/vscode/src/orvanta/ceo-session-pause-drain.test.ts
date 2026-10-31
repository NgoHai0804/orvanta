import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createCompany, createSession, getCeoSessionPause, requestCeoSessionPause } from "@cline/shared"
import { afterEach, describe, expect, it, vi } from "vitest"
import { beginCeoSessionPauseDrain, handlePauseDrainOnTeamEvent } from "./ceo-session-pause-drain"
import { globalWarRoomTracker } from "./war-room-tracker"

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu."

describe("ceo-session-pause-drain", () => {
	const temps: string[] = []
	afterEach(async () => {
		vi.restoreAllMocks()
		for (const root of temps.splice(0)) {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("marks active agents draining then safe on terminal run without killing", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-drain-"))
		temps.push(root)
		const company = await createCompany(root, { name: "DrainCo", purpose: PURPOSE })
		expect(company.status).toBe("ready")
		if (company.status !== "ready") throw new Error("not ready")
		const sessionId = "ceo_drain_1"
		await createSession(root, {
			sessionId,
			companyId: company.company.id,
			title: "Drain session",
		})
		await requestCeoSessionPause(root, sessionId)

		vi.spyOn(globalWarRoomTracker, "listActiveAgentIds").mockReturnValue(["reviewer"])
		await beginCeoSessionPauseDrain(root, sessionId, ["coordinator", "reviewer", "builder"])
		const seeded = await getCeoSessionPause(root, sessionId)
		expect(seeded?.participants.coordinator).toBe("safe")
		expect(seeded?.participants.reviewer).toBe("draining")
		expect(seeded?.participants.builder).toBe("safe")

		vi.spyOn(globalWarRoomTracker, "listActiveAgentIds").mockReturnValue([])
		await handlePauseDrainOnTeamEvent(root, sessionId, {
			type: "run_completed",
			run: {
				id: "run_1",
				agentId: "reviewer",
				status: "completed",
				message: "done",
				priority: 0,
				retryCount: 0,
				maxRetries: 0,
				startedAt: new Date(),
			},
		} as never)

		const paused = await getCeoSessionPause(root, sessionId)
		expect(paused?.status).toBe("paused")
		expect(paused?.participants.reviewer).toBe("safe")
	})
})
