import { TeamMessageType } from "@cline/shared"

const BUFFER_MAX = 20
const COMPLETED_TTL_MS = 30_000
function pushLine(buf, line) {
	const next = [...buf, line]
	return next.length > BUFFER_MAX ? next.slice(next.length - BUFFER_MAX) : next
}
function trunc(text, max = 160) {
	return text.length <= max ? text : `${text.slice(0, max)}…`
}
function appendDelta(card, chunk, kind) {
	if (!chunk) return
	const prefix = kind === "think" ? "think: " : ""
	const lines = chunk.split("\n")
	for (let i = 0; i < lines.length; i++) {
		const part = lines[i]
		if (i === 0 && card.buffer.length > 0) {
			const last = card.buffer[card.buffer.length - 1]
			if (last.kind === kind && last.text.length < 80) {
				const available = 80 - last.text.length
				if (part.length <= available) {
					last.text += part
					continue
				}
				last.text += part.slice(0, available)
				const remainder = part.slice(available)
				if (remainder) {
					card.buffer = pushLine(card.buffer, { kind, text: `${prefix}${trunc(remainder, 80)}` })
				}
				continue
			}
		}
		if (part.trim().length > 0) {
			card.buffer = pushLine(card.buffer, { kind, text: `${prefix}${trunc(part, 80)}` })
		}
	}
}
export class WarRoomTracker {
	cards = new Map()
	listeners = new Set()
	tickTimer
	syncRoster(agents) {
		let changed = false
		const knownIds = new Set(agents.map((a) => a.id))
		for (const id of this.cards.keys()) {
			if (!knownIds.has(id)) {
				this.cards.delete(id)
				changed = true
			}
		}
		for (const agent of agents) {
			const ex = this.cards.get(agent.id)
			if (!ex) {
				this.cards.set(agent.id, {
					id: agent.id,
					displayName: agent.displayName,
					role: agent.role,
					status: agent.status ?? "idle",
					taskTitle: "",
					isEphemeral: false,
					startedAt: undefined,
					buffer: [],
					inputTokens: 0,
					outputTokens: 0,
					cost: 0,
				})
				changed = true
			} else if (ex.displayName !== agent.displayName || ex.role !== agent.role) {
				ex.displayName = agent.displayName
				ex.role = agent.role
				changed = true
			}
		}
		if (changed) this.notify()
	}
	handleTeamEvent(event) {
		// biome-ignore lint/suspicious/noExplicitAny: event union from core has loose payload fields
		const e = event
		switch (event.type) {
			case TeamMessageType.TeammateSpawned: {
				const aid = e.agentId ?? e.agent?.id
				if (aid && !this.cards.has(aid)) {
					this.cards.set(aid, {
						id: aid,
						displayName: e.agent?.displayName ?? aid,
						role: e.agent?.role ?? "teammate",
						status: "idle",
						taskTitle: "",
						isEphemeral: e.agent?.isEphemeral ?? false,
						startedAt: undefined,
						buffer: [],
						inputTokens: 0,
						outputTokens: 0,
						cost: 0,
					})
					this.notify()
				}
				break
			}
			case TeamMessageType.TeammateShutdown: {
				const aid = e.agentId ?? e.agent?.id
				const card = aid ? this.cards.get(aid) : undefined
				if (card && card.status !== "stopped") {
					card.status = "stopped"
					card.startedAt = undefined
					this.notify()
				}
				break
			}
			case TeamMessageType.RunQueued: {
				const card = this.getOrCreate(e.run?.agentId)
				if (!card) break
				card.status = "queued"
				card.taskTitle = e.run?.taskTitle ?? card.taskTitle
				this.notify()
				break
			}
			case TeamMessageType.RunStarted: {
				const card = this.getOrCreate(e.run?.agentId)
				if (!card) break
				card.status = "running"
				card.startedAt = Date.now()
				card.buffer = []
				card.inputTokens = 0
				card.outputTokens = 0
				card.cost = 0
				card.taskTitle = e.run?.taskTitle ?? card.taskTitle
				this.ensureTick()
				this.notify()
				break
			}
			case TeamMessageType.RunProgress: {
				const card = this.cards.get(e.run?.agentId)
				if (!card) break
				const msg = trunc(e.message ?? e.run?.currentActivity ?? "")
				if (msg) {
					card.buffer = pushLine(card.buffer, { kind: "progress", text: msg })
					this.notify()
				}
				break
			}
			case TeamMessageType.RunCompleted: {
				const card = this.cards.get(e.run?.agentId)
				if (!card) break
				card.status = "completed"
				card.startedAt = undefined
				this.notify()
				const id = card.id
				setTimeout(() => {
					const c = this.cards.get(id)
					if (c && c.status === "completed") {
						c.status = "idle"
						this.notify()
					}
				}, COMPLETED_TTL_MS)
				break
			}
			case TeamMessageType.RunFailed: {
				const card = this.cards.get(e.run?.agentId)
				if (!card) break
				card.status = "failed"
				card.startedAt = undefined
				card.buffer = pushLine(card.buffer, { kind: "error", text: trunc(e.run?.error ?? e.reason ?? "Loi khong ro") })
				this.notify()
				break
			}
			case TeamMessageType.RunCancelled: {
				const card = this.cards.get(e.run?.agentId)
				if (!card) break
				card.status = "cancelled"
				card.startedAt = undefined
				this.notify()
				break
			}
			case TeamMessageType.RunInterrupted: {
				const card = this.cards.get(e.run?.agentId)
				if (!card) break
				card.status = "interrupted"
				card.startedAt = undefined
				this.notify()
				break
			}
			case TeamMessageType.TeamTaskUpdated: {
				const agentId = e.task?.assigneeId ?? e.run?.agentId
				const taskTitle = trunc(e.task?.title ?? e.task?.name ?? "")
				if (!agentId || !taskTitle) break
				const card = this.cards.get(agentId)
				if (card) {
					card.taskTitle = taskTitle
					this.notify()
				}
				break
			}
			case TeamMessageType.AgentEvent: {
				const aid = e.agentId ?? e.run?.agentId
				const card = aid ? this.cards.get(aid) : undefined
				if (!card || !e.event) break
				const ae = e.event
				const et = ae.type ?? ae.kind ?? ""
				if (et === "content_start") {
					if (ae.contentType === "text" && ae.text) {
						appendDelta(card, ae.text, "text")
						this.notify()
					} else if (ae.contentType === "reasoning" && ae.reasoning) {
						appendDelta(card, ae.reasoning, "think")
						this.notify()
					} else if (ae.contentType === "tool") {
						card.buffer = pushLine(card.buffer, { kind: "tool_start", text: `▸ ${ae.toolName ?? "tool"}` })
						this.notify()
					}
				} else if (et === "content_update") {
					if (ae.update) {
						const up = typeof ae.update === "string" ? ae.update : JSON.stringify(ae.update)
						card.buffer = pushLine(card.buffer, { kind: "progress", text: trunc(up, 160) })
						this.notify()
					}
				} else if (et === "content_end") {
					if (ae.contentType === "tool") {
						const isErr = Boolean(ae.error)
						const out = ae.error ?? ae.output ?? ""
						card.buffer = pushLine(card.buffer, {
							kind: "tool_result",
							text: `◂ ${isErr ? "err" : "ok"} ${trunc(typeof out === "string" ? out : JSON.stringify(out), 160)}`,
						})
						this.notify()
					}
				} else if (et === "usage") {
					if (typeof ae.totalInputTokens === "number" || typeof ae.inputTokens === "number") {
						card.inputTokens = ae.totalInputTokens ?? ae.inputTokens ?? card.inputTokens
					}
					if (typeof ae.totalOutputTokens === "number" || typeof ae.outputTokens === "number") {
						card.outputTokens = ae.totalOutputTokens ?? ae.outputTokens ?? card.outputTokens
					}
					if (typeof ae.totalCost === "number" || typeof ae.cost === "number") {
						card.cost = ae.totalCost ?? ae.cost ?? card.cost
					}
					this.notify()
				} else if (et === "tool_start" || et === "tool_use") {
					card.buffer = pushLine(card.buffer, { kind: "tool_start", text: `▸ ${ae.toolName ?? ae.name ?? "tool"}` })
					this.notify()
				} else if (et === "tool_result") {
					card.buffer = pushLine(card.buffer, {
						kind: "tool_result",
						text: `◂ ${ae.isError ? "err" : "ok"} ${trunc(String(ae.result ?? ae.output ?? ""), 160)}`,
					})
					this.notify()
				} else if (et === "deny" || et === "purpose_lock_deny") {
					card.buffer = pushLine(card.buffer, { kind: "deny", text: `✕ lock ${ae.toolName ?? ae.tool ?? "tool"}` })
					this.notify()
				}
				break
			}
		}
	}
	getSnapshot() {
		const now = Date.now()
		return Array.from(this.cards.values()).map((card) => ({
			id: card.id,
			displayName: card.displayName,
			role: card.role,
			status: card.status,
			taskTitle: card.taskTitle,
			elapsedSeconds: card.status === "running" && card.startedAt ? Math.floor((now - card.startedAt) / 1000) : 0,
			buffer: card.buffer.map((line) => ({ kind: line.kind, text: line.text })),
			isEphemeral: card.isEphemeral,
			inputTokens: card.inputTokens,
			outputTokens: card.outputTokens,
			cost: card.cost,
		}))
	}
	subscribeChange(listener) {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}
	reset() {
		this.cards.clear()
		this.stopTick()
		this.notify()
	}
	getOrCreate(agentId) {
		if (!agentId) return undefined
		if (!this.cards.has(agentId)) {
			this.cards.set(agentId, {
				id: agentId,
				displayName: agentId,
				role: "teammate",
				status: "idle",
				taskTitle: "",
				isEphemeral: false,
				startedAt: undefined,
				buffer: [],
				inputTokens: 0,
				outputTokens: 0,
				cost: 0,
			})
		}
		const card = this.cards.get(agentId)
		return card
	}
	notify() {
		for (const listener of this.listeners) {
			try {
				listener()
			} catch {
				/* ignore */
			}
		}
	}
	ensureTick() {
		if (this.tickTimer !== undefined) return
		this.tickTimer = setInterval(() => {
			const hasRunning = Array.from(this.cards.values()).some((c) => c.status === "running")
			if (!hasRunning) {
				this.stopTick()
				return
			}
			this.notify()
		}, 1000)
	}
	stopTick() {
		if (this.tickTimer !== undefined) {
			clearInterval(this.tickTimer)
			this.tickTimer = undefined
		}
	}
}
export const globalWarRoomTracker = new WarRoomTracker()
//# sourceMappingURL=war-room-tracker.js.map
