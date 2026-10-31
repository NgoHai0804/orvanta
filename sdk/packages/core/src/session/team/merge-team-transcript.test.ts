import { describe, expect, it } from "vitest";
import { mergeTeamTranscriptMessages } from "./team-child-session-manager";
import type { StoredMessageWithMetadata } from "../../types/session";

describe("mergeTeamTranscriptMessages", () => {
	it("does not duplicate when the newer snapshot already contains the prior transcript", () => {
		const prior: StoredMessageWithMetadata[] = [
			{ role: "user", content: "a" } as StoredMessageWithMetadata,
			{ role: "assistant", content: [{ type: "text", text: "b" }] } as StoredMessageWithMetadata,
		];
		const next = [
			...prior,
			{ role: "user", content: "c" } as StoredMessageWithMetadata,
		];
		expect(mergeTeamTranscriptMessages(prior, next)).toEqual(next);
		// Replaying the same next snapshot must stay idempotent.
		expect(mergeTeamTranscriptMessages(next, next)).toEqual(next);
	});

	it("appends fresh-run messages that are not a continuation prefix", () => {
		const prior: StoredMessageWithMetadata[] = [
			{ role: "user", content: "run1" } as StoredMessageWithMetadata,
		];
		const next: StoredMessageWithMetadata[] = [
			{ role: "user", content: "run2" } as StoredMessageWithMetadata,
		];
		expect(mergeTeamTranscriptMessages(prior, next)).toEqual([...prior, ...next]);
	});
});
