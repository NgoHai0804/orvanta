import { Empty } from "@shared/proto/cline/common"
/**
 * "Proceed While Running": detach the in-flight foreground terminal command(s)
 * so the agent turn continues with the partial output while the commands keep
 * running in the user's terminal, streaming further output to a log file.
 */
export async function proceedWhileRunningCommand(controller, _request) {
	const controllerWithProceed = controller
	await controllerWithProceed.proceedWhileRunningCommand()
	return Empty.create()
}
//# sourceMappingURL=proceedWhileRunningCommand.js.map
