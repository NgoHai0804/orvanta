import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	ProjectStorageRootError,
	resolveProjectStorageRoots,
	validateProjectStorageRoots,
} from "./project-storage";

const tempRoots: string[] = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

function createWorkspace(): string {
	const root = mkdtempSync(join(tmpdir(), "orvanta-project-storage-"));
	tempRoots.push(root);
	return root;
}

describe("project storage roots", () => {
	it("derives distinct project-owned roots from the canonical workspace", () => {
		const workspaceRoot = createWorkspace();

		expect(resolveProjectStorageRoots(workspaceRoot)).toEqual({
			workspaceRoot,
			teamStoreDir: join(workspaceRoot, ".orvanta", "local", "db"),
			sdkDbDir: join(workspaceRoot, ".orvanta", "local", "sdk", "db"),
			sdkArtifactDir: join(
				workspaceRoot,
				".orvanta",
				"local",
				"sdk",
				"sessions",
			),
		});
	});

	it("keeps separate workspace roots separate and does not create storage directories", () => {
		const firstWorkspace = createWorkspace();
		const secondWorkspace = createWorkspace();
		const firstRoots = resolveProjectStorageRoots(firstWorkspace);
		const secondRoots = resolveProjectStorageRoots(secondWorkspace);

		expect(firstRoots.teamStoreDir).not.toBe(secondRoots.teamStoreDir);
		expect(firstRoots.sdkDbDir).not.toBe(secondRoots.sdkDbDir);
		expect(firstRoots.sdkArtifactDir).not.toBe(secondRoots.sdkArtifactDir);
		expect(existsSync(join(firstWorkspace, ".orvanta"))).toBe(false);
		expect(existsSync(join(secondWorkspace, ".orvanta"))).toBe(false);
	});

	it("uses the canonical workspace identity when opened through a symlink", () => {
		const workspaceRoot = createWorkspace();
		const workspaceAlias = join(
			tmpdir(),
			`orvanta-workspace-alias-${tempRoots.length}`,
		);
		tempRoots.push(workspaceAlias);
		symlinkSync(workspaceRoot, workspaceAlias, "junction");

		expect(resolveProjectStorageRoots(workspaceAlias).workspaceRoot).toBe(
			realpathSync.native(workspaceRoot),
		);
	});

	it("rejects relative, missing, and traversal-bearing workspace roots", () => {
		expect(() => resolveProjectStorageRoots("relative/project")).toThrow(
			ProjectStorageRootError,
		);
		expect(() =>
			resolveProjectStorageRoots(join(createWorkspace(), "missing")),
		).toThrow(ProjectStorageRootError);
		expect(() =>
			resolveProjectStorageRoots(`${createWorkspace()}${join("child", "..")}`),
		).toThrow(ProjectStorageRootError);
	});

	it("rejects roots validated against a different workspace", () => {
		const roots = resolveProjectStorageRoots(createWorkspace());
		const otherWorkspace = createWorkspace();

		expect(() => validateProjectStorageRoots(roots, otherWorkspace)).toThrow(
			expect.objectContaining({ code: "WORKSPACE_MISMATCH" }),
		);
	});

	it("rejects a caller-supplied storage path outside the project roots", () => {
		const roots = resolveProjectStorageRoots(createWorkspace());

		expect(() =>
			validateProjectStorageRoots(
				{ ...roots, sdkDbDir: join(tmpdir(), "shared-sdk-db") },
				roots.workspaceRoot,
			),
		).toThrow(expect.objectContaining({ code: "INVALID_STORAGE_ROOTS" }));
	});

	it("rejects a caller-supplied storage path containing parent traversal", () => {
		const roots = resolveProjectStorageRoots(createWorkspace());

		expect(() =>
			validateProjectStorageRoots(
				{ ...roots, sdkDbDir: `${roots.sdkDbDir}${join("..", "db")}` },
				roots.workspaceRoot,
			),
		).toThrow(expect.objectContaining({ code: "INVALID_STORAGE_ROOTS" }));
	});

	it("rejects a symlink in the storage path even if it points back inside the workspace", () => {
		const workspaceRoot = createWorkspace();
		const localRoot = join(workspaceRoot, ".orvanta", "local");
		const redirectedSdk = join(localRoot, "sdk");
		const internalTarget = join(workspaceRoot, "alternate-sdk-store");
		mkdirSync(localRoot, { recursive: true });
		mkdirSync(internalTarget);
		symlinkSync(internalTarget, redirectedSdk, "junction");

		expect(lstatSync(redirectedSdk).isSymbolicLink()).toBe(true);
		expect(() => resolveProjectStorageRoots(workspaceRoot)).toThrow(
			expect.objectContaining({ code: "SYMLINK_NOT_ALLOWED" }),
		);
	});

	it("rejects a storage path redirected outside the workspace", () => {
		const workspaceRoot = createWorkspace();
		const outsideRoot = createWorkspace();
		const localRoot = join(workspaceRoot, ".orvanta", "local");
		mkdirSync(localRoot, { recursive: true });
		symlinkSync(outsideRoot, join(localRoot, "sdk"), "junction");

		expect(() => resolveProjectStorageRoots(workspaceRoot)).toThrow(
			expect.objectContaining({ code: "SYMLINK_NOT_ALLOWED" }),
		);
	});

	it("rejects a file where a storage directory is expected", () => {
		const workspaceRoot = createWorkspace();
		const localRoot = join(workspaceRoot, ".orvanta", "local");
		mkdirSync(localRoot, { recursive: true });
		const sdkRoot = join(localRoot, "sdk");
		// A regular file must not be treated as an existing storage directory.
		writeFileSync(sdkRoot, "not a directory");

		expect(() => resolveProjectStorageRoots(workspaceRoot)).toThrow(
			expect.objectContaining({ code: "INVALID_PATH_TYPE" }),
		);
	});
});
