import { BrainIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { memo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CHAT_HEADER_TITLE_MUTED, CHAT_ROW_LUCIDE } from "./chatRowStyles"

interface ThinkingRowProps {
	showTitle: boolean
	reasoningContent?: string
	isVisible: boolean
	isExpanded: boolean
	onToggle?: () => void
	title?: string
	isStreaming?: boolean
	showChevron?: boolean
	agentId?: string
	agentDisplayName?: string
	agentRole?: string
}

export const ThinkingRow = memo(
	({
		showTitle = false,
		reasoningContent,
		isVisible,
		isExpanded,
		onToggle,
		title = "Thinking",
		isStreaming = false,
		showChevron = true,
		agentId,
		agentDisplayName,
		agentRole,
	}: ThinkingRowProps) => {
		const hasAgent = Boolean(agentId || agentDisplayName || agentRole)

		if (!isVisible) {
			return null
		}

		// Don't render anything if collapsed and no title (nothing to show)
		if (!isExpanded && !showTitle) {
			return null
		}

		return (
			<div className="ml-1 pl-0 mb-0 -mt-[2px]">
				{showTitle ? (
					<Button
						className={cn(
							"inline-flex justify-baseline gap-1.5 items-center text-left select-none px-0 py-0 my-0 h-auto min-h-0 w-full text-description overflow-visible",
							{
								"cursor-pointer": !!onToggle,
								"cursor-default": !onToggle,
							},
						)}
						onClick={onToggle}
						size="icon"
						variant="icon">
						<BrainIcon {...CHAT_ROW_LUCIDE} className="shrink-0 text-description" />
						<span
							className={cn(CHAT_HEADER_TITLE_MUTED, {
								"animate-shimmer bg-linear-90 from-foreground to-description bg-[length:200%_100%] bg-clip-text text-transparent":
									isStreaming,
								"select-none": isStreaming,
							})}>
							{hasAgent ? (isStreaming ? "đang suy nghĩ..." : "(Suy nghĩ)") : title}
						</span>
						{showChevron &&
							(isExpanded ? (
								<ChevronDownIcon {...CHAT_ROW_LUCIDE} className="shrink-0 text-description" />
							) : (
								<ChevronRightIcon {...CHAT_ROW_LUCIDE} className="shrink-0 text-description" />
							))}
					</Button>
				) : null}

				{isExpanded && (
					<div className="w-full min-w-0 pt-1.5 pb-2 pl-0.5 pr-1">
						<div className="w-full text-description text-[12.5px] leading-relaxed whitespace-pre-wrap wrap-break-word select-text font-normal opacity-90">
							{reasoningContent}
						</div>
					</div>
				)}
			</div>
		)
	},
)

ThinkingRow.displayName = "ThinkingRow"
