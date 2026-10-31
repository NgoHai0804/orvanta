import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { IconArrowLeft } from "@tabler/icons-react"
import { useCallback, useContext, useEffect, useMemo } from "react"
import { AgentBadge } from "@/components/common/AgentBadge"
import { ExtensionStateContext } from "@/context/ExtensionStateContext"
import { TeamFeedView } from "./TeamFeedView"
import { TeamSidebar } from "./TeamSidebar"
import { ChromeTabBar } from "./tabs/ChromeTabBar"
import { ConsoleHistoryDrawer } from "./tabs/ConsoleHistoryDrawer"
import { useChatTabs } from "./tabs/useChatTabs"

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
	const extensionState = useContext(ExtensionStateContext)
	const currentTaskItem = extensionState?.currentTaskItem

	const {
		tabs,
		activeTab,
		activeTabId,
		isHistoryOpen,
		selectTab,
		createNewTab,
		closeTab,
		openTaskInTab,
		openSessionInTab,
		bindTaskToActiveAgent,
		switchAgentInActiveTab,
		handleTaskDeleted,
		toggleHistory,
	} = useChatTabs({
		initialFocusAgentId: focusAgentId,
		onActiveAgentChange: onSelectAgent,
	})

	// Synchronize backend currentTaskItem with the active agent in the active tab.
	// Pass HistoryItem.sessionId (CEO session) separately from the SDK task id.
	useEffect(() => {
		if (currentTaskItem?.id && activeTab) {
			const currentAgentTask = activeTab.agentTasks?.[activeTab.activeAgentId]
			const ceoSessionId = currentTaskItem.sessionId
			const needsTaskBind = !currentAgentTask || currentAgentTask !== currentTaskItem.id
			const needsSessionBind = !!ceoSessionId && activeTab.sessionId !== ceoSessionId
			if (needsTaskBind || needsSessionBind) {
				bindTaskToActiveAgent(currentTaskItem.id, currentTaskItem.task, ceoSessionId)
			}
		}
	}, [currentTaskItem, activeTab, bindTaskToActiveAgent])

	const handleSelectAgent = useCallback(
		async (agentId: string) => {
			onSelectAgent(agentId)
			await switchAgentInActiveTab(agentId)
		},
		[onSelectAgent, switchAgentInActiveTab],
	)

	const isTeamFeed = focusAgentId === "team-feed"

	const focusedAgent = useMemo(() => {
		if (isTeamFeed) return undefined
		return (agents ?? []).find((a) => a.id === focusAgentId)
	}, [agents, focusAgentId, isTeamFeed])

	return (
		<div className="flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden" data-testid="console-view">
			{/* Chrome Tab Bar bao trùm toàn bộ ConsoleView Root */}
			<ChromeTabBar
				activeTabId={activeTabId}
				isHistoryOpen={isHistoryOpen}
				onCloseTab={closeTab}
				onNewTab={() => createNewTab(focusAgentId)}
				onSelectTab={selectTab}
				onToggleHistory={toggleHistory}
				tabs={tabs}
			/>

			{/* Main Workspace Area: Sidebar on left + Content on right */}
			<div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
				{/* Left Collapsible Channels Sidebar */}
				<TeamSidebar
					agents={agents}
					focusAgentId={focusAgentId}
					lockDeniedAgentIds={lockDeniedAgentIds}
					onHire={onHire}
					onOpenWarRoom={() => handleSelectAgent("team-feed")}
					onSelectAgent={handleSelectAgent}
				/>

				{/* Right Content Area: Simple, standard flex column filling full height */}
				<div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
					{/* 1. When #team-feed is active */}
					{isTeamFeed && (
						<div className="flex flex-1 min-h-0 w-full overflow-hidden flex-col">
							<TeamFeedView
								ceoSessionId={activeTab?.sessionId}
								companyName={companyName}
								onSelectAgent={onSelectAgent}
							/>
						</div>
					)}

					{/* 2. When an @agent channel is active: show ChatView with Agent Channel Header */}
					<div
						className="flex-col flex-1 min-h-0 w-full overflow-hidden"
						style={{ display: isTeamFeed ? "none" : "flex" }}>
						{focusedAgent && (
							<div
								className="shrink-0 h-[36px] min-h-[36px] border-b border-border-panel bg-(--vscode-sideBar-background) px-3 flex items-center justify-between select-none z-10 gap-2 overflow-hidden text-xs"
								data-testid="agent-channel-header">
								{/* Left side: Back to #team-feed + Agent Identity */}
								<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
									<button
										className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-secondary cursor-pointer transition-colors whitespace-nowrap"
										onClick={() => onSelectAgent("team-feed")}
										title="Quay lại #team-feed"
										type="button">
										<IconArrowLeft className="shrink-0" size={14} stroke={1.5} />
										<span className="font-mono text-[11px] whitespace-nowrap">#team-feed</span>
									</button>
									<div className="h-3 w-[1px] bg-border-panel shrink-0" />
									<div className="flex items-center gap-1 min-w-0 overflow-hidden">
										<AgentBadge
											agentId={focusedAgent.id}
											className="shrink min-w-0"
											displayName={focusedAgent.displayName}
											role={focusedAgent.role}
											size="sm"
										/>
										<span className="text-[11px] text-muted-foreground truncate font-mono hidden md:inline shrink-0">
											@{focusedAgent.id}
										</span>
									</div>
								</div>

								{/* Right side: Status + 1:1 attribution */}
								<div className="flex items-center gap-1.5 shrink-0 text-[11px] text-muted-foreground ml-auto">
									<span className="flex items-center gap-1 shrink-0">
										<span
											className={`h-1.5 w-1.5 rounded-full ${
												focusedAgent.status === "running"
													? "bg-violet-400 animate-pulse"
													: "bg-emerald-400"
											}`}
										/>
										<span className="capitalize">{focusedAgent.status}</span>
									</span>
									<span className="opacity-40 shrink-0">·</span>
									<span
										className="italic opacity-80 whitespace-nowrap truncate max-w-[130px]"
										title="Chỉ đạo 1:1 qua Mailbox">
										Chỉ đạo 1:1 qua Mailbox
									</span>
								</div>
							</div>
						)}
						<div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden relative">{children}</div>
					</div>
				</div>

				{/* History Drawer Overlay */}
				<ConsoleHistoryDrawer
					companyAgents={agents}
					currentTaskId={activeTab?.taskId}
					isOpen={isHistoryOpen}
					onClose={() => toggleHistory(false)}
					onDeleteTask={(taskId) => {
						void handleTaskDeleted(taskId)
					}}
					onSelectCeoSession={(session) => {
						void openSessionInTab(
							session.sessionId,
							session.title,
							session.participants.map((p) => ({
								agentSlug: p.agentSlug,
								taskId: p.taskId || p.sdkSessionId || undefined,
								agentNumericId: Number(p.agentNumericId) || undefined,
							})),
						)
						toggleHistory(false)
					}}
					onSelectTask={(taskId, title, agentId, sessionAgentTasks) => {
						void openTaskInTab(taskId, title, agentId, sessionAgentTasks)
					}}
				/>
			</div>
		</div>
	)
}

export default ConsoleView
