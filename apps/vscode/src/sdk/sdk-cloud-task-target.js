// SdkCloudTaskTarget — the one writer and the one reader of "where does the
// next task run".
//
// The user makes three kinds of choice (Local/Cloud, a repository, a branch)
// and each is stored as itself. Everything else the panel shows and the
// composer submits — which repository the account can actually reach, which
// branch to start on — is resolved here from the stored choice, the active
// account's repositories and the workspace's git remote, on every state post.
// Nothing derived is ever written back, so no background lookup can overwrite
// a choice the user made while it was in flight.
import { normalizeGitHubRemoteUrl } from "@shared/cloud/cloud-sessions"
import { CloudSessionError } from "@/services/cloud/CloudSessionsService"
import { resolveWorkspaceCloudDefaults } from "@/services/cloud/workspace-cloud-defaults"
/** How long a failed lookup is left alone before a read retries it. */
export const LOOKUP_RETRY_MS = 30_000
/**
 * How long a loaded input is trusted before a read re-asks in the background.
 * Repository access changes in the browser (GitHub App install page) and the
 * git checkout changes in the terminal; neither notifies the extension, so a
 * read older than this refreshes and the next state post carries the answer.
 */
export const REPOSITORIES_MAX_AGE_MS = 60_000
export const WORKSPACE_MAX_AGE_MS = 10_000
/**
 * One input to the resolved target, cached under the key it was loaded for
 * (account scope, workspace root, repository+branch). A read under a new
 * key discards the old value and starts a load; a load whose slot has been
 * replaced meanwhile is dropped, by identity, not by key.
 */
