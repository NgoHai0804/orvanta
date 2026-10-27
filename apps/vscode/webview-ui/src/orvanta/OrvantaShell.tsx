import HomeView from "./HomeView"
import { useOrvantaCompany } from "./useOrvantaCompany"

export type OrvantaTab = "home" | "inbox" | "chat" | "war-room"

type OrvantaShellProps = {
	activeTab: OrvantaTab
	onTabChange: (tab: OrvantaTab) => void
}

const TABS: Array<{ id: OrvantaTab; label: string; enabled: boolean; title?: string }> = [
	{ id: "home", label: "Home", enabled: true },
	{ id: "inbox", label: "Inbox", enabled: false, title: "Pha sau" },
	{ id: "chat", label: "Chat", enabled: true },
	{ id: "war-room", label: "War room", enabled: false, title: "Pha sau" },
]

const OrvantaShell = ({ activeTab, onTabChange }: OrvantaShellProps) => {
	const { company, loading, creating, createError, createCompany, saveAgentProfile, deleteAgentProfile } = useOrvantaCompany()

	return (
		<div className={activeTab === "home" ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden" : "shrink-0"}>
			<nav className="flex shrink-0 gap-1 border-b border-border-panel px-2 py-1">
				{TABS.map((tab) => (
					<button
						className={`rounded px-2 py-1 text-xs ${
							activeTab === tab.id
								? "bg-(--vscode-button-background) text-(--vscode-button-foreground)"
								: "opacity-80 hover:opacity-100"
						} disabled:cursor-not-allowed disabled:opacity-40`}
						disabled={!tab.enabled}
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						title={tab.title}
						type="button">
						{tab.label}
					</button>
				))}
			</nav>
			{activeTab === "home" && (
				<HomeView
					company={company}
					createError={createError}
					creating={creating}
					loading={loading}
					onCreate={createCompany}
					onDeleteAgentProfile={deleteAgentProfile}
					onSaveAgentProfile={saveAgentProfile}
				/>
			)}
		</div>
	)
}

export default OrvantaShell
