import { CloudCreationUnconfirmedError, CloudSessionApi, CloudSessionError as CoreCloudSessionError } from "@cline/core/cloud"
import { ClineEnv } from "@/config"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

const REQUEST_TIMEOUT_MS = 15_000
const CREATE_TIMEOUT_MS = 610_000
export class CloudSessionError extends Error {
	code
	connectUrl
	status
	constructor(code, message, connectUrl, status) {
		super(message)
		this.code = code
		this.connectUrl = connectUrl
		this.status = status
		this.name = "CloudSessionError"
	}
}
function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "")
}
export function isCloudSessionExpired(record) {
	if (record.status === "expired") {
		return true
	}
	const expiredAt = record.expiredAt ? Date.parse(record.expiredAt) : Number.NaN
	return Number.isFinite(expiredAt) && expiredAt <= Date.now()
}
export class CloudSessionsService {
	options
	fetchImpl
	constructor(options) {
		this.options = options
		this.fetchImpl = options.fetch ?? fetch
	}
	get apiBaseUrl() {
		return trimTrailingSlash(this.options.apiBaseUrl ?? ClineEnv.config().apiBaseUrl)
	}
	get appBaseUrl() {
		return trimTrailingSlash(this.options.appBaseUrl ?? ClineEnv.config().appBaseUrl)
	}
	dashboardUrl(sessionId) {
		return `${this.appBaseUrl}/agents?sessionId=${encodeURIComponent(sessionId)}`
	}
	/** WebSocket endpoint the sandbox's Hub is proxied on. */
	sessionSocketUrl(sessionId) {
		const url = new URL(`/api/v1/session/${encodeURIComponent(sessionId)}`, this.apiBaseUrl)
		url.protocol = url.protocol === "http:" ? "ws:" : "wss:"
		return url.toString()
	}
	githubConnectUrl() {
		return this.options.getActiveOrganizationId()?.trim()
			? `${this.appBaseUrl}/dashboard/organization/integrations`
			: `${this.appBaseUrl}/dashboard/integrations`
	}
	async requireToken() {
		const token = (await this.options.getAuthToken())?.trim()
		if (!token) {
			throw new CloudSessionError("authentication_required", "Sign in to Cline to use cloud sessions.")
		}
		return token
	}
	async withApi(operation) {
		const api = new CloudSessionApi({
			apiBaseUrl: this.apiBaseUrl,
			appBaseUrl: this.appBaseUrl,
			getAuthToken: async () => (await this.options.getAuthToken())?.trim() || undefined,
			fetch: this.fetchImpl,
			createTimeoutMs: CREATE_TIMEOUT_MS,
		})
		try {
			return await operation(api)
		} catch (error) {
			if (error instanceof CloudCreationUnconfirmedError || !(error instanceof CoreCloudSessionError)) {
				throw error
			}
			if (error.status === 403) {
				throw new CloudSessionError(
					"request_failed",
					"Your active account or organization cannot use cloud sessions. Switch to Personal or another organization in the Account view and try again.",
					undefined,
					403,
				)
			}
			const status =
				error.status ??
				{
					authentication_required: 401,
					session_not_found: 404,
					session_expired: 410,
					github_not_connected: 412,
					session_failed: undefined,
					request_failed: undefined,
				}[error.code]
			throw new CloudSessionError(error.code, error.detail, error.connectUrl, status)
		}
	}
	// ---- GitHub integration ----
	async getGitHubConnection() {
		const connectUrl = this.githubConnectUrl()
		const organizationId = this.options.getActiveOrganizationId()?.trim()
		try {
			const result = await this.withApi((api) => api.listRepositories(organizationId))
			result.repositories.sort((a, b) => a.fullName.localeCompare(b.fullName))
			return result
		} catch (error) {
			if (
				error instanceof CloudSessionError &&
				(error.code === "github_not_connected" || error.code === "session_not_found")
			) {
				return { connected: false, connectUrl, repositories: [] }
			}
			throw error
		}
	}
	/** Resolves the GitHub App install URL (the API answers with a redirect to github.com). */
	async getGitHubInstallUrl() {
		const token = await this.requireToken()
		const installUrl = new URL("/api/v1/integrations/github/install", this.apiBaseUrl)
		installUrl.searchParams.set("redirect", new URL("/dashboard/integrations", this.appBaseUrl).toString())
		const response = await this.fetchImpl(installUrl, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			redirect: "manual",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})
		const location = response.headers.get("location")?.trim()
		if (response.status >= 300 && response.status < 400 && location) {
			const resolved = new URL(location, installUrl)
			if (resolved.protocol === "https:" && resolved.hostname === "github.com") {
				return resolved.toString()
			}
		}
		// Fall back to the dashboard, which hosts the same connect flow.
		Logger.warn(`[CloudSessions] GitHub install URL unavailable (status ${response.status}); opening dashboard instead`)
		return this.githubConnectUrl()
	}
	async listBranches(repositoryId, query) {
		if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
			return []
		}
		const organizationId = this.options.getActiveOrganizationId()?.trim()
		const result = await this.withApi((api) => api.listBranches(repositoryId, organizationId, { query }))
		return result.branches
	}
	// ---- Sessions ----
	async listSessions() {
		const orgId = this.options.getActiveOrganizationId()?.trim()
		return this.withApi((api) => api.list(orgId))
	}
	async getSession(sessionId) {
		const sessions = await this.listSessions()
		return sessions.find((session) => session.id === sessionId)
	}
	async getStatus(sessionId, signal) {
		return (await this.withApi((api) => api.status(sessionId, { signal }))) ?? {}
	}
	/**
	 * Creates a resumable sandbox and resolves once it is ready to accept a Hub connection.
	 * `onProvisioning` fires as soon as the record exists so the UI can show progress.
	 * Providing that callback transfers cleanup ownership to the caller, including
	 * when readiness or subsequent record lookup fails. Aborting `signal` stops the
	 * readiness poll; the record already created stays the caller's to delete.
	 */
	async createSession(input, onProvisioning, signal, onPhase) {
		const orgId = input.organizationId ?? this.options.getActiveOrganizationId()?.trim()
		return this.withApi(async (api) => {
			const created = await api.create({ ...input, organizationId: orgId, sandboxType: "resumable" })
			const sessionId = created.sessionId
			onProvisioning?.(sessionId)
			if (created.status === "provisioning" || !created.sandboxUrl?.trim()) {
				try {
					await this.waitForReady(api, sessionId, signal, onPhase)
				} catch (error) {
					if (!onProvisioning && error instanceof CoreCloudSessionError && error.code === "session_failed") {
						await api.delete(sessionId)
					}
					throw error
				}
			}
			const record = (await api.list(orgId)).find((session) => session.id === sessionId)
			return (
				record ?? {
					id: sessionId,
					status: created.status || "active",
					sandboxType: "resumable",
					sandboxUrl: created.sandboxUrl,
					repoContext: { repoUrl: input.repoUrl, branch: input.branch },
					metadata: { modelId: input.modelId, sandboxType: "resumable" },
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}
			)
		})
	}
	/**
	 * Polls until the sandbox accepts connections. Aborting the signal stops the
	 * poll at once (the caller then deletes the unused record) instead of after
	 * the sandbox comes up.
	 */
	async waitUntilReady(sessionId, signal, onPhase) {
		return this.withApi((api) => this.waitForReady(api, sessionId, signal, onPhase))
	}
	async waitForReady(api, sessionId, signal, onPhase) {
		try {
			await api.waitUntilReady(sessionId, signal ?? new AbortController().signal, ({ phase }) => {
				if (phase) onPhase?.(phase)
			})
		} catch (error) {
			signal?.throwIfAborted()
			if (error instanceof DOMException && error.name === "TimeoutError") {
				throw new CloudSessionError("request_failed", "Timed out waiting for the cloud sandbox to become ready.")
			}
			throw error
		}
	}
	/** Wakes a suspended sandbox and waits until it accepts connections. */
	async resumeSession(sessionId, onPhase) {
		let status
		try {
			status = (await this.withApi((api) => api.resume(sessionId)))?.status
		} catch (error) {
			// Another client may have resumed it first, or resume may still be in flight.
			if (!(error instanceof CloudSessionError) || error.status !== 409) throw error
			status = (await this.getStatus(sessionId)).status
			if (status !== "provisioning" && status !== "ready" && status !== "active") throw error
		}
		if (status !== "ready" && status !== "active") {
			await this.waitUntilReady(sessionId, undefined, onPhase)
		}
	}
	async deleteSession(sessionId) {
		await this.withApi((api) => api.delete(sessionId))
	}
	async renameSession(sessionId, title) {
		await this.withApi((api) => api.updateTitle(sessionId, title))
	}
	/** Archived transcript of an expired sandbox; null when no archive exists. */
	async getHistory(sessionId) {
		return this.withApi((api) => api.history(sessionId))
	}
}
//# sourceMappingURL=CloudSessionsService.js.map
