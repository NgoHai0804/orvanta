import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	acknowledgeCeoSessionPause,
	getCeoSessionPause,
	isCeoSessionDispatchBlocked,
	requestCeoSessionPause,
	resumeCeoSessionPause,
	reportCeoSessionNeedsAttention,
} from "./ceo-session-pause";
import { createCompany } from "./workspace-store";

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

describe("ceo session pause store", () => {
	it("persists pause_requested and blocks dispatch until all participants are safe", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-pause-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		const requested = await requestCeoSessionPause(root, "session-abc");
		expect(requested.status).toBe("pause_requested");
		expect(isCeoSessionDispatchBlocked(requested)).toBe(true);
		const partial = await acknowledgeCeoSessionPause(root, "session-abc", {
			coordinator: "safe",
			reviewer: "failed",
		});
		expect(partial.status).toBe("partial");
		expect(isCeoSessionDispatchBlocked(await getCeoSessionPause(root, "session-abc"))).toBe(
			false,
		);
		await requestCeoSessionPause(root, "session-abc");
		const paused = await acknowledgeCeoSessionPause(root, "session-abc", {
			coordinator: "safe",
			reviewer: "safe",
		});
		expect(paused.status).toBe("paused");
		expect(isCeoSessionDispatchBlocked(paused)).toBe(true);
		const resumed = await resumeCeoSessionPause(root, "session-abc");
		expect(resumed.status).toBe("none");
		expect(isCeoSessionDispatchBlocked(resumed)).toBe(false);
		expect(isCeoSessionDispatchBlocked(await getCeoSessionPause(root, "session-abc"))).toBe(false);

		const flagged = await reportCeoSessionNeedsAttention(root, "session-abc", [
			{ agentId: "reviewer", reason: "Interrupted run — verify git side effects" },
		]);
		expect(flagged.needsAttention).toHaveLength(1);
		const idempotent = await reportCeoSessionNeedsAttention(root, "session-abc", [
			{ agentId: "reviewer", reason: "Interrupted run — verify git side effects" },
		]);
		expect(idempotent.needsAttention).toHaveLength(1);
		const afterResume = await resumeCeoSessionPause(root, "session-abc");
		expect(afterResume.needsAttention).toHaveLength(1);
	});
});
