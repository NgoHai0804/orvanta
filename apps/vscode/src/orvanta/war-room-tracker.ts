import type { TeamEvent } from "@cline/core"
import { TeamMessageType } from "@cline/shared"
import type { OrvantaAgentCard, OrvantaCardBufferLine, OrvantaRosterAgent } from "@shared/proto/cline/orvanta"

const BUFFER_MAX = 20
const COMPLETED_TTL_MS = 30_000
const LINE_MAX_LENGTH = 500

export type CardStatus = "idle" | "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted" | "stopped"

interface CardState {
	id: string
	displayName: string
	role: string
	status: CardStatus
	taskTitle: string
	isEphemeral: boolean
	startedAt: number | undefined
	buffer: OrvantaCardBufferLine[]
	inputTokens: number
	outputTokens: number
	cost: number
}

function pushLine(buf: OrvantaCardBufferLine[], line: OrvantaCardBufferLine): OrvantaCardBufferLine[] {
	const next = [...buf, line]
	return next.length > BUFFER_MAX ? next.slice(next.length - BUFFER_MAX) : next
}

function trunc(text: string, max = LINE_MAX_LENGTH): string {
	return text.length <= max ? text : `${text.slice(0, max)}…`
}

function appendDelta(card: CardState, chunk: string, kind: "text" | "think"): void {
	if (!chunk) return
	const prefix = kind === "think" ? "think: " : ""
	const lines = chunk.split("\n")
	for (let i = 0; i < lines.length; i++) {
		const part = lines[i]
		if (i === 0 && card.buffer.length > 0) {
			const last = card.buffer[card.buffer.length - 1]
			if (last.kind === kind && last.text.length < LINE_MAX_LENGTH) {
				const available = LINE_MAX_LENGTH - last.text.length
				if (part.length <= available) {
					last.text += part
					continue
				}
				last.text += part.slice(0, available)
				const remainder = part.slice(available)
				if (remainder.trim().length > 0) {
					card.buffer = pushLine(card.buffer, { kind, text: `${prefix}${trunc(remainder, LINE_MAX_LENGTH)}` })
				}
				continue
			}
		}
		if (part.trim().length > 0) {
			card.buffer = pushLine(card.buffer, { kind, text: `${prefix}${trunc(part, LINE_MAX_LENGTH)}` })
		}
	}
}
export class WarRoomTracker {
	private readonly cards = new Map<string, CardState>()
	private readonly transcripts = new Map<string, OrvantaCardBufferLine[]>()
	private readonly transcriptLineCompleted = new Map<string, boolean>()
	private readonly listeners = new Set<() => void>()
	private tickTimer: ReturnType<typeof setInterval> | undefined

