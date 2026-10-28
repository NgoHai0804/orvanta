import { openFile as openFileIntegration } from "@integrations/misc/open-file"
import { Empty } from "@shared/proto/cline/common"
import path from "path"
import { HostProvider } from "@/hosts/host-provider"
/**
 * Opens the api_conversation_history.json file for a task in the editor
 * @param controller The controller instance
 * @param request The request message containing the task ID in the 'value' field
 * @returns Empty response
 */
export async function openDiskConversationHistory(_controller, request) {
	if (request.value) {
		const globalStoragePath = HostProvider.get().globalStorageFsPath
		const taskConversationHistoryPath = path.join(globalStoragePath, "tasks", request.value, "api_conversation_history.json")
		await openFileIntegration(taskConversationHistoryPath)
	}
	return Empty.create()
}
//# sourceMappingURL=openDiskConversationHistory.js.map
