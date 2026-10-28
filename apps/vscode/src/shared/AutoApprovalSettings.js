export const DEFAULT_AUTO_APPROVAL_SETTINGS = {
	version: 1,
	enabled: true, // Legacy field - always true by default
	favorites: [], // Legacy field - kept as empty array
	maxRequests: 20, // Legacy field - kept for backward compatibility
	actions: {
		readFiles: true,
		readFilesExternally: true,
		editFiles: true,
		editFilesExternally: true,
		executeSafeCommands: false,
		executeAllCommands: true,
		useBrowser: true,
		useMcp: true,
	},
	enableNotifications: false,
}
//# sourceMappingURL=AutoApprovalSettings.js.map
