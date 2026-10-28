import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { WORKSPACE_DIRNAME } from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { globalTeamStatusTracker } from "@/orvanta/team-status-tracker"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { loadCompany } from "@/orvanta/workspace-store"
import type { Controller } from ".."

export async function getCompany(_controller: Controller, _request: EmptyRequest): Promise<OrvantaCompanyResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	let tasksJson = ""
	try {
		const teamDataDir = process.env.CLINE_TEAM_DATA_DIR || join(root, WORKSPACE_DIRNAME, "state", "team")
		tasksJson = await readFile(join(teamDataDir, "tasks.json"), "utf8")
	} catch {
		// optional tasks.json
	}
	return toCompanyResponse(await loadCompany(root), [], globalTeamStatusTracker.getRunningAgentIds(), tasksJson)
}
