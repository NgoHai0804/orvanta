import { EmptyRequest, StringRequest } from "@shared/proto/cline/common"
import { useCallback, useEffect, useRef, useState } from "react"
import { TaskServiceClient } from "@/services/grpc-client"
import { type ChatTab, type ChatTabsState, CONSOLE_TABS_STORAGE_KEY, DEFAULT_TAB_TITLE, MAX_TABS_COUNT } from "./types"

export interface UseChatTabsOptions {
	initialFocusAgentId?: string
	onActiveAgentChange?: (agentId: string) => void
}

function createDefaultTab(agentId = "team-feed"): ChatTab {
	const now = Date.now()
	return {
		id: `tab_${now}_${Math.random().toString(36).slice(2, 7)}`,
		title: DEFAULT_TAB_TITLE,
		activeAgentId: agentId,
		agentTasks: {},
		agentDrafts: {},
		agentIds: [agentId],
		createdAt: now,
		lastActiveAt: now,
	}
}

function loadInitialTabsState(defaultAgentId = "team-feed"): ChatTabsState {
	if (typeof window === "undefined" || !window.localStorage) {
		const defaultTab = createDefaultTab(defaultAgentId)
		return { tabs: [defaultTab], activeTabId: defaultTab.id, isHistoryOpen: false }
	}

	try {
		const raw = localStorage.getItem(CONSOLE_TABS_STORAGE_KEY)
		if (raw) {
			const parsed = JSON.parse(raw)
			if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
				const normalizedTabs: ChatTab[] = parsed.tabs.map((t: any) => {
					const activeAgentId = t.activeAgentId || defaultAgentId
					const agentTasks =
						t.agentTasks && typeof t.agentTasks === "object"
							? t.agentTasks
							: t.taskId
								? { [activeAgentId]: t.taskId }
								: {}
					return {
						...t,
						activeAgentId,
						agentTasks,
						agentDrafts: t.agentDrafts || {},
						agentIds: t.agentIds || Object.keys(agentTasks),
						taskId: agentTasks[activeAgentId] || t.taskId,
					}
				})
				const activeTabId = normalizedTabs.find((t) => t.id === parsed.activeTabId)?.id || normalizedTabs[0].id
				return { tabs: normalizedTabs, activeTabId, isHistoryOpen: false }
			}
		}
	} catch (e) {
		console.error("Failed to load console tabs from localStorage:", e)
	}

	const defaultTab = createDefaultTab(defaultAgentId)
	return { tabs: [defaultTab], activeTabId: defaultTab.id, isHistoryOpen: false }
}

