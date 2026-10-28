// Replaces classic src/core/storage/disk.ts reads (see origin/main)
//
// Reads on-disk state written in the pre-SDK storage format from the Cline
// data directory, so the SDK adapter can surface tasks and settings created
// before the SDK migration.
//
// All reads are non-throwing — missing or corrupt files return defaults.
import fs from "node:fs"
import path from "node:path"
import { Logger } from "@shared/services/Logger"
import { resolveDataDirFromEnv } from "@shared/storage/storage-context"
// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
/**
 * Resolve the Cline data directory.
 * Priority: CLINE_DATA_DIR env > CLINE_DIR env + "/data" > ~/.cline/data
 */
export function resolveDataDir(override) {
	// Delegates to the same resolver createStorageContext uses so the two
	// stores can never drift apart again (ENG-2332).
	return override || resolveDataDirFromEnv()
}
/** Path to globalState.json */
function globalStatePath(dataDir) {
	return path.join(resolveDataDir(dataDir), "globalState.json")
}
/** Path to secrets.json */
function secretsPath(dataDir) {
	return path.join(resolveDataDir(dataDir), "secrets.json")
}
/** Path to taskHistory.json (stored in state/ subdirectory) */
function taskHistoryPath(dataDir) {
	return path.join(resolveDataDir(dataDir), "state", "taskHistory.json")
}
/** Path to MCP settings file */
function mcpSettingsPath(dataDir) {
	return path.join(resolveDataDir(dataDir), "settings", "cline_mcp_settings.json")
}
/** Path to a task directory */
export function taskDirPath(taskId, dataDir) {
	return path.join(resolveDataDir(dataDir), "tasks", taskId)
}
/** Path to api_conversation_history.json for a task */
function apiConversationHistoryPath(taskId, dataDir) {
	return path.join(taskDirPath(taskId, dataDir), "api_conversation_history.json")
}
/** Path to ui_messages.json for a task */
function uiMessagesPath(taskId, dataDir) {
	return path.join(taskDirPath(taskId, dataDir), "ui_messages.json")
}
/** Path to context_history.json for a task */
function contextHistoryPath(taskId, dataDir) {
	return path.join(taskDirPath(taskId, dataDir), "context_history.json")
}
/** Path to task_metadata.json for a task */
function taskMetadataPath(taskId, dataDir) {
	return path.join(taskDirPath(taskId, dataDir), "task_metadata.json")
}
// ---------------------------------------------------------------------------
// Low-level JSON reader
// ---------------------------------------------------------------------------
/**
 * Read and parse a JSON file, returning undefined on any error.
 * Never throws — returns fallback instead.
 */
function readJsonFile(filePath, fallback) {
	try {
		if (!fs.existsSync(filePath)) {
			return fallback
		}
		const content = fs.readFileSync(filePath, "utf-8").trim()
		if (!content || content === "{}") {
			return fallback
		}
		return JSON.parse(content)
	} catch (error) {
		Logger.warn(`[LegacyStateReader] Failed to read ${filePath}:`, error)
		return fallback
	}
}
// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------
/**
 * Read the full globalState.json contents.
 * Returns a partial record — only keys present on disk are included.
 */
export function readGlobalState(dataDir) {
	return readJsonFile(globalStatePath(dataDir), {})
}
/**
 * Read a single key from globalState.json.
 */
export function readGlobalStateKey(key, dataDir) {
	const state = readGlobalState(dataDir)
	return state[key]
}
// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------
/**
 * Read the full secrets.json contents.
 * Returns a partial record — only keys present on disk are included.
 */
export function readSecrets(dataDir) {
	return readJsonFile(secretsPath(dataDir), {})
}
/**
 * Read a single key from secrets.json.
 */
export function readSecretKey(key, dataDir) {
	const secrets = readSecrets(dataDir)
	return secrets[key]
}
// ---------------------------------------------------------------------------
// Task history
// ---------------------------------------------------------------------------
/**
 * Read taskHistory.json from the state directory.
 * Returns an empty array if the file is missing or corrupt.
 */
