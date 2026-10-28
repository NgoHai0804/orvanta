import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const MIN_SIDEBAR_WIDTH = 140
const MAX_SIDEBAR_WIDTH = 280
const DEFAULT_SIDEBAR_WIDTH = 190
const COLLAPSED_SIDEBAR_WIDTH = 48
const STORAGE_KEY = "orvanta_team_sidebar_width"
const COLLAPSED_STORAGE_KEY = "orvanta_sidebar_collapsed"

export type TeamSidebarProps = {
	agents: OrvantaRosterAgent[]
	focusAgentId: string
	onSelectAgent: (agentId: string) => void
	onHire: () => void
	onOpenWarRoom?: () => void
	lockDeniedAgentIds?: string[]
	width?: number
	onWidthChange?: (width: number) => void
	isCollapsed?: boolean
	onToggleCollapse?: (collapsed: boolean) => void
}

function getStatusRank(status: string): number {
	const s = status.toLowerCase()
	if (s === "running") return 1
	if (s === "idle") return 2
	if (s.startsWith("pending")) return 3
	if (s === "stopped") return 4
	return 5
}

function sortAgents(agents: OrvantaRosterAgent[]): OrvantaRosterAgent[] {
	return [...agents].sort((a, b) => {
		const aIsLead = a.role === "lead" || a.id === "coordinator"
		const bIsLead = b.role === "lead" || b.id === "coordinator"
		if (aIsLead && !bIsLead) return -1
		if (!aIsLead && bIsLead) return 1
		const rankA = getStatusRank(a.status)
		const rankB = getStatusRank(b.status)
		if (rankA !== rankB) return rankA - rankB
		return a.displayName.localeCompare(b.displayName)
	})
}