export function useChatTabs(options?: UseChatTabsOptions) {
	const [state, setState] = useState<ChatTabsState>(() => loadInitialTabsState(options?.initialFocusAgentId || "team-feed"))

	const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0]
	const activeTabRef = useRef(activeTab)
	activeTabRef.current = activeTab

	useEffect(() => {
		try {
			localStorage.setItem(CONSOLE_TABS_STORAGE_KEY, JSON.stringify({ tabs: state.tabs, activeTabId: state.activeTabId }))
		} catch (e) {
			console.error("Failed to save console tabs to localStorage:", e)
		}
	}, [state.tabs, state.activeTabId])

	const switchTaskBackend = useCallback(async (taskId?: string) => {
		try {
			if (taskId) {
				await TaskServiceClient.showTaskWithId(StringRequest.create({ value: taskId }))
			} else {
				await TaskServiceClient.clearTask(EmptyRequest.create({}))
			}
		} catch (err) {
			console.error("Error switching task backend:", err)
		}
	}, [])

	const selectTab = useCallback(
		async (tabId: string) => {
			const targetTab = state.tabs.find((t) => t.id === tabId)
			if (!targetTab) return

			setState((prev) => ({
				...prev,
				activeTabId: tabId,
				tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t)),
			}))

			if (targetTab.activeAgentId && options?.onActiveAgentChange) {
				options.onActiveAgentChange(targetTab.activeAgentId)
			}
			await switchTaskBackend(targetTab.taskId)
		},
		[state.tabs, options, switchTaskBackend],
	)

	const switchAgentInActiveTab = useCallback(
		async (newAgentId: string) => {
			const currentTab = state.tabs.find((t) => t.id === state.activeTabId)
			if (!currentTab) return
			const taskId = currentTab.agentTasks?.[newAgentId]

			setState((prev) => ({
				...prev,
				tabs: prev.tabs.map((t) => {
					if (t.id !== prev.activeTabId) return t
					return {
						...t,
						activeAgentId: newAgentId,
						taskId,
						draftInput: t.agentDrafts?.[newAgentId] ?? "",
						lastActiveAt: Date.now(),
					}
				}),
			}))

			if (options?.onActiveAgentChange) {
				options.onActiveAgentChange(newAgentId)
			}
			await switchTaskBackend(taskId)
		},
		[state.tabs, state.activeTabId, options, switchTaskBackend],
	)

	const bindTaskToActiveAgent = useCallback((taskId: string, title?: string) => {
		setState((prev) => {
			const current = prev.tabs.find((t) => t.id === prev.activeTabId)
			if (!current) return prev

			const agentId = current.activeAgentId || "coordinator"
			const updatedAgentTasks = { ...(current.agentTasks || {}), [agentId]: taskId }
			const updatedAgentIds = Array.from(new Set([...(current.agentIds || []), agentId]))
			const newTitle = current.title === DEFAULT_TAB_TITLE && title ? title : current.title

			return {
				...prev,
				tabs: prev.tabs.map((t) =>
					t.id === prev.activeTabId
						? {
								...t,
								taskId,
								title: newTitle,
								agentTasks: updatedAgentTasks,
								agentIds: updatedAgentIds,
								lastActiveAt: Date.now(),
							}
						: t,
				),
			}
		})
	}, [])

	const createNewTab = useCallback(
		async (agentId?: string) => {
			if (state.tabs.length >= MAX_TABS_COUNT) {
				const lastTab = state.tabs[state.tabs.length - 1]
				await selectTab(lastTab.id)
				return lastTab
			}

			const effectiveAgent = agentId || options?.initialFocusAgentId || "team-feed"
			const newTab = createDefaultTab(effectiveAgent)

			setState((prev) => ({
				...prev,
				tabs: [...prev.tabs, newTab],
				activeTabId: newTab.id,
			}))

			if (options?.onActiveAgentChange) {
				options.onActiveAgentChange(effectiveAgent)
			}
			await switchTaskBackend(undefined)
			return newTab
		},
		[state.tabs, options, selectTab, switchTaskBackend],
	)

	const closeTab = useCallback(
		async (tabId: string, event?: React.MouseEvent) => {
			if (event) {
				event.stopPropagation()
			}

			setState((prev) => {
				const tabIndex = prev.tabs.findIndex((t) => t.id === tabId)
				if (tabIndex === -1) return prev

				if (prev.tabs.length <= 1) {
					const blankTab = createDefaultTab(options?.initialFocusAgentId || "team-feed")
					void switchTaskBackend(undefined)
					return { ...prev, tabs: [blankTab], activeTabId: blankTab.id }
				}

				const remaining = prev.tabs.filter((t) => t.id !== tabId)
				let nextActiveId = prev.activeTabId

				if (prev.activeTabId === tabId) {
					const neighborIndex = tabIndex > 0 ? tabIndex - 1 : 0
					const nextTab = remaining[neighborIndex]
					nextActiveId = nextTab.id
					const nextAgentTask = nextTab.agentTasks?.[nextTab.activeAgentId] || nextTab.taskId
					void switchTaskBackend(nextAgentTask)
					if (nextTab.activeAgentId && options?.onActiveAgentChange) {
						options.onActiveAgentChange(nextTab.activeAgentId)
					}
				}

				return { ...prev, tabs: remaining, activeTabId: nextActiveId }
			})
		},
		[options, switchTaskBackend],
	)

	const openTaskInTab = useCallback(
		async (taskId: string, title?: string, agentId?: string, sessionAgentTasks?: Record<string, string>) => {
			const initialAgent = agentId || "coordinator"
			const agentTasksMap = sessionAgentTasks || { [initialAgent]: taskId }

			const existing = state.tabs.find(
				(t) => t.taskId === taskId || (t.agentTasks && Object.values(t.agentTasks).includes(taskId)),
			)
			if (existing) {
				await selectTab(existing.id)
				setState((prev) => ({ ...prev, isHistoryOpen: false }))
				return
			}

			const currentActive = activeTabRef.current
			if (
				currentActive &&
				!currentActive.taskId &&
				Object.keys(currentActive.agentTasks || {}).length === 0 &&
				currentActive.title === DEFAULT_TAB_TITLE
			) {
				const updatedTab: ChatTab = {
					...currentActive,
					taskId,
					title: title || currentActive.title,
					activeAgentId: initialAgent,
					agentTasks: agentTasksMap,
					agentIds: Object.keys(agentTasksMap),
					lastActiveAt: Date.now(),
				}

				setState((prev) => ({
					...prev,
					tabs: prev.tabs.map((t) => (t.id === currentActive.id ? updatedTab : t)),
					isHistoryOpen: false,
				}))

				if (options?.onActiveAgentChange) {
					options.onActiveAgentChange(initialAgent)
				}
				await switchTaskBackend(taskId)
				return
			}

			const now = Date.now()
			const newTab: ChatTab = {
				id: `tab_${now}_${Math.random().toString(36).slice(2, 7)}`,
				taskId,
				title: title || DEFAULT_TAB_TITLE,
				activeAgentId: initialAgent,
				agentTasks: agentTasksMap,
				agentIds: Object.keys(agentTasksMap),
				createdAt: now,
				lastActiveAt: now,
			}

			setState((prev) => ({
				...prev,
				tabs: [...prev.tabs, newTab],
				activeTabId: newTab.id,
				isHistoryOpen: false,
			}))

			if (options?.onActiveAgentChange) {
				options.onActiveAgentChange(initialAgent)
			}
			await switchTaskBackend(taskId)
		},
		[state.tabs, options, selectTab, switchTaskBackend],
	)

	const updateActiveTab = useCallback((updates: Partial<ChatTab>) => {
		setState((prev) => ({
			...prev,
			tabs: prev.tabs.map((t) => (t.id === prev.activeTabId ? { ...t, ...updates } : t)),
		}))
	}, [])

	const updateActiveTabTask = useCallback((taskId: string, title?: string) => {
		setState((prev) => ({
			...prev,
			tabs: prev.tabs.map((t) => {
				if (t.id !== prev.activeTabId) return t
				const agentId = t.activeAgentId || "coordinator"
				const updatedTasks = { ...(t.agentTasks || {}), [agentId]: taskId }
				return {
					...t,
					taskId,
					title: title || t.title,
					agentTasks: updatedTasks,
					agentIds: Array.from(new Set([...(t.agentIds || []), agentId])),
				}
			}),
		}))
	}, [])

	const setDraftInput = useCallback((tabId: string, draftInput: string) => {
		setState((prev) => ({
			...prev,
			tabs: prev.tabs.map((t) => {
				if (t.id !== tabId) return t
				const currentAgent = t.activeAgentId || "coordinator"
				const updatedDrafts = { ...(t.agentDrafts || {}), [currentAgent]: draftInput }
				return { ...t, draftInput, agentDrafts: updatedDrafts }
			}),
		}))
	}, [])

	const handleTaskDeleted = useCallback(
		async (deletedTaskId: string) => {
			const activeTab = activeTabRef.current
			const shouldClearBackend =
				activeTab?.taskId === deletedTaskId || activeTab?.agentTasks?.[activeTab?.activeAgentId] === deletedTaskId

			setState((prev) => {
				return {
					...prev,
					tabs: prev.tabs.map((t) => {
						const hasTask = t.taskId === deletedTaskId || Object.values(t.agentTasks || {}).includes(deletedTaskId)
						if (!hasTask) return t

						const newAgentTasks = { ...(t.agentTasks || {}) }
						for (const [ag, tid] of Object.entries(newAgentTasks)) {
							if (tid === deletedTaskId) {
								delete newAgentTasks[ag]
							}
						}

						const remainingTaskCount = Object.keys(newAgentTasks).length
						const newCurrentTaskId = newAgentTasks[t.activeAgentId]

						return {
							...t,
							taskId: newCurrentTaskId,
							agentTasks: newAgentTasks,
							agentIds: Object.keys(newAgentTasks),
							title: remainingTaskCount === 0 ? DEFAULT_TAB_TITLE : t.title,
						}
					}),
				}
			})

			if (shouldClearBackend) {
				await switchTaskBackend(undefined)
			}
		},
		[switchTaskBackend],
	)

	const toggleHistory = useCallback((open?: boolean) => {
		setState((prev) => ({
			...prev,
			isHistoryOpen: open !== undefined ? open : !prev.isHistoryOpen,
		}))
	}, [])

	return {
		tabs: state.tabs,
		activeTab,
		activeTabId: state.activeTabId,
		isHistoryOpen: state.isHistoryOpen,
		selectTab,
		switchAgentInActiveTab,
		bindTaskToActiveAgent,
		createNewTab,
		closeTab,
		updateActiveTabTask,
		setDraftInput,
		openTaskInTab,
		updateActiveTab,
		handleTaskDeleted,
		toggleHistory,
	}
}
