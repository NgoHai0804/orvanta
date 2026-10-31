import { AgentMemoryNotFoundError } from "@cline/shared"
import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaAgentMemoryResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { deleteAgentMemory as removeAcceptedMemory } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function deleteAgentMemory(_controller: Controller, request: StringRequest): Promise<OrvantaAgentMemoryResponse> {
	const agentId = request.value?.trim()
	if (!agentId) {
		return OrvantaAgentMemoryResponse.create({
			success: false,
			error: "agentId is required",
			agentId: "",
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
		await removeAcceptedMemory(root, agentId)
		return OrvantaAgentMemoryResponse.create({
			success: true,
			agentId,
			content: "",
			status: "missing",
		})
	} catch (error) {
		if (error instanceof AgentMemoryNotFoundError) {
			return OrvantaAgentMemoryResponse.create({
				success: false,
				error: error.message,
				agentId,
				content: "",
				status: "missing",
			})
		}
		return OrvantaAgentMemoryResponse.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			agentId,
			content: "",
			status: "empty",
		})
	}
}
