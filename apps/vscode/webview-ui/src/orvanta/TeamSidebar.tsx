import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import {
	type Icon,
	IconBolt,
	IconChevronDown,
	IconChevronUp,
	IconCode,
	IconHash,
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
	IconPencil,
	IconRobot,
	IconRuler,
	IconSearch,
	IconSpeakerphone,
	IconStar,
	IconTarget,
} from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

/** Map role/id → Tabler icon component. Ref: specs/web/styles/icons.md */
const AGENT_ROLE_ICON_RULES: Array<{ match: (r: string, i: string) => boolean; icon: Icon }> = [
	{ match: (r, i) => r === "lead" || i === "coordinator", icon: IconStar },
	{ match: (r, i) => r === "architect" || i.includes("architect"), icon: IconRuler },
	{
		match: (r, i) => r === "implementer" || r === "coder" || i.includes("implementer") || i.includes("coder"),
		icon: IconCode,
	},
	{
		match: (r, i) => r === "reviewer" || r === "auditor" || i.includes("reviewer") || i.includes("auditor"),
		icon: IconSearch,
	},
	{ match: (r, i) => r === "copywriter" || r === "content" || i.includes("writer"), icon: IconPencil },
	{ match: (r, _i) => r === "sales" || r === "outreach", icon: IconTarget },
	{
		match: (r, i) => r === "ephemeral" || r === "guest" || i.startsWith("guest-") || i.startsWith("ephemeral-"),
		icon: IconBolt,
	},
]

export function getAgentRoleIconComponent(role: string, id: string): Icon {
	const r = (role || "").toLowerCase()
	const i = (id || "").toLowerCase()
	return AGENT_ROLE_ICON_RULES.find(({ match }) => match(r, i))?.icon ?? IconRobot
}

function getStatusDotColor(status: string): string {
	const s = status.toLowerCase()
	if (s === "running") return "var(--color-status-running, #4ec9b0)"
	if (s === "idle") return "var(--vscode-charts-green, #4ec9b0)"
	if (s.startsWith("pending")) return "var(--color-status-pending, #cca700)"
	if (s === "stopped") return "var(--color-status-stopped, #6e6e6e)"
	return "var(--vscode-descriptionForeground, #858585)"
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
			} else if (a.id.startsWith("guest-") || a.id.startsWith("ephemeral-") || (a as { ephemeral?: boolean }).ephemeral) {
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
		const AgentIcon = getAgentRoleIconComponent(agent.role, agent.id)

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
					<div className="flex items-center gap-1.5 min-w-0 font-medium truncate">
						<AgentIcon className="shrink-0 text-muted-foreground" size={14} stroke={1.5} />
						<span className="truncate">{agent.displayName}</span>
						{isLead && (
							<span
								className="text-amber-400 shrink-0 inline-flex items-center"
								data-testid="lead-star"
								title="Coordinator">
								<IconStar fill="currentColor" size={12} stroke={2} />
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
		const AgentIcon = getAgentRoleIconComponent(agent.role, agent.id)
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
				<AgentIcon className="select-none" size={16} stroke={1.5} />
				{isLead && (
					<span className="absolute -top-0.5 -right-0.5 text-[8px] leading-none" title="Coordinator">
						<IconStar className="text-amber-400" size={8} stroke={2} />
					</span>
				)}
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
						className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-(--vscode-sideBar-background)"
						style={{ backgroundColor: getStatusDotColor(agent.status) }}
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
							<span className="truncate flex items-center gap-1">
								<AgentIcon size={14} stroke={1.5} />
								<span>{agent.displayName}</span>
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
						<IconLayoutSidebarLeftExpand size={16} stroke={1.5} />
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
						<IconLayoutSidebarLeftCollapse size={16} stroke={1.5} />
					</button>
				</div>
			)}

			{/* Agent List */}
			<nav aria-label="Danh sách agent" className="flex-1 scroller-y p-1">
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
										<IconHash className="select-none" size={16} stroke={2} />
									</button>
								</TooltipTrigger>
								<TooltipContent
									align="center"
									className="bg-(--vscode-editor-background) text-(--vscode-editor-foreground) border border-border-panel p-2 shadow-xl text-xs z-50"
									side="right">
									<div className="font-semibold flex items-center gap-1.5">
										<IconSpeakerphone size={14} stroke={1.5} />
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
								<IconHash className="opacity-80 shrink-0" size={14} stroke={2} />
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
									{showStopped ? (
										<IconChevronUp size={14} stroke={1.5} />
									) : (
										<IconChevronDown size={14} stroke={1.5} />
									)}
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
