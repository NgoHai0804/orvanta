import { HostProvider } from "@/hosts/host-provider"
import { vscodeHostBridgeClient } from "@/hosts/vscode/hostbridge/client/host-grpc-client"
/**
 * Initializes the HostProvider with test defaults.
 * This is a common setup used across multiple test files.
 *
 * @param options Optional overrides for the default test configuration
 */
export function setVscodeHostProviderMock(options) {
	HostProvider.reset()
	HostProvider.initialize(
		options?.webviewProviderCreator ?? (() => {}),
		options?.editPreviewCreator ?? (() => {}),
		options?.commentReviewControllerCreator ?? (() => {}),
		options?.hostBridgeClient ?? vscodeHostBridgeClient,
		options?.logToChannel ?? ((_) => {}),
		options?.getCallbackUri ?? (async (path) => `http://example.com:1234${path}`),
		options?.getBinaryLocation ?? (async (n) => `/mock/path/to/binary/${n}`),
		options?.extensionFsPath ?? "/mock/path/to/extension",
		options?.globalStorageFsPath ?? "/mock/path/to/globalstorage",
	)
}
/**
 * Stubs HostProvider.workspace so code under test resolves the given paths as
 * this window's workspace roots.
 */
export function stubWorkspacePaths(sandbox, paths) {
	sandbox.stub(HostProvider, "workspace").get(() => ({
		getWorkspacePaths: async () => ({ paths }),
	}))
}
//# sourceMappingURL=host-provider-test-utils.js.map
