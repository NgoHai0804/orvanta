import { makeTeamTaskSubSessionId, type TeamEvent } from "@cline/core"
import { getSession, type OrvantaParticipantRole, recordTeamRunTranscriptLink } from "@cline/shared"
import { loadCompany } from "@/orvanta/workspace-store"
import { Logger } from "@/shared/services/Logger"

export interface CeoTranscriptBinding {
	workspaceRoot: string
	companyId: string
	orvantaSessionId: string
	rootSdkSessionId: string
}

const bindingsByCeoSession = new Map<string, CeoTranscriptBinding>()

export function registerCeoTranscriptBinding(binding: CeoTranscriptBinding): void {
	const sessionId = binding.orvantaSessionId.trim()
	const rootSdk = binding.rootSdkSessionId.trim()
	const workspaceRoot = binding.workspaceRoot.trim()
	if (!sessionId || !rootSdk || !workspaceRoot) return
	bindingsByCeoSession.set(sessionId, {
		workspaceRoot,
		companyId: binding.companyId.trim(),
		orvantaSessionId: sessionId,
		rootSdkSessionId: rootSdk,
	})
}

export function clearCeoTranscriptBinding(orvantaSessionId: string): void {
	bindingsByCeoSession.delete(orvantaSessionId.trim())
}

export function getCeoTranscriptBinding(orvantaSessionId: string): CeoTranscriptBinding | undefined {
	return bindingsByCeoSession.get(orvantaSessionId.trim())
}

function roleForAgent(slug: string, rosterRole?: string): OrvantaParticipantRole {
	if (slug === "coordinator" || slug === "lead" || rosterRole === "lead") return "lead"
	return "teammate"
}

/**
 * On teammate RunStarted: ensure the Orvanta participant maps to one canonical
 * SDK session (`makeTeamTaskSubSessionId(root, agent)`) and append the runId link only.
 */
export async function linkTeamRunFromEvent(binding: CeoTranscriptBinding, event: TeamEvent): Promise<void> {
	if (event.type !== "run_started") return
	const run = "run" in event ? event.run : undefined
	if (!run?.id || !run.agentId) return

	const agentSlug = String(run.agentId).trim()
	if (!agentSlug) return

	const load = await loadCompany(binding.workspaceRoot)
	if (load.status !== "ready") return

	const rosterAgent = load.roster.agents.find((a) => a.id === agentSlug)
	const agentNumericId =
		typeof rosterAgent?.agentNumericId === "number" && rosterAgent.agentNumericId > 0 ? rosterAgent.agentNumericId : undefined
	if (!agentNumericId) {
		Logger.warn(`[TeamRunTranscriptLinker] Skip link for '${agentSlug}': roster agentNumericId missing`)
		return
	}

	const sdkSessionId = makeTeamTaskSubSessionId(binding.rootSdkSessionId, agentSlug)
	const taskId = run.taskId?.trim() || sdkSessionId

	let existingSdk: string | undefined
	try {
		const manifest = await getSession(binding.workspaceRoot, binding.orvantaSessionId, {
			expectedCompanyId: binding.companyId || undefined,
		})
		existingSdk = manifest.participants.find((p) => p.agentNumericId === agentNumericId)?.transcript?.sdkSessionId
	} catch {
		// Session may not exist yet; recordTeamRunTranscriptLink / upsert will create participant
		// only when session exists — bindTaskToSession on coordinator creates the CEO session first.
	}

	await recordTeamRunTranscriptLink({
		workspaceRoot: binding.workspaceRoot,
		sessionId: binding.orvantaSessionId,
		runId: run.id,
		participant: {
			agentNumericId,
			agentSlugAtJoin: agentSlug,
			displayNameAtJoin: rosterAgent?.displayName || agentSlug,
			roleAtJoin: roleForAgent(agentSlug, rosterAgent?.role),
			taskId,
		},
		transcript: {
			sdkSessionId: existingSdk || sdkSessionId,
			runtimeAgentId: agentSlug,
		},
	})
}

export async function handleTeamEventTranscriptLink(orvantaSessionId: string | undefined, event: TeamEvent): Promise<void> {
	const sessionId = orvantaSessionId?.trim()
	if (!sessionId) return
	const binding = bindingsByCeoSession.get(sessionId)
	if (!binding) return
	try {
		await linkTeamRunFromEvent(binding, event)
	} catch (error) {
		Logger.warn("[TeamRunTranscriptLinker] Failed to record run transcript link:", error)
	}
}
