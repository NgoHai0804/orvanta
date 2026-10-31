/**
 * Phase 9 — representative scenario on temp project fixtures (not monorepo `.orvanta`).
 * Covers the product path that can be proven without a VS Code GUI host.
 * UI Feed/detail live sync and full LLM team runs remain host/E2E items.
 */
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	approveMemoryProposal,
	deleteAgentMemory,
	getAgentMemory,
	listMemoryProposals,
	saveAgentMemory,
	writeMemoryProposal,
} from "./agent-memory-store";
import {
	acknowledgeCeoSessionPause,
	getCeoSessionPause,
	isCeoSessionDispatchBlocked,
	requestCeoSessionPause,
	resumeCeoSessionPause,
} from "./ceo-session-pause";
import { planCeoSessionRuntimeRecovery } from "./ceo-session-resume-plan";
import { WORKSPACE_DIRNAME } from "./paths";
import { resolveProjectStorageRoots } from "./project-storage";
import { getSession, listSessions } from "./session-history-store";
import {
	bindTaskToSession,
	clearActiveTaskBindings,
	recordTeamRunTranscriptLink,
} from "./session-task-binding";
import { injectAgentMemory } from "./system-prompt";
import { createCompany, getAgentProfile, upsertAgent } from "./workspace-store";

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

async function fixtureProject(prefix: string): Promise<string> {
	return mkdtemp(join(tmpdir(), prefix));
}

