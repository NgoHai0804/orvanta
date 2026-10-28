import type { OrvantaAgentProfile, OrvantaRosterAgent } from "@shared/proto/cline/orvanta"

export interface AgentTreeNode {
	id: string
	displayName: string
	role: "lead" | "teammate" | string
	status: "idle" | "running" | "stopped" | "pending_hire" | "pending_fire" | string
	reportsTo: string | null
	profile?: OrvantaAgentProfile
	children: AgentTreeNode[]
	depth: number
}

function getNodeStatusRank(status: string): number {
	const s = status.toLowerCase()
	if (s === "running") return 1
	if (s === "idle") return 2
	if (s.startsWith("pending")) return 3
	if (s === "stopped") return 4
	return 5
}

function sortTreeChildren(nodes: AgentTreeNode[]): void {
	nodes.sort((a, b) => {
		const rankA = getNodeStatusRank(a.status)
		const rankB = getNodeStatusRank(b.status)
		if (rankA !== rankB) return rankA - rankB
		return (a.displayName || a.id).localeCompare(b.displayName || b.id)
	})
	for (const child of nodes) {
		sortTreeChildren(child.children)
	}
}

function assignTreeDepth(node: AgentTreeNode, currentDepth: number): void {
	node.depth = currentDepth
	for (const child of node.children) {
		assignTreeDepth(child, currentDepth + 1)
	}
}

/**
 * Checks whether setting proposedParentId as the parent of agentId will cause a cycle.
 */
export function willCauseCycle(
	agentId: string,
	proposedParentId: string | null | undefined,
	allProfiles?: Record<string, { reportsTo?: string | null } | undefined>,
): boolean {
	if (!proposedParentId) return false
	if (proposedParentId === agentId) return true
	if (!allProfiles) return false

	let current: string | null | undefined = proposedParentId
	const visited = new Set<string>()

	while (current) {
		if (current === agentId) {
			return true
		}
		if (visited.has(current)) {
			return true
		}
		visited.add(current)
		current = allProfiles[current]?.reportsTo
	}

	return false
}

/**
 * Builds a hierarchical tree of agents starting from the root (coordinator/lead).
 * Any agent whose reportsTo is invalid, missing, or causes a cycle will fallback to root.
 */
export function buildAgentTree(
	agents: OrvantaRosterAgent[],
	profiles?: Record<string, OrvantaAgentProfile>,
): AgentTreeNode | null {
	if (!agents || agents.length === 0) {
		return null
	}

	// Identify Root Node: coordinator or lead, fallback to first agent
	const rootAgent = agents.find((a) => a.role === "lead" || a.id === "coordinator") || agents[0]

	const nodeMap = new Map<string, AgentTreeNode>()
	for (const agent of agents) {
		const profile = profiles?.[agent.id]
		nodeMap.set(agent.id, {
			id: agent.id,
			displayName: profile?.displayName || agent.displayName || agent.id,
			role: profile?.role || agent.role || "teammate",
			status: agent.status || "idle",
			reportsTo: null,
			profile,
			children: [],
			depth: 0,
		})
	}

	// Prepare profilesMap for cycle detection
	const profilesMap: Record<string, { reportsTo?: string | null }> = {}
	for (const agent of agents) {
		const prof = profiles?.[agent.id]
		const rTo = prof?.reportsTo !== undefined ? prof.reportsTo : (agent.reportsTo ?? null)
		profilesMap[agent.id] = { reportsTo: rTo ?? null }
	}

	const rootNode = nodeMap.get(rootAgent.id)!
	rootNode.reportsTo = null

	// Link children to parents
	for (const agent of agents) {
		if (agent.id === rootAgent.id) continue

		const node = nodeMap.get(agent.id)!
		const declaredParentId =
			profiles?.[agent.id]?.reportsTo !== undefined ? profiles[agent.id]?.reportsTo : (agent.reportsTo ?? null)

		let effectiveParentId = rootAgent.id
		if (
			declaredParentId &&
			declaredParentId !== agent.id &&
			nodeMap.has(declaredParentId) &&
			!willCauseCycle(agent.id, declaredParentId, profilesMap)
		) {
			effectiveParentId = declaredParentId
		}

		node.reportsTo = effectiveParentId
		const parentNode = nodeMap.get(effectiveParentId)!
		parentNode.children.push(node)
	}

	// Assign depths and sort children
	assignTreeDepth(rootNode, 0)
	sortTreeChildren(rootNode.children)

	return rootNode
}

/**
 * Returns the list of agents that can validly be assigned as the manager (reportsTo) of agentId.
 * Excludes agentId itself, coordinator (cannot report to anyone), and any descendants of agentId.
 */
export function getAllowedManagers(
	agentId: string,
	agents: OrvantaRosterAgent[],
	profiles?: Record<string, { reportsTo?: string | null } | undefined>,
): OrvantaRosterAgent[] {
	if (!agentId || agentId === "coordinator") {
		return []
	}

	// Build unified map of reportsTo relationships
	const profilesMap: Record<string, { reportsTo?: string | null }> = {}
	for (const a of agents) {
		const p = profiles?.[a.id]
		const rTo = p?.reportsTo !== undefined ? p.reportsTo : (a.reportsTo ?? null)
		profilesMap[a.id] = { reportsTo: rTo ?? null }
	}

	return agents.filter((candidate) => {
		if (candidate.id === agentId) return false
		return !willCauseCycle(agentId, candidate.id, profilesMap)
	})
}

/**
 * Helper to find a specific node in an AgentTreeNode hierarchy.
 */
export function findTreeNode(root: AgentTreeNode | null, id: string): AgentTreeNode | null {
	if (!root) return null
	if (root.id === id) return root
	for (const child of root.children) {
		const found = findTreeNode(child, id)
		if (found) return found
	}
	return null
}

/**
 * Helper to flatten an AgentTreeNode hierarchy into a flat list in DFS pre-order.
 */
export function flattenTree(root: AgentTreeNode | null): AgentTreeNode[] {
	if (!root) return []
	const result: AgentTreeNode[] = [root]
	for (const child of root.children) {
		result.push(...flattenTree(child))
	}
	return result
}
