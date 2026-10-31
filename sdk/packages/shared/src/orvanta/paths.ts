export const WORKSPACE_DIRNAME = ".orvanta";
export const WORKSPACE_TMP_DIRNAME = ".orvanta.tmp";
export const COMPANY_FILE = "company.json";
export const PURPOSE_FILE = "purpose.md";
export const VERSION_FILE = "VERSION";
export const ROSTER_FILE = "org/roster.json";
export const COORDINATOR_AGENT_ID = "coordinator";
export const COORDINATOR_PROFILE_FILE = "org/agents/coordinator/profile.md";
export const LOCAL_DIRNAME = "local";
/** Project on-disk layout version (company schema stays SCHEMA_VERSION). */
export const PROJECT_LAYOUT_VERSION = 2;
export const PROJECT_LAYOUT_VERSION_FILE = "local/LAYOUT_VERSION";
export const COORDINATOR_MEMORY_FILE =
	"local/memory/agents/coordinator/memory.md";
export const LEGACY_COORDINATOR_MEMORY_FILE =
	"org/agents/coordinator/workspace/memory.md";
export const SCHEMA_VERSION = 1;
export const ROSTER_SCHEMA_VERSION = 2;
export const VERSION_FILE_CONTENTS = "1\n";
export const MIN_PURPOSE_LENGTH = 20;
export const MAX_COMPANY_NAME_LENGTH = 64;
export const INBOX_DIRNAME = "inbox";
export const INBOX_PENDING_FILE = "inbox/pending.json";
export const INBOX_HISTORY_FILE = "inbox/history.jsonl";
export const KNOWLEDGE_DIRNAME = "knowledge";
export const ARTIFACTS_DIRNAME = "artifacts";
export const ARTIFACTS_MARKETING_DIR = "artifacts/marketing";
export const ARTIFACTS_SALES_DIR = "artifacts/sales";
export const ARTIFACTS_RESEARCH_DIR = "artifacts/research";
export const ARTIFACTS_REVIEWS_DIR = "artifacts/reviews";
export const ARTIFACTS_BUILD_DIR = "artifacts/build";
export const HISTORY_DIRNAME = "local/history";
export const LEGACY_HISTORY_DIRNAME = "history";
export const HISTORY_SCHEMA_VERSION = 1;
/** Legacy v0.1 list/task mirror — Delete-only after inventory. */
export const HISTORY_SESSIONS_FILE = "history/sessions.json";
export const HISTORY_TASKS_DIR = "history/tasks";
export const HISTORY_INDEX_FILE = "local/history/index.json";
export const HISTORY_SESSIONS_DIR = "local/history/sessions";
export const HISTORY_SESSION_FILENAME = "session.json";
export const HISTORY_LOCK_FILE = "local/history/history.lock";

export function acceptedMemoryRelativePath(agentId: string): string {
	return `local/memory/agents/${agentId}/memory.md`;
}

export function memoryProposalsDirRelativePath(agentId: string): string {
	return `local/memory/agents/${agentId}/proposals`;
}

export function legacyMemoryRelativePath(agentId: string): string {
	return `org/agents/${agentId}/workspace/memory.md`;
}