describe("Phase 9 — representative fixture scenario", () => {
	afterEach(() => {
		clearActiveTaskBindings();
	});

	it("draft → CEO session → dual-agent transcripts → pause drain → memory → new session isolation", async () => {
		const root = await fixtureProject("orvanta-p9-scenario-");
		const company = await createCompany(root, { name: "FixtureNine", purpose: PURPOSE });
		expect(company.status).toBe("ready");
		if (company.status !== "ready") throw new Error("company not ready");

		const reviewer = await upsertAgent(root, {
			id: "reviewer",
			displayName: "Reviewer",
			role: "teammate",
			instructions: "Review carefully",
		});
		const builder = await upsertAgent(root, {
			id: "builder",
			displayName: "Builder",
			role: "teammate",
			instructions: "Implement features",
		});

		const orvantaSessionId = "ceo_p9_scenario_1";
		const rootSdkSessionId = "sdk_coord_p9_1";
		const sessionFile = join(
			root,
			WORKSPACE_DIRNAME,
			"local",
			"history",
			"sessions",
			orvantaSessionId,
			"session.json",
		);

		// 1) Tab mới là draft — chưa có file session
		expect(await pathExists(sessionFile)).toBe(false);
		expect((await listSessions(root)).total).toBe(0);

		// 2) Gửi tin Coordinator → tạo CEO session trên disk
		const first = await bindTaskToSession({
			workspaceRoot: root,
			companyId: company.company.id,
			sessionId: orvantaSessionId,
			taskId: rootSdkSessionId,
			agentNumericId: 1,
			agentSlug: "coordinator",
			displayName: "Coordinator",
			role: "lead",
			sdkSessionId: rootSdkSessionId,
			prompt: "Ship auth with two teammates in parallel",
			lastMessagePreview: "Coordinating reviewer + builder",
		});
		expect(first.isNewSession).toBe(true);
		expect(await pathExists(sessionFile)).toBe(true);

		// 3) Transcript Coordinator persist dưới SDK path project
		const roots = resolveProjectStorageRoots(root);
		const coordTranscriptDir = join(roots.sdkArtifactDir, rootSdkSessionId);
		await mkdir(coordTranscriptDir, { recursive: true });
		const coordTranscriptPath = join(coordTranscriptDir, "messages.json");
		await writeFile(
			coordTranscriptPath,
			`${JSON.stringify(
				[
					{ role: "user", content: "Ship auth" },
					{ role: "assistant", content: "On it" },
				],
				null,
				"\t",
			)}\n`,
			"utf8",
		);
		expect(await readFile(coordTranscriptPath, "utf8")).toContain("Ship auth");
		expect(coordTranscriptPath.replace(/\\/g, "/")).toContain("/.orvanta/local/sdk/sessions/");

		// 4) Hai Agent được giao song song + sticky transcript links
		const reviewerSdk = `${rootSdkSessionId}__reviewer__canonical`;
		const builderSdk = `${rootSdkSessionId}__builder__canonical`;
		await Promise.all([
			recordTeamRunTranscriptLink({
				workspaceRoot: root,
				sessionId: orvantaSessionId,
				runId: "run_review_1",
				participant: {
					agentNumericId: reviewer.agentNumericId,
					agentSlugAtJoin: "reviewer",
					displayNameAtJoin: "Reviewer",
					roleAtJoin: "teammate",
					taskId: reviewerSdk,
				},
				transcript: { sdkSessionId: reviewerSdk },
			}),
			recordTeamRunTranscriptLink({
				workspaceRoot: root,
				sessionId: orvantaSessionId,
				runId: "run_build_1",
				participant: {
					agentNumericId: builder.agentNumericId,
					agentSlugAtJoin: "builder",
					displayNameAtJoin: "Builder",
					roleAtJoin: "teammate",
					taskId: builderSdk,
				},
				transcript: { sdkSessionId: builderSdk },
			}),
		]);
		for (const [sdkId, text] of [
			[reviewerSdk, "reviewing auth"],
			[builderSdk, "implementing auth"],
		] as const) {
			const dir = join(roots.sdkArtifactDir, sdkId);
			await mkdir(dir, { recursive: true });
			await writeFile(
				join(dir, "messages.json"),
				`${JSON.stringify([{ role: "assistant", content: text }])}\n`,
				"utf8",
			);
		}

		const linked = await getSession(root, orvantaSessionId);
		expect(linked.participants).toHaveLength(3);
		const reviewerP = linked.participants.find((p) => p.agentSlugAtJoin === "reviewer");
		const builderP = linked.participants.find((p) => p.agentSlugAtJoin === "builder");
		expect(reviewerP?.transcript?.sdkSessionId).toBe(reviewerSdk);
		expect(builderP?.transcript?.sdkSessionId).toBe(builderSdk);
		expect(reviewerP?.transcript?.runIds).toContain("run_review_1");
		expect(builderP?.transcript?.runIds).toContain("run_build_1");

		// 5) Pause: chặn việc mới; drain tới safe → Paused (không kill)
		await requestCeoSessionPause(root, orvantaSessionId);
		expect(isCeoSessionDispatchBlocked(await getCeoSessionPause(root, orvantaSessionId))).toBe(
			true,
		);
		await acknowledgeCeoSessionPause(root, orvantaSessionId, {
			coordinator: "draining",
			reviewer: "draining",
			builder: "safe",
		});
		expect((await getCeoSessionPause(root, orvantaSessionId))?.status).toBe("partial");
		await acknowledgeCeoSessionPause(root, orvantaSessionId, {
			coordinator: "safe",
			reviewer: "safe",
			builder: "safe",
		});
		const paused = await getCeoSessionPause(root, orvantaSessionId);
		expect(paused?.status).toBe("paused");
		expect(isCeoSessionDispatchBlocked(paused)).toBe(true);

		// 6) Restart simulation: still paused; reopen session has all transcripts
		clearActiveTaskBindings();
		expect((await getCeoSessionPause(root, orvantaSessionId))?.status).toBe("paused");
		const reopened = await getSession(root, orvantaSessionId);
		expect(reopened.participants.map((p) => p.agentSlugAtJoin).sort()).toEqual([
			"builder",
			"coordinator",
			"reviewer",
		]);
		for (const p of reopened.participants) {
			const sdkId = p.transcript?.sdkSessionId;
			expect(sdkId).toBeTruthy();
			const raw = await readFile(join(roots.sdkArtifactDir, sdkId!, "messages.json"), "utf8");
			expect(raw.length).toBeGreaterThan(2);
		}

		await resumeCeoSessionPause(root, orvantaSessionId);
		expect(isCeoSessionDispatchBlocked(await getCeoSessionPause(root, orvantaSessionId))).toBe(
			false,
		);

		// 7) Memory propose → CEO view/edit/approve; new CEO session loads memory, not old transcript
		await writeMemoryProposal(root, "builder", "Prefer JWT for auth", "prop_auth");
		expect((await listMemoryProposals(root, "builder")).map((p) => p.id)).toEqual(["prop_auth"]);
		await saveAgentMemory(root, "builder", "scratch note");
		expect(await getAgentMemory(root, "builder")).toBe("scratch note");
		await deleteAgentMemory(root, "builder");
		expect(await getAgentMemory(root, "builder")).toBe("");
		await approveMemoryProposal(root, "builder", "prop_auth");
		expect(await getAgentMemory(root, "builder")).toBe("Prefer JWT for auth");
		expect(await listMemoryProposals(root, "builder")).toEqual([]);

		const memory = await getAgentMemory(root, "builder");
		const newPrompt = injectAgentMemory("You are Builder.", memory);
		expect(newPrompt).toContain("Prefer JWT for auth");

		const newSessionId = "ceo_p9_scenario_2";
		const second = await bindTaskToSession({
			workspaceRoot: root,
			companyId: company.company.id,
			sessionId: newSessionId,
			taskId: "sdk_coord_p9_2",
			agentNumericId: 1,
			agentSlug: "coordinator",
			displayName: "Coordinator",
			role: "lead",
			sdkSessionId: "sdk_coord_p9_2",
			prompt: "New session after memory approval",
		});
		expect(second.isNewSession).toBe(true);
		const newSession = await getSession(root, newSessionId);
		expect(newSession.sessionId).not.toBe(orvantaSessionId);
		expect(newSession.participants).toHaveLength(1);
		expect(newSession.participants[0]?.transcript?.sdkSessionId).toBe("sdk_coord_p9_2");
		expect(newSession.participants[0]?.transcript?.sdkSessionId).not.toBe(rootSdkSessionId);

		// 8) Ambiguous side effect → needs-attention plan (no blind replay)
		const ambiguous = planCeoSessionRuntimeRecovery({
			runs: [
				{
					runId: "run_shell",
					agentId: "builder",
					status: "running",
					hasDurableCheckpoint: false,
				},
			],
		});
		expect(ambiguous.autoResumeRunIds).toEqual([]);
		expect(ambiguous.needsAttention.length).toBeGreaterThan(0);
	});

	it("project B agent/profile edits and memory stay isolated from project A", async () => {
		const rootA = await fixtureProject("orvanta-p9-iso-a-");
		const rootB = await fixtureProject("orvanta-p9-iso-b-");
		await createCompany(rootA, { name: "AlphaNine", purpose: PURPOSE });
		await createCompany(rootB, { name: "BetaNine", purpose: PURPOSE });

		await upsertAgent(rootA, {
			id: "reviewer",
			displayName: "Alpha Reviewer",
			role: "teammate",
			instructions: "Alpha instructions",
		});
		await upsertAgent(rootB, {
			id: "reviewer",
			displayName: "Beta Reviewer",
			role: "teammate",
			instructions: "Beta instructions",
		});

		await upsertAgent(rootA, {
			id: "reviewer",
			displayName: "Alpha Reviewer Edited",
			role: "teammate",
			instructions: "Alpha instructions edited",
		});

		const profileA = await getAgentProfile(rootA, "reviewer");
		const profileB = await getAgentProfile(rootB, "reviewer");
		expect(profileA?.displayName).toBe("Alpha Reviewer Edited");
		expect(profileA?.instructions).toContain("edited");
		expect(profileB?.displayName).toBe("Beta Reviewer");
		expect(profileB?.instructions).toBe("Beta instructions");

		await saveAgentMemory(rootA, "reviewer", "alpha-mem");
		expect(await getAgentMemory(rootB, "reviewer")).toBe("");
	});
});
