import { CreateCompanyInputSchema } from "@cline/shared"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toCompanyResponse } from "@/orvanta/to-company-response"
import { CompanyAlreadyExistsError, createCompany as createCompanyOnDisk, loadCompany } from "@/orvanta/workspace-store"
export async function createCompany(_controller, request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return toCompanyResponse({ status: "missing" }, ["no_folder"])
	}
	const parsed = CreateCompanyInputSchema.safeParse({
		name: request.name,
		purpose: request.purpose,
	})
	const current = await loadCompany(root)
	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message ?? "name hoặc purpose không hợp lệ"
		return toCompanyResponse(current, [message])
	}
	try {
		return toCompanyResponse(await createCompanyOnDisk(root, parsed.data))
	} catch (error) {
		const message =
			error instanceof CompanyAlreadyExistsError ? error.message : error instanceof Error ? error.message : String(error)
		return toCompanyResponse(current, [message])
	}
}
//# sourceMappingURL=createCompany.js.map
