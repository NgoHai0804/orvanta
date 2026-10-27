import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import React, { useCallback, useMemo, useRef, useState } from "react"

const MIN_SIDEBAR_WIDTH = 140
const MAX_SIDEBAR_WIDTH = 280
const DEFAULT_SIDEBAR_WIDTH = 180
const STORAGE_KEY = "orvanta_team_sidebar_width"

export type TeamSidebarProps = {
	agents: OrvantaRosterAgent[]
	focusAgentId: string
	onSelectAgent: (agentId: string) => void
	onHire: () => void
	onOpenWarRoom?: () => void
	width?: number
	onWidthChange?: (width: number) => void
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

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
	agents,
	focusAgentId,
	onSelectAgent,
	onHire,
	onOpenWarRoom,
	width: controlledWidth,
	onWidthChange,
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

	const width = controlledWidth ?? internalWidth
	const isDraggingRef = useRef(false)
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
			e.preventDefault()
			isDraggingRef.current = true
			startXRef.current = e.clientX
			startWidthRef.current = width

			const onMouseMove = (moveEvent: MouseEvent) => {
				if (!isDraggingRef.current) return
				const delta = moveEvent.clientX - startXRef.current
				handleWidthChange(startWidthRef.current + delta)
			}

			const onMouseUp = () => {
				isDraggingRef.current = false
				window.removeEventListener("mousemove", onMouseMove)
				window.removeEventListener("mouseup", onMouseUp)
			}

			window.addEventListener("mousemove", onMouseMove)
			window.addEventListener("mouseup", onMouseUp)
		},
		[width, handleWidthChange],
	)

	const sortedAgents = useMemo(() => sortAgents(agents), [agents])

	return (
		<aside
			aria-label="Đội"
			className="relative flex h-full shrink-0 flex-col border-r border-border-panel bg-(--vscode-sideBar-background) select-none"
			data-testid="orvanta-team-sidebar"
			style={{ width }}>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border-panel px-2.5 py-2 text-xs font-semibold text-description uppercase tracking-wider">
				<span>Đội ({agents.length})</span>
			</div>

			{/* Agent List */}
			<nav aria-label="Danh sách agent" className="flex-1 overflow-y-auto p-1">
				<div className="flex flex-col gap-0.5">
					{sortedAgents.map((agent) => {
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
										{isRunning && (
											<span
												aria-label="Đang chạy"
												className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse"
											/>
										)}
										<span className="opacity-70">{agent.status}</span>
									</div>
								</div>
								<div className="text-[10px] opacity-50 truncate">@{agent.id}</div>
							</button>
						)
					})}
				</div>
			</nav>

			{/* Footer */}
			<div className="flex flex-col gap-1 border-t border-border-panel p-2">
				<button
					className="w-full rounded border border-border-panel px-2 py-1 text-center text-xs opacity-40 cursor-not-allowed"
					disabled
					onClick={onOpenWarRoom}
					title="Pha sau"
					type="button">
					Mở War room
				</button>
				<button
					className="w-full rounded bg-(--vscode-button-secondaryBackground) px-2 py-1 text-center text-xs text-(--vscode-button-secondaryForeground) hover:bg-(--vscode-button-secondaryHoverBackground)"
					onClick={onHire}
					type="button">
					+ Hire agent
				</button>
			</div>

			{/* Resizer Handle */}
			<div
				aria-hidden="true"
				className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-(--vscode-focusBorder) active:bg-(--vscode-focusBorder)"
				onMouseDown={onMouseDown}
			/>
		</aside>
	)
}

export default TeamSidebar
