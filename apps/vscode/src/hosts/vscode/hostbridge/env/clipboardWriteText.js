import { Empty } from "@shared/proto/cline/common"
import * as vscode from "vscode"
export async function clipboardWriteText(request) {
	await vscode.env.clipboard.writeText(request.value)
	return Empty.create({})
}
//# sourceMappingURL=clipboardWriteText.js.map
