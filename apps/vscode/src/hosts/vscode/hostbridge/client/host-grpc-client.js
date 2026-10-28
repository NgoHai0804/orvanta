import { createGrpcClient } from "@hosts/vscode/hostbridge/client/host-grpc-client-base"
import * as host from "@shared/proto/index.host"
export const vscodeHostBridgeClient = {
	workspaceClient: createGrpcClient(host.WorkspaceServiceDefinition),
	envClient: createGrpcClient(host.EnvServiceDefinition),
	windowClient: createGrpcClient(host.WindowServiceDefinition),
	diffClient: createGrpcClient(host.DiffServiceDefinition),
}
//# sourceMappingURL=host-grpc-client.js.map
