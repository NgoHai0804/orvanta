import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	applyLegacyHistoryCleanup,
	dryRunLegacyHistoryCleanup,
	getLegacyHistoryInventory,
} from "./legacy-history-cleanup";
import { createCompany, pathExists } from "./workspace-store";
import { WORKSPACE_DIRNAME } from "./paths";

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

describe("legacy history cleanup", () => {
	it("labels every inventoried path Keep or Delete", () => {
		const labels = new Set(getLegacyHistoryInventory().map((item) => item.label));
		expect(labels.has("keep")).toBe(true);
		expect(labels.has("delete")).toBe(true);
		expect(
			getLegacyHistoryInventory().every((item) => item.label === "keep" || item.label === "delete"),
		).toBe(true);
	});

	it("dry-run lists legacy files without deleting them", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-cleanup-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		const historyDir = join(root, WORKSPACE_DIRNAME, "history");
		await mkdir(join(historyDir, "tasks", "task-1"), { recursive: true });
		await writeFile(join(historyDir, "sessions.json"), "[]\n", "utf8");
		await writeFile(join(historyDir, "tasks", "task-1", "ui_messages.json"), "[]\n", "utf8");
		const planned = await dryRunLegacyHistoryCleanup(root);
		expect(planned.some((item) => item.relativePath.includes("sessions.json"))).toBe(true);
		expect(await pathExists(join(historyDir, "sessions.json"))).toBe(true);
		expect(await pathExists(join(root, WORKSPACE_DIRNAME, "company.json"))).toBe(true);
	});

	it("apply deletes only legacy history and keeps company/roster", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-cleanup-apply-"));
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		const orvanta = join(root, WORKSPACE_DIRNAME);
		await mkdir(join(orvanta, "history", "tasks", "task-1"), { recursive: true });
		await writeFile(join(orvanta, "history", "sessions.json"), "[]\n", "utf8");
		await mkdir(join(orvanta, "local", "sdk", "sessions"), { recursive: true });
		await writeFile(join(orvanta, "local", "sdk", "sessions", "keep.txt"), "sdk", "utf8");
		await applyLegacyHistoryCleanup(root);
		expect(await pathExists(join(orvanta, "history", "sessions.json"))).toBe(false);
		expect(await pathExists(join(orvanta, "company.json"))).toBe(true);
		expect(await pathExists(join(orvanta, "org", "roster.json"))).toBe(true);
		expect(await pathExists(join(orvanta, "org", "agents", "coordinator", "profile.md"))).toBe(
			true,
		);
		expect(await pathExists(join(orvanta, "local", "sdk", "sessions", "keep.txt"))).toBe(true);
	});
});
