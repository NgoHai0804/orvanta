import { projectSessionMessagesForDisplay, type SessionDisplayMessage } from "@cline/core"
import type { MessageWithMetadata, OrvantaSessionManifest } from "@cline/shared"
import { SessionNotFoundError, validateSessionId } from "@cline/shared"
import type { SdkSessionHost } from "@/sdk/session-host"
import { arePathsEqual } from "@/utils/path"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100
const DEFAULT_MAX_CANONICAL_MESSAGES = 2_000

export interface ParticipantTranscriptQuery {
	workspaceRoot: string
	orvantaSessionId: string
	participantNumericId?: number
	runId?: string
	cursor?: string
	pageSize?: number
	maxCanonicalMessages?: number
	loadManifest: (workspaceRoot: string, sessionId: string) => Promise<OrvantaSessionManifest>
	sessionHost: Pick<SdkSessionHost, "get" | "readMessages">
}

export type ParticipantTranscriptResult =
	| { status: "not-linked"; reason: "missing-session" | "run-not-linked" }
	| { status: "not-found"; resource: "orvanta-session" | "participant" | "sdk-session"; id: string }
	| {
			status: "ok"
			sdkSessionId: string
			participantNumericId: number
			participantSlug: string
			runIds: string[]
			messages: SessionDisplayMessage[]
			nextCursor?: string
			truncated: boolean
			/** readMessages loads the full transcript before this bounded projection is formed. */
			readCost: "full-transcript-before-projection"
	  }
	| { status: "error"; code: "INVALID_ARGUMENT" | "WORKSPACE_MISMATCH" | "STORAGE_ERROR"; error: unknown }

function parseCursor(cursor: string | undefined): number | undefined {
	if (cursor === undefined) return 0
	if (!/^(0|[1-9]\d{0,8})$/.test(cursor)) return undefined
	const offset = Number(cursor)
	return Number.isSafeInteger(offset) ? offset : undefined
}

/**
 * Resolves a specific participant (or a run explicitly mapped to that participant),
 * then reads only the linked SDK session. Run IDs are associations, never session IDs.
 * SDK readMessages currently materializes all messages; this reader caps the display
 * projection, but offset paging does not reduce that underlying storage/read cost.
 */
export async function queryParticipantTranscript(input: ParticipantTranscriptQuery): Promise<ParticipantTranscriptResult> {
	let sessionId = input.orvantaSessionId
	let cursorOffset: number | undefined
	try {
		sessionId = validateSessionId(input.orvantaSessionId)
		if (!input.workspaceRoot.trim()) throw new Error("workspaceRoot is required")
		if (
			(input.participantNumericId !== undefined &&
				(!Number.isSafeInteger(input.participantNumericId) || input.participantNumericId <= 0)) ||
			(input.runId !== undefined && !/^[a-zA-Z0-9_-]{1,64}$/.test(input.runId)) ||
			(input.participantNumericId === undefined && input.runId === undefined)
		) {
			throw new Error("Provide a valid participantNumericId or runId")
		}
		cursorOffset = parseCursor(input.cursor)
		if (cursorOffset === undefined) throw new Error("Invalid transcript cursor")
	} catch (error) {
		return { status: "error", code: "INVALID_ARGUMENT", error }
	}

	try {
		const manifest = await input.loadManifest(input.workspaceRoot, sessionId)
		const participant = input.runId
			? manifest.participants.find((entry) => entry.transcript?.runIds.includes(input.runId!))
			: manifest.participants.find((entry) => entry.agentNumericId === input.participantNumericId)
		if (!participant) {
			return input.runId
				? { status: "not-linked", reason: "run-not-linked" }
				: { status: "not-found", resource: "participant", id: String(input.participantNumericId) }
		}
		if (
			input.runId &&
			input.participantNumericId !== undefined &&
			participant.agentNumericId !== input.participantNumericId
		) {
			return { status: "not-linked", reason: "run-not-linked" }
		}
		const sdkSessionId = participant.transcript?.sdkSessionId
		if (!sdkSessionId) return { status: "not-linked", reason: "missing-session" }

		const sdkSession = await input.sessionHost.get(sdkSessionId)
		if (!sdkSession) return { status: "not-found", resource: "sdk-session", id: sdkSessionId }
		if (!arePathsEqual(sdkSession.workspaceRoot, input.workspaceRoot)) {
			return {
				status: "error",
				code: "WORKSPACE_MISMATCH",
				error: new Error(`SDK session '${sdkSessionId}' belongs to a different workspace`),
			}
		}

		const canonical = await input.sessionHost.readMessages(sdkSessionId)
		const requestedCanonicalLimit = input.maxCanonicalMessages ?? DEFAULT_MAX_CANONICAL_MESSAGES
		const requestedPageSize = input.pageSize ?? DEFAULT_PAGE_SIZE
		if (!Number.isFinite(requestedCanonicalLimit) || !Number.isFinite(requestedPageSize)) {
			throw new Error("Transcript page and history limits must be finite numbers")
		}
		const maxCanonicalMessages = Math.min(Math.max(1, Math.floor(requestedCanonicalLimit)), DEFAULT_MAX_CANONICAL_MESSAGES)
		const windowStart = Math.max(0, canonical.length - maxCanonicalMessages)
		const boundedCanonical = canonical.slice(windowStart)
		const display = projectSessionMessagesForDisplay(boundedCanonical as MessageWithMetadata[])
		if (cursorOffset > display.length) throw new Error("Transcript cursor is outside the bounded transcript")
		const pageSize = Math.min(Math.max(1, Math.floor(requestedPageSize)), MAX_PAGE_SIZE)
		const page = display.slice(cursorOffset, cursorOffset + pageSize)
		const nextOffset = cursorOffset + page.length
		return {
			status: "ok",
			sdkSessionId,
			participantNumericId: participant.agentNumericId,
			participantSlug: participant.agentSlugAtJoin,
			runIds: participant.transcript?.runIds ?? [],
			messages: page,
			nextCursor: nextOffset < display.length ? String(nextOffset) : undefined,
			truncated: canonical.length > boundedCanonical.length,
			readCost: "full-transcript-before-projection",
		}
	} catch (error) {
		if (error instanceof SessionNotFoundError) {
			return { status: "not-found", resource: "orvanta-session", id: sessionId }
		}
		return { status: "error", code: "STORAGE_ERROR", error }
	}
}
