export const CLOUD_CREATION_UNCONFIRMED_ERROR_CODE = "cloud_creation_unconfirmed"
export const CLOUD_WORKSPACE_ROOT = "/workspace"
/**
 * Cloud sessions run in Act mode only, whatever Plan/Act mode the user has
 * saved for local tasks. The sandbox runtime, each turn sent to it and the
 * chat view all read this one value so they cannot disagree.
 */
export const CLOUD_SESSION_MODE = "act"
/**
 * Whether the resolved target names a sandbox that can be started: Cloud
 * with a repository. Cloud without a repository (none reachable, or not yet
 * loaded) is an incomplete selection, not a fallback to Local.
 */
export function isCloudTargetReady(view) {
	return view?.target === "cloud" && !!view.repoUrl
}
export const ACTIVE_CLOUD_STATUSES = new Set(["provisioning", "running"])
export const CLOUD_PROVISIONING_ID_PREFIX = "cloud-provisioning-"
/** Whether an id names a control-plane record that other Cline surfaces can open. */
export function isPersistedCloudSessionId(id) {
	return typeof id === "string" && id.trim().startsWith("ses-")
}
/** Outer Cline Cloud session ids (`ses-…`), plus the placeholder id used while a sandbox is provisioning. */
export function isCloudSessionId(id) {
	if (typeof id !== "string") {
		return false
	}
	const trimmed = id.trim()
	return isPersistedCloudSessionId(trimmed) || trimmed.startsWith(CLOUD_PROVISIONING_ID_PREFIX)
}
/** Formats https://github.com/owner/repo as owner/repo for compact display. */
export function formatRepoLabel(repoUrl) {
	if (!repoUrl) {
		return ""
	}
	const normalized = normalizeGitHubRemoteUrl(repoUrl)
	return normalized ? normalized.replace(/^https:\/\/github\.com\//, "") : repoUrl
}
function trimGitSuffix(path) {
	return path
		.replace(/^\/+/, "")
		.replace(/\/+$/, "")
		.replace(/\.git$/i, "")
}
/**
 * Normalizes any GitHub remote form (https, ssh scp-style, ssh://, git://) into
 * https://github.com/owner/repo. Returns null for non-GitHub or malformed remotes.
 */
export function normalizeGitHubRemoteUrl(remoteUrl) {
	const value = remoteUrl.trim()
	if (!value) {
		return null
	}
	const scpMatch = value.match(/^(?:[^@/\s]+@)?github\.com:([^\s]+)$/i)
	if (scpMatch?.[1]) {
		const path = trimGitSuffix(scpMatch[1])
		return path.split("/").length === 2 ? `https://github.com/${path}` : null
	}
	try {
		const url = new URL(value)
		if (url.hostname.toLowerCase() !== "github.com") {
			return null
		}
		if (!new Set(["https:", "http:", "ssh:", "git:"]).has(url.protocol)) {
			return null
		}
		const path = trimGitSuffix(url.pathname)
		return path.split("/").length === 2 ? `https://github.com/${path}` : null
	} catch {
		return null
	}
}
//# sourceMappingURL=cloud-sessions.js.map
