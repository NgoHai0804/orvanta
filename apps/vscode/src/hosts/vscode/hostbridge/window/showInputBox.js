import * as vscode from "vscode"
import { ShowInputBoxResponse } from "@/shared/proto/index.host"
export async function showInputBox(request) {
	const response = await vscode.window.showInputBox({
		title: request.title,
		prompt: request.prompt,
		value: request.value,
	})
	return ShowInputBoxResponse.create({ response })
}
//# sourceMappingURL=showInputBox.js.map