class Lookup {
	onLoaded
	now
	maxAgeMs
	key
	value
	loadedAt
	pending
	failedAt
	/**
	 * @param maxAgeMs how long a loaded value is trusted; a read after that
	 * returns the old value and reloads in the background. Omit for inputs that
	 * only change with the key.
	 */
	constructor(onLoaded, now, maxAgeMs) {
		this.onLoaded = onLoaded
		this.now = now
		this.maxAgeMs = maxAgeMs
	}
	/** The cached value for `key`, starting a load in the background when there is none or it has aged out. */
	read(key, load) {
		this.start(key, load, false)
		return this.value
	}
	/** The value for `key`, loaded now when there is none; `refresh` discards the cached one first. */
	async get(key, load, refresh) {
		await this.start(key, load, refresh)
		return this.value
	}
	start(key, load, refresh) {
		if (this.key !== key || refresh) {
			this.key = key
			this.value = undefined
			this.loadedAt = undefined
			this.pending = undefined
			this.failedAt = undefined
		}
		if (this.pending) {
			return this.pending
		}
		if (this.value !== undefined && !this.aged()) {
			return Promise.resolve()
		}
		if (this.failedAt !== undefined && this.now() - this.failedAt < LOOKUP_RETRY_MS) {
			return Promise.resolve()
		}
		const pending = load().then(
			(value) => {
				if (this.pending !== pending) {
					return
				}
				this.pending = undefined
				this.value = value
				this.loadedAt = this.now()
				this.onLoaded()
			},
			() => {
				if (this.pending !== pending) {
					return
				}
				this.pending = undefined
				this.failedAt = this.now()
			},
		)
		this.pending = pending
		return pending
	}
	aged() {
		return this.maxAgeMs !== undefined && this.loadedAt !== undefined && this.now() - this.loadedAt >= this.maxAgeMs
	}
}
export class SdkCloudTaskTarget {
	options
	connection
	workspace
	workspaceBranch
	constructor(options) {
		this.options = options
		// A landed input posts state so the panel and composer see the new view.
		const onLoaded = () => void options.postStateToWebview().catch(() => {})
		const now = () => options.now?.() ?? Date.now()
		this.connection = new Lookup(onLoaded, now, REPOSITORIES_MAX_AGE_MS)
		this.workspace = new Lookup(onLoaded, now, WORKSPACE_MAX_AGE_MS)
		// A branch either exists on GitHub or it does not; a stale "yes" fails at
		// provisioning with a clear error, and the key changes with the checkout.
		this.workspaceBranch = new Lookup(onLoaded, now)
	}
	// ---- Writes: one field per user choice ----
	async choose(choice) {
		const current = this.selection()
		let next
		if ("target" in choice) {
			next = { ...current, target: choice.target }
		} else if ("repositoryId" in choice) {
			// A branch belongs to the repository it was chosen for.
			next = { target: "cloud", repositoryId: choice.repositoryId }
		} else {
			// The branch attaches to the repository the user is looking at, which
			// the view resolved and the stored selection may not name.
			next = {
				target: "cloud",
				repositoryId: this.view().repositoryId ?? current.repositoryId,
				branch: choice.branch.trim() || undefined,
			}
		}
		this.options.stateManager.setGlobalState("cloudTaskTarget", next)
		await this.options.postStateToWebview()
	}
	selection() {
		return this.options.stateManager.getGlobalStateKey("cloudTaskTarget") ?? { target: "local" }
	}
	// ---- Reads: the resolved target, from whatever inputs are known now ----
	/**
	 * The target as it stands. An input not yet known is requested in the
	 * background and the state is posted again when it arrives, so the view
	 * converges without anything being written. Local starts no lookups.
	 */
	view() {
		const selection = this.selection()
		if (selection.target !== "cloud") {
			return { target: "local" }
		}
		const workspace = this.workspaceDefaults()
		const view = { target: "cloud", workspaceRepoUrl: workspace?.repoUrl }
		const repositories = this.cachedConnection()?.repositories ?? []
		const repository =
			repositories.find((repo) => repo.id === selection.repositoryId) ??
			repositories.find((repo) => this.isWorkspaceRepository(repo, workspace)) ??
			repositories[0]
		if (!repository) {
			return view
		}
		view.repositoryId = repository.id
		view.repoUrl = normalizeGitHubRemoteUrl(repository.url) ?? repository.url
		const chosenBranch = selection.repositoryId === repository.id ? selection.branch : undefined
		const workspaceBranch =
			workspace?.branch && this.isWorkspaceRepository(repository, workspace)
				? this.confirmedWorkspaceBranch(repository, workspace.branch)
				: undefined
		view.branch = chosenBranch ?? workspaceBranch ?? repository.defaultBranch ?? undefined
		return view
	}
	isWorkspaceRepository(repo, workspace) {
		return !!workspace?.repoUrl && normalizeGitHubRemoteUrl(repo.url) === workspace.repoUrl
	}
	// ---- Inputs, each cached under the key it depends on ----
	/**
	 * The active account's GitHub App connection and repositories, for the
	 * Account view and the onboarding card. `refresh` re-asks the control plane.
	 * The cache is keyed by account scope, so another account's repositories
	 * are never returned as this one's.
	 */
	async connectionStatus(refresh = false) {
		const scope = this.options.getAccountScope()
		const status = scope && (await this.connection.get(scope, () => this.fetchConnection(), refresh))
		return status || this.signedOut()
	}
	cachedConnection() {
		const scope = this.options.getAccountScope()
		return scope ? this.connection.read(scope, () => this.fetchConnection()) : undefined
	}
	async fetchConnection() {
		try {
			return { signedIn: true, ...(await this.options.cloudSessions.getGitHubConnection()) }
		} catch (error) {
			if (error instanceof CloudSessionError && error.code === "authentication_required") {
				return this.signedOut()
			}
			return { ...this.signedOut(), signedIn: true, error: error instanceof Error ? error.message : String(error) }
		}
	}
	signedOut() {
		return { signedIn: false, connected: false, connectUrl: this.options.cloudSessions.githubConnectUrl(), repositories: [] }
	}
	workspaceDefaults() {
		const cwd = this.options.getWorkspaceRoot()
		return cwd ? this.workspace.read(cwd, () => resolveWorkspaceCloudDefaults(cwd)) : undefined
	}
	/**
	 * The workspace branch, once GitHub confirms `repository` has it. A local
	 * remote-tracking ref can outlive the branch on GitHub, so GitHub is asked
	 * by name rather than trusting the ref or the first page of branches.
	 */
	confirmedWorkspaceBranch(repository, branch) {
		const exists = this.workspaceBranch.read(`${repository.id}:${branch}`, async () =>
			(await this.options.cloudSessions.listBranches(repository.id, branch)).includes(branch),
		)
		return exists ? branch : undefined
	}
}
//# sourceMappingURL=sdk-cloud-task-target.js.map
