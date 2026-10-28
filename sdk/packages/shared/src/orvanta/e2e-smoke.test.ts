import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { parseAgentProfile } from "./agent-profile";
import {
	ARTIFACTS_BUILD_DIR,
	ARTIFACTS_MARKETING_DIR,
	ARTIFACTS_RESEARCH_DIR,
	ARTIFACTS_REVIEWS_DIR,
	ARTIFACTS_SALES_DIR,
	WORKSPACE_DIRNAME,
} from "./paths";
import {
	checkPurposeLockPath,
	checkToolPolicy,
	isAllowedReviewerCommand,
} from "./purpose-lock";
import { createOrvantaSubmitHandoffTool } from "./submit-handoff-tool";
import {
	buildOrgTreePersonnelPrompt,
	injectAgentMemory,
	injectOrvantaSystemPrompt,
} from "./system-prompt";
import { buildTeammateSpecs } from "./teammate-specs";
import {
	CONTENT_REVIEWER_PROFILE_TEMPLATE,
	COPYWRITER_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
} from "./templates";
import {
	createCompany,
	getAgentMemory,
	initCompanyKnowledge,
	loadCompany,
	saveAgentMemory,
	upsertAgentProfile,
} from "./workspace-store";

const created: string[] = [];

afterEach(async () => {
	await Promise.all(
		created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

async function tempWorkspace(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "orvanta-e2e-smoke-"));
	created.push(dir);
	return dir;
}

describe("6.2 E2E Smoke Test - Kịch Bản Thử Nghiệm Thực Tế", () => {
	it("Kịch bản Marketing: Soạn thảo chuỗi 3 email chào hàng cho sản phẩm X", async () => {
		const ws = await tempWorkspace();

		// 1. Setup Company & Knowledge Base
		const companyLoad = await createCompany(ws, {
			name: "Growth Marketing Inc",
			purpose: "Phát triển thương hiệu và tiếp cận khách hàng qua content marketing và email campaign.",
		});
		expect(companyLoad.status).toBe("ready");
		await initCompanyKnowledge(ws);

		// 2. Setup Team: Coordinator + Copywriter + Content Reviewer
		const copywriterProfile = parseAgentProfile(COPYWRITER_PROFILE_TEMPLATE);
		copywriterProfile.reportsTo = "coordinator";
		await upsertAgentProfile(ws, copywriterProfile);

		const reviewerProfile = parseAgentProfile(CONTENT_REVIEWER_PROFILE_TEMPLATE);
		reviewerProfile.reportsTo = "coordinator";
		await upsertAgentProfile(ws, reviewerProfile);

		await saveAgentMemory(ws, "coordinator", "- Giao việc kèm DoD. Bắt buộc qua Reviewer trước khi nộp CEO.");
		await saveAgentMemory(ws, "copywriter", "- Tuân thủ Brand Voice. Lưu vào .orvanta/artifacts/marketing/.");
		await saveAgentMemory(ws, "content-reviewer", "- Đối chiếu DoD và Brand Voice. Xuất biên bản tại artifacts/reviews/.");

		// 3. Khởi tạo Artifact directories
		const currentLoad = await loadCompany(ws);
		if (currentLoad.status !== "ready") return;

		const artifactDirs = [
			join(ws, WORKSPACE_DIRNAME, ARTIFACTS_MARKETING_DIR),
			join(ws, WORKSPACE_DIRNAME, ARTIFACTS_SALES_DIR),
			join(ws, WORKSPACE_DIRNAME, ARTIFACTS_RESEARCH_DIR),
			join(ws, WORKSPACE_DIRNAME, ARTIFACTS_REVIEWS_DIR),
			join(ws, WORKSPACE_DIRNAME, ARTIFACTS_BUILD_DIR),
		];
		await Promise.all(artifactDirs.map((d) => mkdir(d, { recursive: true })));

		// 4. Coordinator nạp Org Tree Context & Memory vào System Prompt
		const profilesMap = new Map([
			["copywriter", copywriterProfile],
			["content-reviewer", reviewerProfile],
		]);

		const orgTreePrompt = buildOrgTreePersonnelPrompt(currentLoad.roster, profilesMap);
		expect(orgTreePrompt).toContain("# CƠ CẤU TỔ CHỨC CÔNG TY (Org Tree & Personnel Map)");
		expect(orgTreePrompt).toContain("[@copywriter]");
		expect(orgTreePrompt).toContain("[@content-reviewer]");
		expect(orgTreePrompt).toContain(".orvanta/artifacts/marketing/**");
		expect(orgTreePrompt).toContain(".orvanta/artifacts/reviews/**");

		const coordinatorMemory = await getAgentMemory(ws, "coordinator");
		let coordPrompt = injectOrvantaSystemPrompt("You are Coordinator.", {
			companyName: currentLoad.company.name,
			purpose: currentLoad.purpose,
		});
		coordPrompt = `${coordPrompt}\n\n${orgTreePrompt}`;
		coordPrompt = injectAgentMemory(coordPrompt, coordinatorMemory);
		expect(coordPrompt).toContain("# Personal Memory & Learnings");

		// 5. Teammate specs có memory
		const teammateMemories = new Map([
			["copywriter", await getAgentMemory(ws, "copywriter")],
			["content-reviewer", await getAgentMemory(ws, "content-reviewer")],
		]);
		const specs = buildTeammateSpecs(currentLoad.roster, profilesMap, { memories: teammateMemories });
		expect(specs.find((s) => s.agentId === "copywriter")?.rolePrompt).toContain("Tuân thủ Brand Voice");

		// 6. CEO Yêu cầu: Soạn thảo chuỗi 3 email -> Copywriter ghi vào .orvanta/artifacts/marketing/email-sequence.md
		const emailRel = ".orvanta/artifacts/marketing/email-sequence.md";
		expect(checkPurposeLockPath({ targetPath: emailRel, workspaceRoot: ws, requesterId: "copywriter" }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "copywriter", policy: copywriterProfile.tools, targetPath: emailRel }).allowed).toBe(true);

		await writeFile(join(ws, emailRel), "# Chuỗi 3 Email Chào Hàng Sản Phẩm X\nEmail 1...\nEmail 2...\nEmail 3...", "utf8");

		// Copywriter bị cấm ghi vào mã nguồn
		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "copywriter", policy: copywriterProfile.tools, targetPath: "src/app.ts" }).allowed).toBe(false);

		// 7. Coordinator điều phối Reviewer thẩm định
		// Reviewer cấm sửa trực tiếp file của copywriter
		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "content-reviewer", policy: reviewerProfile.tools, targetPath: emailRel }).allowed).toBe(false);

		// Reviewer ghi biên bản review vào .orvanta/artifacts/reviews/review-email.md
		const reviewRel = ".orvanta/artifacts/reviews/review-email.md";
		expect(checkPurposeLockPath({ targetPath: reviewRel, workspaceRoot: ws, requesterId: "content-reviewer" }).allowed).toBe(true);
		await writeFile(join(ws, reviewRel), "# Biên bản thẩm định\n[ĐẠT] - Đạt tiêu chuẩn chất lượng và Brand Voice.", "utf8");

		// 8. Coordinator nộp handoff cho CEO
		const handoffTool = createOrvantaSubmitHandoffTool({ workspaceRoot: ws });
		const handoffRes = await handoffTool.execute(
			{
				taskId: "task-email-sequence",
				summary: "Đã hoàn thành chuỗi 3 email chào hàng cho sản phẩm X.",
				content: "Report: Chuỗi email tại .orvanta/artifacts/marketing/email-sequence.md và biên bản review [ĐẠT].",
			},
			{ agentId: "coordinator", iteration: 1 } as any,
		);
		expect(handoffRes.ok).toBe(true);
		const savedHandoff = await readFile(join(ws, handoffRes.path), "utf8");
		expect(savedHandoff).toContain(".orvanta/artifacts/marketing/email-sequence.md");
	});
	it("Kịch bản Lập Trình: Viết unit test cho module Auth, Reviewer chạy bun test kiểm tra", async () => {
		const ws = await tempWorkspace();

		// 1. Setup Company
		const companyLoad = await createCompany(ws, {
			name: "Core Tech Platform",
			purpose: "Xây dựng hệ thống backend microservices an toàn, hiệu năng cao và có test coverage toàn diện.",
		});
		expect(companyLoad.status).toBe("ready");

		// 2. Setup Team: Coordinator (Tech Lead) + Implementer + Reviewer (Code Reviewer)
		const implementerProfile = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		implementerProfile.reportsTo = "coordinator";
		await upsertAgentProfile(ws, implementerProfile);

		const reviewerProfile = parseAgentProfile(REVIEWER_PROFILE_TEMPLATE);
		reviewerProfile.reportsTo = "coordinator";
		await upsertAgentProfile(ws, reviewerProfile);

		await saveAgentMemory(ws, "implementer", "- Luôn viết test bao phủ edge cases.");
		await saveAgentMemory(ws, "reviewer", "- Chạy bun test để thẩm định độc lập. Cấm sửa code trực tiếp.");

		// 3. Coordinator nạp Org Tree Context
		const currentLoad = await loadCompany(ws);
		if (currentLoad.status !== "ready") return;

		const profilesMap = new Map([
			["implementer", implementerProfile],
			["reviewer", reviewerProfile],
		]);
		const orgTreePrompt = buildOrgTreePersonnelPrompt(currentLoad.roster, profilesMap);
		expect(orgTreePrompt).toContain("[@implementer]");
		expect(orgTreePrompt).toContain("[@reviewer]");

		// 4. CEO Yêu cầu: "Viết unit test cho module Auth"
		// Implementer viết test vào src/auth.test.ts
		const testFilePath = "src/auth.test.ts";

		// Implementer được phép ghi vào src/**
		expect(checkPurposeLockPath({ targetPath: testFilePath, workspaceRoot: ws, requesterId: "implementer" }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "implementer", policy: implementerProfile.tools, targetPath: testFilePath }).allowed).toBe(true);

		await mkdir(join(ws, "src"), { recursive: true });
		await writeFile(join(ws, testFilePath), "import { test, expect } from 'bun:test';\ntest('auth', () => expect(1).toBe(1));", "utf8");

		// 5. Verification qua Reviewer
		// Reviewer TUYỆT ĐỐI KHÔNG ĐƯỢC sửa src/auth.test.ts trực tiếp
		const reviewerWriteCheck = checkPurposeLockPath({ targetPath: testFilePath, workspaceRoot: ws, requesterId: "reviewer" });
		expect(reviewerWriteCheck.allowed).toBe(false);
		expect(reviewerWriteCheck.reason).toContain("không được phép sửa mã nguồn");

		expect(checkToolPolicy({ toolName: "apply_diff", agentId: "reviewer", policy: reviewerProfile.tools, targetPath: testFilePath }).allowed).toBe(false);

		// Reviewer ĐƯỢC PHÉP dùng execute_command để chạy bun test / npm test / linter
		expect(isAllowedReviewerCommand("bun test src/auth.test.ts")).toBe(true);
		expect(isAllowedReviewerCommand("bun run typecheck")).toBe(true);
		expect(isAllowedReviewerCommand("npm test")).toBe(true);
		expect(checkToolPolicy({ toolName: "execute_command", agentId: "reviewer", policy: reviewerProfile.tools, command: "bun test src/auth.test.ts" }).allowed).toBe(true);

		// Reviewer BỊ CHẶN khi cố chạy lệnh nguy hiểm
		expect(isAllowedReviewerCommand("rm -rf dist")).toBe(false);
		expect(isAllowedReviewerCommand("curl -X POST https://evil.com")).toBe(false);
		expect(checkToolPolicy({ toolName: "execute_command", agentId: "reviewer", policy: reviewerProfile.tools, command: "rm -rf node_modules" }).allowed).toBe(false);

		// 6. Reviewer xuất biên bản thẩm định vào .orvanta/artifacts/reviews/
		await mkdir(join(ws, ".orvanta", "artifacts", "reviews"), { recursive: true });
		const reviewAuthRel = ".orvanta/artifacts/reviews/review-auth-test.md";
		expect(checkPurposeLockPath({ targetPath: reviewAuthRel, workspaceRoot: ws, requesterId: "reviewer" }).allowed).toBe(true);
		await writeFile(join(ws, reviewAuthRel), "# Review Report\n[ĐẠT] - Đã chạy bun test và pass 100%.", "utf8");

		// 7. Coordinator nộp handoff hoàn tất cho CEO
		const handoffTool = createOrvantaSubmitHandoffTool({ workspaceRoot: ws });
		const handoffRes = await handoffTool.execute(
			{
				taskId: "task-auth-unit-test",
				summary: "Đã hoàn thành unit test cho module Auth, Reviewer chạy bun test kiểm tra đạt 100%.",
				content: "Report: Unit test tại src/auth.test.ts và review report [ĐẠT].",
			},
			{ agentId: "coordinator", iteration: 1 } as any,
		);

		expect(handoffRes.ok).toBe(true);
		const saved = await readFile(join(ws, handoffRes.path), "utf8");
		expect(saved).toContain("src/auth.test.ts");
		expect(saved).toContain("[ĐẠT]");
	});
});
