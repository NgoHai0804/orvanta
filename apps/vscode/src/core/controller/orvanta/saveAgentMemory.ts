import { OrvantaAgentMemoryResponse, OrvantaSaveAgentMemoryRequest } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { saveAgentMemory as writeAcceptedMemory } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function saveAgentMemory(
	_controller: Controller,
	request: OrvantaSaveAgentMemoryRequest,
): Promise<OrvantaAgentMemoryResponse> {
	const agentId = request.agentId?.trim()
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
		const content = request.content ?? ""
		await writeAcceptedMemory(root, agentId, content)
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
