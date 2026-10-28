import {
	type Icon,
	IconCheck,
	IconCode,
	IconCrown,
	IconFile,
	IconPlus,
	IconRobot,
	IconSearch,
	IconShield,
	IconSitemap,
	IconSparkles,
	IconWorld,
	IconX,
} from "@tabler/icons-react"
import { useMemo, useState } from "react"
import type { AgentTreeNode } from "./tree-utils"

export interface AgentTreeChartProps {
	tree: AgentTreeNode | null
	selectedAgentId?: string | null
	onSelectAgent: (agentId: string) => void
	onAddAgent?: (templateKey: string) => void
	className?: string
}

interface TemplateOption {
	id: string
	label: string
	icon: Icon
	description: string
}

export const TEMPLATES: TemplateOption[] = [
	{
		id: "implementer",
		label: "Implementer",
		icon: IconCode,
		description: "Viết code trong scope task, tuân thủ nguyên tắc không nới epic.",
	},
	{
		id: "reviewer",
		label: "Reviewer",
		icon: IconSearch,
		description: "Review code và kết quả theo purpose và tiêu chuẩn chất lượng.",
	},
	{
		id: "researcher",
		label: "Researcher",
		icon: IconWorld,
		description: "Nghiên cứu tài liệu, kiến trúc, công nghệ và phân tích giải pháp.",
	},
	{
		id: "skeptic",
		label: "Skeptic",
		icon: IconShield,
		description: "Chỉ trích phản biện, tìm điểm yếu, edge cases và rủi ro kiến trúc.",
	},
	{
		id: "blank",
		label: "Blank",
		icon: IconFile,
		description: "Tạo agent trống từ đầu, tự định nghĩa vai trò và hướng dẫn.",
	},
]

function getRoleMeta(role: string, id: string): { Icon: Icon; border: string; bg: string } {
	const lowerId = id.toLowerCase()
	const lowerRole = role.toLowerCase()
	if (lowerId === "coordinator" || lowerRole === "lead") {
		return { Icon: IconCrown, border: "border-amber-500/50", bg: "bg-amber-950/40 text-amber-300" }
	}
	if (lowerId.includes("impl") || lowerId.includes("dev") || lowerId.includes("coder")) {
		return { Icon: IconCode, border: "border-blue-500/50", bg: "bg-blue-950/40 text-blue-300" }
	}
	if (lowerId.includes("review")) {
		return { Icon: IconSearch, border: "border-purple-500/50", bg: "bg-purple-950/40 text-purple-300" }
	}
	if (lowerId.includes("research")) {
		return { Icon: IconWorld, border: "border-cyan-500/50", bg: "bg-cyan-950/40 text-cyan-300" }
	}
	if (lowerId.includes("skeptic") || lowerId.includes("guard")) {
		return { Icon: IconShield, border: "border-amber-600/50", bg: "bg-amber-950/40 text-amber-300" }
	}
	return { Icon: IconRobot, border: "border-slate-700", bg: "bg-slate-800/60 text-slate-300" }
}

function countTotalNodes(root: AgentTreeNode | null): number {
	if (!root) return 0
	let count = 1
	for (const child of root.children) {
		count += countTotalNodes(child)
	}
	return count
}

