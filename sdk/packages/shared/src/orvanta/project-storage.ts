import { lstatSync, realpathSync, type Stats } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export interface ProjectStorageRoots {
	/** Canonical, existing workspace directory that owns these stores. */
	workspaceRoot: string;
	/** Orvanta TeamStore directory; independent from SDK-owned stores. */
	teamStoreDir: string;
	/** SDK session metadata database directory. */
	sdkDbDir: string;
	/** SDK canonical session artifact directory. */
	sdkArtifactDir: string;
}

export type ProjectStorageRootErrorCode =
	| "INVALID_WORKSPACE_ROOT"
	| "WORKSPACE_MISMATCH"
	| "INVALID_STORAGE_ROOTS"
	| "SYMLINK_NOT_ALLOWED"
	| "INVALID_PATH_TYPE";

export class ProjectStorageRootError extends Error {
	constructor(
		readonly code: ProjectStorageRootErrorCode,
		message: string,
	) {
		super(message);
		this.name = "ProjectStorageRootError";
	}
}

function isPathEqual(left: string, right: string): boolean {
	const normalizedLeft = resolve(left);
	const normalizedRight = resolve(right);
	return process.platform === "win32"
		? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
		: normalizedLeft === normalizedRight;
}

function isContained(root: string, candidate: string): boolean {
	const pathFromRoot = relative(root, candidate);
	return (
		pathFromRoot === "" ||
		(!pathFromRoot.startsWith(`..${sep}`) &&
			pathFromRoot !== ".." &&
			!isAbsolute(pathFromRoot))
	);
}

function canonicalWorkspaceRoot(workspaceRoot: string): string {
	if (
		typeof workspaceRoot !== "string" ||
		workspaceRoot.trim() === "" ||
		!isAbsolute(workspaceRoot) ||
		workspaceRoot.split(/[\\/]+/u).includes("..")
	) {
		throw new ProjectStorageRootError(
			"INVALID_WORKSPACE_ROOT",
			"Project storage requires an absolute workspace path without parent traversal",
		);
	}

	let canonical: string;
	try {
		canonical = realpathSync.native(workspaceRoot);
	} catch {
		throw new ProjectStorageRootError(
			"INVALID_WORKSPACE_ROOT",
			"Project storage workspace must already exist and be accessible",
		);
	}

	try {
		if (!lstatSync(canonical).isDirectory()) {
			throw new ProjectStorageRootError(
				"INVALID_WORKSPACE_ROOT",
				"Project storage workspace must be a directory",
			);
		}
	} catch (error) {
		if (error instanceof ProjectStorageRootError) throw error;
		throw new ProjectStorageRootError(
			"INVALID_WORKSPACE_ROOT",
			"Project storage workspace must be an accessible directory",
		);
	}

	return canonical;
}

function assertSafeDirectoryPath(
	workspaceRoot: string,
	candidate: string,
): void {
	if (!isContained(workspaceRoot, candidate)) {
		throw new ProjectStorageRootError(
			"INVALID_STORAGE_ROOTS",
			"Project storage path must remain within its workspace",
		);
	}

	const segments = relative(workspaceRoot, candidate)
		.split(sep)
		.filter(Boolean);
	let current = workspaceRoot;
	for (const segment of segments) {
		current = join(current, segment);
		let stats: Stats;
		try {
			stats = lstatSync(current);
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT")
				return;
			throw new ProjectStorageRootError(
				"INVALID_STORAGE_ROOTS",
				"Project storage path could not be inspected",
			);
		}

		if (stats.isSymbolicLink()) {
			throw new ProjectStorageRootError(
				"SYMLINK_NOT_ALLOWED",
				"Project storage directories must not contain symbolic links",
			);
		}
		if (!stats.isDirectory()) {
			throw new ProjectStorageRootError(
				"INVALID_PATH_TYPE",
				"Every existing component of a project storage path must be a directory",
			);
		}
	}
}

function rootsForCanonicalWorkspace(
	workspaceRoot: string,
): ProjectStorageRoots {
	const projectDataRoot = join(workspaceRoot, ".orvanta");
	const sdkRoot = join(projectDataRoot, "local", "sdk");
	return {
		workspaceRoot,
		teamStoreDir: join(projectDataRoot, "local", "db"),
		sdkDbDir: join(sdkRoot, "db"),
		sdkArtifactDir: join(sdkRoot, "sessions"),
	};
}

/**
 * Derive deterministic, separate Orvanta and SDK storage roots for one
 * existing workspace. This validates paths only; it deliberately does not
 * create directories or change any ambient process configuration.
 */
export function resolveProjectStorageRoots(
	workspaceRoot: string,
): ProjectStorageRoots {
	const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
	const roots = rootsForCanonicalWorkspace(canonicalRoot);
	validateProjectStorageRoots(roots, canonicalRoot);
	return roots;
}

/** Validate caller-provided roots against the selected canonical workspace. */
export function validateProjectStorageRoots(
	roots: ProjectStorageRoots,
	workspaceRoot: string,
): ProjectStorageRoots {
	const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
	if (
		typeof roots !== "object" ||
		roots === null ||
		typeof roots.workspaceRoot !== "string"
	) {
		throw new ProjectStorageRootError(
			"INVALID_STORAGE_ROOTS",
			"Project storage roots must include a workspace identity",
		);
	}
	if (!isPathEqual(roots.workspaceRoot, canonicalRoot)) {
		throw new ProjectStorageRootError(
			"WORKSPACE_MISMATCH",
			"Project storage roots belong to a different workspace",
		);
	}

	const expectedRoots = rootsForCanonicalWorkspace(canonicalRoot);
	for (const key of ["teamStoreDir", "sdkDbDir", "sdkArtifactDir"] as const) {
		const candidate = roots[key];
		if (typeof candidate !== "string" || !isAbsolute(candidate)) {
			throw new ProjectStorageRootError(
				"INVALID_STORAGE_ROOTS",
				`Project storage ${key} must be an absolute path`,
			);
		}
		if (candidate.split(/[\\/]+/u).includes("..")) {
			throw new ProjectStorageRootError(
				"INVALID_STORAGE_ROOTS",
				`Project storage ${key} must not contain parent traversal`,
			);
		}
		if (!isContained(canonicalRoot, resolve(candidate))) {
			throw new ProjectStorageRootError(
				"INVALID_STORAGE_ROOTS",
				`Project storage ${key} escapes its workspace`,
			);
		}
		if (!isPathEqual(candidate, expectedRoots[key])) {
			throw new ProjectStorageRootError(
				"INVALID_STORAGE_ROOTS",
				`Project storage ${key} does not match its project-owned location`,
			);
		}
		assertSafeDirectoryPath(canonicalRoot, expectedRoots[key]);
	}

	return expectedRoots;
}