function getAgentRoleIcon(role: string, id: string): string {
	const r = (role || "").toLowerCase()
	const i = (id || "").toLowerCase()
	if (r === "lead" || i === "coordinator") return "⭐"
	if (r === "architect" || i.includes("architect")) return "📐"
	if (r === "implementer" || r === "coder" || i.includes("implementer") || i.includes("coder")) return "💻"
	if (r === "reviewer" || r === "auditor" || i.includes("reviewer") || i.includes("auditor")) return "🔍"
	if (r === "copywriter" || r === "content" || i.includes("writer")) return "📝"
	if (r === "sales" || r === "outreach") return "🎯"
	if (r === "ephemeral" || r === "guest" || i.startsWith("guest-") || i.startsWith("ephemeral-")) return "⚡"
	return "🤖"
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
	agents,
	focusAgentId,
	onSelectAgent,
	onHire: _onHire,
	onOpenWarRoom: _onOpenWarRoom,
	lockDeniedAgentIds = [],
	width: controlledWidth,
	onWidthChange,
	isCollapsed: controlledCollapsed,
	onToggleCollapse,
}) => {
	const [internalWidth, setInternalWidth] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) {
				const parsed = Number.parseInt(saved, 10)
				if (!Number.isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
					return parsed
				}
			}
		}
		return DEFAULT_SIDEBAR_WIDTH
	})

	const [internalCollapsed, setInternalCollapsed] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY)
			if (saved !== null) {
				return saved === "true"
			}
		}
		return false
	})

	const isCollapsed = controlledCollapsed ?? internalCollapsed
	const width = controlledWidth ?? internalWidth
	const effectiveWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : width

	const toggleCollapse = useCallback(() => {
		const next = !isCollapsed
		setInternalCollapsed(next)
		onToggleCollapse?.(next)
		try {
			localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
		} catch {
			// Ignore localStorage errors
		}
	}, [isCollapsed, onToggleCollapse])

	// Shortcut Ctrl + B / Cmd + B to toggle collapse
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
				const target = e.target as HTMLElement | null
				if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
					return
				}
				e.preventDefault()
				toggleCollapse()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [toggleCollapse])

	const isDraggingRef = useRef(false)
	const [isDragging, setIsDragging] = useState(false)
	const startXRef = useRef(0)
	const startWidthRef = useRef(width)

	const handleWidthChange = useCallback(
		(newWidth: number) => {
			const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
			setInternalWidth(clamped)
			onWidthChange?.(clamped)
			try {
				localStorage.setItem(STORAGE_KEY, String(clamped))
			} catch {
				// Ignore localStorage errors
			}
		},
		[onWidthChange],
	)

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (isCollapsed) return
			e.preventDefault()
			isDraggingRef.current = true
			setIsDragging(true)
			startXRef.current = e.clientX
			startWidthRef.current = width

			document.body.style.userSelect = "none"
			document.body.style.cursor = "col-resize"

			let rafId: number | null = null
			const onMouseMove = (moveEvent: MouseEvent) => {
				if (!isDraggingRef.current) return
				if (rafId !== null) cancelAnimationFrame(rafId)
				rafId = requestAnimationFrame(() => {
					const delta = moveEvent.clientX - startXRef.current
					handleWidthChange(startWidthRef.current + delta)
				})
			}

			const onMouseUp = () => {
				isDraggingRef.current = false
				setIsDragging(false)
				if (rafId !== null) cancelAnimationFrame(rafId)
				document.body.style.userSelect = ""
				document.body.style.cursor = ""
				window.removeEventListener("mousemove", onMouseMove)
				window.removeEventListener("mouseup", onMouseUp)
			}

			window.addEventListener("mousemove", onMouseMove)
			window.addEventListener("mouseup", onMouseUp)
		},
		[isCollapsed, width, handleWidthChange],
	)

	const sortedAgents = useMemo(() => sortAgents(agents), [agents])
	const [showStopped, setShowStopped] = useState(false)

	const { persistentAgents, ephemeralAgents, stoppedAgents } = useMemo(() => {
		const persistent: OrvantaRosterAgent[] = []
		const ephemeral: OrvantaRosterAgent[] = []
		const stopped: OrvantaRosterAgent[] = []

		for (const a of sortedAgents) {
			if (a.status.toLowerCase() === "stopped") {
				stopped.push(a)
			} else if (a.id.startsWith("guest-") || a.id.startsWith("ephemeral-") || (a as any).ephemeral) {
				ephemeral.push(a)
			} else {
				persistent.push(a)
			}
		}

		return { persistentAgents: persistent, ephemeralAgents: ephemeral, stoppedAgents: stopped }
	}, [sortedAgents])

	const renderAgentRow = (agent: OrvantaRosterAgent) => {
		const isSelected = focusAgentId === agent.id
		const isLead = agent.role === "lead" || agent.id === "coordinator"
		const isRunning = agent.status.toLowerCase() === "running"

		return (
			<button
				aria-current={isSelected ? "true" : undefined}
				className={`group relative flex w-full cursor-pointer flex-col rounded px-2 py-1.5 text-left text-xs transition-colors ${
					isSelected
						? "border-l-2 border-indigo-500 bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)"
						: "border-l-2 border-transparent hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-list-hoverForeground)"
				}`}
				data-testid={`agent-row-${agent.id}`}
				key={agent.id}
				onClick={() => onSelectAgent(agent.id)}
				type="button">
				<div className="flex w-full items-center justify-between gap-1">
					<div className="flex items-center gap-1 min-w-0 font-medium truncate">
						<span className="truncate">{agent.displayName}</span>
						{isLead && (
							<span className="text-amber-400 shrink-0" title="Coordinator">
								★
							</span>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0 text-[10px]">
						{lockDeniedAgentIds.includes(agent.id) && (
							<span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Bị chặn bởi Purpose Lock" />
						)}
						{isRunning && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" title="Đang chạy" />}
						<span className="opacity-70">{agent.status}</span>
					</div>
				</div>
				<div className="text-[10px] opacity-50 truncate">@{agent.id}</div>
			</button>
		)
	}
	const renderMiniAgentRow = (agent: OrvantaRosterAgent) => {
		const isSelected = focusAgentId === agent.id
		const isLead = agent.role === "lead" || agent.id === "coordinator"
		const isRunning = agent.status.toLowerCase() === "running"
		const icon = getAgentRoleIcon(agent.role, agent.id)
		const isLockDenied = lockDeniedAgentIds.includes(agent.id)

		const button = (
			<button
				aria-current={isSelected ? "true" : undefined}
				aria-label={`${agent.displayName} (@${agent.id})`}
				className={`group relative flex h-9 w-9 items-center justify-center rounded-full transition-all cursor-pointer ${
					isSelected
						? "bg-violet-500/20 ring-2 ring-violet-500 text-foreground"
						: "hover:bg-surface-secondary text-muted-foreground hover:text-foreground"
				}`}
				data-testid={`agent-row-${agent.id}`}
				onClick={() => onSelectAgent(agent.id)}
				title={`${agent.displayName} (@${agent.id}) - ${agent.status}`}
				type="button">
				<span className="text-base select-none leading-none">{icon}</span>
				{isRunning ? (
					<span
						className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-violet-400 border-2 border-(--vscode-sideBar-background) animate-pulse"
						title="Đang chạy"
					/>
				) : isLockDenied ? (
					<span
						className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-(--vscode-sideBar-background)"
						title="Bị chặn bởi Purpose Lock"
					/>
				) : (
					<span
						className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-(--vscode-sideBar-background) ${
							agent.status.toLowerCase() === "idle" ? "bg-emerald-500/80" : "bg-muted-foreground/60"
						}`}
					/>
				)}
			</button>
		)

		return (
			<div className="flex justify-center py-1" key={agent.id}>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					<TooltipContent
						align="center"
						className="bg-(--vscode-editor-background) text-(--vscode-editor-foreground) border border-border-panel p-2.5 shadow-xl min-w-44 max-w-64 flex flex-col gap-1 text-xs z-50"
						side="right">
						<div className="flex items-center justify-between font-semibold gap-2">
							<span className="truncate">
								{icon} {agent.displayName}
							</span>
							<span className="text-[10px] px-1 py-0.5 rounded bg-surface-secondary text-description uppercase">
								{isLead ? "Lead" : agent.role}
							</span>
						</div>
						<div className="text-[11px] text-muted-foreground">@{agent.id}</div>
						<div className="text-[11px] flex items-center gap-1.5 opacity-90 mt-0.5">
							<span
								className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-violet-400 animate-pulse" : "bg-emerald-500"}`}
							/>
							<span>Trạng thái: {agent.status}</span>
						</div>
						<div className="text-[10px] text-muted-foreground/80 mt-1 border-t border-border-panel/40 pt-1">
							Click để mở kênh chat riêng
						</div>
					</TooltipContent>
				</Tooltip>
			</div>
		)
	}

	return (
		<aside
			aria-label="Đội"
			className={`relative flex h-full shrink-0 flex-col border-r border-border-panel bg-(--vscode-sideBar-background) select-none ${
				isDragging ? "transition-none" : "transition-[width] duration-200 ease-in-out"
			}`}
			data-collapsed={isCollapsed ? "true" : "false"}
			data-testid="orvanta-team-sidebar"
			style={{ width: effectiveWidth }}>
			{/* Header */}
			{isCollapsed ? (
				<div className="flex items-center justify-center border-b border-border-panel py-2 px-1 w-full">
					<button
						aria-label="Mở rộng thanh kênh (Ctrl+B)"
						className="hover:text-foreground cursor-pointer p-1 rounded hover:bg-surface-secondary text-sm font-bold flex items-center justify-center transition-colors"
						data-testid="sidebar-toggle-button"
						onClick={toggleCollapse}
						title="Mở rộng thanh kênh (Ctrl+B)"
						type="button">
						»
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between border-b border-border-panel px-2.5 py-2 text-xs font-semibold text-description uppercase tracking-wider w-full">
					<span>Đội ({agents.length})</span>
					<button
						aria-label="Thu gọn thanh kênh (Ctrl+B)"
						className="hover:text-foreground cursor-pointer px-1 py-0.5 rounded hover:bg-surface-secondary text-sm font-bold flex items-center justify-center transition-colors"
						data-testid="sidebar-toggle-button"
						onClick={toggleCollapse}
						title="Thu gọn thanh kênh (Ctrl+B)"
						type="button">
						«
					</button>
				</div>
			)}

			{/* Agent List */}
			<nav aria-label="Danh sách agent" className="flex-1 overflow-y-auto p-1">
				{isCollapsed ? (
					<div className="flex flex-col gap-0.5 items-center">
						{/* Mini #team-feed channel button */}
						<div className="flex justify-center py-1">
							<Tooltip delayDuration={100}>
								<TooltipTrigger asChild>
									<button
										aria-current={focusAgentId === "team-feed" ? "true" : undefined}
										aria-label="Kênh chung #team-feed"
										className={`group relative flex h-9 w-9 items-center justify-center rounded-full transition-all cursor-pointer ${
											focusAgentId === "team-feed"
												? "bg-violet-500/20 ring-2 ring-violet-500 text-foreground font-bold"
												: "hover:bg-surface-secondary text-muted-foreground hover:text-foreground"
										}`}
										data-testid="channel-team-feed"
										onClick={() => onSelectAgent("team-feed")}
										title="Kênh chung #team-feed"
										type="button">
										<span className="font-mono text-base font-bold leading-none select-none">#</span>
									</button>
								</TooltipTrigger>
								<TooltipContent
									align="center"
									className="bg-(--vscode-editor-background) text-(--vscode-editor-foreground) border border-border-panel p-2 shadow-xl text-xs z-50"
									side="right">
									<div className="font-semibold flex items-center gap-1.5">
										<span>📢</span>
										<span>#team-feed</span>
									</div>
									<div className="text-[11px] text-muted-foreground">Kênh tổng quan toàn đội</div>
								</TooltipContent>
							</Tooltip>
						</div>

						<div className="my-1.5 w-6 border-t border-border-panel/40" />

						{persistentAgents.map(renderMiniAgentRow)}

						{ephemeralAgents.length > 0 && (
							<>
								<div className="my-1.5 w-6 border-t border-border-panel/40" />
								{ephemeralAgents.map(renderMiniAgentRow)}
							</>
						)}

						{stoppedAgents.length > 0 && (
							<>
								<div className="my-1.5 w-6 border-t border-border-panel/40" />
								{stoppedAgents.map(renderMiniAgentRow)}
							</>
						)}
					</div>
				) : (
					<div className="flex flex-col gap-0.5">
						{/* Expanded #team-feed channel button */}
						<div className="mb-2">
							<div className="px-2 py-0.5 text-[10px] font-semibold text-description uppercase tracking-wider">
								KÊNH CHUNG
							</div>
							<button
								aria-current={focusAgentId === "team-feed" ? "true" : undefined}
								className={`group relative flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors ${
									focusAgentId === "team-feed"
										? "border-l-2 border-indigo-500 bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground) font-semibold"
										: "border-l-2 border-transparent hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-list-hoverForeground)"
								}`}
								data-testid="channel-team-feed"
								onClick={() => onSelectAgent("team-feed")}
								type="button">
								<span className="font-mono text-sm leading-none opacity-80">#</span>
								<span className="truncate">team-feed</span>
							</button>
						</div>

						<div className="px-2 py-0.5 text-[10px] font-semibold text-description uppercase tracking-wider">
							NHÂN SỰ ({persistentAgents.length})
						</div>

						{persistentAgents.map(renderAgentRow)}

						{ephemeralAgents.length > 0 && (
							<div className="mt-2 border-t border-border-panel/40 pt-1.5">
								<div className="px-2 py-0.5 text-[10px] font-semibold text-description uppercase tracking-wider flex items-center justify-between">
									<span>Tạm thời ({ephemeralAgents.length})</span>
									<span className="text-[9px] lowercase opacity-60">hết khi đóng session</span>
								</div>
								<div className="flex flex-col gap-0.5 mt-0.5">{ephemeralAgents.map(renderAgentRow)}</div>
							</div>
						)}

						{stoppedAgents.length > 0 && (
							<div className="mt-2 border-t border-border-panel/40 pt-1.5">
								<button
									className="w-full px-2 py-0.5 text-[10px] font-semibold text-description uppercase tracking-wider flex items-center justify-between hover:text-foreground cursor-pointer"
									onClick={() => setShowStopped(!showStopped)}
									type="button">
									<span>Đã dừng ({stoppedAgents.length})</span>
									<span className="text-[10px]">{showStopped ? "▲" : "▼"}</span>
								</button>
								{showStopped && (
									<div className="flex flex-col gap-0.5 mt-0.5 opacity-60">
										{stoppedAgents.map(renderAgentRow)}
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</nav>

			{/* Resizer Handle */}
			{!isCollapsed && (
				<div
					aria-hidden="true"
					className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-(--vscode-focusBorder) active:bg-(--vscode-focusBorder)"
					onMouseDown={onMouseDown}
				/>
			)}
		</aside>
	)
}

export default TeamSidebar
