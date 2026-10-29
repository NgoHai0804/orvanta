import type React from "react"

interface ChatLayoutProps {
	isHidden: boolean
	children: React.ReactNode
}

/**
 * Main layout container for the chat view
 * Provides standard flex column layout dividing content (flex-1) and composer footer (shrink-0)
 */
export const ChatLayout: React.FC<ChatLayoutProps> = ({ isHidden, children }) => {
	return (
		<div className={`flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden relative ${isHidden ? "hidden" : ""}`}>
			{children}
		</div>
	)
}
