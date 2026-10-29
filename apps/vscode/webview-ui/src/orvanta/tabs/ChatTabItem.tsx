import { IconMessage, IconRobot, IconX } from "@tabler/icons-react"
import React, { useCallback } from "react"
import type { ChatTab } from "./types"

export interface ChatTabItemProps {
	tab: ChatTab
	isActive: boolean
	onSelect: (id: string) => void
	onClose: (id: string, event?: React.MouseEvent) => void
}

export const ChatTabItem: React.FC<ChatTabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
	const handleAuxClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.button === 1) {
				// Middle click to close tab
				e.preventDefault()
				e.stopPropagation()
				onClose(tab.id, e)
			}
		},
		[tab.id, onClose],
	)

	const isAgentTab = tab.activeAgentId && tab.activeAgentId !== "team-feed"

	return (
		<div
			aria-selected={isActive}
			className={`
				group relative flex items-center gap-1.5 h-[32px] px-3 text-xs cursor-pointer select-none
				border-r border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))]
				transition-colors duration-150 shrink-0 max-w-[200px] min-w-[100px] outline-none
				${
					isActive
						? "bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)] font-medium border-t-2 border-t-[var(--vscode-focusBorder,#007fd4)]"
						: "bg-[var(--vscode-sideBar-background)] text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-toolbar-hoverBackground)] hover:text-[var(--vscode-foreground)] border-t-2 border-t-transparent"
				}
			`}
			onAuxClick={handleAuxClick}
			onClick={() => onSelect(tab.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					onSelect(tab.id)
				}
			}}
			role="tab"
			tabIndex={0}
			title={`${tab.title}${tab.activeAgentId ? ` (@${tab.activeAgentId})` : ""}`}>
			{/* Icon: Agent or Chat */}
			{isAgentTab ? (
				<IconRobot className="shrink-0 text-cyan-400" size={13} />
			) : (
				<IconMessage className="shrink-0 opacity-70" size={13} />
			)}

			{/* Running indicator dot */}
			{tab.isRunning && (
				<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Đang chạy" />
			)}

			{/* Title with truncation */}
			<span className="truncate flex-1 text-left">{tab.title}</span>

			{/* Close button */}
			<button
				aria-label={`Đóng tab ${tab.title}`}
				className={`
					p-0.5 rounded opacity-60 hover:opacity-100 hover:bg-[var(--vscode-toolbar-hoverBackground)]
					transition-opacity shrink-0 ml-0.5
					${isActive ? "opacity-80" : "opacity-0 group-hover:opacity-70"}
				`}
				onClick={(e) => {
					e.stopPropagation()
					onClose(tab.id, e)
				}}
				type="button">
				<IconX size={12} />
			</button>
		</div>
	)
}
