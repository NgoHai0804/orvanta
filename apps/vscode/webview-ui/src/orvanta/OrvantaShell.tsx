import { useState } from "react"
import AgentsView from "./AgentsView"
import HomeView from "./HomeView"
import InboxView from "./InboxView"
import { useOrvantaCompany } from "./useOrvantaCompany"
import { useOrvantaInbox } from "./useOrvantaInbox"
import { useWarRoom } from "./useWarRoom"
import WarRoomView from "./WarRoomView"

export type OrvantaTab = "home" | "agents" | "inbox" | "chat" | "war-room"

type OrvantaShellProps = {
	activeTab: OrvantaTab
	onTabChange: (tab: OrvantaTab) => void
}

const OrvantaShell = ({ activeTab, onTabChange }: OrvantaShellProps) => {
	const { company, loading, creating, createError, createCompany, saveAgentProfile, deleteAgentProfile } = useOrvantaCompany()

	const {
		pending,
		deferred,
		history,
		pendingCount,
		loading: inboxLoading,
		error: inboxError,
		resolveDecision,
		requestDecision,
		refresh: refreshInbox,
	} = useOrvantaInbox(company?.status)

	const isCompanyReady = company?.status === "ready"

	const warRoom = useWarRoom(activeTab === "war-room" && isCompanyReady)

	const [inboxFocusId, setInboxFocusId] = useState<string | undefined>()

	const tabs: Array<{
		id: OrvantaTab
		label: string
		enabled: boolean
		title?: string
		badge?: number
	}> = [
		{ id: "home", label: "Home", enabled: true },
		{
			id: "agents",
			label: "Agents",
			enabled: isCompanyReady,
			title: isCompanyReady ? "Sơ đồ tổ chức & quản lý Agents" : "Lập công ty để mở Agents",
		},
		{
			id: "inbox",
			label: "Inbox",
			enabled: isCompanyReady,
			title: isCompanyReady ? "Hộp thư quyết định của CEO" : "Lập công ty trên Home để mở Inbox",
			badge: pendingCount,
		},
		{ id: "chat", label: "Chat", enabled: true },
		{
			id: "war-room",
			label: "War room",
			enabled: isCompanyReady,
			title: isCompanyReady ? undefined : "Lập công ty trên Home để mở War room",
		},
	]

	const isFullView = activeTab === "home" || activeTab === "agents" || activeTab === "inbox" || activeTab === "war-room"

	return (
		<div className={isFullView ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden" : "shrink-0"}>
			<nav className="flex shrink-0 gap-1 border-b border-border-panel bg-[#0b1021] px-2 py-1">
				{tabs.map((tab) => (
					<button
						aria-label={tab.id === "inbox" && tab.badge && tab.badge > 0 ? `Inbox, ${tab.badge} pending` : tab.label}
						className={`rounded px-2.5 py-1 text-xs flex items-center gap-1.5 font-medium transition-colors ${
							activeTab === tab.id
								? "bg-indigo-600 text-white shadow-xs"
								: "text-slate-300 hover:text-white hover:bg-white/5"
						} disabled:cursor-not-allowed disabled:opacity-40`}
						disabled={!tab.enabled}
						key={tab.id}
						onClick={() => {
							if (tab.id === "inbox") {
								setInboxFocusId(undefined)
							}
							onTabChange(tab.id)
						}}
						title={tab.title}
						type="button">
						<span>{tab.label}</span>
						{tab.badge !== undefined && tab.badge > 0 && (
							<span className="rounded-full bg-violet-600 px-1.5 py-0.2 text-[10px] text-white font-semibold">
								{tab.badge > 99 ? "99+" : tab.badge}
							</span>
						)}
					</button>
				))}
			</nav>
			{activeTab === "home" && (
				<HomeView
					company={company}
					createError={createError}
					creating={creating}
					inboxPending={pending}
					loading={loading}
					onCreate={createCompany}
					onDeleteAgentProfile={deleteAgentProfile}
					onOpenInbox={(focusId) => {
						setInboxFocusId(focusId)
						onTabChange("inbox")
					}}
					onRequestDecision={requestDecision}
					onSaveAgentProfile={saveAgentProfile}
					onTabChange={onTabChange}
				/>
			)}
			{activeTab === "agents" && (
				<AgentsView company={company} onDeleteAgentProfile={deleteAgentProfile} onSaveAgentProfile={saveAgentProfile} />
			)}
			{activeTab === "inbox" && (
				<InboxView
					deferred={deferred}
					error={inboxError}
					focusId={inboxFocusId}
					history={history}
					loading={inboxLoading}
					onRefresh={refreshInbox}
					onResolve={resolveDecision}
					pending={pending}
				/>
			)}
			{activeTab === "war-room" && (
				<WarRoomView
					filter={warRoom.filter}
					onFilterChange={warRoom.setFilter}
					onPauseToggle={warRoom.setPaused}
					onTalkToAgent={(agentId) => {
						// Deep-link to chat tab focusing the agent
						window.postMessage({ type: "orvanta_switch_tab", tab: "chat", focusAgentId: agentId }, "*")
						onTabChange("chat")
					}}
					paused={warRoom.paused}
					snapshot={warRoom.snapshot}
				/>
			)}
		</div>
	)
}

export default OrvantaShell
