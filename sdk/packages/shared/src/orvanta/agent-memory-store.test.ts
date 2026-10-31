import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	approveMemoryProposal,
	getAcceptedMemoryPath,
	getAgentMemory,
	getLegacyMemoryPath,
	listMemoryProposals,
	rejectMemoryProposal,
	saveAgentMemory,
	writeMemoryProposal,
} from "./agent-memory-store";
import { createCompany } from "./workspace-store";

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

describe("agent memory store", () => {
	it("writes accepted memory under local/memory and isolates agents", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-memory-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		await saveAgentMemory(root, "coordinator", "coord-only");
		await saveAgentMemory(root, "reviewer", "reviewer-only");
		expect(await getAgentMemory(root, "coordinator")).toBe("coord-only");
		expect(await getAgentMemory(root, "reviewer")).toBe("reviewer-only");
		expect(getAcceptedMemoryPath(root, "coordinator")).toContain(
			join(".orvanta", "local", "memory", "agents", "coordinator"),
		);
	});

	it("migrates legacy org workspace memory once", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-memory-legacy-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		const legacy = getLegacyMemoryPath(root, "coordinator");
		await mkdir(join(legacy, ".."), { recursive: true });
		await writeFile(legacy, "legacy-memory", "utf8");
		expect(await getAgentMemory(root, "coordinator")).toBe("legacy-memory");
		expect(await getAgentMemory(root, "coordinator")).toBe("legacy-memory");
	});

	it("stores proposals separately from accepted memory", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-memory-prop-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		await saveAgentMemory(root, "coordinator", "accepted");
		await writeMemoryProposal(root, "coordinator", "proposed", "prop1");
		expect((await listMemoryProposals(root, "coordinator")).map((p) => p.id)).toEqual([
			"prop1",
		]);
		expect(await getAgentMemory(root, "coordinator")).toBe("accepted");
		await approveMemoryProposal(root, "coordinator", "prop1");
		expect(await getAgentMemory(root, "coordinator")).toBe("proposed");
		expect(await listMemoryProposals(root, "coordinator")).toEqual([]);
		await writeMemoryProposal(root, "coordinator", "later", "prop2");
		await rejectMemoryProposal(root, "coordinator", "prop2");
		expect(await listMemoryProposals(root, "coordinator")).toEqual([]);
		expect(await getAgentMemory(root, "coordinator")).toBe("proposed");
	});
});
