import type { OrvantaAgentProfile, OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { describe, expect, it } from "vitest"
import { buildAgentTree, findTreeNode, flattenTree, getAllowedManagers, willCauseCycle } from "./tree-utils"

describe("tree-utils", () => {
	describe("buildAgentTree", () => {
		it("returns null when agents list is empty", () => {
			expect(buildAgentTree([])).toBeNull()
		})

		it("builds a single root node for coordinator", () => {
			const agents: OrvantaRosterAgent[] = [
				{
					id: "coordinator",
					displayName: "Company Coordinator",
					role: "lead",
					status: "idle",
					reportsTo: undefined,
				},
			]
			const tree = buildAgentTree(agents)
			expect(tree).not.toBeNull()
			expect(tree?.id).toBe("coordinator")
			expect(tree?.displayName).toBe("Company Coordinator")
			expect(tree?.role).toBe("lead")
			expect(tree?.status).toBe("idle")
			expect(tree?.reportsTo).toBeNull()
			expect(tree?.depth).toBe(0)
			expect(tree?.children).toEqual([])
		})

		it("identifies coordinator as root even if not the first element", () => {
			const agents: OrvantaRosterAgent[] = [
				{
					id: "dev-1",
					displayName: "Developer",
					role: "teammate",
					status: "idle",
					reportsTo: "coordinator",
				},
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "running",
					reportsTo: undefined,
				},
			]
			const tree = buildAgentTree(agents)
			expect(tree?.id).toBe("coordinator")
			expect(tree?.children).toHaveLength(1)
			expect(tree?.children[0].id).toBe("dev-1")
			expect(tree?.children[0].depth).toBe(1)
			expect(tree?.children[0].reportsTo).toBe("coordinator")
		})

		it("falls back to root if reportsTo points to an invalid/non-existent agent", () => {
			const agents: OrvantaRosterAgent[] = [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
				},
				{
					id: "dev-orphan",
					displayName: "Orphan Dev",
					role: "teammate",
					status: "idle",
					reportsTo: "non-existent-manager",
				},
			]
			const tree = buildAgentTree(agents)
			expect(tree?.children).toHaveLength(1)
			expect(tree?.children[0].id).toBe("dev-orphan")
			expect(tree?.children[0].reportsTo).toBe("coordinator")
		})

		it("falls back to root if reportsTo is self (self-reporting)", () => {
			const agents: OrvantaRosterAgent[] = [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
				},
				{
					id: "dev-loop",
					displayName: "Loop Dev",
					role: "teammate",
					status: "idle",
					reportsTo: "dev-loop",
				},
			]
			const tree = buildAgentTree(agents)
			expect(tree?.children).toHaveLength(1)
			expect(tree?.children[0].id).toBe("dev-loop")
			expect(tree?.children[0].reportsTo).toBe("coordinator")
		})

		it("builds a multi-level hierarchy with accurate depths", () => {
			const agents: OrvantaRosterAgent[] = [
				{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
				{ id: "lead-dev", displayName: "Tech Lead", role: "lead", status: "idle", reportsTo: "coordinator" },
				{ id: "dev-1", displayName: "Dev 1", role: "teammate", status: "idle", reportsTo: "lead-dev" },
				{ id: "dev-2", displayName: "Dev 2", role: "teammate", status: "idle", reportsTo: "lead-dev" },
				{ id: "qa", displayName: "QA Engineer", role: "teammate", status: "idle", reportsTo: "coordinator" },
			]
			const tree = buildAgentTree(agents)
			expect(tree?.depth).toBe(0)
			expect(tree?.children).toHaveLength(2)

			const leadNode = tree?.children.find((c) => c.id === "lead-dev")
			const qaNode = tree?.children.find((c) => c.id === "qa")

			expect(leadNode?.depth).toBe(1)
			expect(qaNode?.depth).toBe(1)
			expect(leadNode?.children).toHaveLength(2)

			const dev1Node = leadNode?.children.find((c) => c.id === "dev-1")
			const dev2Node = leadNode?.children.find((c) => c.id === "dev-2")
			expect(dev1Node?.depth).toBe(2)
			expect(dev2Node?.depth).toBe(2)
		})

		it("sorts children by status rank: running > idle > pending > stopped, then displayName", () => {
			const agents: OrvantaRosterAgent[] = [
				{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
				{ id: "a-stopped", displayName: "Agent Alpha", role: "teammate", status: "stopped", reportsTo: "coordinator" },
				{ id: "b-running", displayName: "Agent Beta", role: "teammate", status: "running", reportsTo: "coordinator" },
				{
					id: "c-pending",
					displayName: "Agent Charlie",
					role: "teammate",
					status: "pending_hire",
					reportsTo: "coordinator",
				},
				{ id: "d-idle-2", displayName: "Agent Delta", role: "teammate", status: "idle", reportsTo: "coordinator" },
				{ id: "e-idle-1", displayName: "Agent Echo", role: "teammate", status: "idle", reportsTo: "coordinator" },
			]
			const tree = buildAgentTree(agents)
			const childIds = tree?.children.map((c) => c.id)
			expect(childIds).toEqual(["b-running", "d-idle-2", "e-idle-1", "c-pending", "a-stopped"])
		})

		it("breaks circular reference in roster data by falling back to root", () => {
			const agents: OrvantaRosterAgent[] = [
				{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
				{ id: "agent-a", displayName: "Agent A", role: "teammate", status: "idle", reportsTo: "agent-b" },
				{ id: "agent-b", displayName: "Agent B", role: "teammate", status: "idle", reportsTo: "agent-a" },
			]
			const tree = buildAgentTree(agents)
			expect(tree).not.toBeNull()
			const flat = flattenTree(tree)
			expect(flat).toHaveLength(3)
		})

		it("incorporates profile metadata into node", () => {
			const agents: OrvantaRosterAgent[] = [
				{ id: "coordinator", displayName: "Coord", role: "lead", status: "idle" },
				{ id: "dev", displayName: "Dev Old", role: "teammate", status: "idle" },
			]
			const profiles: Record<string, OrvantaAgentProfile> = {
				dev: {
					id: "dev",
					displayName: "Dev New Name",
					role: "teammate",
					description: "Lead developer",
					reportsTo: "coordinator",
				} as OrvantaAgentProfile,
			}
			const tree = buildAgentTree(agents, profiles)
			const devNode = tree?.children[0]
			expect(devNode?.displayName).toBe("Dev New Name")
			expect(devNode?.profile?.description).toBe("Lead developer")
		})
	})

	describe("willCauseCycle", () => {
		it("returns false for empty or null proposed parent", () => {
			expect(willCauseCycle("agent-a", null, {})).toBe(false)
			expect(willCauseCycle("agent-a", undefined, {})).toBe(false)
			expect(willCauseCycle("agent-a", "", {})).toBe(false)
		})

		it("returns true when agent proposes itself as parent", () => {
			expect(willCauseCycle("agent-a", "agent-a", {})).toBe(true)
		})

		it("detects direct 2-node cycle (A -> B, proposing B -> A)", () => {
			const profiles = {
				"agent-a": { reportsTo: "agent-b" },
				"agent-b": { reportsTo: null },
			}
			expect(willCauseCycle("agent-b", "agent-a", profiles)).toBe(true)
			expect(willCauseCycle("agent-b", "coordinator", profiles)).toBe(false)
		})

		it("detects multi-hop 3+ node cycle (A -> B -> C, proposing C -> A)", () => {
			const profiles = {
				"agent-a": { reportsTo: "agent-b" },
				"agent-b": { reportsTo: "agent-c" },
				"agent-c": { reportsTo: null },
			}
			expect(willCauseCycle("agent-c", "agent-a", profiles)).toBe(true)
			expect(willCauseCycle("agent-c", "agent-b", profiles)).toBe(true)
			expect(willCauseCycle("agent-c", "coordinator", profiles)).toBe(false)
		})

		it("detects existing loop in chain and returns true to prevent infinite recursion", () => {
			const profiles = {
				x: { reportsTo: "y" },
				y: { reportsTo: "x" },
			}
			expect(willCauseCycle("z", "x", profiles)).toBe(true)
		})

		it("returns false when proposed parent chain reaches root/null safely", () => {
			const profiles = {
				coordinator: { reportsTo: null },
				lead: { reportsTo: "coordinator" },
				dev: { reportsTo: "lead" },
			}
			expect(willCauseCycle("new-agent", "dev", profiles)).toBe(false)
			expect(willCauseCycle("new-agent", "lead", profiles)).toBe(false)
			expect(willCauseCycle("new-agent", "coordinator", profiles)).toBe(false)
		})
	})

	describe("getAllowedManagers", () => {
		const agents: OrvantaRosterAgent[] = [
			{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
			{ id: "lead-dev", displayName: "Tech Lead", role: "lead", status: "idle", reportsTo: "coordinator" },
			{ id: "dev-1", displayName: "Dev 1", role: "teammate", status: "idle", reportsTo: "lead-dev" },
			{ id: "dev-2", displayName: "Dev 2", role: "teammate", status: "idle", reportsTo: "lead-dev" },
			{ id: "qa", displayName: "QA", role: "teammate", status: "idle", reportsTo: "coordinator" },
		]

		it("returns empty array for coordinator", () => {
			expect(getAllowedManagers("coordinator", agents)).toEqual([])
		})

		it("excludes self and all descendants from allowed managers", () => {
			const allowed = getAllowedManagers("lead-dev", agents)
			const allowedIds = allowed.map((a) => a.id)
			expect(allowedIds).toContain("coordinator")
			expect(allowedIds).toContain("qa")
			expect(allowedIds).not.toContain("lead-dev")
			expect(allowedIds).not.toContain("dev-1")
			expect(allowedIds).not.toContain("dev-2")
		})

		it("allows leaf node to report to any non-self agent", () => {
			const allowed = getAllowedManagers("dev-1", agents)
			const allowedIds = allowed.map((a) => a.id)
			expect(allowedIds).toContain("coordinator")
			expect(allowedIds).toContain("lead-dev")
			expect(allowedIds).toContain("dev-2")
			expect(allowedIds).toContain("qa")
			expect(allowedIds).not.toContain("dev-1")
		})
	})

	describe("tree helpers", () => {
		const agents: OrvantaRosterAgent[] = [
			{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
			{ id: "lead", displayName: "Lead", role: "lead", status: "idle", reportsTo: "coordinator" },
			{ id: "dev", displayName: "Dev", role: "teammate", status: "idle", reportsTo: "lead" },
		]
		const tree = buildAgentTree(agents)

		it("findTreeNode finds existing node", () => {
			const found = findTreeNode(tree, "dev")
			expect(found).not.toBeNull()
			expect(found?.id).toBe("dev")
			expect(found?.depth).toBe(2)
		})

		it("findTreeNode returns null for non-existent id", () => {
			expect(findTreeNode(tree, "ghost")).toBeNull()
			expect(findTreeNode(null, "dev")).toBeNull()
		})

		it("flattenTree flattens tree in pre-order traversal", () => {
			const flat = flattenTree(tree)
			expect(flat.map((n) => n.id)).toEqual(["coordinator", "lead", "dev"])
			expect(flattenTree(null)).toEqual([])
		})
	})
})
