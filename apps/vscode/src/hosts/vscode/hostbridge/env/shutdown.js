import { Empty } from "@shared/proto/cline/common"
export async function shutdown(request) {
	// VSCode extensions cannot shutdown the host process (VSCode itself)
	// This is a no-op that just returns success
	// The shutdown RPC is primarily used by standalone cline-core instances
	// to tell their paired host bridge processes to shut down
	return Empty.create({})
}
//# sourceMappingURL=shutdown.js.map
