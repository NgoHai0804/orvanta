import { AgentMemoryCorruptError } from "@cline/shared"
import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaMemoryProposal, OrvantaMemoryProposalList } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { listMemoryProposals as listProposals } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function listMemoryProposals(_controller: Controller, request: StringRequest): Promise<OrvantaMemoryProposalList> {
	const agentId = request.value?.trim()
	if (!agentId) {
		return OrvantaMemoryProposalList.create({
			success: false,
			error: "agentId is required",
			agentId: "",
			proposals: [],
		})
	}
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaMemoryProposalList.create({
			success: false,
			error: "No workspace folder open",
			agentId,
			proposals: [],
		})
	}
	try {
		const proposals = await listProposals(root, agentId)
		return OrvantaMemoryProposalList.create({
			success: true,
			agentId,
			proposals: proposals.map((p) =>
				OrvantaMemoryProposal.create({
					id: p.id,
					agentId: p.agentId,
					content: p.content,
					createdAt: p.createdAt,
				}),
			),
		})
	} catch (error) {
		if (error instanceof AgentMemoryCorruptError) {
			return OrvantaMemoryProposalList.create({
				success: false,
				error: error.message,
				agentId,
				proposals: [],
			})
		}
		return OrvantaMemoryProposalList.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			agentId,
			proposals: [],
		})
	}
}
