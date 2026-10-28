import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { IconArrowLeft } from "@tabler/icons-react"
import { useMemo } from "react"
import { AgentBadge } from "@/components/common/AgentBadge"
import { TeamFeedView } from "./TeamFeedView"
import { TeamSidebar } from "./TeamSidebar"

export interface ConsoleViewProps {
	agents: OrvantaRosterAgent[]
	focusAgentId: string
	onSelectAgent: (agentId: string) => void
	onHire?: () => void
	lockDeniedAgentIds?: string[]
	companyName?: string
	children: React.ReactNode
}

export function ConsoleView({
	agents,
	focusAgentId,
	onSelectAgent,
	onHire = () => {},
	lockDeniedAgentIds = [],
	companyName,
	children,
}: ConsoleViewProps) {
	const isTeamFeed = focusAgentId === "team-feed"

	const focusedAgent = useMemo(() => {
		if (isTeamFeed) return undefined
		return (agents ?? []).find((a) => a.id === focusAgentId)
	}, [agents, focusAgentId, isTeamFeed])

	return (
		<div className="flex h-full min-h-0 w-full overflow-hidden" data-testid="console-view">
			{/* Left Collapsible Channels Sidebar */}
			<TeamSidebar
				agents={agents}
				focusAgentId={focusAgentId}
				lockDeniedAgentIds={lockDeniedAgentIds}
				onHire={onHire}
				onOpenWarRoom={() => onSelectAgent("team-feed")}
				onSelectAgent={onSelectAgent}
			/>

			{/* Right Content Area */}
			<div className="flex-1 min-w-0 h-full relative flex flex-col overflow-hidden">
				{/* 1. When #team-feed is active */}
				{isTeamFeed && (
					<div className="flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col">
						<TeamFeedView companyName={companyName} onSelectAgent={onSelectAgent} />
					</div>
				)}

				{/* 2. When an @agent channel is active: show ChatView with Agent Channel Header */}
				<div className="h-full w-full flex-col min-h-0 overflow-hidden" style={{ display: isTeamFeed ? "none" : "flex" }}>
					{focusedAgent && (
						<div
							className="flex shrink-0 items-center justify-between border-b border-border-panel bg-(--vscode-sideBar-background)/70 px-3 py-1.5 text-xs select-none"
							data-testid="agent-channel-header">
							<div className="flex items-center gap-2 min-w-0">
								<button
									className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-secondary cursor-pointer transition-colors"
									onClick={() => onSelectAgent("team-feed")}
									title="Quay lại #team-feed"
									type="button">
									<IconArrowLeft className="shrink-0" size={14} stroke={1.5} />
									<span className="font-mono text-[11px]">#team-feed</span>
								</button>
								<div className="h-3 w-[1px] bg-border-panel" />
								<AgentBadge
									agentId={focusedAgent.id}
									displayName={focusedAgent.displayName}
									role={focusedAgent.role}
									size="sm"
								/>
								<span className="text-[11px] text-muted-foreground truncate font-mono">@{focusedAgent.id}</span>
							</div>
							<div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
								<span className="flex items-center gap-1">
									<span
										className={`h-1.5 w-1.5 rounded-full ${
											focusedAgent.status === "running" ? "bg-violet-400 animate-pulse" : "bg-emerald-400"
										}`}
									/>
									<span className="capitalize">{focusedAgent.status}</span>
								</span>
								<span className="opacity-40">·</span>
								<span className="italic opacity-80">Chỉ đạo 1:1 qua Mailbox</span>
							</div>
						</div>
					)}
					<div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">{children}</div>
				</div>
			</div>
		</div>
	)
}

export default ConsoleView
