/**
 * Fail-closed event-content policy for Team Feed / Agent detail projections.
 * Content outside this allowlist must not be shown or persisted to a projection.
 */

export const EVENT_CONTENT_ALLOWLIST = [
	"team_run_started",
	"team_run_progress",
	"team_run_completed",
	"team_run_failed",
	"team_run_cancelled",
	"team_task_updated",
	"team_message",
	"agent_status",
	"pause_requested",
	"paused",
	"needs_attention",
] as const;

export type AllowedEventType = (typeof EVENT_CONTENT_ALLOWLIST)[number];

const SECRET_PATTERNS = [
	/sk-[a-zA-Z0-9_-]{20,}/g,
	/ghp_[a-zA-Z0-9]{20,}/g,
	/gho_[a-zA-Z0-9]{20,}/g,
	/bearer\s+[a-zA-Z0-9_.\-~+/]+=*/gi,
	/api[_-]?key\s*[:=]\s*\S+/gi,
];

export function isAllowedEventType(type: string): type is AllowedEventType {
	return (EVENT_CONTENT_ALLOWLIST as readonly string[]).includes(type);
}

export function redactEventText(text: string): string {
	let out = text;
	for (const pattern of SECRET_PATTERNS) {
		out = out.replace(pattern, "[redacted]");
	}
	return out;
}

export function projectEventContent(
	type: string,
	text: string | undefined,
): string | undefined {
	if (!isAllowedEventType(type)) {
		return undefined;
	}
	if (typeof text !== "string") {
		return undefined;
	}
	return redactEventText(text);
}
