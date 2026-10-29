import type { ClineMessage } from "@shared/ExtensionMessage"
import { memo } from "react"
import ChatRow from "@/components/chat/ChatRow"
import { cn } from "@/lib/utils"

interface StickyAnchorHeaderProps {
	message: ClineMessage | null
	pushOffset: number
	selectedAgentId?: string
	onScrollToMessage?: () => void
}

export const StickyAnchorHeader = memo(({ message, pushOffset, selectedAgentId, onScrollToMessage }: StickyAnchorHeaderProps) => {
	if (!message) {
		return null
	}

	return (
		<div
			aria-hidden={false}
			className={cn("absolute top-0 left-0 right-0 z-10 overflow-hidden pointer-events-none")}
			style={{ transform: `translateY(${pushOffset}px)`, willChange: "transform" }}>
			<button
				className="w-full text-left pointer-events-auto bg-(--vscode-sideBar-background) shadow-[0_8px_16px_-12px_rgba(0,0,0,0.45)] cursor-pointer border-0 p-0 block font-inherit"
				onClick={onScrollToMessage}
				title="Cuộn tới tin nhắn này"
				type="button">
				<ChatRow
					isExpanded={false}
					isLast={false}
					isStickyClone
					message={message}
					onHeightChange={() => undefined}
					onLastRowContentChange={() => undefined}
					onSetQuote={() => undefined}
					onToggleExpand={() => undefined}
					selectedAgentId={selectedAgentId}
				/>
			</button>
		</div>
	)
})

StickyAnchorHeader.displayName = "StickyAnchorHeader"
