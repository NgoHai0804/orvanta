import { OrvantaAgentMemoryResponse, OrvantaMemoryProposalActionRequest } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { approveMemoryProposal as approveProposal, getAgentMemory } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function approveMemoryProposal(
	_controller: Controller,
	request: OrvantaMemoryProposalActionRequest,
): Promise<OrvantaAgentMemoryResponse> {
	const agentId = request.agentId?.trim()
	const proposalId = request.proposalId?.trim()
	if (!agentId || !proposalId) {
		return OrvantaAgentMemoryResponse.create({
			success: false,
			error: "agentId and proposalId are required",
			agentId: agentId || "",
			content: "",
			status: "empty",
		})
	}
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaAgentMemoryResponse.create({
			success: false,
			error: "No workspace folder open",
			agentId,
			content: "",
			status: "empty",
		})
	}
	try {
		await approveProposal(root, agentId, proposalId)
		const content = await getAgentMemory(root, agentId)
		return OrvantaAgentMemoryResponse.create({
			success: true,
			agentId,
			content,
			status: content.length > 0 ? "ready" : "missing",
		})
	} catch (error) {
		return OrvantaAgentMemoryResponse.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			agentId,
			content: "",
			status: "empty",
		})
	}
}
