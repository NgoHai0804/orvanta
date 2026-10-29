import { isCloudTargetReady } from "@shared/cloud/cloud-sessions"
import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import React from "react"
import ChatTextArea from "@/components/chat/ChatTextArea"
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"

interface InputSectionProps {
	chatState: ChatState
	messageHandlers: MessageHandlers
	scrollBehavior: ScrollBehavior
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
	focusAgent?: OrvantaRosterAgent
	onResetFocusAgent?: () => void
	contextTask?: { id: string; title: string }
	contextDecision?: { id: string; title: string }
	onClearContextTask?: () => void
	onClearContextDecision?: () => void
}

/**
 * Input section including quoted message preview and chat text area
 */
export const InputSection: React.FC<InputSectionProps> = ({
	chatState,
	messageHandlers,
	scrollBehavior,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
	focusAgent,
	onResetFocusAgent,
	contextTask,
	contextDecision,
	onClearContextTask,
	onClearContextDecision,
}) => {
	const {
		activeQuote,
		setActiveQuote,
		isTextAreaFocused,
		inputValue,
		setInputValue,
		sendingDisabled,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		textAreaRef,
		handleFocusChange,
		lastMessage,
		pendingResponse,
	} = chatState

	const { isAtBottom, scrollToBottomAuto } = scrollBehavior
	const { turnState, cloudSessionsEnabled, cloudTaskTarget, currentCloudTask, clineMessages = [] } = useExtensionState()
	const legacyTaskRunning =
		turnState === undefined &&
		(lastMessage?.partial === true || (lastMessage?.type === "say" && lastMessage.say === "api_req_started"))
	const allowSubmitWhileDisabled =
		turnState?.phase === "streaming" ||
		turnState?.phase === "awaiting_approval" ||
		(messageHandlers.errorRecoveryAvailable && pendingResponse === undefined && !messageHandlers.recoveryActionInFlight) ||
		legacyTaskRunning
	const cloudSelectedForNewTask = clineMessages.length === 0 && !!cloudSessionsEnabled && cloudTaskTarget?.target === "cloud"
	// The task-target panel above the composer shows what is still missing.
	const cloudTargetIncomplete = cloudSelectedForNewTask && !isCloudTargetReady(cloudTaskTarget)
	// Local file paths cannot be read from a cloud sandbox. Refuse the send
	// rather than silently dropping the attachments from the request.
	const cloudFilesUnsupported = cloudSelectedForNewTask && selectedFiles.length > 0
	// A provisioning sandbox has no session to queue a follow-up on yet; the draft stays in the composer.
	const isStopped = focusAgent?.status === "stopped"
	const isPendingHire = focusAgent?.status?.startsWith("pending_")
	const isAgentDisabled = isStopped || isPendingHire
	const effectivePlaceholderText = isStopped
		? "Agent đã dừng. Hire lại từ Home."
		: isPendingHire
			? "Chờ duyệt hire."
			: placeholderText

	const submitDisabled =
		isAgentDisabled ||
		(sendingDisabled && !allowSubmitWhileDisabled) ||
		cloudTargetIncomplete ||
		cloudFilesUnsupported ||
		currentCloudTask?.status === "provisioning"

	const handleSendWithContext = () => {
		let prefix = ""
		if (contextTask) {
			prefix += `[CEO đang nói về task ${contextTask.id}: ${contextTask.title}]\n`
		}
		if (contextDecision) {
			prefix += `[CEO đang nói về decision ${contextDecision.id}: ${contextDecision.title}]\n`
		}
		if (focusAgent && focusAgent.role !== "lead" && focusAgent.id !== "coordinator") {
			prefix += `[CEO to @${focusAgent.id} (${focusAgent.displayName}) via mailbox]: `
		}
		messageHandlers.handleSendMessage(`${prefix}${inputValue}`, selectedImages, selectedFiles)
	}

	return (
		<div className="flex flex-col w-full shrink-0">
			{cloudFilesUnsupported && (
				<p className="mx-[15px] mt-[10px] mb-0 text-[11px] leading-snug text-description" role="status">
					Attached files can't be sent to a cloud sandbox. Remove them, or mention them in the prompt and let the agent
					read them from the repository.
				</p>
			)}
			{activeQuote && (
				<div style={{ marginBottom: "-12px", marginTop: "10px" }}>
					<QuotedMessagePreview
						isFocused={isTextAreaFocused}
						onDismiss={() => setActiveQuote(null)}
						text={activeQuote}
					/>
				</div>
			)}
			{contextTask && (
				<div
					aria-label={`Task: ${contextTask.title}`}
					className="mx-3.5 mt-2 -mb-1 flex items-center gap-1.5 text-xs text-description"
					data-testid="context-task-chip">
					<span>Task:</span>
					<span className="inline-flex items-center gap-1 rounded bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 font-medium text-[11px]">
						<span>{contextTask.title}</span>
						{onClearContextTask && (
							<button
								aria-label="Bỏ task context"
								className="ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
								onClick={onClearContextTask}
								title="Bỏ context task"
								type="button">
								✕
							</button>
						)}
					</span>
				</div>
			)}
			{contextDecision && (
				<div
					aria-label={`Decision: ${contextDecision.title}`}
					className="mx-3.5 mt-2 -mb-1 flex items-center gap-1.5 text-xs text-description"
					data-testid="context-decision-chip">
					<span>Decision:</span>
					<span className="inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 font-medium text-[11px]">
						<span>{contextDecision.title}</span>
						{onClearContextDecision && (
							<button
								aria-label="Bỏ decision context"
								className="ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
								onClick={onClearContextDecision}
								title="Bỏ context decision"
								type="button">
								✕
							</button>
						)}
					</span>
				</div>
			)}
			{focusAgent && (
				<div
					aria-label={`Nói với ${focusAgent.displayName}`}
					className="mx-3.5 mt-2 -mb-1 flex items-center gap-1.5 text-xs text-description"
					data-testid="composer-focus-chip">
					<span>Nói với:</span>
					<span className="inline-flex items-center gap-1 rounded bg-(--vscode-badge-background) text-(--vscode-badge-foreground) px-1.5 py-0.5 font-medium text-[11px]">
						<span>{focusAgent.displayName}</span>
						{(focusAgent.role === "lead" || focusAgent.id === "coordinator") && (
							<span className="text-amber-400" title="Coordinator">
								★
							</span>
						)}
						{focusAgent.role !== "lead" && focusAgent.id !== "coordinator" && onResetFocusAgent && (
							<button
								aria-label="Quay lại coordinator"
								className="ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
								onClick={onResetFocusAgent}
								title="Quay lại coordinator"
								type="button">
								✕
							</button>
						)}
					</span>
				</div>
			)}

			<ChatTextArea
				activeQuote={activeQuote}
				inputValue={inputValue}
				onFocusChange={handleFocusChange}
				onHeightChange={() => {
					if (isAtBottom) {
						scrollToBottomAuto()
					}
				}}
				onSelectFilesAndImages={selectFilesAndImages}
				onSend={handleSendWithContext}
				placeholderText={effectivePlaceholderText}
				ref={textAreaRef}
				selectedFiles={selectedFiles}
				selectedImages={selectedImages}
				sendingDisabled={submitDisabled}
				setInputValue={setInputValue}
				setSelectedFiles={setSelectedFiles}
				setSelectedImages={setSelectedImages}
				shouldDisableFilesAndImages={shouldDisableFilesAndImages}
			/>
		</div>
	)
}
