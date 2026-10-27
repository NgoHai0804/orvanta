import type { CompanyLoad } from "@cline/shared"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"

export function toCompanyResponse(load: CompanyLoad, extraErrors: string[] = []): OrvantaCompanyResponse {
	if (load.status === "missing") {
		return OrvantaCompanyResponse.create({
			status: "missing",
			errors: extraErrors,
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})
	}
	if (load.status === "broken") {
		return OrvantaCompanyResponse.create({
			status: "broken",
			errors: [...load.errors, ...extraErrors],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})
	}
	return OrvantaCompanyResponse.create({
		status: "ready",
		errors: extraErrors,
		id: load.company.id,
		name: load.company.name,
		purpose: load.purpose,
		teamName: load.company.teamName,
		agents: load.roster.agents.map((agent) => ({
			id: agent.id,
			displayName: agent.displayName,
			role: agent.role,
			status: agent.status,
		})),
	})
}
