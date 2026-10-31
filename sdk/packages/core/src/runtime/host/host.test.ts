import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProjectStorageRoots } from "@cline/shared/orvanta";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSessionService } from "../../session/services/file-session-service";

const sqliteInitMock = vi.hoisted(() => vi.fn());
const sqliteStoreOptionsMock = vi.hoisted(() => vi.fn());
const ensureCompatibleLocalHubUrlMock = vi.hoisted(() => vi.fn());
const resolveCompatibleLocalHubUrlMock = vi.hoisted(() => vi.fn());
const hubConnectMock = vi.hoisted(() => vi.fn());
const prewarmDetachedHubServerMock = vi.hoisted(() => vi.fn());

vi.mock("../../hub/client", async () => {
	const actual =
		await vi.importActual<typeof import("../../hub/client")>(
			"../../hub/client",
		);
	return {
		...actual,
		NodeHubClient: class {
			connect = hubConnectMock;
			command = vi.fn();
			subscribe = vi.fn(() => () => {});
			close = vi.fn();
		},
		ensureCompatibleLocalHubUrl: ensureCompatibleLocalHubUrlMock,
		resolveCompatibleLocalHubUrl: resolveCompatibleLocalHubUrlMock,
	};
});

vi.mock("../../hub/daemon", async () => {
	const actual =
		await vi.importActual<typeof import("../../hub/daemon")>(
			"../../hub/daemon",
		);
	return {
		...actual,
		prewarmDetachedHubServer: prewarmDetachedHubServerMock,
	};
});

vi.mock("../../services/storage/sqlite-session-store", () => ({
	SqliteSessionStore: class {
		constructor(options?: unknown) {
			sqliteStoreOptionsMock(options);
		}
		init(): void {
			sqliteInitMock();
		}
		queryAll(): unknown[] {
			return [];
		}
		queryOne(): undefined {
			return undefined;
		}
		run(): { changes: number } {
			return { changes: 0 };
		}
	},
}));

