import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	acceptedMemoryRelativePath,
	legacyMemoryRelativePath,
	memoryProposalsDirRelativePath,
	WORKSPACE_DIRNAME,
} from "./paths";

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

export class AgentMemoryCorruptError extends Error {
	constructor(
		readonly agentId: string,
		readonly filePath: string,
		message: string,
	) {
		super(message);
		this.name = "AgentMemoryCorruptError";
	}
}

export class AgentMemoryNotFoundError extends Error {
	constructor(readonly agentId: string) {
		super(`Accepted memory for agent '${agentId}' does not exist`);
		this.name = "AgentMemoryNotFoundError";
	}
}

export interface MemoryProposal {
	id: string;
	agentId: string;
	createdAt: string;
	content: string;
}

function validateAgentId(agentId: string): string {
	if (!agentId || !SAFE_ID_REGEX.test(agentId)) {
		throw new Error(`Invalid agent ID '${agentId}'`);
	}
	return agentId;
}

export function getAcceptedMemoryPath(workspaceRoot: string, agentId: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, acceptedMemoryRelativePath(validateAgentId(agentId)));
}

export function getLegacyMemoryPath(workspaceRoot: string, agentId: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, legacyMemoryRelativePath(validateAgentId(agentId)));
}

export function getMemoryProposalsDir(workspaceRoot: string, agentId: string): string {
	return join(workspaceRoot, WORKSPACE_DIRNAME, memoryProposalsDirRelativePath(validateAgentId(agentId)));
}

async function atomicWriteText(filePath: string, content: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
	const tmpPath = `${filePath}.tmp`;
	await writeFile(tmpPath, content, "utf8");
	await rename(tmpPath, filePath);
}

async function migrateLegacyMemoryOnce(workspaceRoot: string, agentId: string): Promise<void> {
	const dest = getAcceptedMemoryPath(workspaceRoot, agentId);
	const legacy = getLegacyMemoryPath(workspaceRoot, agentId);
	if (!(await pathExists(legacy))) {
		return;
	}
	let destContent = "";
	if (await pathExists(dest)) {
		destContent = await readFile(dest, "utf8");
		if (destContent.trim().length > 0) {
			return;
		}
	}
	const content = await readFile(legacy, "utf8");
	if (content.trim().length === 0 && destContent.length === 0 && (await pathExists(dest))) {
		return;
	}
	await atomicWriteText(dest, content);
	await mkdir(getMemoryProposalsDir(workspaceRoot, agentId), { recursive: true });
}

export async function getAgentMemory(
	workspaceRoot: string,
	agentId: string,
): Promise<string> {
	validateAgentId(agentId);
	await migrateLegacyMemoryOnce(workspaceRoot, agentId);
	const memoryPath = getAcceptedMemoryPath(workspaceRoot, agentId);
	if (!(await pathExists(memoryPath))) {
		return "";
	}
	try {
		return await readFile(memoryPath, "utf8");
	} catch (error) {
		throw new AgentMemoryCorruptError(
			agentId,
			memoryPath,
			error instanceof Error ? error.message : "Failed to read accepted memory",
		);
	}
}

export async function saveAgentMemory(
	workspaceRoot: string,
	agentId: string,
	content: string,
): Promise<void> {
	validateAgentId(agentId);
	const memoryPath = getAcceptedMemoryPath(workspaceRoot, agentId);
	await atomicWriteText(memoryPath, content);
	await mkdir(getMemoryProposalsDir(workspaceRoot, agentId), { recursive: true });
}

export async function deleteAgentMemory(
	workspaceRoot: string,
	agentId: string,
): Promise<void> {
	validateAgentId(agentId);
	const memoryPath = getAcceptedMemoryPath(workspaceRoot, agentId);
	if (!(await pathExists(memoryPath))) {
		throw new AgentMemoryNotFoundError(agentId);
	}
	await rm(memoryPath, { force: true });
}

export async function writeMemoryProposal(
	workspaceRoot: string,
	agentId: string,
	content: string,
	proposalId: string,
): Promise<MemoryProposal> {
	validateAgentId(agentId);
	if (!SAFE_ID_REGEX.test(proposalId)) {
		throw new Error(`Invalid proposal ID '${proposalId}'`);
	}
	const dir = getMemoryProposalsDir(workspaceRoot, agentId);
	await mkdir(dir, { recursive: true });
	const createdAt = new Date().toISOString();
	const filePath = join(dir, `${proposalId}.md`);
	await atomicWriteText(filePath, content);
	return { id: proposalId, agentId, createdAt, content };
}

export async function listMemoryProposals(
	workspaceRoot: string,
	agentId: string,
): Promise<MemoryProposal[]> {
	validateAgentId(agentId);
	const dir = getMemoryProposalsDir(workspaceRoot, agentId);
	if (!(await pathExists(dir))) {
		return [];
	}
	const entries = await readdir(dir, { withFileTypes: true });
	const proposals: MemoryProposal[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		const id = entry.name.slice(0, -3);
		const filePath = join(dir, entry.name);
		try {
			const content = await readFile(filePath, "utf8");
			proposals.push({
				id,
				agentId,
				createdAt: "",
				content,
			});
		} catch (error) {
			throw new AgentMemoryCorruptError(
				agentId,
				filePath,
				error instanceof Error ? error.message : "Failed to read memory proposal",
			);
		}
	}
	return proposals.sort((a, b) => a.id.localeCompare(b.id));
}

export async function approveMemoryProposal(
	workspaceRoot: string,
	agentId: string,
	proposalId: string,
): Promise<void> {
	const proposals = await listMemoryProposals(workspaceRoot, agentId);
	const proposal = proposals.find((item) => item.id === proposalId);
	if (!proposal) {
		throw new Error(`Memory proposal '${proposalId}' was not found`);
	}
	await saveAgentMemory(workspaceRoot, agentId, proposal.content);
	await rejectMemoryProposal(workspaceRoot, agentId, proposalId);
}

export async function rejectMemoryProposal(
	workspaceRoot: string,
	agentId: string,
	proposalId: string,
): Promise<void> {
	validateAgentId(agentId);
	if (!SAFE_ID_REGEX.test(proposalId)) {
		throw new Error(`Invalid proposal ID '${proposalId}'`);
	}
	const filePath = join(getMemoryProposalsDir(workspaceRoot, agentId), `${proposalId}.md`);
	await rm(filePath, { force: true });
}

export async function renameAgentMemoryDir(
	workspaceRoot: string,
	fromAgentId: string,
	toAgentId: string,
): Promise<void> {
	const fromDir = dirname(getAcceptedMemoryPath(workspaceRoot, fromAgentId));
	const toDir = dirname(getAcceptedMemoryPath(workspaceRoot, toAgentId));
	if (fromDir === toDir || !(await pathExists(fromDir))) {
		return;
	}
	await mkdir(dirname(toDir), { recursive: true });
	if (await pathExists(toDir)) {
		await rm(toDir, { recursive: true, force: true });
	}
	await rename(fromDir, toDir);
}
