import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { KNOWLEDGE_DIRNAME, PURPOSE_FILE, WORKSPACE_DIRNAME, WORKSPACE_TMP_DIRNAME } from "./paths";
import {
	CompanyAlreadyExistsError,
	createCompany,
	getAgentMemory,
	initCompanyKnowledge,
	loadCompany,
	pathExists,
	pickWorkspaceRoot,
	saveAgentMemory,
} from "./workspace-store";

const PURPOSE =
	"Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

const created: string[] = [];

afterEach(async () => {
	await Promise.all(
		created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

async function tempWorkspace(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "orvanta-ws-"));
	created.push(dir);
	return dir;
}

describe("pickWorkspaceRoot", () => {
	it("returns the folder that already has .orvanta", async () => {
		const a = await tempWorkspace();
		const b = await tempWorkspace();
		await mkdir(join(b, WORKSPACE_DIRNAME));
		expect(await pickWorkspaceRoot([a, b])).toBe(b);
	});

	it("falls back to the first folder", async () => {
		const a = await tempWorkspace();
		expect(await pickWorkspaceRoot([a])).toBe(a);
	});
});

describe("workspace-store", () => {
	it("loads missing when the folder is empty", async () => {
		const root = await tempWorkspace();
		expect(await loadCompany(root)).toEqual({ status: "missing" });
	});

	it("creates then loads a ready company", async () => {
		const root = await tempWorkspace();
		const createdCompany = await createCompany(root, {
			name: "Orvanta",
			purpose: PURPOSE,
		});
		expect(createdCompany.status).toBe("ready");
		if (createdCompany.status !== "ready") {
			return;
		}
		expect(createdCompany.company.name).toBe("Orvanta");
		expect(createdCompany.company.teamName).toBe("orvanta");
		expect(createdCompany.roster.agents).toHaveLength(1);
		expect(createdCompany.roster.agents[0]?.id).toBe("coordinator");
		expect(await loadCompany(root)).toEqual(createdCompany);
	});

	it("is broken when purpose.md is missing", async () => {
		const root = await tempWorkspace();
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		await rm(join(root, WORKSPACE_DIRNAME, PURPOSE_FILE));
		const loaded = await loadCompany(root);
		expect(loaded.status).toBe("broken");
		if (loaded.status === "broken") {
			expect(loaded.errors).toContain("thiếu purpose.md");
		}
	});

	it("rejects create when a company already exists", async () => {
		const root = await tempWorkspace();
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		await expect(
			createCompany(root, { name: "Other", purpose: PURPOSE }),
		).rejects.toBeInstanceOf(CompanyAlreadyExistsError);
	});

	it("leaves no .orvanta.tmp after a successful create", async () => {
		const root = await tempWorkspace();
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });
		expect(await pathExists(join(root, WORKSPACE_TMP_DIRNAME))).toBe(false);
		expect(await pathExists(join(root, WORKSPACE_DIRNAME))).toBe(true);
	});
});


	it("reads and writes agent memory independently with persistence", async () => {
		const root = await tempWorkspace();
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });

		// Coordinator memory initially empty
		expect(await getAgentMemory(root, "coordinator")).toBe("");
		expect(await getAgentMemory(root, "unknown-agent")).toBe("");

		const coordMemory = "# Coordinator Learnings\n- Always dispatch via team_run_task";
		const implMemory = "# Implementer Learnings\n- Use bun test";

		await saveAgentMemory(root, "coordinator", coordMemory);
		await saveAgentMemory(root, "implementer", implMemory);

		expect(await getAgentMemory(root, "coordinator")).toBe(coordMemory);
		expect(await getAgentMemory(root, "implementer")).toBe(implMemory);
	});

	it("initializes company knowledge base without overwriting existing files", async () => {
		const root = await tempWorkspace();
		await createCompany(root, { name: "Orvanta", purpose: PURPOSE });

		const knowledgeDir = join(root, WORKSPACE_DIRNAME, KNOWLEDGE_DIRNAME);
		const brandPath = join(knowledgeDir, "brand-guidelines.md");
		const codingPath = join(knowledgeDir, "coding-standards.md");

		expect(await pathExists(brandPath)).toBe(true);
		expect(await pathExists(codingPath)).toBe(true);

		const customBrand = "# Custom Brand Voice\n- Bold and direct.";
		await writeFile(brandPath, customBrand, "utf8");

		await initCompanyKnowledge(root);

		const brandContent = await readFile(brandPath, "utf8");
		expect(brandContent).toBe(customBrand);
	});