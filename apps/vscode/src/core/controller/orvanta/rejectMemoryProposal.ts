import { OrvantaMemoryProposal, OrvantaMemoryProposalActionRequest, OrvantaMemoryProposalList } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { listMemoryProposals, rejectMemoryProposal as rejectProposal } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function rejectMemoryProposal(
	_controller: Controller,
	request: OrvantaMemoryProposalActionRequest,
): Promise<OrvantaMemoryProposalList> {
	const agentId = request.agentId?.trim()
	const proposalId = request.proposalId?.trim()
	if (!agentId || !proposalId) {
		return OrvantaMemoryProposalList.create({
			success: false,
			error: "agentId and proposalId are required",
			agentId: agentId || "",
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
		await rejectProposal(root, agentId, proposalId)
		const proposals = await listMemoryProposals(root, agentId)
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
		return OrvantaMemoryProposalList.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			agentId,
			proposals: [],
		})
	}
}
