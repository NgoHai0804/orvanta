import { workspaceResolver } from "@core/workspace"
import { openFile as openFileIntegration } from "@integrations/misc/open-file"
import { Empty, StringRequest } from "@shared/proto/cline/common"
import { getWorkspacePath } from "@utils/path"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Opens a file in the editor by a relative path
 * @param controller The controller instance
 * @param request The request message containing the relative file path in the 'value' field
 * @returns Empty response
 */
export async function openFileRelativePath(_controller: Controller, request: StringRequest): Promise<Empty> {
	const workspacePath = await getWorkspacePath()

	if (!workspacePath) {
		Logger.error("Error in openFileRelativePath: No workspace path available")
		return Empty.create()
	}

	if (request.value) {
		let relativePath = request.value
		let lineNumber: string | undefined
		const match = relativePath.match(/^(.+?):(\d+)(?::\d+)?$/)
		if (match) {
			relativePath = match[1]
			lineNumber = match[2]
		}

		// Resolve the relative path to absolute path
		const resolvedPath = workspaceResolver.resolveWorkspacePath(
			workspacePath,
			relativePath,
			"Controller.openFileRelativePath",
		)
		const absolutePath = typeof resolvedPath === "string" ? resolvedPath : resolvedPath.absolutePath
		const finalPath = lineNumber ? `${absolutePath}:${lineNumber}` : absolutePath

		// Open the file using the existing integration
		openFileIntegration(finalPath)
	}

	return Empty.create()
}
