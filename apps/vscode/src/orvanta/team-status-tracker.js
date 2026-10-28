import { TeamMessageType } from "@cline/shared"
/**
 * Tracks the live execution status of agents in the team.
 *
 * Subscribes to TeamEvents (RunStarted, RunCompleted, RunFailed, RunCancelled, RunInterrupted)
 * and notifies listeners (such as subscribeCompany) so the UI reflects running agents in real time.
 */
export class TeamStatusTracker {
	runningAgentIds = new Set()
	listeners = new Set()
	isAgentRunning(agentId) {
		return this.runningAgentIds.has(agentId)
	}
	getRunningAgentIds() {
		return Array.from(this.runningAgentIds)
	}
	setAgentRunning(agentId, isRunning) {
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
	handleTeamEvent(event) {
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
	subscribeRunningChange(listener) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
	notify() {
		for (const listener of this.listeners) {
			try {
				listener()
			} catch {
				// ignore
			}
		}
	}
	reset() {
		if (this.runningAgentIds.size > 0) {
			this.runningAgentIds.clear()
			this.notify()
		}
	}
}
export const globalTeamStatusTracker = new TeamStatusTracker()
//# sourceMappingURL=team-status-tracker.js.map
