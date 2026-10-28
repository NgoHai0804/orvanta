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

	const [contextTask, setContextTask] = useState<{ id: string; title: string } | undefined>()
	const [contextDecision, setContextDecision] = useState<{ id: string; title: string } | undefined>()

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
	useEffect(() => {
		const handleMessage = (e: MessageEvent) => {
			if (e.data?.type === "orvanta_switch_tab" && e.data?.tab) {
				setOrvantaTab(e.data.tab)
				if (e.data.focusAgentId || e.data.focusAgent) {
					setFocusAgentId(e.data.focusAgentId || e.data.focusAgent)
				}
				if (e.data.contextTask) {
					setContextTask(e.data.contextTask)
				}
				if (e.data.contextDecision) {
					setContextDecision(e.data.contextDecision)
				}
			}
		}
		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	const [chatBannerDismissed, setChatBannerDismissed] = useState(() => {
		if (typeof window !== "undefined") {
			const until = localStorage.getItem("orvanta_chat_banner_dismissed_until")
			if (until && Number(until) > Date.now()) {
				return true
			}
		}
		return false
	})

	const dismissChatBanner = () => {
		setChatBannerDismissed(true)
		if (typeof window !== "undefined") {
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
			localStorage.setItem("orvanta_chat_banner_dismissed_until", String(Date.now() + sevenDaysMs))
		}
	}

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
				if (e.key === "1") {
					e.preventDefault()
					setOrvantaTab("home")
				} else if (e.key === "2") {
					if (hasCompany) {
						e.preventDefault()
						setOrvantaTab("inbox")
					}
				} else if (e.key === "3") {
					e.preventDefault()
					setOrvantaTab("chat")
				} else if (e.key === "4") {
					if (hasCompany) {
						e.preventDefault()
						setOrvantaTab("war-room")
					}
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [hasCompany])

	useEffect(() => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search)
			const hash = window.location.hash || ""
			let viewParam = params.get("view")
			if (!viewParam && hash.includes("orvanta://view/")) {
				viewParam = hash.split("orvanta://view/")[1]?.split("?")[0]
			} else if (!viewParam && hash.includes("view=")) {
				viewParam = new URLSearchParams(hash.replace(/^#/, "")).get("view")
			}
			if (viewParam) {
				const clean = viewParam.trim().toLowerCase()
				if (clean === "home" || clean === "agents" || clean === "inbox" || clean === "chat" || clean === "war-room") {
					setOrvantaTab(clean as OrvantaTab)
				}
			}

			const agent = params.get("agent")
			const task = params.get("task")
			const decision = params.get("decision")
			if (agent) {
				setFocusAgentId(agent)
			}
			if (task) {
				setContextTask({ id: task, title: task })
			}
			if (decision) {
				setContextDecision({ id: decision, title: decision })
			}
		}
	}, [])

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
						onOpenWarRoom={() => setOrvantaTab("war-room")}
						onSelectAgent={setFocusAgentId}
					/>
				)}
				<div className="flex-1 min-w-0 h-full relative flex flex-col">
					{!hasCompany && orvantaTab === "chat" && !chatBannerDismissed && (
						<div className="flex items-center justify-between border-b border-border-panel bg-surface-secondary/40 px-3 py-1.5 text-xs text-muted-foreground shrink-0">
							<span>Lập công ty trên Home để quản lý đội.</span>
							<div className="flex items-center gap-2">
								<button
									className="text-(--vscode-textLink-foreground) hover:underline"
									onClick={() => setOrvantaTab("home")}
									type="button">
									Lập công ty →
								</button>
								<button
									aria-label="Dismiss banner"
									className="opacity-60 hover:opacity-100"
									onClick={dismissChatBanner}
									type="button">
									✕
								</button>
							</div>
						</div>
					)}
					<ChatView
						contextDecision={contextDecision}
						contextTask={contextTask}
						focusAgent={hasCompany ? focusedAgent : undefined}
						hideAnnouncement={hideAnnouncement}
						isHidden={overlayOpen || orvantaTab !== "chat" || showWelcome}
						onClearContextDecision={() => setContextDecision(undefined)}
						onClearContextTask={() => setContextTask(undefined)}
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
