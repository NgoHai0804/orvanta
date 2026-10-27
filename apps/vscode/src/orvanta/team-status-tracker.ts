import type { TeamEvent } from "@cline/core"
import { TeamMessageType } from "@cline/shared"

/**
 * Tracks the live execution status of agents in the team.
 *
 * Subscribes to TeamEvents (RunStarted, RunCompleted, RunFailed, RunCancelled, RunInterrupted)
 * and notifies listeners (such as subscribeCompany) so the UI reflects running agents in real time.
 */
export class TeamStatusTracker {
	private readonly runningAgentIds = new Set<string>()
	private readonly listeners = new Set<() => void>()

	isAgentRunning(agentId: string): boolean {
		return this.runningAgentIds.has(agentId)
	}

	getRunningAgentIds(): string[] {
		return Array.from(this.runningAgentIds)
	}

	setAgentRunning(agentId: string, isRunning: boolean): void {
		const changed = isRunning ? !this.runningAgentIds.has(agentId) : this.runningAgentIds.has(agentId)
		if (isRunning) {
			this.runningAgentIds.add(agentId)
		} else {
			this.runningAgentIds.delete(agentId)
		}
		if (changed) {
			this.notify()
		}
	}

	handleTeamEvent(event: TeamEvent): void {
		if (event.type === TeamMessageType.RunStarted) {
			this.setAgentRunning(event.run.agentId, true)
		} else if (
			event.type === TeamMessageType.RunCompleted ||
			event.type === TeamMessageType.RunFailed ||
			event.type === TeamMessageType.RunCancelled ||
			event.type === TeamMessageType.RunInterrupted
		) {
			this.setAgentRunning(event.run.agentId, false)
		}
	}

	subscribeRunningChange(listener: () => void): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	private notify(): void {
		for (const listener of this.listeners) {
			try {
				listener()
			} catch {
				// ignore
			}
		}
	}

	reset(): void {
		if (this.runningAgentIds.size > 0) {
			this.runningAgentIds.clear()
			this.notify()
		}
	}
}

export const globalTeamStatusTracker = new TeamStatusTracker()
