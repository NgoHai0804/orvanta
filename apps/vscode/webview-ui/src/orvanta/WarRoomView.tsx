import type { OrvantaAgentCard, OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { IconPlayerPause, IconPlayerPlay, IconX } from "@tabler/icons-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { WarRoomFilter } from "./useWarRoom"

function statusLabel(status: string): string {
	const map: Record<string, string> = {
		idle: "idle",
		queued: "queued",
		running: "running",
		completed: "done",
		failed: "failed",
		cancelled: "cancelled",
		interrupted: "interrupted",
		stopped: "stopped",
	}
	return map[status] ?? status
}

function statusDotClass(status: string): string {
	switch (status) {
		case "running":
			return "bg-violet-400 animate-pulse"
		case "failed":
			return "bg-amber-400"
		case "cancelled":
		case "interrupted":
			return "bg-rose-400"
		case "completed":
			return "bg-emerald-400"
		case "queued":
			return "bg-yellow-400"
		case "stopped":
			return "bg-zinc-500"
		default:
			return "bg-zinc-400"
	}
}

function cardBorderClass(status: string): string {
	switch (status) {
		case "running":
			return "border-violet-500"
		case "failed":
			return "border-amber-400"
		default:
			return "border-border-panel"
	}
}

function formatElapsed(seconds: number): string {
	if (seconds < 60) return `${seconds}s`
	return `${Math.floor(seconds / 60)}m${(seconds % 60).toString().padStart(2, "0")}s`
}

function linePrefixClass(kind: string): string {
	switch (kind) {
		case "error":
			return "text-rose-400"
		case "deny":
			return "text-amber-400"
		case "tool_start":
			return "text-violet-300"
		case "tool_result":
			return "text-emerald-300"
		case "think":
			return "text-slate-400 italic"
		case "text":
			return "text-slate-200"
		default:
			return "text-foreground/80"
	}
}
interface AgentCardProps {
	card: OrvantaAgentCard
	onExpand: (c: OrvantaAgentCard) => void
	onTalk: (c: OrvantaAgentCard) => void
}

function AgentCard({ card, onExpand, onTalk }: AgentCardProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const atBottomRef = useRef(true)
	useEffect(() => {
		const el = scrollRef.current
		if (!el || !atBottomRef.current) return
		el.scrollTop = el.scrollHeight
	})
	const handleScroll = () => {
		const el = scrollRef.current
		if (!el) return
		atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20
	}
	const isRunning = card.status === "running"
	return (
		<article
			aria-live={isRunning ? "polite" : undefined}
			className={`flex flex-col rounded border bg-(--vscode-sideBar-background) overflow-hidden ${cardBorderClass(card.status)}`}>
			<div className="flex items-start justify-between gap-1 px-2 py-1.5 border-b border-border-panel/60">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(card.status)}`} />
						<span className="truncate text-xs font-semibold">{card.displayName}</span>
						{card.isEphemeral && (
							<span className="shrink-0 rounded bg-zinc-600/50 px-1 py-0.5 text-[9px] uppercase tracking-wider text-zinc-300">
								tam
							</span>
						)}
					</div>
					<div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
						<span className="shrink-0">{statusLabel(card.status)}</span>
						{isRunning && card.elapsedSeconds > 0 && (
							<span className="shrink-0 text-violet-300">{formatElapsed(Number(card.elapsedSeconds))}</span>
						)}
						{card.taskTitle && (
							<span className="truncate opacity-70" title={card.taskTitle}>
								{card.taskTitle}
							</span>
						)}
					</div>
				</div>
			</div>
			<div
				className="flex-1 scroller-y px-2 py-1 font-mono text-[10px] leading-relaxed min-h-20 max-h-40"
				onScroll={handleScroll}
				ref={scrollRef}>
				{card.buffer.length === 0 ? (
					<span className="text-muted-foreground/50 italic">{isRunning ? "Dang chay..." : "—"}</span>
				) : (
					card.buffer.map((line, i) => {
						const isLast = i === card.buffer.length - 1
						const isActivelyStreaming = isRunning && isLast && (line.kind === "text" || line.kind === "think")
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: sequential log buffer
							<div className={`truncate ${linePrefixClass(line.kind)}`} key={i}>
								{line.text}
								{isActivelyStreaming && (
									<span className="inline-block w-1 h-2.5 ml-0.5 bg-violet-400 animate-pulse align-middle" />
								)}
							</div>
						)
					})
				)}
			</div>
			<div className="flex gap-1 border-t border-border-panel/40 px-2 py-1">
				<button
					className="rounded px-2 py-0.5 text-[10px] hover:bg-surface-secondary"
					onClick={() => onExpand(card)}
					type="button">
					Mo
				</button>
				<button
					className="rounded px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/10"
					onClick={() => onTalk(card)}
					type="button">
					Noi
				</button>
			</div>
		</article>
	)
}
interface ExpandPanelProps {
	card: OrvantaAgentCard
	onClose: () => void
	onTalk: (c: OrvantaAgentCard) => void
}

function ExpandPanel({ card, onClose, onTalk }: ExpandPanelProps) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [onClose])
	return (
		<div
			aria-label={`Chi tiet agent ${card.displayName}`}
			aria-modal="true"
			className="absolute inset-0 z-50 flex flex-col bg-(--vscode-sideBar-background) border-l border-border-panel"
			role="dialog">
			<div className="flex items-center justify-between border-b border-border-panel px-3 py-2">
				<div>
					<span className="font-semibold text-sm">{card.displayName}</span>
					<span className="ml-2 text-xs text-muted-foreground">
						{card.role} · {statusLabel(card.status)}
					</span>
					{card.taskTitle && <span className="ml-2 text-xs text-violet-300 truncate">{card.taskTitle}</span>}
				</div>
				<div className="flex items-center gap-2">
					<button
						className="rounded px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/10"
						onClick={() => onTalk(card)}
						type="button">
						Noi voi agent
					</button>
					<button
						aria-label="Dong expand"
						className="rounded px-2 py-0.5 text-[10px] hover:bg-surface-secondary cursor-pointer flex items-center justify-center"
						onClick={onClose}
						type="button">
						<IconX size={14} stroke={1.5} />
					</button>
				</div>
			</div>
			<div className="flex items-center gap-4 border-b border-border-panel/60 bg-surface-secondary/30 px-3 py-1.5 text-[11px]">
				<div>
					<span className="text-muted-foreground mr-1 text-[10px]">Thoi gian:</span>
					<span className="font-mono text-violet-300">
						{card.elapsedSeconds > 0 ? formatElapsed(Number(card.elapsedSeconds)) : "—"}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground mr-1 text-[10px]">Tokens:</span>
					<span className="font-mono">
						{card.inputTokens > 0 || card.outputTokens > 0
							? `${(card.inputTokens + card.outputTokens).toLocaleString()} (In: ${card.inputTokens.toLocaleString()} · Out: ${card.outputTokens.toLocaleString()})`
							: "—"}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground mr-1 text-[10px]">Chi phi:</span>
					<span className="font-mono">{card.cost > 0 ? `$${card.cost.toFixed(4)}` : "—"}</span>
				</div>
			</div>
			<div className="flex-1 scroller-y p-3 font-mono text-xs leading-relaxed">
				{card.buffer.length === 0 ? (
					<p className="text-muted-foreground italic">Chua co hoat dong nao trong run nay.</p>
				) : (
					card.buffer.map((line, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: sequential log buffer
						<div className={`${linePrefixClass(line.kind)} break-all whitespace-pre-wrap`} key={i}>
							{line.text}
						</div>
					))
				)}
			</div>
		</div>
	)
}
export interface WarRoomViewProps {
	snapshot: OrvantaWarRoomSnapshot | null
	paused: boolean
	filter: WarRoomFilter
	onPauseToggle: (paused: boolean) => void
	onFilterChange: (filter: WarRoomFilter) => void
	onTalkToAgent: (agentId: string) => void
}

const PAGE_SIZE = 12

export function WarRoomView({ snapshot, paused, filter, onPauseToggle, onFilterChange, onTalkToAgent }: WarRoomViewProps) {
	const [expandedCard, setExpandedCard] = useState<OrvantaAgentCard | null>(null)
	const [layoutCols, setLayoutCols] = useState<1 | 2 | 3>(1)
	const [searchQuery, setSearchQuery] = useState("")
	const [page, setPage] = useState(0)

	const handleTalk = useCallback(
		(card: OrvantaAgentCard) => {
			onTalkToAgent(card.id)
		},
		[onTalkToAgent],
	)

	if (!snapshot) {
		return (
			<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
				<span>Dang ket noi War room...</span>
			</div>
		)
	}
	const cards = snapshot.cards ?? []
	if (cards.length === 0) {
		const hasCompany = snapshot.companyName && snapshot.companyName.length > 0
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground">
				{hasCompany ? (
					<>
						<p>Coordinator dang idle.</p>
						<p className="opacity-60">Giao viec tren Chat.</p>
					</>
				) : (
					<p>Lap cong ty tren Home de mo War room.</p>
				)}
			</div>
		)
	}
	const searchLower = searchQuery.trim().toLowerCase()
	const filteredCards = cards.filter((c) => {
		if (filter === "running" && c.status !== "running") return false
		if (filter === "idle" && c.status !== "idle") return false
		if (filter === "failed" && c.status !== "failed") return false
		if (searchLower) {
			const matchName = c.displayName.toLowerCase().includes(searchLower)
			const matchId = c.id.toLowerCase().includes(searchLower)
			const matchRole = c.role.toLowerCase().includes(searchLower)
			if (!matchName && !matchId && !matchRole) return false
		}
		return true
	})

	const sortedCards = [...filteredCards].sort((a, b) => {
		if (a.status === "running" && b.status !== "running") return -1
		if (a.status !== "running" && b.status === "running") return 1
		return 0
	})

	const totalPages = Math.max(1, Math.ceil(sortedCards.length / PAGE_SIZE))
	const safePage = Math.min(page, totalPages - 1)
	const isVirtual = sortedCards.length > PAGE_SIZE
	const visibleCards = isVirtual ? sortedCards.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE) : sortedCards

	const regularCards = visibleCards.filter((c) => !c.isEphemeral)
	const ephemeralCards = visibleCards.filter((c) => c.isEphemeral)

	const gridClass =
		layoutCols === 1
			? "grid grid-cols-1 gap-2"
			: layoutCols === 2
				? "grid grid-cols-1 sm:grid-cols-2 gap-2"
				: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
	return (
		<div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
			<div className="shrink-0 border-b border-border-panel px-3 py-1.5">
				{snapshot.companyName && (
					<div className="mb-1 text-[10px] font-semibold text-muted-foreground truncate">
						{snapshot.companyName}
						{snapshot.purposeOneLiner && (
							<span className="ml-1 font-normal opacity-70">· {snapshot.purposeOneLiner}</span>
						)}
					</div>
				)}
				<div className="flex items-center gap-2 flex-wrap">
					<div aria-label="Loc agent" className="flex items-center gap-0.5" role="toolbar">
						{(["all", "running", "idle", "failed"] as WarRoomFilter[]).map((f) => (
							<button
								className={`rounded px-1.5 py-0.5 text-[10px] ${filter === f ? "bg-(--vscode-button-background) text-(--vscode-button-foreground)" : "opacity-70 hover:opacity-100"}`}
								key={f}
								onClick={() => {
									onFilterChange(f)
									setPage(0)
								}}
								type="button">
								{f === "all" ? "Tat ca" : f === "running" ? "Dang chay" : f === "idle" ? "Idle" : "Loi"}
							</button>
						))}
					</div>
					<input
						aria-label="Tim kiem agent"
						className="rounded border border-border-panel/70 bg-surface-secondary/40 px-1.5 py-0.5 text-[10px] placeholder:text-muted-foreground/60 focus:outline-none focus:border-violet-500 w-24 sm:w-32"
						onChange={(e) => {
							setSearchQuery(e.target.value)
							setPage(0)
						}}
						placeholder="Tim agent..."
						type="search"
						value={searchQuery}
					/>
					<fieldset aria-label="So cot layout" className="flex items-center gap-0.5 ml-auto border-0 p-0 m-0">
						{([1, 2, 3] as const).map((cols) => (
							<button
								aria-label={`${cols} cot`}
								className={`rounded px-1.5 py-0.5 text-[10px] ${layoutCols === cols ? "bg-(--vscode-button-background) text-(--vscode-button-foreground)" : "opacity-70 hover:opacity-100"}`}
								key={cols}
								onClick={() => setLayoutCols(cols)}
								type="button">
								{cols} cột
							</button>
						))}
					</fieldset>
					<button
						className={`rounded px-2 py-0.5 text-[10px] inline-flex items-center gap-1 cursor-pointer ${paused ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/50" : "bg-surface-secondary opacity-80 hover:opacity-100"}`}
						onClick={() => onPauseToggle(!paused)}
						title={paused ? "Runtime van chay. Click de tiep tuc stream." : "Dung cap nhat UI (runtime van chay)"}
						type="button">
						{paused ? (
							<>
								<IconPlayerPlay size={10} stroke={1.5} />
								<span>Resume</span>
							</>
						) : (
							<>
								<IconPlayerPause size={10} stroke={1.5} />
								<span>Pause</span>
							</>
						)}
					</button>
				</div>
				{paused && <p className="mt-1 text-[10px] text-indigo-300 italic">Paused · runtime van chay</p>}
				{isVirtual && (
					<div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border-panel/40 pt-1">
						<span>
							Trang {safePage + 1} / {totalPages} ({sortedCards.length} agents, ưu tiên đang chạy)
						</span>
						<div className="flex gap-1">
							<button
								className="rounded px-1.5 py-0.5 hover:bg-surface-secondary disabled:opacity-30"
								disabled={safePage === 0}
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								type="button">
								Trước
							</button>
							<button
								className="rounded px-1.5 py-0.5 hover:bg-surface-secondary disabled:opacity-30"
								disabled={safePage >= totalPages - 1}
								onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
								type="button">
								Sau
							</button>
						</div>
					</div>
				)}
			</div>
			<div className="flex-1 scroller-y p-2">
				{filteredCards.length === 0 ? (
					<div className="flex items-center justify-center py-8 text-xs text-muted-foreground italic">
						Khong ai khop filter. Xoa filter?
					</div>
				) : (
					<>
						<div className={gridClass}>
							{regularCards.map((card) => (
								<AgentCard card={card} key={card.id} onExpand={setExpandedCard} onTalk={handleTalk} />
							))}
						</div>
						{ephemeralCards.length > 0 && (
							<div className="mt-3">
								<div className="mb-1 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
									Guest tam thoi
								</div>
								<div className={gridClass}>
									{ephemeralCards.map((card) => (
										<AgentCard card={card} key={card.id} onExpand={setExpandedCard} onTalk={handleTalk} />
									))}
								</div>
							</div>
						)}
					</>
				)}
			</div>
			{expandedCard && <ExpandPanel card={expandedCard} onClose={() => setExpandedCard(null)} onTalk={handleTalk} />}
		</div>
	)
}

export default WarRoomView
