import { IconCheck, IconChevronDown, IconChevronRight, IconClipboardList, IconClock } from "@tabler/icons-react"
import { memo, useState } from "react"
import { AgentBadge } from "@/components/common/AgentBadge"

export interface AgentAssignedTaskHeaderProps {
	agentId: string
	agentDisplayName?: string
	taskTitle: string
	taskDescription?: string
	isCompleted?: boolean
	delegatedBy?: string
}

export const AgentAssignedTaskHeader = memo(
	({
		agentDisplayName,
		taskTitle,
		taskDescription,
		isCompleted = false,
		delegatedBy = "Coordinator",
	}: AgentAssignedTaskHeaderProps) => {
		const [isExpanded, setIsExpanded] = useState(false)

		if (!taskTitle) {
			return null
		}

		return (
			<div className="mx-3 mt-2 mb-3 rounded-lg border border-indigo-500/30 bg-slate-900/90 shadow-sm overflow-hidden text-xs">
				<button
					aria-expanded={isExpanded}
					className="w-full text-left flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-800/50 transition-colors bg-transparent border-0 font-inherit"
					onClick={() => setIsExpanded((prev) => !prev)}
					type="button">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
							<IconClipboardList className="h-3.5 w-3.5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-semibold text-slate-200 truncate">
									Nhiệm vụ được giao{agentDisplayName ? ` cho ${agentDisplayName}` : ""}
								</span>
								<span
									className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
										isCompleted
											? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
											: "bg-amber-500/15 text-amber-400 border border-amber-500/30"
									}`}>
									{isCompleted ? (
										<IconCheck className="h-3 w-3 stroke-[2.5]" />
									) : (
										<IconClock className="h-3 w-3" />
									)}
									{isCompleted ? "Đã hoàn thành" : "Đang thực hiện"}
								</span>
							</div>
							<div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{taskTitle}</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0 ml-2">
						<div className="flex items-center gap-1 text-[11px] text-slate-400">
							<span>Giao bởi:</span>
							<AgentBadge agentId="coordinator" agentRole="lead" displayName={delegatedBy} size="sm" />
						</div>
						<span aria-hidden="true" className="text-slate-400 hover:text-slate-200 p-1">
							{isExpanded ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
						</span>
					</div>
				</button>

				{isExpanded && (
					<div className="border-t border-slate-800 bg-slate-950/70 p-3 space-y-2 text-[11px]">
						<div>
							<div className="text-slate-400 font-medium uppercase text-[10px] tracking-wider mb-1">
								Chi tiết yêu cầu & Định nghĩa hoàn thành (DoD):
							</div>
							<div className="whitespace-pre-wrap rounded border border-slate-800 bg-slate-900/60 p-2 font-mono text-slate-300 max-h-48 overflow-y-auto">
								{taskDescription || taskTitle}
							</div>
						</div>
					</div>
				)}
			</div>
		)
	},
)

AgentAssignedTaskHeader.displayName = "AgentAssignedTaskHeader"
