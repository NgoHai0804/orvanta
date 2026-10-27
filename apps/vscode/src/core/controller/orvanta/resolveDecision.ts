import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
	type AgentProfile,
	loadPendingInbox,
	PURPOSE_FILE,
	type ResolveDecisionInput,
	resolveDecision as resolveDecisionInStore,
	WORKSPACE_DIRNAME,
} from "@cline/shared"
import { OrvantaResolveDecisionRequest, OrvantaResolveDecisionResponse } from "@shared/proto/cline/orvanta"
import { globalInboxBadgeTracker } from "@/orvanta/inbox-badge-tracker"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { removeAgent, upsertAgent } from "@/orvanta/workspace-store"
import type { Controller } from ".."
import { toProtoDecisionItem, toProtoHistoryEntry } from "./listInbox"

export async function resolveDecision(
	_controller: Controller,
	request: OrvantaResolveDecisionRequest,
): Promise<OrvantaResolveDecisionResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaResolveDecisionResponse.create({
			success: false,
			error: "No workspace root found",
		})
	}

	try {
		const result = await resolveDecisionInStore(root, {
			id: request.id,
			action: request.action as ResolveDecisionInput["action"],
			note: request.note,
			resolvedBy: "ceo",
		})

		// Side effects on approve
		if (request.action === "approve") {
			const { type, payload } = result.item

			if (type === "hire_agent") {
				const agentId = String(payload.agentId || "")
				if (agentId) {
					const existingProfile = payload.profile as Partial<AgentProfile> | undefined
					const tools = payload.tools as { allow?: string[]; deny?: string[] } | undefined
					await upsertAgent(root, {
						id: agentId,
						displayName: String(payload.displayName || existingProfile?.displayName || agentId),
						role: "teammate",
						description: String(payload.rolePromptPreview || payload.summary || existingProfile?.description || ""),
						instructions: String(
							existingProfile?.instructions ||
								payload.instructions ||
								payload.rolePromptPreview ||
								`You are ${agentId}. Assist the team with tasks.`,
						),
						tools: {
							allow: tools?.allow ||
								existingProfile?.tools?.allow || [
									"read_files",
									"write_to_file",
									"apply_diff",
									"execute_command",
									"grep",
									"list_files",
								],
							deny: tools?.deny || existingProfile?.tools?.deny || ["team_spawn_teammate"],
						},
						scopePaths: {
							allow: existingProfile?.scopePaths?.allow || ["**/*"],
							denyWrite: existingProfile?.scopePaths?.denyWrite || [],
						},
						modelId: (payload.modelId as string) || existingProfile?.modelId || null,
						maxIterations: (payload.maxIterations as number) || existingProfile?.maxIterations || 40,
						temperature: existingProfile?.temperature ?? null,
					})
				}
			} else if (type === "fire_agent") {
				const agentId = String(payload.agentId || "")
				if (agentId) {
					await removeAgent(root, agentId)
				}
			} else if (type === "change_purpose") {
				const newPurpose = String(payload.to || "")
				if (newPurpose) {
					const purposePath = join(root, WORKSPACE_DIRNAME, PURPOSE_FILE)
					await writeFile(purposePath, newPurpose, "utf8")
				}
			}
		}

		// Update Activity Bar badge
		const pending = await loadPendingInbox(root)
		const pendingCount = pending.items.filter((i) => i.status === "pending").length
		globalInboxBadgeTracker.setBadge(pendingCount)

		return OrvantaResolveDecisionResponse.create({
			success: true,
			resolved: result.resolved ? toProtoHistoryEntry(result.resolved) : undefined,
			item: toProtoDecisionItem(result.item),
		})
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err)
		return OrvantaResolveDecisionResponse.create({
			success: false,
			error: message,
		})
	}
}