	syncRoster(agents: OrvantaRosterAgent[]): void {
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
					status: (agent.status as CardStatus) ?? "idle",
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
	handleTeamEvent(event: TeamEvent): void {
		// biome-ignore lint/suspicious/noExplicitAny: event union from core has loose payload fields
		const e = event as any
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
					const line: OrvantaCardBufferLine = { kind: "progress", text: msg }
					card.buffer = pushLine(card.buffer, line)
					this.pushToTranscript(card.id, line)
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
				const line: OrvantaCardBufferLine = { kind: "error", text: trunc(e.run?.error ?? e.reason ?? "Loi khong ro") }
				card.buffer = pushLine(card.buffer, line)
				this.pushToTranscript(card.id, line)
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
						this.appendTranscriptDelta(aid, ae.text, "text")
						this.notify()
					} else if (ae.contentType === "reasoning" && ae.reasoning) {
						appendDelta(card, ae.reasoning, "think")
						this.appendTranscriptDelta(aid, ae.reasoning, "think")
						this.notify()
					} else if (ae.contentType === "tool") {
						const line: OrvantaCardBufferLine = { kind: "tool_start", text: `▸ ${ae.toolName ?? "tool"}` }
						card.buffer = pushLine(card.buffer, line)
						this.pushToTranscript(aid, line)
						this.notify()
					}
				} else if (et === "content_update") {
					if (ae.update) {
						const up = typeof ae.update === "string" ? ae.update : JSON.stringify(ae.update)
						const line: OrvantaCardBufferLine = { kind: "progress", text: trunc(up, 160) }
						card.buffer = pushLine(card.buffer, line)
						this.pushToTranscript(aid, line)
						this.notify()
					}
				} else if (et === "content_end") {
					if (ae.contentType === "tool") {
						const isErr = Boolean(ae.error)
						const out = ae.error ?? ae.output ?? ""
						const line: OrvantaCardBufferLine = {
							kind: "tool_result",
							text: `◂ ${isErr ? "err" : "ok"} ${trunc(typeof out === "string" ? out : JSON.stringify(out), 160)}`,
						}
						card.buffer = pushLine(card.buffer, line)
						this.pushToTranscript(aid, line)
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
					const line: OrvantaCardBufferLine = { kind: "tool_start", text: `▸ ${ae.toolName ?? ae.name ?? "tool"}` }
					card.buffer = pushLine(card.buffer, line)
					this.pushToTranscript(aid, line)
					this.notify()
				} else if (et === "tool_result") {
					const line: OrvantaCardBufferLine = {
						kind: "tool_result",
						text: `◂ ${ae.isError ? "err" : "ok"} ${trunc(String(ae.result ?? ae.output ?? ""), 160)}`,
					}
					card.buffer = pushLine(card.buffer, line)
					this.pushToTranscript(aid, line)
					this.notify()
				} else if (et === "deny" || et === "purpose_lock_deny") {
					const line: OrvantaCardBufferLine = { kind: "deny", text: `✕ lock ${ae.toolName ?? ae.tool ?? "tool"}` }
					card.buffer = pushLine(card.buffer, line)
					this.pushToTranscript(aid, line)
					this.notify()
				}
				break
			}
		}
	}
	getSnapshot(): OrvantaAgentCard[] {
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

	getCard(agentId: string): OrvantaAgentCard | undefined {
		const card = this.cards.get(agentId)
		if (!card) return undefined
		const now = Date.now()
		return {
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
		}
	}

	getAgentTranscript(agentId: string): OrvantaCardBufferLine[] {
		const transcript = this.transcripts.get(agentId)
		if (transcript && transcript.length > 0) {
			return transcript.map((l) => ({ kind: l.kind, text: l.text }))
		}
		const card = this.cards.get(agentId)
		return card ? card.buffer.map((l) => ({ kind: l.kind, text: l.text })) : []
	}

	recordDirectMessage(agentId: string, message: string, subject?: string): void {
		const card = this.cards.get(agentId)
		const label = subject
			? `[CEO ➜ @${card?.displayName ?? agentId}] (${subject}): ${message}`
			: `[CEO ➜ @${card?.displayName ?? agentId}]: ${message}`
		const line: OrvantaCardBufferLine = {
			kind: "text",
			text: trunc(label, 160),
		}
		if (card) {
			card.buffer = pushLine(card.buffer, line)
		}
		this.pushToTranscript(agentId, line)
		this.notify()
	}

	private pushToTranscript(agentId: string, line: OrvantaCardBufferLine): void {
		const list = this.transcripts.get(agentId) ?? []
		const updated = pushLine(list, line)
		this.transcripts.set(agentId, updated.length > 500 ? updated.slice(updated.length - 500) : updated)
		this.transcriptLineCompleted.set(agentId, true)
	}

	private appendTranscriptDelta(agentId: string, chunk: string, kind: "text" | "think"): void {
		const list = this.transcripts.get(agentId) ?? []
		const prefix = kind === "think" ? "think: " : ""
		const lines = chunk.split("\n")
		const isPrevLineCompleted = Boolean(this.transcriptLineCompleted.get(agentId))
		let updated = [...list]
		for (let i = 0; i < lines.length; i++) {
			const part = lines[i]
			if (i === 0 && updated.length > 0 && !isPrevLineCompleted) {
				const last = updated[updated.length - 1]
				if (last.kind === kind && last.text.length < LINE_MAX_LENGTH) {
					const available = LINE_MAX_LENGTH - last.text.length
					if (part.length <= available) {
						last.text += part
						continue
					}
					last.text += part.slice(0, available)
					const remainder = part.slice(available)
					if (remainder.trim().length > 0) {
						updated = pushLine(updated, { kind, text: `${prefix}${trunc(remainder, LINE_MAX_LENGTH)}` })
					}
					continue
				}
			}
			if (part.trim().length > 0) {
				updated = pushLine(updated, { kind, text: `${prefix}${trunc(part, LINE_MAX_LENGTH)}` })
			}
		}
		this.transcripts.set(agentId, updated.length > 500 ? updated.slice(updated.length - 500) : updated)
		this.transcriptLineCompleted.set(agentId, chunk.endsWith("\n"))
	}

	subscribeChange(listener: () => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	reset(): void {
		this.cards.clear()
		this.transcripts.clear()
		this.transcriptLineCompleted.clear()
		this.stopTick()
		this.notify()
	}

	private getOrCreate(agentId: string | undefined): CardState | undefined {
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

	private notify(): void {
		for (const listener of this.listeners) {
			try {
				listener()
			} catch {
				/* ignore */
			}
		}
	}

	private ensureTick(): void {
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

	private stopTick(): void {
		if (this.tickTimer !== undefined) {
			clearInterval(this.tickTimer)
			this.tickTimer = undefined
		}
	}
}

export const globalWarRoomTracker = new WarRoomTracker()
