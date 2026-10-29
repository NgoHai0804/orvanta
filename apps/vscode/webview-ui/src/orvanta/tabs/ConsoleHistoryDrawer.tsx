import { StringArrayRequest } from "@shared/proto/cline/common"
import {
	IconClock,
	IconCoin,
	IconExternalLink,
	IconFolder,
	IconMessage,
	IconRobot,
	IconSearch,
	IconTrash,
	IconX,
} from "@tabler/icons-react"
import React, { useContext, useMemo, useState } from "react"
import { ExtensionStateContext } from "@/context/ExtensionStateContext"
import { TaskServiceClient } from "@/services/grpc-client"

export interface ConsoleHistoryDrawerProps {
	isOpen: boolean
	onClose: () => void
	onSelectTask: (taskId: string, title?: string, agentId?: string, sessionAgentTasks?: Record<string, string>) => void
	onDeleteTask?: (taskId: string) => void
	currentTaskId?: string
	companyAgents?: Array<{ id: string; displayName?: string; role?: string }>
}

function formatTimestamp(ts: number): string {
	const d = new Date(ts)
	const now = new Date()
	const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
	if (diffSec < 60) return "Vừa xong"
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
	return d.toLocaleDateString("vi-VN", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export const ConsoleHistoryDrawer: React.FC<ConsoleHistoryDrawerProps> = ({
	isOpen,
	onClose,
	onSelectTask,
	onDeleteTask,
	currentTaskId,
	companyAgents = [],
}) => {
	const extensionState = useContext(ExtensionStateContext)
	const taskHistory = extensionState?.taskHistory
	const [searchQuery, setSearchQuery] = useState("")
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
	const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())

	const filteredTasks = useMemo(() => {
		const list = (taskHistory || []).filter((item) => !deletedIds.has(item.id))
		const query = searchQuery.trim().toLowerCase()

		if (!query) {
			return list
		}

		return list.filter((item) => {
			const textMatch = item.task?.toLowerCase().includes(query)
			const idMatch = item.id?.toLowerCase().includes(query)
			const agentMatch = item.agents?.some(
				(a) =>
					a.id.toLowerCase().includes(query) ||
					a.displayName?.toLowerCase().includes(query) ||
					a.role?.toLowerCase().includes(query),
			)
			const promptAgentsMatch = companyAgents.some(
				(ca) =>
					(ca.id.toLowerCase().includes(query) || (ca.displayName?.toLowerCase().includes(query) ?? false)) &&
					item.task?.toLowerCase().includes(ca.id.toLowerCase()),
			)

			return textMatch || idMatch || agentMatch || promptAgentsMatch
		})
	}, [taskHistory, searchQuery, deletedIds, companyAgents])

	const handleDelete = async (taskId: string) => {
		try {
			await TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ value: [taskId] }))
			setDeletedIds((prev) => new Set(prev).add(taskId))
			setConfirmDeleteId(null)
			onDeleteTask?.(taskId)
		} catch (error) {
			console.error("Failed to delete task:", error)
		}
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-y-0 right-0 z-50 w-full sm:w-[360px] max-w-full flex flex-col bg-[var(--vscode-sideBar-background)] border-l border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))] shadow-2xl animate-in slide-in-from-right duration-200"
			data-testid="console-history-drawer">
			{/* Drawer Header */}
			<div className="flex items-center justify-between p-3 border-b border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))] bg-[var(--vscode-sideBarSectionHeader-background,rgba(255,255,255,0.02))]">
				<div className="flex flex-col">
					<div className="flex items-center gap-1.5 font-medium text-xs text-[var(--vscode-foreground)]">
						<IconClock className="text-cyan-400" size={15} />
						<span>Lịch sử cuộc trò chuyện</span>
					</div>
					<div className="flex items-center gap-1 text-[10px] text-[var(--vscode-descriptionForeground)] mt-0.5">
						<IconFolder size={11} />
						<span>.orvanta/history</span>
					</div>
				</div>
				<button
					aria-label="Đóng lịch sử"
					className="p-1 rounded text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)] transition-colors"
					onClick={onClose}
					type="button">
					<IconX size={16} />
				</button>
			</div>

			{/* Search Bar (No Filter Buttons) */}
			<div className="p-3 border-b border-[var(--vscode-sideBar-border,rgba(255,255,255,0.08))] flex flex-col gap-1.5">
				<div className="relative flex items-center">
					<IconSearch
						className="absolute left-2.5 text-[var(--vscode-input-placeholderForeground)] pointer-events-none"
						size={14}
					/>
					<input
						className="w-full h-8 pl-8 pr-7 text-xs rounded bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border,rgba(255,255,255,0.1))] focus:outline-none focus:border-[var(--vscode-focusBorder,#007fd4)]"
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Tìm kiếm yêu cầu, mã task, hoặc agent..."
						type="text"
						value={searchQuery}
					/>
					{searchQuery && (
						<button
							aria-label="Xóa từ khóa tìm kiếm"
							className="absolute right-2 text-xs text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)]"
							onClick={() => setSearchQuery("")}
							type="button">
							×
						</button>
					)}
				</div>
				<div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)] px-0.5">
					<span>{searchQuery ? `Kết quả cho "${searchQuery}"` : "Tất cả cuộc trò chuyện"}</span>
					<span>{filteredTasks.length} phiên</span>
				</div>
			</div>

			{/* Task List Container */}
			<div className="flex-1 overflow-y-auto p-2 space-y-1.5">
				{filteredTasks.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--vscode-descriptionForeground)]">
						<IconMessage className="opacity-30 mb-2" size={32} />
						<span>
							{searchQuery ? "Không tìm thấy phiên làm việc phù hợp" : "Chưa có phiên làm việc nào được lưu"}
						</span>
					</div>
				) : (
					filteredTasks.map((task) => {
						const isCurrent = task.id === currentTaskId
						const isConfirmingDelete = confirmDeleteId === task.id
						const totalTokens = (task.tokensIn || 0) + (task.tokensOut || 0)
						const displayTitle = task.task || "Phiên hội thoại không tên"

						const taskAgents =
							task.agents && task.agents.length > 0
								? task.agents
								: companyAgents.filter((ca) => task.task?.toLowerCase().includes(ca.id.toLowerCase()))

						return (
							<div
								className={`
									group p-2.5 rounded border text-left cursor-pointer transition-all duration-150 flex flex-col gap-1.5
									${
										isCurrent
											? "border-[var(--vscode-focusBorder,#007fd4)] bg-[var(--vscode-editor-background)]"
											: "border-[var(--vscode-sideBar-border,rgba(255,255,255,0.06))] bg-[var(--vscode-sideBarSectionHeader-background,rgba(255,255,255,0.01))] hover:border-[var(--vscode-focusBorder,#007fd4)] hover:bg-[var(--vscode-toolbar-hoverBackground)]"
									}
								`}
								key={task.id}
								onClick={() => {
									if (!isConfirmingDelete) {
										const firstAgent = taskAgents[0]?.id || "coordinator"
										const targetTaskId = task.agentTasks?.[firstAgent] || task.id
										onSelectTask(targetTaskId, displayTitle, firstAgent, task.agentTasks)
									}
								}}>
								{/* Card Header & Action Buttons */}
								<div className="flex items-start justify-between gap-2">
									<div className="font-medium text-xs text-[var(--vscode-foreground)] line-clamp-2 leading-relaxed flex-1">
										{displayTitle}
									</div>
									<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
										<button
											className="p-1 rounded hover:bg-[var(--vscode-button-background,#007fd4)] hover:text-white text-[var(--vscode-descriptionForeground)] transition-colors"
											onClick={(e) => {
												e.stopPropagation()
												const firstAgent = taskAgents[0]?.id || "coordinator"
												const targetTaskId = task.agentTasks?.[firstAgent] || task.id
												onSelectTask(targetTaskId, displayTitle, firstAgent, task.agentTasks)
											}}
											title="Mở vào tab mới và tiếp tục chat"
											type="button">
											<IconExternalLink size={13} />
										</button>
										<button
											aria-label="Xóa cuộc trò chuyện"
											className="p-1 rounded hover:bg-rose-500 hover:text-white text-[var(--vscode-descriptionForeground)] transition-colors"
											onClick={(e) => {
												e.stopPropagation()
												setConfirmDeleteId(task.id)
											}}
											title="Xóa cuộc trò chuyện"
											type="button">
											<IconTrash size={13} />
										</button>
									</div>
								</div>

								{/* Agent Badges: Click agent badge to jump directly to that agent's conversation */}
								{taskAgents.length > 0 && (
									<div className="flex items-center gap-1 flex-wrap mt-0.5">
										{taskAgents.map((ag) => (
											<button
												className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] hover:bg-[var(--vscode-button-background,#007fd4)] hover:text-white transition-colors cursor-pointer"
												key={ag.id}
												onClick={(e) => {
													e.stopPropagation()
													const agentTaskId = task.agentTasks?.[ag.id] || task.id
													onSelectTask(agentTaskId, displayTitle, ag.id, task.agentTasks)
												}}
												title={`Xem trao đổi với ${ag.displayName || ag.id}`}
												type="button">
												<IconRobot className="shrink-0 opacity-80" size={10} />
												<span>@{ag.id}</span>
											</button>
										))}
									</div>
								)}

								{/* Inline Confirmation when Deleting */}
								{isConfirmingDelete ? (
									<div
										className="mt-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2"
										onClick={(e) => e.stopPropagation()}>
										<span className="text-[11px] text-rose-400 font-medium">Xác nhận xóa?</span>
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												className="px-2 py-0.5 text-[10px] rounded border border-[var(--vscode-input-border,rgba(255,255,255,0.1))] text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]"
												onClick={() => setConfirmDeleteId(null)}
												type="button">
												Hủy
											</button>
											<button
												className="px-2 py-0.5 text-[10px] rounded bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors"
												onClick={() => handleDelete(task.id)}
												type="button">
												Xóa
											</button>
										</div>
									</div>
								) : (
									/* Timestamp & Usage Footer */
									<div className="flex items-center justify-between text-[10px] text-[var(--vscode-descriptionForeground)] mt-0.5">
										<span className="flex items-center gap-1">
											<IconClock size={11} />
											{formatTimestamp(task.ts)}
										</span>

										<div className="flex items-center gap-2">
											{totalTokens > 0 && <span>{totalTokens.toLocaleString()} tokens</span>}
											{task.totalCost ? (
												<span className="flex items-center text-emerald-400">
													<IconCoin className="mr-0.5" size={10} />${task.totalCost.toFixed(3)}
												</span>
											) : null}
										</div>
									</div>
								)}
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}
