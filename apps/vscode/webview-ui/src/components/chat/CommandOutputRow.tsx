import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING } from "@shared/combineCommandSequences"
import { ClineMessage } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import { ChevronDown, ChevronRight } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileServiceClient } from "@/services/grpc-client"
import CodeBlock from "../common/CodeBlock"
import { CHAT_HEADER_ROW, CHAT_HEADER_TITLE, CHAT_ROW_LUCIDE } from "./chatRowStyles"
import ExpandHandle from "./ExpandHandle"

export const CommandOutputContent = memo(
	({
		output,
		isOutputFullyExpanded,
		onToggle,
		isContainerExpanded,
		onOutputChange,
	}: {
		output: string
		isOutputFullyExpanded: boolean
		onToggle: () => void
		isContainerExpanded: boolean
		onOutputChange?: () => void
	}) => {
		const outputLines = output.split("\n")
		const lineCount = outputLines.length
		const shouldAutoShow = lineCount <= 5
		const outputRef = useRef<HTMLDivElement>(null)

		// Auto-scroll to bottom when output changes (only when showing limited output)
		useEffect(() => {
			if (!isOutputFullyExpanded && outputRef.current) {
				// Direct scrollTop manipulation
				outputRef.current.scrollTop = outputRef.current.scrollHeight

				// Another attempt with more delay (for slower renders) to ensure scrolling works
				setTimeout(() => {
					if (outputRef.current) {
						outputRef.current.scrollTop = outputRef.current.scrollHeight
					}
				}, 50)
			}
		}, [output, isOutputFullyExpanded])

		useEffect(() => {
			if (isContainerExpanded) {
				onOutputChange?.()
			}
		}, [output, isOutputFullyExpanded, isContainerExpanded, onOutputChange])

		// Don't render anything if container is collapsed
		if (!isContainerExpanded) {
			return null
		}

		// Check if output contains a log file path indicator
		const logFilePathMatch = output.match(/📋 Output is being logged to: ([^\n]+)/)
		const logFilePath = logFilePathMatch ? logFilePathMatch[1].trim() : null

		// Render output with clickable log file path
		const renderOutput = () => {
			if (!logFilePath) {
				return <CodeBlock forceWrap={true} source={`${"```"}shell\n${output}\n${"```"}`} />
			}

			// Split output into parts: before log path, log path line, after log path
			const logPathLineStart = output.indexOf("📋 Output is being logged to:")
			const logPathLineEnd = output.indexOf("\n", logPathLineStart)
			const beforeLogPath = output.substring(0, logPathLineStart)
			const afterLogPath = logPathLineEnd !== -1 ? output.substring(logPathLineEnd) : ""

			// Extract just the filename from the full path for display
			const fileName = logFilePath.split("/").pop() || logFilePath

			return (
				<div className="border border-editor-group-border rounded-sm">
					{beforeLogPath && <CodeBlock forceWrap={true} source={`${"```"}shell\n${beforeLogPath}\n${"```"}`} />}
					<div
						className="flex flex-wrap items-center gap-1.5 px-3 py-2 mx-2 my-1.5 rounded-sm bg-banner-background cursor-pointer hover:brightness-110 transition-colors"
						onClick={() => {
							FileServiceClient.openFile(StringRequest.create({ value: logFilePath })).catch((err) =>
								console.error("Failed to open log file:", err),
							)
						}}
						title={`Click to open: ${logFilePath}`}>
						<span className="shrink-0">📋 Output is being logged to:</span>
						<span className="text-vscode-textLink-foreground underline break-all">{fileName}</span>
					</div>
					{afterLogPath && <CodeBlock forceWrap={true} source={`${"```"}shell\n${afterLogPath}\n${"```"}`} />}
				</div>
			)
		}

		return (
			<div
				className={cn("w-full relative pb-0 overflow-visible border-t border-editor-group-border bg-code rounded-sm", {
					"rounded-b-none": lineCount > 5,
				})}>
				<div
					className={cn("text-white scroll-smooth bg-code overflow-y-auto", {
						"max-h-[75px]": !shouldAutoShow && !isOutputFullyExpanded,
						"max-h-[200px]": !shouldAutoShow && isOutputFullyExpanded,
						"overflow-y-visible": shouldAutoShow,
					})}
					ref={outputRef}>
					<div className="bg-code">{renderOutput()}</div>
				</div>
				{/* Show notch only if there's more than 5 lines */}
				{lineCount > 5 && <ExpandHandle isExpanded={isOutputFullyExpanded} onToggle={onToggle} />}
			</div>
		)
	},
)

CommandOutputContent.displayName = "CommandOutputContent"

