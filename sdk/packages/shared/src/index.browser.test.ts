import { describe, expect, expectTypeOf, it } from "vitest";
import {
	type ChatModelModalities,
	MANDATORY_DENY_WRITE_PATHS,
	PURPOSE_TEMPLATE,
	isChatCompatibleModel,
	slugify,
	supportsChatModalities,
} from "./index.browser";

describe("browser entry point", () => {
	it("exports the chat-model modality API", () => {
		const modalities: ChatModelModalities = {
			input: ["text"],
			output: ["text"],
		};

		expectTypeOf(modalities).toMatchTypeOf<ChatModelModalities>();
		expect(supportsChatModalities(modalities)).toBe(true);
		expect(isChatCompatibleModel({ operation: "transcription" })).toBe(false);
	});

	it("exports isomorphic Orvanta helpers without loading Node-only stores", () => {
		expect(MANDATORY_DENY_WRITE_PATHS).toContain(".orvanta/company.json");
		expect(PURPOSE_TEMPLATE).toContain("# Purpose");
		expect(slugify("Orvanta Team")).toBe("orvanta-team");
	});
});
