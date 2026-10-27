import { useState } from "react"
import HomeView from "./HomeView"
import InboxView from "./InboxView"
import { useOrvantaCompany } from "./useOrvantaCompany"
import { useOrvantaInbox } from "./useOrvantaInbox"

export type OrvantaTab = "home" | "inbox" | "chat" | "war-room"

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

	const [inboxFocusId, setInboxFocusId] = useState<string | undefined>()

	const isCompanyReady = company?.status === "ready"

	const tabs: Array<{
		id: OrvantaTab
		label: string
		enabled: boolean
		title?: string
		badge?: number
	}> = [
		{ id: "home", label: "Home", enabled: true },
		{
			id: "inbox",
			label: "Inbox",
			enabled: isCompanyReady,
			title: isCompanyReady ? "Hộp thư quyết định của CEO" : "Lập công ty trên Home để mở Inbox",
			badge: pendingCount,
		},
		{ id: "chat", label: "Chat", enabled: true },
		{ id: "war-room", label: "War room", enabled: false, title: "Pha sau" },
	]

	const isFullView = activeTab === "home" || activeTab === "inbox"

	return (
		<div className={isFullView ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden" : "shrink-0"}>
			<nav className="flex shrink-0 gap-1 border-b border-border-panel px-2 py-1">
				{tabs.map((tab) => (
					<button
						aria-label={tab.id === "inbox" && tab.badge && tab.badge > 0 ? `Inbox, ${tab.badge} pending` : tab.label}
						className={`rounded px-2 py-1 text-xs flex items-center gap-1 ${
							activeTab === tab.id
								? "bg-(--vscode-button-background) text-(--vscode-button-foreground)"
								: "opacity-80 hover:opacity-100"
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
							<span className="rounded-full bg-(--vscode-badge-background) px-1.5 py-0.2 text-[10px] text-(--vscode-badge-foreground) font-medium">
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
				/>
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
		</div>
	)
}

export default OrvantaShell