export const CommandOutputRow = memo(
	({
		message,
		isCommandExecuting = false,
		isCommandPending = false,
		isCommandCompleted = false,
		isBackgroundExec = false, // vscodeTerminalExecutionMode === "backgroundExec"
		onCancelCommand,
		icon,
		title,
		isOutputFullyExpanded,
		setIsOutputFullyExpanded,
		onOutputChange,
	}: {
		message: ClineMessage
		isCommandExecuting?: boolean
		isCommandPending?: boolean
		isCommandCompleted?: boolean
		isBackgroundExec?: boolean
		onCancelCommand?: () => void
		icon?: JSX.Element | null
		title?: JSX.Element | null
		isOutputFullyExpanded: boolean
		setIsOutputFullyExpanded: (expanded: boolean) => void
		onOutputChange?: () => void
	}) => {
		const splitMessage = (text: string) => {
			const outputIndex = text.indexOf(COMMAND_OUTPUT_STRING)
			if (outputIndex === -1) {
				return { command: text, output: "" }
			}
			return {
				command: text.slice(0, outputIndex).trim(),
				output: text
					.slice(outputIndex + COMMAND_OUTPUT_STRING.length)
					.trim()
					.split("")
					.map((char) => {
						switch (char) {
							case "\t":
								return "→   "
							case "\b":
								return "⌫"
							case "\f":
								return "⏏"
							case "\v":
								return "⇳"
							default:
								return char
						}
					})
					.join(""),
			}
		}

		const { command: rawCommand, output } = splitMessage(message.text || "")

		const requestsApproval = rawCommand.endsWith(COMMAND_REQ_APP_STRING)
		const command = requestsApproval ? rawCommand.slice(0, -COMMAND_REQ_APP_STRING.length) : rawCommand
		const showCancelButton =
			(isCommandExecuting || isCommandPending) && typeof onCancelCommand === "function" && isBackgroundExec

		const [isCommandBodyExpanded, setIsCommandBodyExpanded] = useState(false)

		const actorId = message?.agentId ?? message?.agent_id
		const actor =
			(actorId
				? actorId.charAt(0).toUpperCase() + actorId.slice(1)
				: (message?.agentDisplayName ?? message?.agent_display_name)) || "Cline"

		const commandHeader = (
			<div className={`${CHAT_HEADER_ROW} flex-wrap`}>
				{icon}
				{title ?? <span className={CHAT_HEADER_TITLE}>{actor} wants to execute this command:</span>}
			</div>
		)

		return (
			<>
				{commandHeader}
				<div
					className="bg-code rounded-sm border border-editor-group-border"
					style={{
						transition: "all 0.3s ease-in-out",
					}}>
					{command && (
						<div
							className="bg-code flex items-center justify-between px-2.5 py-1.5 border-b border-editor-group-border rounded-sm cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
							onClick={() => setIsCommandBodyExpanded((prev) => !prev)}>
							<div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
								<div
									className={cn(
										"inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border shrink-0",
										{
											"bg-emerald-500/10 text-emerald-400 border-emerald-500/30": isCommandExecuting,
											"bg-amber-500/10 text-amber-400 border-amber-500/30": isCommandPending,
											"bg-slate-800/80 text-slate-300 border-slate-700/60": isCommandCompleted,
											"bg-slate-800 text-slate-400 border-slate-700":
												!isCommandExecuting && !isCommandPending && !isCommandCompleted,
										},
									)}>
									<span
										className={cn("rounded-full w-1.5 h-1.5 shrink-0", {
											"bg-emerald-400 animate-pulse": isCommandExecuting,
											"bg-amber-400 animate-ping": isCommandPending,
											"bg-emerald-400": isCommandCompleted,
											"bg-slate-400": !isCommandExecuting && !isCommandPending && !isCommandCompleted,
										})}
									/>
									<span>{getCommandStatusText(isCommandExecuting, isCommandPending, isCommandCompleted)}</span>
								</div>
								<span className="font-mono text-xs text-foreground/80 truncate opacity-90 max-w-sm">
									{command}
								</span>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{showCancelButton && (
									<Button
										onClick={(e) => {
											e.stopPropagation()
											if (isBackgroundExec) {
												onCancelCommand?.()
											} else {
												alert(
													"This command is running in the VSCode terminal. You can manually stop it using Ctrl+C in the terminal, or switch to Background Execution mode in settings for cancellable commands.",
												)
											}
										}}
										size="sm"
										variant="secondary">
										{isBackgroundExec ? "cancel" : "stop"}
									</Button>
								)}
								<div className="text-description hover:text-foreground p-0.5">
									{isCommandBodyExpanded ? (
										<ChevronDown {...CHAT_ROW_LUCIDE} />
									) : (
										<ChevronRight {...CHAT_ROW_LUCIDE} />
									)}
								</div>
							</div>
						</div>
					)}

					{isCommandBodyExpanded && (
						<>
							<div className="bg-code opacity-75 text-sm max-h-48 overflow-auto">
								<CodeBlock forceWrap={true} source={`${"```"}shell\n${command}\n${"```"}`} />
							</div>

							{output.length > 0 && (
								<CommandOutputContent
									isContainerExpanded={true}
									isOutputFullyExpanded={isOutputFullyExpanded}
									onOutputChange={onOutputChange}
									onToggle={() => setIsOutputFullyExpanded(!isOutputFullyExpanded)}
									output={output}
								/>
							)}
						</>
					)}
				</div>
				{requestsApproval && (
					<div className="flex items-center gap-2.5 p-2 text-[12px] text-editor-warning-foreground">
						<i className="codicon codicon-warning" />
						<span>The model has determined this command requires explicit approval.</span>
					</div>
				)}
			</>
		)
	},
)

CommandOutputRow.displayName = "CommandOutputRow"

const CommandStatusMap = {
	executing: "Đang chạy",
	pending: "Chờ duyệt",
	completed: "Hoàn tất",
	skipped: "Bỏ qua",
}

function getCommandStatusText(isExecuting: boolean, isPending: boolean, isCompleted: boolean): string {
	if (isExecuting) {
		return CommandStatusMap.executing
	}
	if (isPending) {
		return CommandStatusMap.pending
	}
	if (isCompleted) {
		return CommandStatusMap.completed
	}
	return CommandStatusMap.skipped
}