const AgentCard = ({
	node,
	isSelected,
	onSelect,
	hasChildren,
	isCollapsed,
	onToggleCollapse,
}: {
	node: AgentTreeNode
	isSelected: boolean
	onSelect: () => void
	hasChildren: boolean
	isCollapsed: boolean
	onToggleCollapse: () => void
}) => {
	const meta = getRoleMeta(node.role, node.id)
	const isLead = node.role === "lead" || node.id === "coordinator"
	const isRunning = node.status === "running"
	const isIdle = node.status === "idle"
	const isStopped = node.status === "stopped"
	const isPending = node.status.startsWith("pending")

	return (
		<div
			className={`relative group w-46.25 min-w-42.5 max-w-50 rounded-lg p-2.5 transition-all duration-200 cursor-pointer select-none text-left flex flex-col gap-1.5 ${
				isSelected
					? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30 shadow-lg shadow-indigo-500/20"
					: "bg-[#141b34] border border-slate-800 shadow-sm hover:border-indigo-400/60 hover:bg-[#1a2344] hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/10"
			}`}
			data-testid={`agent-node-${node.id}`}
			onClick={onSelect}
			role="button"
			tabIndex={0}>
			{/* Top Header: Avatar + Status + Role badge */}
			<div className="flex items-center justify-between gap-1.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<div
						className={`h-7 w-7 rounded-md border flex items-center justify-center shrink-0 ${meta.border} ${meta.bg}`}
						title={node.displayName}>
						<meta.Icon size={14} stroke={1.5} />
					</div>
					<div className="flex items-center gap-1">
						{isRunning && (
							<span
								className="h-2 w-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-amber-400/50"
								title="Đang chạy"
							/>
						)}
						{isIdle && <span className="h-2 w-2 rounded-full bg-emerald-400" title="Đang chờ (Idle)" />}
						{isStopped && <span className="h-2 w-2 rounded-full bg-slate-500" title="Đã dừng" />}
						{isPending && (
							<span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" title="Đang chờ xử lý" />
						)}
					</div>
				</div>

				<span
					className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0 ${
						isLead
							? "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
							: "bg-slate-800/80 text-slate-400 border border-slate-700/50"
					}`}>
					{isLead ? "LEAD" : "TEAM"}
				</span>
			</div>

			{/* Middle info */}
			<div className="min-w-0">
				<div className="font-semibold text-xs text-white truncate" title={node.displayName}>
					{node.displayName}
				</div>
				<div className="text-[10px] text-slate-400 font-mono truncate" title={`@${node.id}`}>
					@{node.id}
				</div>
			</div>

			{/* Bottom footer: Expand/collapse toggle if has children */}
			<div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
				{hasChildren ? (
					<button
						aria-label={isCollapsed ? `Mở rộng ${node.displayName}` : `Thu gọn ${node.displayName}`}
						className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
						data-testid={`collapse-toggle-${node.id}`}
						onClick={(e) => {
							e.stopPropagation()
							onToggleCollapse()
						}}
						type="button">
						<span>{isCollapsed ? "+" : "−"}</span>
						{isCollapsed && <span className="text-[9px] text-indigo-300 font-sans">({node.children.length})</span>}
					</button>
				) : (
					<span className="text-[10px] text-slate-500 italic">Cấp dưới: 0</span>
				)}

				{isSelected && (
					<span className="text-[9px] font-medium text-indigo-400 flex items-center gap-1">
						<IconCheck size={11} stroke={2} />
						<span className="sr-only">✓</span>
						<span>Đang chọn</span>
					</span>
				)}
			</div>
		</div>
	)
}

const TreeNodeItem = ({
	node,
	selectedAgentId,
	onSelectAgent,
	collapsedNodes,
	onToggleCollapse,
}: {
	node: AgentTreeNode
	selectedAgentId?: string | null
	onSelectAgent: (id: string) => void
	collapsedNodes: Set<string>
	onToggleCollapse: (id: string) => void
}) => {
	const isSelected = selectedAgentId === node.id
	const hasChildren = node.children && node.children.length > 0
	const isCollapsed = collapsedNodes.has(node.id)

	return (
		<div className="flex flex-col items-center">
			<AgentCard
				hasChildren={hasChildren}
				isCollapsed={isCollapsed}
				isSelected={isSelected}
				node={node}
				onSelect={() => onSelectAgent(node.id)}
				onToggleCollapse={() => onToggleCollapse(node.id)}
			/>

			{hasChildren && !isCollapsed && (
				<>
					{/* Vertical stem from parent bottom */}
					<div
						className={`w-[1.5px] h-4 transition-colors duration-200 ${
							isSelected ? "bg-indigo-500" : "bg-slate-700"
						}`}
					/>

					{/* Children row */}
					<div className="flex items-start justify-center">
						{node.children.map((child, index) => {
							const isFirst = index === 0
							const isLast = index === node.children.length - 1
							const isOnly = node.children.length === 1

							return (
								<div className="flex flex-col items-center px-2 relative" key={child.id}>
									{/* Horizontal connector bar across siblings */}
									{!isOnly && (
										<div
											className={`absolute top-0 h-[1.5px] bg-slate-700 ${
												isFirst ? "left-1/2 right-0" : isLast ? "left-0 right-1/2" : "left-0 right-0"
											}`}
										/>
									)}

									{/* Vertical stem into child top */}
									<div
										className={`w-[1.5px] h-4 transition-colors duration-200 ${
											selectedAgentId === child.id ? "bg-indigo-500" : "bg-slate-700"
										}`}
									/>

									{/* Child subtree */}
									<TreeNodeItem
										collapsedNodes={collapsedNodes}
										node={child}
										onSelectAgent={onSelectAgent}
										onToggleCollapse={onToggleCollapse}
										selectedAgentId={selectedAgentId}
									/>
								</div>
							)
						})}
					</div>
				</>
			)}
		</div>
	)
}

export const AgentTreeChart = ({ tree, selectedAgentId, onSelectAgent, onAddAgent, className = "" }: AgentTreeChartProps) => {
	const [zoom, setZoom] = useState(100)
	const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
	const [showAddModal, setShowAddModal] = useState(false)

	const totalAgents = useMemo(() => countTotalNodes(tree), [tree])

	const handleToggleCollapse = (nodeId: string) => {
		setCollapsedNodes((prev) => {
			const next = new Set(prev)
			if (next.has(nodeId)) {
				next.delete(nodeId)
			} else {
				next.add(nodeId)
			}
			return next
		})
	}

	const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 140))
	const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 60))
	const handleZoomReset = () => setZoom(100)

	const handleSelectTemplate = (templateKey: string) => {
		setShowAddModal(false)
		if (onAddAgent) {
			onAddAgent(templateKey)
		}
	}

	return (
		<div
			className={`relative flex flex-col h-full w-full bg-[#0a0e1a] overflow-hidden select-none ${className}`}
			data-testid="agent-tree-chart">
			{/* Top Chart Header / Toolbar */}
			<div className="flex items-center justify-between px-3 py-2 border-b border-border-panel bg-[#10162a]/90 backdrop-blur-xs shrink-0 z-10">
				<div className="flex items-center gap-2">
					<IconSitemap className="text-indigo-400 shrink-0" size={16} stroke={1.5} />
					<span className="font-semibold text-xs text-white">Sơ đồ tổ chức</span>
					<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
						{totalAgents} agents
					</span>
				</div>

				<div className="flex items-center gap-2">
					{/* Zoom controls */}
					<div className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-1 py-0.5">
						<button
							className="px-1.5 py-0.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
							data-testid="zoom-out-button"
							onClick={handleZoomOut}
							title="Thu nhỏ sơ đồ"
							type="button">
							−
						</button>
						<button
							className="px-1 text-[10px] font-mono text-slate-300 hover:text-white transition-colors"
							data-testid="zoom-reset-button"
							onClick={handleZoomReset}
							title="Khôi phục tỉ lệ 100%"
							type="button">
							{zoom}%
						</button>
						<button
							className="px-1.5 py-0.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
							data-testid="zoom-in-button"
							onClick={handleZoomIn}
							title="Phóng to sơ đồ"
							type="button">
							+
						</button>
					</div>

					{/* + Thêm Agent button */}
					<button
						className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
						data-testid="add-agent-button"
						onClick={() => setShowAddModal(true)}
						type="button">
						<IconPlus size={13} stroke={2} />
						<span>Thêm Agent</span>
					</button>
				</div>
			</div>

			{/* Chart Viewport */}
			<div className="flex min-h-0 flex-1 items-start justify-center scroller p-6">
				{tree ? (
					<div
						style={{
							transform: `scale(${zoom / 100})`,
							transformOrigin: "top center",
							transition: "transform 0.15s ease-out",
						}}>
						<TreeNodeItem
							collapsedNodes={collapsedNodes}
							node={tree}
							onSelectAgent={onSelectAgent}
							onToggleCollapse={handleToggleCollapse}
							selectedAgentId={selectedAgentId}
						/>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center text-slate-500 text-xs py-12 gap-2">
						<span>Chưa có dữ liệu cơ cấu tổ chức</span>
					</div>
				)}
			</div>

			{/* Template Picker Modal */}
			{showAddModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
					data-testid="template-picker-modal">
					<div className="w-full max-w-md rounded-lg border border-border-panel bg-[#141b34] p-4 shadow-xl flex flex-col gap-3">
						<div className="flex items-center justify-between border-b border-white/10 pb-2">
							<div className="flex items-center gap-2">
								<IconSparkles className="text-indigo-400" size={16} stroke={1.5} />
								<h3 className="font-semibold text-sm text-white">Thêm Agent mới</h3>
							</div>
							<button
								className="text-xs text-slate-400 hover:text-white p-1 rounded cursor-pointer"
								onClick={() => setShowAddModal(false)}
								type="button">
								<IconX size={14} stroke={1.5} />
							</button>
						</div>

						<p className="text-xs text-slate-300">
							Chọn một mẫu Agent được cấu hình sẵn theo vai trò chuyên biệt hoặc bắt đầu với mẫu trống:
						</p>

						<div className="flex flex-col gap-2 max-h-80 scroller-y pr-1">
							{TEMPLATES.map((tmpl) => {
								const TmplIcon = tmpl.icon
								return (
									<button
										className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-800 bg-[#0e1428] hover:border-indigo-500 hover:bg-[#161f3e] transition-all text-left group cursor-pointer"
										data-testid={`template-card-${tmpl.id}`}
										key={tmpl.id}
										onClick={() => handleSelectTemplate(tmpl.id)}
										type="button">
										<span className="p-1.5 rounded-md bg-white/5 border border-white/10 shrink-0 text-indigo-300">
											<TmplIcon size={18} stroke={1.5} />
										</span>
										<div className="min-w-0">
											<div className="font-semibold text-xs text-white group-hover:text-indigo-300 transition-colors">
												{tmpl.label}
											</div>
											<div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
												{tmpl.description}
											</div>
										</div>
									</button>
								)
							})}
						</div>

						<div className="flex justify-end pt-2 border-t border-white/10">
							<button
								className="px-3 py-1 text-xs rounded border border-border-panel text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
								onClick={() => setShowAddModal(false)}
								type="button">
								Hủy
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default AgentTreeChart