describe("runtime host resolution", () => {
	const logger = {
		debug: vi.fn(),
		log: vi.fn(),
		error: vi.fn(),
	};
	const temporaryRoots: string[] = [];
	const createRoots = () => {
		const workspaceRoot = mkdtempSync(join(tmpdir(), "cline-project-storage-"));
		temporaryRoots.push(workspaceRoot);
		return resolveProjectStorageRoots(workspaceRoot);
	};

	afterEach(() => {
		sqliteInitMock.mockReset();
		sqliteStoreOptionsMock.mockReset();
		ensureCompatibleLocalHubUrlMock.mockReset();
		resolveCompatibleLocalHubUrlMock.mockReset();
		hubConnectMock.mockReset();
		prewarmDetachedHubServerMock.mockReset();
		logger.debug.mockReset();
		logger.log.mockReset();
		logger.error.mockReset();
		for (const root of temporaryRoots.splice(0)) {
			rmSync(root, { recursive: true, force: true });
		}
		delete process.env.CLINE_SESSION_BACKEND_MODE;
		delete process.env.CLINE_VCR;
		vi.resetModules();
	});

	it("fails explicitly when project-owned sqlite initialization fails", async () => {
		sqliteInitMock.mockImplementation(() => {
			throw new Error("sqlite unavailable");
		});
		const { resolveSessionBackend } = await import("./host");
		const projectStorageRoots = createRoots();

		await expect(
			resolveSessionBackend({ backendMode: "local", projectStorageRoots }),
		).rejects.toThrow("sqlite unavailable");
		expect(sqliteStoreOptionsMock).toHaveBeenCalledWith({
			sessionsDir: projectStorageRoots.sdkDbDir,
		});
	});

	it("retains the legacy file fallback for unscoped storage when SQLite is unavailable", async () => {
		sqliteInitMock.mockImplementation(() => {
			const error = new Error(
				"No such built-in module: node:sqlite",
			) as Error & {
				code?: string;
			};
			error.code = "ERR_UNKNOWN_BUILTIN_MODULE";
			throw error;
		});
		const { resolveSessionBackend } = await import("./host");

		const backend = await resolveSessionBackend({ backendMode: "local" });
		expect(backend.constructor.name).toBe("FileSessionService");
	});

	it("honors env-managed local mode inside core backend resolution", async () => {
		process.env.CLINE_SESSION_BACKEND_MODE = "local";
		const { resolveSessionBackend } = await import("./host");

		const backend = await resolveSessionBackend({});

		expect(backend).not.toBeInstanceOf(FileSessionService);
	});

	it("creates separate persistence backends for different project roots", async () => {
		const { resolveSessionBackend } = await import("./host");
		const firstRoots = createRoots();
		const secondRoots = createRoots();

		const first = await resolveSessionBackend({
			backendMode: "local",
			projectStorageRoots: firstRoots,
		});
		const second = await resolveSessionBackend({
			backendMode: "local",
			projectStorageRoots: secondRoots,
		});

		expect(first).not.toBe(second);
		expect(first.constructor.name).toBe("CoreSessionService");
		expect(second.constructor.name).toBe("CoreSessionService");
		expect(first.ensureSessionsDir()).toBe(firstRoots.sdkArtifactDir);
		expect(second.ensureSessionsDir()).toBe(secondRoots.sdkArtifactDir);
		expect(sqliteStoreOptionsMock).toHaveBeenNthCalledWith(1, {
			sessionsDir: firstRoots.sdkDbDir,
		});
		expect(sqliteStoreOptionsMock).toHaveBeenNthCalledWith(2, {
			sessionsDir: secondRoots.sdkDbDir,
		});
	});

	it("does not allow environment-selected runtime modes to redirect project persistence", async () => {
		process.env.CLINE_SESSION_BACKEND_MODE = "hub";
		const { createRuntimeHost } = await import("./host");
		const roots = createRoots();

		const host = await createRuntimeHost({ projectStorageRoots: roots });

		expect(host.constructor.name).toBe("LocalRuntimeHost");
		expect(ensureCompatibleLocalHubUrlMock).not.toHaveBeenCalled();
		expect(resolveCompatibleLocalHubUrlMock).not.toHaveBeenCalled();
	});

	it("rejects a supplied project backend that does not match its storage identity", async () => {
		const { resolveSessionBackend } = await import("./host");
		const roots = createRoots();
		await expect(
			resolveSessionBackend({
				backendMode: "local",
				projectStorageRoots: {
					...roots,
					workspaceRoot: join(roots.workspaceRoot, "child"),
				},
			}),
		).rejects.toMatchObject({ code: "INVALID_WORKSPACE_ROOT" });
	});

	it("forces local backend when vcr is enabled", async () => {
		process.env.CLINE_VCR = "1";
		const { resolveSessionBackend } = await import("./host");

		const backend = await resolveSessionBackend({});

		expect(backend).not.toBeInstanceOf(FileSessionService);
	});

	it("prefers a compatible local hub when backendMode is auto", async () => {
		const { createRuntimeHost } = await import("./host");
		const { HubRuntimeHost } = await import(
			"../../hub/runtime-host/hub-runtime-host"
		);
		resolveCompatibleLocalHubUrlMock.mockResolvedValue(
			"ws://127.0.0.1:25463/hub",
		);
		hubConnectMock.mockResolvedValue(undefined);

		const host = await createRuntimeHost({
			backendMode: "auto",
			logger,
			hub: {
				strategy: "prefer-hub",
			},
		});

		expect(host).toBeInstanceOf(HubRuntimeHost);
		expect(prewarmDetachedHubServerMock).not.toHaveBeenCalled();
		expect(resolveCompatibleLocalHubUrlMock).toHaveBeenCalledWith({
			endpoint: undefined,
			strategy: "prefer-hub",
		});
		expect(ensureCompatibleLocalHubUrlMock).not.toHaveBeenCalled();
		expect(logger.log).toHaveBeenCalledWith(
			"Using discovered local hub runtime host",
			{
				url: "ws://127.0.0.1:25463/hub",
			},
		);
	});

	it("falls back to local runtime when auto hub discovery fails", async () => {
		const { createRuntimeHost } = await import("./host");
		const { LocalRuntimeHost } = await import("./local-runtime-host");
		resolveCompatibleLocalHubUrlMock.mockResolvedValue(undefined);

		const host = await createRuntimeHost({
			backendMode: "auto",
			logger,
		});

		expect(host).toBeInstanceOf(LocalRuntimeHost);
		expect(prewarmDetachedHubServerMock).toHaveBeenCalledWith(process.cwd());
		expect(resolveCompatibleLocalHubUrlMock).toHaveBeenCalledWith({
			endpoint: undefined,
			strategy: "prefer-hub",
		});
		expect(
			resolveCompatibleLocalHubUrlMock.mock.invocationCallOrder[0],
		).toBeLessThan(
			prewarmDetachedHubServerMock.mock.invocationCallOrder[0] ?? Infinity,
		);
		expect(ensureCompatibleLocalHubUrlMock).not.toHaveBeenCalled();
		expect(logger.log).toHaveBeenCalledWith(
			"Falling back to local runtime host",
			{
				reason: "compatible_hub_unavailable",
				severity: "warn",
			},
		);
	});

	it("falls back to local runtime when auto hub connect fails", async () => {
		const { createRuntimeHost } = await import("./host");
		const { LocalRuntimeHost } = await import("./local-runtime-host");
		resolveCompatibleLocalHubUrlMock.mockResolvedValue(
			"ws://127.0.0.1:25463/hub",
		);
		hubConnectMock.mockRejectedValue(new Error("connect failed"));

		const host = await createRuntimeHost({
			backendMode: "auto",
			logger,
		});

		expect(host).toBeInstanceOf(LocalRuntimeHost);
		expect(prewarmDetachedHubServerMock).toHaveBeenCalledWith(process.cwd());
		expect(logger.log).toHaveBeenCalledWith(
			"Falling back to local runtime host",
			expect.objectContaining({
				reason: "hub_connect_failed",
				severity: "warn",
			}),
		);
	});

	it("uses a hub runtime host when backendMode is hub", async () => {
		const { createRuntimeHost } = await import("./host");
		const { HubRuntimeHost } = await import(
			"../../hub/runtime-host/hub-runtime-host"
		);
		ensureCompatibleLocalHubUrlMock.mockResolvedValue(
			"ws://127.0.0.1:25463/hub",
		);

		const host = await createRuntimeHost({
			backendMode: "hub",
		});

		expect(host).toBeInstanceOf(HubRuntimeHost);
		expect(prewarmDetachedHubServerMock).not.toHaveBeenCalled();
		expect(ensureCompatibleLocalHubUrlMock).toHaveBeenCalledWith({
			strategy: "require-hub",
			onStartupError: expect.any(Function),
		});
	});

	it("includes the hub startup failure in the error", async () => {
		const { createRuntimeHost } = await import("./host");
		const startupError = new Error(
			"Timed out after 15000ms waiting for detached hub startup.",
		);
		ensureCompatibleLocalHubUrlMock.mockImplementation(
			async (options: { onStartupError?: (error: unknown) => void }) => {
				options.onStartupError?.(startupError);
				return undefined;
			},
		);

		const failure = await createRuntimeHost({ backendMode: "hub" }).catch(
			(error: unknown) => error,
		);

		expect(failure).toBeInstanceOf(Error);
		expect((failure as Error).message).toBe(
			"No compatible hub runtime is available: Timed out after 15000ms waiting for detached hub startup.",
		);
		expect((failure as Error).cause).toBe(startupError);
	});

	it("keeps the plain error when no hub startup was attempted", async () => {
		const { createRuntimeHost } = await import("./host");
		ensureCompatibleLocalHubUrlMock.mockResolvedValue(undefined);

		await expect(createRuntimeHost({ backendMode: "hub" })).rejects.toThrow(
			/^No compatible hub runtime is available\.$/,
		);
	});

	it("uses the configured hub workspace root when prewarming", async () => {
		const { createRuntimeHost } = await import("./host");
		resolveCompatibleLocalHubUrlMock.mockResolvedValue(undefined);

		await createRuntimeHost({
			backendMode: "auto",
			hub: {
				workspaceRoot: "/workspace/project",
			},
		});

		expect(prewarmDetachedHubServerMock).toHaveBeenCalledWith(
			"/workspace/project",
		);
	});

	it("does not prewarm when using an explicit hub endpoint", async () => {
		const { createRuntimeHost } = await import("./host");
		resolveCompatibleLocalHubUrlMock.mockResolvedValue(undefined);

		await createRuntimeHost({
			backendMode: "auto",
			hub: {
				endpoint: "ws://127.0.0.1:25463/hub",
			},
		});

		expect(prewarmDetachedHubServerMock).not.toHaveBeenCalled();
	});

	it("uses a remote runtime host when backendMode is remote", async () => {
		const { createRuntimeHost } = await import("./host");
		const { RemoteRuntimeHost } = await import(
			"../../hub/runtime-host/remote-runtime-host"
		);

		const host = await createRuntimeHost({
			backendMode: "remote",
			remote: {
				endpoint: "https://remote.example.com/hub",
			},
			logger,
		});

		expect(host).toBeInstanceOf(RemoteRuntimeHost);
		expect(ensureCompatibleLocalHubUrlMock).not.toHaveBeenCalled();
		expect(logger.log).toHaveBeenCalledWith("Using remote runtime host", {
			endpoint: "https://remote.example.com/hub",
		});
	});

	it("allows runtime capabilities in remote runtime mode", async () => {
		const { createRuntimeHost } = await import("./host");
		const { RemoteRuntimeHost } = await import(
			"../../hub/runtime-host/remote-runtime-host"
		);
		const askQuestion = vi.fn(async () => "yes");

		const host = await createRuntimeHost({
			backendMode: "remote",
			remote: {
				endpoint: "https://remote.example.com/hub",
			},
			capabilities: {
				toolExecutors: { askQuestion },
			},
		});

		expect(host).toBeInstanceOf(RemoteRuntimeHost);
	});

	it("requires a remote endpoint when backendMode is remote", async () => {
		const { createRuntimeHost } = await import("./host");

		await expect(
			createRuntimeHost({
				backendMode: "remote",
			}),
		).rejects.toThrow(
			"Remote runtime mode requires `remote.endpoint` to be configured.",
		);
	});
});
