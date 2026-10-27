import type { Boolean, EmptyRequest } from "@shared/proto/cline/common"
import { useCallback, useEffect, useState } from "react"
import AccountView from "./components/account/AccountView"
import ChatErrorBoundary from "./components/chat/ChatErrorBoundary"
import ChatView from "./components/chat/ChatView"
import HistoryView from "./components/history/HistoryView"
import MarketplaceView from "./components/marketplace/MarketplaceView"
import McpView from "./components/mcp/configuration/McpConfigurationView"
import { openClinePassSubscriptionIfPending } from "./components/onboarding/clinePassSubscribe"
import OnboardingView from "./components/onboarding/OnboardingView"
import SettingsView from "./components/settings/SettingsView"
import WorktreesView from "./components/worktrees/WorktreesView"
import { useClineAuth } from "./context/ClineAuthContext"
import { useExtensionState } from "./context/ExtensionStateContext"
import OrvantaShell, { type OrvantaTab } from "./orvanta/OrvantaShell"
import TeamSidebar from "./orvanta/TeamSidebar"
import { useOrvantaCompany } from "./orvanta/useOrvantaCompany"
import { Providers } from "./Providers"
import { UiServiceClient } from "./services/grpc-client"

const AppContent = () => {
	const {
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		showMarketplace,
		showMcp,
		mcpTab,
		showSettings,
		settingsNavigationRequest,
		showHistory,
		showAccount,
		showWorktrees,
		showAnnouncement,
		setShowAnnouncement,
		setShouldShowAnnouncement,
		closeMcpView,
		navigateToHistory,
		hideSettings,
		hideHistory,
		hideAccount,
		hideWorktrees,
		closeMarketplaceView,
		hideAnnouncement,
	} = useExtensionState()

	const { clineUser, organizations, activeOrganization, accountSwitch, accountSwitchError } = useClineAuth()
	const { company } = useOrvantaCompany()
	const [orvantaTab, setOrvantaTab] = useState<OrvantaTab>("home")
	const [focusAgentId, setFocusAgentId] = useState<string>("coordinator")

	const hasCompany = company.status === "ready" && company.agents.length > 0
	const coordinatorAgent = company.agents.find((a) => a.role === "lead" || a.id === "coordinator") ?? company.agents[0]
	const effectiveFocusAgentId = company.agents.some((a) => a.id === focusAgentId)
		? focusAgentId
		: (coordinatorAgent?.id ?? "coordinator")
	const focusedAgent = company.agents.find((a) => a.id === effectiveFocusAgentId) ?? coordinatorAgent
	const overlayOpen = showSettings || showHistory || showMarketplace || showMcp || showAccount || showWorktrees

	const showUpdateAnnouncementModal = useCallback(() => {
		setShowAnnouncement(true)
		UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
			.then((response: Boolean) => {
				setShouldShowAnnouncement(response.value)
			})
			.catch((error) => {
				console.error("Failed to acknowledge announcement:", error)
			})
	}, [setShouldShowAnnouncement, setShowAnnouncement])

	useEffect(() => {
		if (!didHydrateState || showWelcome || !shouldShowAnnouncement || showAnnouncement) {
			return
		}
		showUpdateAnnouncementModal()
	}, [didHydrateState, showWelcome, shouldShowAnnouncement, showAnnouncement, showUpdateAnnouncementModal])

	// Open the ClinePass subscription page once auth completes. Lives here (not in OnboardingView)
	// because handleAuthCallback unmounts onboarding before the clineUser update arrives.
	useEffect(() => {
		if (clineUser?.uid) {
			openClinePassSubscriptionIfPending(clineUser.appBaseUrl)
		}
	}, [clineUser?.uid, clineUser?.appBaseUrl])

	if (!didHydrateState) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col">
				<OrvantaShell activeTab={orvantaTab} onTabChange={setOrvantaTab} />
			</div>
		)
	}

	const showOnboarding = showWelcome && orvantaTab === "chat"

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			{(accountSwitch || accountSwitchError) && !showAccount && (
				<div className="z-50 bg-editor-background p-2 text-xs" role="status">
					{accountSwitch
						? accountSwitch.slow
							? "Account switch is still pending. You can navigate while it finishes."
							: "Switching account…"
						: `Could not confirm account switch: ${accountSwitchError}`}
				</div>
			)}
			{showSettings && <SettingsView navigationRequest={settingsNavigationRequest} onDone={hideSettings} />}
			{showHistory && <HistoryView onDone={hideHistory} />}
			{showMarketplace && <MarketplaceView initialType={mcpTab ? "mcp" : undefined} onDone={closeMarketplaceView} />}
			{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
			{showAccount && (
				<AccountView
					activeOrganization={activeOrganization}
					clineUser={clineUser}
					onDone={hideAccount}
					organizations={organizations}
				/>
			)}
			{showWorktrees && <WorktreesView onDone={hideWorktrees} />}
			{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
			{!overlayOpen && <OrvantaShell activeTab={orvantaTab} onTabChange={setOrvantaTab} />}
			{showOnboarding && !overlayOpen && (
				<div className="min-h-0 flex-1 overflow-auto">
					<OnboardingView />
				</div>
			)}
			<div
				className="flex min-h-0 flex-1 w-full overflow-hidden"
				style={{ display: overlayOpen || orvantaTab !== "chat" || showWelcome ? "none" : "flex" }}>
				{hasCompany && (
					<TeamSidebar
						agents={company.agents}
						focusAgentId={effectiveFocusAgentId}
						onHire={() => setOrvantaTab("home")}
						onSelectAgent={setFocusAgentId}
					/>
				)}
				<div className="flex-1 min-w-0 h-full relative">
					<ChatView
						focusAgent={hasCompany ? focusedAgent : undefined}
						hideAnnouncement={hideAnnouncement}
						isHidden={overlayOpen || orvantaTab !== "chat" || showWelcome}
						onResetFocusAgent={() => setFocusAgentId(coordinatorAgent?.id ?? "coordinator")}
						showAnnouncement={showAnnouncement}
						showHistoryView={navigateToHistory}
					/>
				</div>
			</div>
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<ChatErrorBoundary errorTitle="Orvanta gặp lỗi giao diện">
				<AppContent />
			</ChatErrorBoundary>
		</Providers>
	)
}

export default App
