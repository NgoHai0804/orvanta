import type { ClineMessage } from "@shared/ExtensionMessage"
import { EmptyRequest } from "@shared/proto/cline/common"
import type { Mode } from "@shared/storage/types"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { GitCompare } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckpointsServiceClient } from "@/services/grpc-client"
import { useExtensionState } from "../../../../../context/ExtensionStateContext"
import { type ButtonActionType, getButtonConfigFromState } from "../../shared/buttonConfig"
import type { ButtonActionInvocation, ChatState, DraftSnapshot, MessageHandlers } from "../../types/chatTypes"

function createActionInvocation(action: ButtonActionType, getDraftSnapshot: () => DraftSnapshot): ButtonActionInvocation {
	switch (action) {
		case "approve":
		case "reject":
		case "proceed":
			return { type: action, draft: getDraftSnapshot() }
		default:
			return { type: action }
	}
}

interface ActionButtonsProps {
	task?: ClineMessage
	messages: ClineMessage[]
	chatState: ChatState
	messageHandlers: MessageHandlers
	mode: Mode
}

/**
 * Action buttons area including approve/reject buttons
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({ task, messages, chatState, mode, messageHandlers }) => {
	const { getDraftSnapshot, setSendingDisabled } = chatState
	const { turnState, foregroundCommandRunning } = useExtensionState()

	// Tracks the ask the user last acted on. Clicking a footer button latches this so the
	// buttons disable immediately (and survive the trailing bookkeeping re-renders before the
	// backend advances the turn). It is a ref, not state, so it can be compared against the
	// current ask during render without scheduling an extra update.
	const processedAskRef = useRef<string | undefined>(undefined)
	// Forces a re-render when the latch flips; the counter value itself is unused.
	const [, bumpRender] = useState(0)

	// Memoize the last message to avoid unnecessary recalculation
	const lastMessage = useMemo(() => messages.at(-1), [messages])

	// Button configuration is driven by the authoritative backend TurnState when present (SDK
	// path); otherwise it falls back to the legacy tail-walking heuristic. This makes the footer
	// buttons immune to trailing bookkeeping messages and never disagree with the thinking
	// indicator (RC1).
	const buttonConfig = useMemo(() => {
		return getButtonConfigFromState(messages, turnState, mode, foregroundCommandRunning)
	}, [messages, turnState, mode, foregroundCommandRunning])

	// Identity of the ask that currently owns the footer buttons. The button config objects are
	// shared singletons (e.g. BUTTON_CONFIGS.tool_approve), so two consecutive identical asks
	// (approve → approve) return the same reference. The anchored turn timestamp (or the last
	// message) changes on every new ask, making it the reliable signal that a fresh decision is
	// due even when the config object is identical. Folding the config's button text in also
	// covers a same-anchor transition between different button sets.
	const askIdentity = `${turnState?.seq ?? ""}:${turnState?.anchorTs ?? lastMessage?.ts ?? ""}:${buttonConfig.primaryText ?? ""}:${buttonConfig.secondaryText ?? ""}`

	// The buttons are "processing" only while the user's click is being handled for the current
	// ask. Because the latch is keyed on the ask identity, a new ask (even one reusing the same
	// shared config object) is never seen as already-processed, so its buttons are interactive
	// again.
	const isProcessing = processedAskRef.current === askIdentity

	// Mirror the config's sending-disabled flag into chat state whenever the active button set
	// changes.
	useEffect(() => {
		setSendingDisabled(buttonConfig.sendingDisabled)
	}, [buttonConfig, setSendingDisabled])

	const handleActionClick = useCallback(
		(invocation: ButtonActionInvocation) => {
			if (processedAskRef.current === askIdentity) {
				return
			}
			// Latch this ask as processed and force a render so the buttons disable immediately.
			processedAskRef.current = askIdentity
			bumpRender((n) => n + 1)

			const releaseLatch = () => {
				if (processedAskRef.current === askIdentity) {
					processedAskRef.current = undefined
					bumpRender((n) => n + 1)
				}
			}
			void messageHandlers
				.executeButtonAction(invocation)
				.then((started) => {
					if (!started) {
						releaseLatch()
					}
				})
				.catch(releaseLatch)
		},
		[messageHandlers, askIdentity],
	)

	// Keyboard event handler
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault()
				event.stopPropagation()
				handleActionClick({ type: "cancel" })
			}
		},
		[handleActionClick],
	)

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handleKeyDown])

	const [changesCount, setChangesCount] = useState(0)
	const [viewChangesPending, setViewChangesPending] = useState(false)

	useEffect(() => {
		let cancelled = false
		const checkChanges = () => {
			CheckpointsServiceClient.checkpointLatestChangesCount(EmptyRequest.create({}))
				.then((res) => {
					if (!cancelled) {
						setChangesCount(res.value ?? 0)
					}
				})
				.catch(() => {
					if (!cancelled) setChangesCount(0)
				})
		}

		checkChanges()
		const interval = setInterval(checkChanges, 2500)
		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [messages.length, turnState?.seq])

	if (!task) {
		return null
	}

	const isOmittedAction = (action?: string, text?: string) => {
		if (!action && !text) return false
		return (
			action === "retry" ||
			action === "new_task" ||
			text === "Retry" ||
			text === "Start New Task" ||
			text === "Start New Task with Context"
		)
	}

	const filteredPrimaryText = isOmittedAction(buttonConfig.primaryAction, buttonConfig.primaryText)
		? undefined
		: buttonConfig.primaryText
	const filteredPrimaryAction = isOmittedAction(buttonConfig.primaryAction, buttonConfig.primaryText)
		? undefined
		: buttonConfig.primaryAction
	const filteredSecondaryText = isOmittedAction(buttonConfig.secondaryAction, buttonConfig.secondaryText)
		? undefined
		: buttonConfig.secondaryText
	const filteredSecondaryAction = isOmittedAction(buttonConfig.secondaryAction, buttonConfig.secondaryText)
		? undefined
		: buttonConfig.secondaryAction

	const hasButtons = Boolean(filteredPrimaryText || filteredSecondaryText)
	const isStreaming = task.partial === true
	const canInteract = buttonConfig.enableButtons && !isProcessing && !messageHandlers.recoveryActionInFlight

	if (!hasButtons && changesCount === 0) {
		return null
	}

	const opacity = canInteract || isStreaming ? 1 : 0.5

	return (
		<div className="flex flex-col px-3.5 pb-2" style={{ opacity }}>
			{changesCount > 0 && (
				<button
					className="flex items-center justify-center gap-1.5 px-3 py-1.5 mb-2 text-xs font-medium rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-sm cursor-pointer disabled:opacity-50"
					disabled={viewChangesPending}
					onClick={() => {
						setViewChangesPending(true)
						CheckpointsServiceClient.checkpointViewLatestChanges(EmptyRequest.create({}))
							.catch((err) => console.error("Failed to view changes:", err))
							.finally(() => setViewChangesPending(false))
					}}
					title="Xem các thay đổi file đang diễn ra (cập nhật liên tục)"
					type="button">
					<GitCompare className="size-3.5" />
					<span>
						View Changes ({changesCount} {changesCount === 1 ? "file" : "files"})
					</span>
				</button>
			)}
			{hasButtons && (
				<div className="flex">
					{filteredPrimaryText && filteredPrimaryAction && (
						<VSCodeButton
							appearance="primary"
							className={filteredSecondaryText ? "flex-1 mr-[6px]" : "flex-2"}
							disabled={!canInteract}
							onClick={() => handleActionClick(createActionInvocation(filteredPrimaryAction, getDraftSnapshot))}>
							{filteredPrimaryText}
						</VSCodeButton>
					)}
					{filteredSecondaryText && filteredSecondaryAction && (
						<VSCodeButton
							appearance="secondary"
							className={filteredPrimaryText ? "flex-1" : "flex-2"}
							disabled={!canInteract}
							onClick={() => handleActionClick(createActionInvocation(filteredSecondaryAction, getDraftSnapshot))}>
							{filteredSecondaryText}
						</VSCodeButton>
					)}
				</div>
			)}
		</div>
	)
}
