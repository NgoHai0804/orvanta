import { AgentMemoryCorruptError } from "@cline/shared"
import { StringRequest } from "@shared/proto/cline/common"
import { OrvantaAgentMemoryResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { getAgentMemory as readAcceptedMemory } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function getAgentMemory(_controller: Controller, request: StringRequest): Promise<OrvantaAgentMemoryResponse> {
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
		const content = await readAcceptedMemory(root, agentId)
		return OrvantaAgentMemoryResponse.create({
			success: true,
			agentId,
			content,
			status: content.length > 0 ? "ready" : "missing",
		})
	} catch (error) {
		if (error instanceof AgentMemoryCorruptError) {
			return OrvantaAgentMemoryResponse.create({
				success: false,
				error: error.message,
				agentId,
				content: "",
				status: "corrupt",
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
