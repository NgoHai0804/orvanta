import type { SessionRecord } from "@cline/core"
import { type MessageWithMetadata, SessionNotFoundError } from "@cline/shared"
import { describe, expect, it, vi } from "vitest"
import type { SdkSessionHost } from "@/sdk/session-host"
import { queryParticipantTranscript } from "./participant-transcript-query"

const messages: MessageWithMetadata[] = [
	{ id: "u1", role: "user", content: "task one", ts: 1 } as MessageWithMetadata,
	{ id: "a1", role: "assistant", content: "answer one", ts: 2 } as MessageWithMetadata,
	{ id: "u2", role: "user", content: "task two", ts: 3 } as MessageWithMetadata,
]

function makeHost(options: { record?: Partial<SessionRecord> | null; messages?: MessageWithMetadata[] } = {}) {
	return {
		get: vi.fn(async () =>
			options.record === null
				? undefined
				: ({ sessionId: "sdk-session-reviewer", workspaceRoot: "C:\\repo", ...options.record } as SessionRecord),
		),
		readMessages: vi.fn(async () => options.messages ?? messages),
	} as unknown as SdkSessionHost
}

function makeManifest() {
	return {
		sessionId: "orv-session",
		participants: [
			{
				agentNumericId: 1,
				agentSlugAtJoin: "reviewer",
				transcript: { sdkSessionId: "sdk-session-reviewer", runIds: ["run-1", "run-2"] },
			},
			{
				agentNumericId: 2,
				agentSlugAtJoin: "builder",
				transcript: { sdkSessionId: "sdk-session-builder", runIds: ["run-3"] },
			},
		],
	}
}

describe("queryParticipantTranscript", () => {
	it("resolves each run to its participant's shared SDK transcript, never treating runId as sessionId", async () => {
		const host = makeHost()
		const result = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			runId: "run-2",
			loadManifest: async () => makeManifest() as never,
			sessionHost: host,
			pageSize: 2,
		})
		expect(result.status).toBe("ok")
		if (result.status !== "ok") return
		expect(result.sdkSessionId).toBe("sdk-session-reviewer")
		expect(result.messages.map(({ message }) => message.id)).toEqual(["u1", "a1"])
		expect(result.nextCursor).toBe("2")
		expect(host.get).toHaveBeenCalledWith("sdk-session-reviewer")
		expect(host.get).not.toHaveBeenCalledWith("run-2")
	})

	it("keeps multiple Agent transcripts isolated and rejects a run paired with another participant", async () => {
		const host = makeHost({ record: { sessionId: "sdk-session-builder" } })
		const builderResult = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 2,
			loadManifest: async () => makeManifest() as never,
			sessionHost: host,
		})
		expect(builderResult).toMatchObject({ status: "ok", sdkSessionId: "sdk-session-builder", participantSlug: "builder" })
		expect(host.get).toHaveBeenCalledTimes(1)
		expect(host.get).toHaveBeenCalledWith("sdk-session-builder")

		const mismatchedRun = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 2,
			runId: "run-2",
			loadManifest: async () => makeManifest() as never,
			sessionHost: host,
		})
		expect(mismatchedRun).toMatchObject({ status: "not-linked", reason: "run-not-linked" })
	})

	it("returns not-linked for legacy participants and unknown run mappings", async () => {
		const host = makeHost()
		const manifest = { sessionId: "orv-session", participants: [{ agentNumericId: 1, agentSlugAtJoin: "legacy" }] }
		const result = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => manifest as never,
			sessionHost: host,
		})
		expect(result).toMatchObject({ status: "not-linked", reason: "missing-session" })
		expect(host.get).not.toHaveBeenCalled()

		const unmappedRun = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			runId: "run-missing",
			loadManifest: async () => makeManifest() as never,
			sessionHost: host,
		})
		expect(unmappedRun).toMatchObject({ status: "not-linked", reason: "run-not-linked" })
	})

	it("distinguishes a missing participant or SDK row from manifest errors", async () => {
		const noParticipant = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 9,
			loadManifest: async () => makeManifest() as never,
			sessionHost: makeHost(),
		})
		expect(noParticipant).toMatchObject({ status: "not-found", resource: "participant", id: "9" })

		const missingSdk = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => makeManifest() as never,
			sessionHost: makeHost({ record: null }),
		})
		expect(missingSdk).toMatchObject({ status: "not-found", resource: "sdk-session", id: "sdk-session-reviewer" })

		const failure = new Error("corrupt manifest")
		const errored = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => {
				throw failure
			},
			sessionHost: makeHost(),
		})
		expect(errored).toMatchObject({ status: "error", code: "STORAGE_ERROR", error: failure })

		const missingManifest = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => {
				throw new SessionNotFoundError("orv-session")
			},
			sessionHost: makeHost(),
		})
		expect(missingManifest).toMatchObject({ status: "not-found", resource: "orvanta-session", id: "orv-session" })
	})

	it("rejects workspace mismatch and propagates transcript read errors", async () => {
		const mismatch = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => makeManifest() as never,
			sessionHost: makeHost({ record: { workspaceRoot: "C:\\other" } }),
		})
		expect(mismatch).toMatchObject({ status: "error", code: "WORKSPACE_MISMATCH" })

		const failure = new Error("corrupt transcript")
		const host = makeHost()
		vi.mocked(host.readMessages).mockRejectedValue(failure)
		const errored = await queryParticipantTranscript({
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "orv-session",
			participantNumericId: 1,
			loadManifest: async () => makeManifest() as never,
			sessionHost: host,
		})
		expect(errored).toMatchObject({ status: "error", code: "STORAGE_ERROR", error: failure })
	})

	it("caps canonical history and pages its display projection with offset cursors", async () => {
		const longTranscript = Array.from(
			{ length: 6 },
			(_, index) =>
				({
					id: `m${index}`,
					role: index % 2 ? "assistant" : "user",
					content: `message ${index}`,
					ts: index,
				}) as MessageWithMetadata,
		)
		const host = makeHost({ messages: longTranscript })
		const query = (cursor?: string) =>
			queryParticipantTranscript({
				workspaceRoot: "C:\\repo",
				orvantaSessionId: "orv-session",
				participantNumericId: 1,
				loadManifest: async () => makeManifest() as never,
				sessionHost: host,
				pageSize: 2,
				maxCanonicalMessages: 4,
				cursor,
			})
		const first = await query()
		expect(first).toMatchObject({ status: "ok", truncated: true })
		if (first.status !== "ok" || !first.nextCursor) return
		expect(first.messages.map(({ message }) => message.id)).toEqual(["m2", "m3"])
		const second = await query(first.nextCursor)
		expect(second.status).toBe("ok")
		if (second.status !== "ok") return
		expect(second.messages.map(({ message }) => message.id)).toEqual(["m4", "m5"])
		expect(second.nextCursor).toBeUndefined()
		expect(second.readCost).toBe("full-transcript-before-projection")
	})

	it("rejects invalid IDs and malformed cursors", async () => {
		const options = {
			workspaceRoot: "C:\\repo",
			orvantaSessionId: "../secret",
			participantNumericId: 1,
			loadManifest: async () => makeManifest() as never,
			sessionHost: makeHost(),
		}
		expect(await queryParticipantTranscript(options)).toMatchObject({ status: "error", code: "INVALID_ARGUMENT" })
		expect(await queryParticipantTranscript({ ...options, orvantaSessionId: "orv-session", cursor: "-1" })).toMatchObject({
			status: "error",
			code: "INVALID_ARGUMENT",
		})
	})
})
