import { appendFile, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
	type AgentProfile,
	COMPANY_FILE,
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

		// Side effects on approve or reject
		const isApprove = request.action === "approve"
		const isReject = request.action === "reject"
		const { type, payload } = result.item

		if (isApprove) {
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
			} else if (type === "change_role") {
				const agentId = String(payload.agentId || "")
				if (agentId) {
					const existingProfile = payload.profile as Partial<AgentProfile> | undefined
					const tools = payload.tools as { allow?: string[]; deny?: string[] } | undefined
					await upsertAgent(root, {
						id: agentId,
						displayName: String(payload.displayName || existingProfile?.displayName || agentId),
						role: "teammate",
						description: String(existingProfile?.description || payload.summary || ""),
						instructions: String(existingProfile?.instructions || payload.instructions || ""),
						tools: {
							allow: tools?.allow || existingProfile?.tools?.allow,
							deny: tools?.deny || existingProfile?.tools?.deny,
						},
						scopePaths: existingProfile?.scopePaths,
						modelId: (payload.modelId as string) || existingProfile?.modelId || null,
						maxIterations: (payload.maxIterations as number) || existingProfile?.maxIterations,
						temperature: existingProfile?.temperature ?? null,
					})
				}
			} else if (type === "change_policy") {
				const key = String(payload.key || "")
				const toValue = String(payload.to || "")
				if (key && toValue) {
					const companyJsonPath = join(root, WORKSPACE_DIRNAME, COMPANY_FILE)
					try {
						const raw = await readFile(companyJsonPath, "utf8")
						const data = JSON.parse(raw)
						data.policies = data.policies || {}
						data.policies[key] = toValue
						await writeFile(companyJsonPath, `${JSON.stringify(data, null, "\t")}\n`, "utf8")
					} catch (e) {
						// ignore if company.json cannot be parsed
					}
				}
			}
		}

		if (type === "change_scope" && (isApprove || isReject)) {
			const taskId = String(payload.taskId || "")
			if (taskId) {
				const teamDataDir = process.env.CLINE_TEAM_DATA_DIR || join(root, WORKSPACE_DIRNAME, "state", "team")
				const taskFile = join(teamDataDir, "tasks.json")
				try {
					const raw = await readFile(taskFile, "utf8")
					const data = JSON.parse(raw)
					if (Array.isArray(data.tasks)) {
						const t = data.tasks.find((x: any) => x.id === taskId)
						if (t) {
							t.status = isApprove ? "pending" : "canceled"
							await writeFile(taskFile, `${JSON.stringify(data, null, "\t")}\n`, "utf8")
						}
					}
				} catch {
					// ignore if tasks.json not yet created
				}
			}
		} else if (type === "merge") {
			const outcomeId = String(payload.outcomeId || "")
			const authorAgentId = String(payload.authorAgentId || "implementer")
			const teamDataDir = process.env.CLINE_TEAM_DATA_DIR || join(root, WORKSPACE_DIRNAME, "state", "team")
			if (isApprove) {
				if (outcomeId) {
					const outcomesFile = join(teamDataDir, "outcomes.json")
					try {
						const raw = await readFile(outcomesFile, "utf8")
						const data = JSON.parse(raw)
						if (Array.isArray(data.outcomes)) {
							const out = data.outcomes.find((x: any) => x.id === outcomeId)
							if (out) {
								out.status = "finalized"
								await writeFile(outcomesFile, `${JSON.stringify(data, null, "\t")}\n`, "utf8")
							}
						}
					} catch {}
				}
			} else if (isReject) {
				const note = request.note || ""
				const mailFile = join(teamDataDir, "mailboxes", `${authorAgentId}.jsonl`)
				try {
					const mailEntry = JSON.stringify({
						from: "ceo",
						to: authorAgentId,
						type: "merge_rejected",
						outcomeId,
						note,
						timestamp: new Date().toISOString(),
					})
					await appendFile(mailFile, `${mailEntry}\n`, "utf8")
				} catch {}
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
