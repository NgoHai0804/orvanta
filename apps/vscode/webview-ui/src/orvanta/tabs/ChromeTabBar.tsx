import { IconHistory, IconPlus } from "@tabler/icons-react"
import React, { useRef } from "react"
import { ChatTabItem } from "./ChatTabItem"
import type { ChatTab } from "./types"

export interface ChromeTabBarProps {
	tabs: ChatTab[]
	activeTabId: string
	isHistoryOpen?: boolean
	onSelectTab: (id: string) => void
	onCloseTab: (id: string, event?: React.MouseEvent) => void
	onNewTab: () => void
	onToggleHistory: () => void
}

export const ChromeTabBar: React.FC<ChromeTabBarProps> = ({
	tabs,
	activeTabId,
	isHistoryOpen,
	onSelectTab,
	onCloseTab,
	onNewTab,
	onToggleHistory,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		if (scrollContainerRef.current && e.deltaY !== 0) {
			// Convert vertical scroll to horizontal scroll
			scrollContainerRef.current.scrollLeft += e.deltaY
		}
	}

	return (
		<div
			className="w-full h-[34px] flex items-center justify-between border-b border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))] bg-[var(--vscode-sideBar-background)] shrink-0 select-none z-10"
			data-testid="chrome-tab-bar">
			{/* Left side: Tabs list with horizontal scroll */}
			<div
				className="flex-1 flex items-center h-full overflow-x-auto overflow-y-hidden no-scrollbar"
				onWheel={handleWheel}
				ref={scrollContainerRef}
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
				{tabs.map((tab) => (
					<ChatTabItem
						isActive={tab.id === activeTabId}
						key={tab.id}
						onClose={onCloseTab}
						onSelect={onSelectTab}
						tab={tab}
					/>
				))}

				{/* New Tab Button [+] */}
				<button
					aria-label="Tạo cuộc trò chuyện mới"
					className="h-[28px] w-[28px] my-auto ml-1 rounded flex items-center justify-center text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)] transition-colors shrink-0"
					onClick={onNewTab}
					title="Mở tab chat mới"
					type="button">
					<IconPlus size={15} />
				</button>
			</div>

			{/* Right side: History Drawer trigger button */}
			<div className="flex items-center h-full px-2 border-l border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))] shrink-0 bg-[var(--vscode-sideBar-background)]">
				<button
					aria-label="Mở lịch sử cuộc trò chuyện"
					className={`
						flex items-center gap-1.5 h-[26px] px-2 rounded text-xs transition-colors
						${
							isHistoryOpen
								? "bg-[var(--vscode-button-secondaryBackground,#3a3d41)] text-[var(--vscode-foreground)] font-medium"
								: "text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]"
						}
					`}
					onClick={onToggleHistory}
					title="Lịch sử cuộc trò chuyện (.orvanta/history)"
					type="button">
					<IconHistory size={14} />
					<span className="hidden sm:inline">Lịch sử</span>
				</button>
			</div>
		</div>
	)
}
