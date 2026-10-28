/**
 * Singleton class that manages host-specific providers for dependency injection.
 *
 * This system runs on two different platforms (VSCode extension and cline-core),
 * so all the host-specific classes and properties are contained in here. The
 * rest of the codebase can use the host provider interface to access platform-specific
 * implementations in a platform-agnostic way.
 *
 * Usage:
 * - Initialize once: HostProvider.initialize(webviewCreator, editPreviewCreator, hostBridge)
 * - Access HostBridge services: HostProvider.window.showMessage()
 * - Access Host Provider factories: HostProvider.get().createEditPreview()
 */
export class HostProvider {
	static instance = null
	createWebviewProvider
	createEditPreview
	createCommentReviewController
	hostBridge
	// Logs to a user-visible output channel.
	logToChannel
	// Returns a callback URL that will redirect to Cline.
	// The path parameter specifies the route for the callback (e.g., "/auth", "/openrouter").
	// The optional preferredPort parameter hints that the provider should try to bind
	// this specific port first (used to preserve OAuth client registrations across sessions).
	getCallbackUrl
	// Returns the location of the binary `name`.
	// Use `getBinaryLocation()` from utils/ts.ts instead of using
	// this directly. The helper function correctly handles the file
	// extension on Windows.
	getBinaryLocation
	// The absolute file system path where the extension is installed.
	// Use to this to get the location of extension assets.
	extensionFsPath
	// The absolute file system path where the extension can store global state.
	globalStorageFsPath
	// Private constructor to enforce singleton pattern
	constructor(
		createWebviewProvider,
		createEditPreview,
		createCommentReviewController,
		hostBridge,
		logToChannel,
		getCallbackUrl,
		getBinaryLocation,
		extensionFsPath,
		globalStorageFsPath,
	) {
		this.createWebviewProvider = createWebviewProvider
		this.createEditPreview = createEditPreview
		this.createCommentReviewController = createCommentReviewController
		this.hostBridge = hostBridge
		this.logToChannel = logToChannel
		this.getCallbackUrl = getCallbackUrl
		this.getBinaryLocation = getBinaryLocation
		this.extensionFsPath = extensionFsPath
		this.globalStorageFsPath = globalStorageFsPath
	}
	static initialize(
		webviewProviderCreator,
		editPreviewCreator,
		commentReviewControllerCreator,
		hostBridgeProvider,
		logToChannel,
		getCallbackUrl,
		getBinaryLocation,
		extensionFsPath,
		globalStorageFsPath,
	) {
		if (HostProvider.instance) {
			throw new Error("Host provider has already been initialized.")
		}
		HostProvider.instance = new HostProvider(
			webviewProviderCreator,
			editPreviewCreator,
			commentReviewControllerCreator,
			hostBridgeProvider,
			logToChannel,
			getCallbackUrl,
			getBinaryLocation,
			extensionFsPath,
			globalStorageFsPath,
		)
		return HostProvider.instance
	}
	/**
	 * Gets the singleton instance
	 */
	static get() {
		if (!HostProvider.instance) {
			throw new Error("HostProvider not setup. Call HostProvider.initialize() first.")
		}
		return HostProvider.instance
	}
	static isInitialized() {
		return !!HostProvider.instance
	}
	/**
	 * Resets the HostProvider instance (primarily for testing)
	 * This allows tests to reinitialize the HostProvider with different configurations
	 */
	static reset() {
		HostProvider.instance = null
	}
	static get workspace() {
		return HostProvider.get().hostBridge.workspaceClient
	}
	static get env() {
		return HostProvider.get().hostBridge.envClient
	}
	static get window() {
		return HostProvider.get().hostBridge.windowClient
	}
	static get diff() {
		return HostProvider.get().hostBridge.diffClient
	}
}
//# sourceMappingURL=host-provider.js.map
