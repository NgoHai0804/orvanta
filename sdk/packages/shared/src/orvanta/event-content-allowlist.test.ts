import { describe, expect, it } from "vitest";
import { isAllowedEventType, projectEventContent, redactEventText } from "./event-content-allowlist";

describe("event content allowlist", () => {
	it("fails closed for unknown event types", () => {
		expect(isAllowedEventType("team_run_started")).toBe(true);
		expect(isAllowedEventType("raw_tool_log")).toBe(false);
		expect(projectEventContent("raw_tool_log", "secret")).toBeUndefined();
	});

	it("redacts credentials before projection", () => {
		expect(redactEventText("token sk-abcdefghijklmnopqrstuvwxyz123456")).toContain(
			"[redacted]",
		);
		expect(projectEventContent("team_message", "bearer abcdefghijklmnopqrstuvwxyz")).toContain(
			"[redacted]",
		);
	});
});
