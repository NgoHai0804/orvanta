import { Empty } from "@shared/proto/cline/common"
/**
 * Opens a multi-file diff of everything that changed between the latest
 * checkpoint (snapshotted when the user's last message started a run) and the
 * current working tree ("View Changes" on the completion row).
 */
export async function checkpointViewLatestChanges(controller, _request) {
	const sdkViewLatestCheckpointChanges = controller.viewLatestCheckpointChanges
	if (sdkViewLatestCheckpointChanges) {
		await sdkViewLatestCheckpointChanges.call(controller)
	}
	return Empty.create({})
}
//# sourceMappingURL=checkpointViewLatestChanges.js.map