export function readTaskHistory(dataDir) {
	return readJsonFile(taskHistoryPath(dataDir), [])
}
/**
 * Delete a legacy task from taskHistory.json and remove its task artifact directory.
 * Returns true when the task existed in legacy history.
 */
export function deleteLegacyTask(taskId, dataDir) {
	const historyPath = taskHistoryPath(dataDir)
	const history = readTaskHistory(dataDir)
	const filteredHistory = history.filter((item) => item.id !== taskId)
	const existed = filteredHistory.length !== history.length
	try {
		if (existed) {
			fs.mkdirSync(path.dirname(historyPath), { recursive: true })
			fs.writeFileSync(historyPath, JSON.stringify(filteredHistory, null, 2), "utf-8")
		}
		fs.rmSync(taskDirPath(taskId, dataDir), { recursive: true, force: true })
	} catch (error) {
		Logger.warn(`[LegacyStateReader] Failed to delete legacy task ${taskId}:`, error)
	}
	return existed
}
// ---------------------------------------------------------------------------
// Per-task data
// ---------------------------------------------------------------------------
/**
 * Read the API conversation history for a specific task.
 * Returns an empty array if the file is missing or corrupt.
 */
export function readApiConversationHistory(taskId, dataDir) {
	return readJsonFile(apiConversationHistoryPath(taskId, dataDir), [])
}
/**
 * Say types the legacy extension persisted but the current webview no longer
 * renders (auto-retry status rows and Focus Chain checklists). Dropped when
 * loading history so old transcripts don't expose retired status content.
 */
const REMOVED_LEGACY_SAY_TYPES = new Set(["error_retry", "api_req_retried", "task_progress"])
/**
 * Read the UI messages for a specific task.
 * Returns an empty array if the file is missing or corrupt.
 */
export function readUiMessages(taskId, dataDir) {
	const messages = readJsonFile(uiMessagesPath(taskId, dataDir), [])
	return messages.filter((message) => !REMOVED_LEGACY_SAY_TYPES.has(message.say ?? ""))
}
/**
 * Read the context history for a specific task.
 * Returns an empty array if the file is missing or corrupt.
 */
export function readContextHistory(taskId, dataDir) {
	return readJsonFile(contextHistoryPath(taskId, dataDir), [])
}
/**
 * Read task metadata for a specific task.
 * Returns an empty object if the file is missing or corrupt.
 */
export function readTaskMetadata(taskId, dataDir) {
	return readJsonFile(taskMetadataPath(taskId, dataDir), {})
}
/**
 * Read the MCP settings file.
 * Returns an empty mcpServers object if the file is missing or corrupt.
 */
export function readMcpSettings(dataDir) {
	return readJsonFile(mcpSettingsPath(dataDir), { mcpServers: {} })
}
// ---------------------------------------------------------------------------
// Task directory listing
// ---------------------------------------------------------------------------
/**
 * List all task IDs that have directories on disk.
 * Returns an empty array if the tasks directory doesn't exist.
 */
export function listTaskIds(dataDir) {
	const tasksDir = path.join(resolveDataDir(dataDir), "tasks")
	try {
		if (!fs.existsSync(tasksDir)) {
			return []
		}
		return fs
			.readdirSync(tasksDir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name)
	} catch (error) {
		Logger.warn(`[LegacyStateReader] Failed to list tasks in ${tasksDir}:`, error)
		return []
	}
}
/**
 * Read all legacy state from disk in a single call.
 * This is the primary entry point for bootstrapping the SDK adapter
 * from existing on-disk data.
 */
export function readAllLegacyState(dataDir) {
	return {
		globalState: readGlobalState(dataDir),
		secrets: readSecrets(dataDir),
		taskHistory: readTaskHistory(dataDir),
		mcpSettings: readMcpSettings(dataDir),
	}
}
//# sourceMappingURL=legacy-state-reader.js.map
