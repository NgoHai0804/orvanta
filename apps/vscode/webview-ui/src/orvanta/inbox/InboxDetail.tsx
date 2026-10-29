import {
	IconAlertTriangle,
	IconArrowBackUp,
	IconBookmark,
	IconBulb,
	IconChartBar,
	IconCheck,
	IconCode,
	IconFileText,
	IconHistory,
	IconInfoCircle,
	IconShieldCheck,
	IconX,
} from "@tabler/icons-react"
import { useMemo, useState } from "react"
import type { OrvantaHistoryEntry } from "../../../../src/shared/proto/cline/orvanta"
import { type AnyDecisionItem, type InboxSubTab, TYPE_LABELS, URGENCY_LABELS } from "./inbox-types"

interface InboxDetailProps {
	item: AnyDecisionItem | null
	activeSubTab: InboxSubTab
	resolving: boolean
	onAction: (action: "approve" | "reject" | "defer" | "reopen") => void
}

export function InboxDetail({ item, activeSubTab, resolving, onAction }: InboxDetailProps) {
	const [showRawPayload, setShowRawPayload] = useState<boolean>(false)

	const parsedPayload = useMemo(() => {
		if (!item?.payloadJson) return {}
		try {
			return JSON.parse(item.payloadJson)
		} catch {
			return {}
		}
	}, [item])

	if (!item) {
		return (
			<div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
				Chọn một quyết định để xem chi tiết
			</div>
		)
	}

	const typeMeta = TYPE_LABELS[item.type]
	const urgencyMeta = URGENCY_LABELS[item.urgency]
	const TypeIcon = typeMeta?.icon || IconInfoCircle
	const isHighRisk = item.type === "fire_agent" || item.type === "change_purpose" || item.type === "change_policy"
	const isMerge = item.type === "merge"

	const getFooterContextNotice = () => {
		if (item.type === "fire_agent") {
			return "Sa thải sẽ gỡ bỏ agent và điều chuyển task sang Coordinator"
		}
		if (item.type === "change_purpose") {
			return "Thay đổi Purpose sẽ điều hướng lại toàn bộ công ty"
		}
		if (item.type === "merge") {
			return "Duyệt merge sẽ kết nạp mã nguồn vào nhánh chính"
		}
		if (item.type === "change_policy") {
			return "Chính sách mới sẽ được áp dụng ngay lập tức"
		}
		return "Hành động phê duyệt sẽ được ghi vào audit log"
	}

	return (
		<div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden bg-(--vscode-editor-background) text-foreground">
			{/* Fixed Detail Header */}
			<div className="shrink-0 border-b border-border-panel p-3 bg-(--vscode-sideBar-background)/30 space-y-2">
				<div className="flex flex-wrap items-center gap-1.5">
					<span
						className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${
							typeMeta?.color || "bg-surface-secondary text-foreground"
						}`}>
						<TypeIcon size={13} stroke={1.5} />
						<span>{typeMeta?.label || item.type}</span>
					</span>
					{urgencyMeta && (
						<span
							className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${urgencyMeta.color}`}>
							Mức độ: {urgencyMeta.label}
						</span>
					)}
					{item.status && (
						<span className="rounded border border-border-panel bg-surface-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono">
							Trạng thái: {item.status}
						</span>
					)}
				</div>

				<h2 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h2>

				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>
						Được yêu cầu bởi{" "}
						<span className="font-mono text-foreground font-medium">@{item.createdBy || "coordinator"}</span>
					</span>
					{item.createdAt && (
						<>
							<span>·</span>
							<span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
						</>
					)}
				</div>
			</div>

			{/* Scrollable Detail Body */}
			<div className="scroller-y flex-1 min-h-0 p-3 space-y-3 text-xs leading-relaxed">
				{/* 1. Motivation Section */}
				<section className="rounded-md border border-border-panel bg-(--vscode-sideBar-background)/40 p-3 space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-foreground">
						<IconInfoCircle className="text-indigo-400 shrink-0" size={14} stroke={1.5} />
						<span>Tóm tắt & Lý do đề xuất</span>
					</div>
					<div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
						{item.summary || "Không có tóm tắt bổ sung."}
					</div>
				</section>

				{/* 2. Maker-Checker Audit Section */}
				<section className="rounded-md border border-border-panel bg-(--vscode-sideBar-background)/40 p-3 space-y-2.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5 font-semibold text-foreground">
							<IconShieldCheck className="text-emerald-400 shrink-0" size={14} stroke={1.5} />
							<span>Biên bản thẩm định độc lập (Maker-Checker Audit)</span>
						</div>
						<span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
							DoD Verified
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2 text-[11px] border-b border-border-panel/40 pb-2">
						<div>
							<span className="text-muted-foreground">Đề xuất (Maker):</span>
							<div className="font-mono font-medium text-foreground">@{item.createdBy || "coordinator"}</div>
						</div>
						<div>
							<span className="text-muted-foreground">Thẩm định (Checker):</span>
							<div className="font-mono font-medium text-foreground">
								@{parsedPayload.reviewer || parsedPayload.auditor || "reviewer"}
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<div className="text-[11px] font-medium text-muted-foreground">Checkpoints tiêu chuẩn:</div>
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-[11px] text-foreground/90">
								<IconCheck className="text-emerald-400 shrink-0" size={12} stroke={2} />
								<span>Phân tách thẩm quyền Maker-Checker (Segregation of Duties)</span>
							</div>
							<div className="flex items-center gap-2 text-[11px] text-foreground/90">
								<IconCheck className="text-emerald-400 shrink-0" size={12} stroke={2} />
								<span>Kiểm tra tiêu chuẩn Definition of Done (DoD) & Audit Trail</span>
							</div>
							<div className="flex items-center gap-2 text-[11px] text-foreground/90">
								<IconCheck className="text-emerald-400 shrink-0" size={12} stroke={2} />
								<span>Bảo đảm giới hạn an toàn hệ thống (Safety Guardrails)</span>
							</div>
						</div>
					</div>
				</section>

				{/* 3. Deliverables & Technical Data Section */}
				<section className="rounded-md border border-border-panel bg-(--vscode-sideBar-background)/40 p-3 space-y-3">
					<div className="flex items-center gap-1.5 font-semibold text-foreground">
						<IconFileText className="text-cyan-400 shrink-0" size={14} stroke={1.5} />
						<span>Bằng chứng sản phẩm & Dữ liệu kỹ thuật</span>
					</div>

					{/* Artifact path if available */}
					{parsedPayload.artifactPath && (
						<div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
							<IconFileText size={13} stroke={1.5} />
							<span className="truncate">{parsedPayload.artifactPath}</span>
						</div>
					)}

					{/* Type-specific Payload */}
					{item.type === "hire_agent" && (
						<div className="space-y-2.5 rounded border border-border-panel bg-surface-secondary/20 p-3">
							<div className="text-xs font-semibold text-emerald-400">Thông tin Agent đề xuất</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<span className="text-muted-foreground">Mã Agent (ID):</span>
									<div className="font-mono font-medium">{parsedPayload.agentId}</div>
								</div>
								<div>
									<span className="text-muted-foreground">Tên hiển thị:</span>
									<div className="font-medium">{parsedPayload.displayName || parsedPayload.agentId}</div>
								</div>
								{parsedPayload.modelId && (
									<div>
										<span className="text-muted-foreground">Model:</span>
										<div className="font-mono">{parsedPayload.modelId}</div>
									</div>
								)}
								{parsedPayload.maxIterations && (
									<div>
										<span className="text-muted-foreground">Số turn tối đa:</span>
										<div>{parsedPayload.maxIterations}</div>
									</div>
								)}
							</div>
							{(parsedPayload.rolePromptPreview || parsedPayload.instructions) && (
								<div className="mt-2">
									<span className="text-xs text-muted-foreground">Chỉ thị vai trò (Prompt/Instructions):</span>
									<pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-background p-2 text-[11px] font-mono border border-border-panel">
										{parsedPayload.rolePromptPreview || parsedPayload.instructions}
									</pre>
								</div>
							)}
						</div>
					)}
					{item.type === "fire_agent" && (
						<div className="space-y-2 rounded border border-rose-500/30 bg-rose-500/10 p-3">
							<div className="text-xs font-semibold text-rose-400">Đề xuất sa thải Agent</div>
							<div className="text-xs">
								<span className="text-muted-foreground">Agent ID:</span>{" "}
								<span className="font-mono font-bold text-rose-300">{parsedPayload.agentId}</span>
							</div>
							<div className="text-xs">
								<span className="text-muted-foreground">Lý do sa thải:</span>
								<div className="mt-1 rounded bg-background/60 p-2 text-xs">{parsedPayload.reason}</div>
							</div>
							{parsedPayload.reassignTasks && (
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
									<IconCheck className="text-emerald-400 shrink-0" size={12} stroke={2} />
									<span>Các nhiệm vụ đang dở sẽ được coordinator phân bổ lại.</span>
								</div>
							)}
						</div>
					)}

					{item.type === "change_purpose" && (
						<div className="space-y-3 rounded border border-amber-500/30 bg-amber-500/10 p-3">
							<div className="text-xs font-semibold text-amber-400">Đề xuất thay đổi Purpose công ty</div>
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground font-medium">Hiện tại (from):</span>
									<div className="mt-1 rounded border border-rose-500/20 bg-rose-500/5 p-2 font-mono text-[11px] line-through opacity-80">
										{parsedPayload.from || "(Trống)"}
									</div>
								</div>
								<div>
									<span className="text-emerald-400 font-medium">Đề xuất mới (to):</span>
									<div className="mt-1 rounded border border-emerald-500/20 bg-emerald-500/10 p-2 font-mono text-[11px] text-foreground">
										{parsedPayload.to}
									</div>
								</div>
							</div>
							<div className="flex items-start gap-1.5 rounded bg-amber-500/20 p-2 text-[11px] text-amber-300 border border-amber-500/30">
								<IconAlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={13} stroke={1.5} />
								<span>
									<strong>Lưu ý:</strong> Sửa Purpose sẽ steer lại các agent đang hoạt động trong toàn bộ công
									ty.
								</span>
							</div>
						</div>
					)}
					{item.type === "change_scope" && (
						<div className="space-y-3 rounded border border-indigo-500/30 bg-indigo-500/10 p-3">
							<div className="text-xs font-semibold text-indigo-400">Đề xuất thay đổi Scope nhiệm vụ</div>
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground font-medium">Task ID:</span>
									<div className="font-mono text-[11px] font-semibold">{parsedPayload.taskId}</div>
								</div>
								{parsedPayload.title && (
									<div>
										<span className="text-muted-foreground font-medium">Tiêu đề:</span>
										<div>{parsedPayload.title}</div>
									</div>
								)}
								<div>
									<span className="text-rose-400 font-medium">Lý do ngoài purpose:</span>
									<div className="mt-1 rounded bg-background/60 p-2 text-[11px] text-foreground">
										{parsedPayload.whyOutsidePurpose}
									</div>
								</div>
								{parsedPayload.proposedScope && (
									<div>
										<span className="text-indigo-300 font-medium">Scope đề xuất bổ sung:</span>
										<div className="mt-1 rounded bg-background/60 p-2 text-[11px] font-mono text-foreground">
											{parsedPayload.proposedScope}
										</div>
									</div>
								)}
							</div>
							<div className="flex items-start gap-1.5 rounded bg-indigo-500/20 p-2 text-[11px] text-indigo-300 border border-indigo-500/30">
								<IconBulb className="text-indigo-300 shrink-0 mt-0.5" size={13} stroke={1.5} />
								<span>
									<strong>Quyết định:</strong> Duyệt (Approve) sẽ mở khóa task; Từ chối (Reject) sẽ hủy task.
								</span>
							</div>
						</div>
					)}

					{item.type === "merge" && (
						<div className="space-y-3 rounded border border-purple-500/30 bg-purple-500/10 p-3">
							<div className="text-xs font-semibold text-purple-400">Yêu cầu duyệt Merge Outcome</div>
							<div className="space-y-2 text-xs">
								{parsedPayload.outcomeId && (
									<div>
										<span className="text-muted-foreground font-medium">Outcome ID:</span>
										<div className="font-mono text-[11px] font-semibold">{parsedPayload.outcomeId}</div>
									</div>
								)}
								{parsedPayload.authorAgentId && (
									<div>
										<span className="text-muted-foreground font-medium">Tác giả đề xuất:</span>
										<div className="font-mono text-[11px]">{parsedPayload.authorAgentId}</div>
									</div>
								)}
								{parsedPayload.diffSummary && (
									<div>
										<span className="text-muted-foreground font-medium">Tóm tắt thay đổi:</span>
										<div className="mt-1 rounded bg-background/60 p-2 text-[11px] text-foreground whitespace-pre-wrap">
											{parsedPayload.diffSummary}
										</div>
									</div>
								)}
								{Array.isArray(parsedPayload.files) && parsedPayload.files.length > 0 && (
									<div>
										<span className="text-muted-foreground font-medium">
											Các file thay đổi ({parsedPayload.files.length}):
										</span>
										<div className="mt-1 max-h-32 overflow-y-auto rounded bg-background/60 p-2 font-mono text-[11px]">
											{parsedPayload.files.map((f: string) => (
												<div className="truncate text-purple-300" key={f}>
													• {f}
												</div>
											))}
										</div>
									</div>
								)}
								{parsedPayload.risk && (
									<div>
										<span className="text-amber-400 font-medium">Đánh giá rủi ro:</span>
										<div className="mt-1 rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20">
											{parsedPayload.risk}
										</div>
									</div>
								)}
							</div>
							<div className="flex items-start gap-1.5 rounded bg-purple-500/20 p-2 text-[11px] text-purple-300 border border-purple-500/30">
								<IconAlertTriangle className="text-purple-300 shrink-0 mt-0.5" size={13} stroke={1.5} />
								<span>
									<strong>Từ chối Merge:</strong> Bắt buộc có lý do (tối thiểu 8 ký tự). Lý do sẽ gửi thẳng vào
									mailbox của tác giả để sửa chữa.
								</span>
							</div>
						</div>
					)}

					{item.type === "change_role" && (
						<div className="space-y-3 rounded border border-cyan-500/30 bg-cyan-500/10 p-3">
							<div className="text-xs font-semibold text-cyan-400">Đề xuất thay đổi vai trò Agent</div>
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground font-medium">Agent ID:</span>
									<div className="font-mono text-[11px] font-semibold">{parsedPayload.agentId}</div>
								</div>
								{parsedPayload.tools && (
									<div>
										<span className="text-muted-foreground font-medium">Cấu hình Tools mới:</span>
										<pre className="mt-1 rounded bg-background/60 p-2 text-[11px] font-mono">
											{JSON.stringify(parsedPayload.tools, null, 2)}
										</pre>
									</div>
								)}
							</div>
						</div>
					)}

					{item.type === "over_budget" && (
						<div className="space-y-3 rounded border border-red-500/30 bg-red-500/10 p-3">
							<div className="text-xs font-semibold text-red-400">Cảnh báo: Vượt hạn mức chi phí (Budget)</div>
							<div className="grid grid-cols-3 gap-2 text-xs">
								<div className="rounded bg-background/60 p-2">
									<span className="text-muted-foreground text-[11px]">Đã tiêu:</span>
									<div className="font-mono text-sm font-bold text-red-400">${parsedPayload.spentUsd}</div>
								</div>
								<div className="rounded bg-background/60 p-2">
									<span className="text-muted-foreground text-[11px]">Hạn mức:</span>
									<div className="font-mono text-sm font-bold text-foreground">${parsedPayload.limitUsd}</div>
								</div>
								<div className="rounded bg-background/60 p-2">
									<span className="text-muted-foreground text-[11px]">Khung:</span>
									<div className="font-medium">{parsedPayload.window || "Session"}</div>
								</div>
							</div>
						</div>
					)}

					{item.type === "over_ephemeral" && (
						<div className="space-y-3 rounded border border-orange-500/30 bg-orange-500/10 p-3">
							<div className="text-xs font-semibold text-orange-400">Cảnh báo: Vượt số lượng guest ephemeral</div>
							<div className="text-xs space-y-1">
								<div>
									Số lượng guest hiện tại:{" "}
									<strong className="font-mono text-orange-300">{parsedPayload.count}</strong> / tối đa{" "}
									<span className="font-mono">{parsedPayload.limit || 3}</span>.
								</div>
								<div className="text-muted-foreground text-[11px]">
									Lead chỉ được spawn tối đa 3 agent tạm thời mỗi session để tránh lạm dụng bỏ qua Inbox.
								</div>
							</div>
						</div>
					)}

					{item.type === "escalate_blocked" && (
						<div className="space-y-3 rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
							<div className="text-xs font-semibold text-yellow-400">Báo cáo bế tắc (Blocker Escalation)</div>
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground font-medium">Task ID:</span>
									<div className="font-mono text-[11px] font-semibold">{parsedPayload.taskId}</div>
								</div>
								<div>
									<span className="text-muted-foreground font-medium">Chi tiết bế tắc:</span>
									<div className="mt-1 rounded bg-background/60 p-2 text-foreground">
										{parsedPayload.blocker}
									</div>
								</div>
							</div>
						</div>
					)}

					{item.type === "change_policy" && (
						<div className="space-y-3 rounded border border-blue-500/30 bg-blue-500/10 p-3">
							<div className="text-xs font-semibold text-blue-400">Đề xuất thay đổi chính sách công ty</div>
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground font-medium">Chính sách (Policy Key):</span>
									<div className="font-mono text-[11px] font-semibold text-blue-300">{parsedPayload.key}</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<span className="text-muted-foreground">Từ (from):</span>
										<div className="mt-1 rounded bg-background/60 p-1.5 font-mono text-[11px]">
											{parsedPayload.from || "chưa đặt"}
										</div>
									</div>
									<div>
										<span className="text-emerald-400">Thành (to):</span>
										<div className="mt-1 rounded bg-background/60 p-1.5 font-mono text-[11px] font-bold text-emerald-400">
											{parsedPayload.to}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Raw JSON Payload Viewer Toggle */}
					<div className="pt-1">
						<button
							className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors"
							onClick={() => setShowRawPayload(!showRawPayload)}
							type="button">
							<IconCode size={13} stroke={1.5} />
							<span>Dữ liệu payload thô (JSON)</span>
						</button>
						{showRawPayload && (
							<pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-background/80 p-2 text-[10px] font-mono border border-border-panel text-muted-foreground">
								{JSON.stringify(parsedPayload, null, 2)}
							</pre>
						)}
					</div>
				</section>

				{/* 4. Impact & Risk Analysis Section */}
				<section className="rounded-md border border-border-panel bg-(--vscode-sideBar-background)/40 p-3 space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-foreground">
						<IconChartBar className="text-amber-400 shrink-0" size={14} stroke={1.5} />
						<span>Đánh giá tác động & Rủi ro (Impact Analysis)</span>
					</div>
					<div className="grid grid-cols-2 gap-2 text-[11px]">
						<div className="rounded bg-surface-secondary/30 p-2">
							<span className="text-muted-foreground">Token tiêu hao ước tính:</span>
							<div className="font-mono font-medium text-foreground">
								{parsedPayload.tokensEstimate || "~1.5k tokens"}
							</div>
						</div>
						<div className="rounded bg-surface-secondary/30 p-2">
							<span className="text-muted-foreground">Mức độ ảnh hưởng:</span>
							<div className="font-medium text-foreground">
								{item.urgency === "critical"
									? "Toàn bộ hệ thống"
									: item.urgency === "high"
										? "Đội ngũ chuyên trách"
										: "Nhiệm vụ độc lập"}
							</div>
						</div>
					</div>
				</section>

				{/* History Resolution Summary */}
				{activeSubTab === "history" && "resolvedAt" in item && (
					<section className="rounded-md border border-border-panel bg-(--vscode-sideBar-background)/40 p-3 text-xs space-y-1.5">
						<div className="flex items-center gap-1.5 font-medium text-foreground">
							<IconHistory className="text-blue-400 shrink-0" size={14} stroke={1.5} />
							<span>Kết quả giải quyết:</span>
						</div>
						<div className="text-muted-foreground">
							Được{" "}
							<strong className={item.status === "approved" ? "text-emerald-400" : "text-rose-400"}>
								{item.status === "approved" ? "chấp thuận" : "từ chối"}
							</strong>{" "}
							bởi <span className="font-mono text-foreground">{(item as OrvantaHistoryEntry).resolvedBy}</span> vào{" "}
							{new Date((item as OrvantaHistoryEntry).resolvedAt).toLocaleString("vi-VN")}
						</div>
						{(item as OrvantaHistoryEntry).note && (
							<div className="rounded bg-surface-secondary/40 p-2 text-[11px] text-foreground border border-border-panel/40">
								Ghi chú CEO: &ldquo;{(item as OrvantaHistoryEntry).note}&rdquo;
							</div>
						)}
					</section>
				)}
			</div>

			{/* Sticky Action Footer */}
			<div className="shrink-0 border-t border-border-panel p-2.5 bg-(--vscode-sideBar-background)/80 backdrop-blur-xs flex items-center justify-between gap-2">
				<div className="text-[11px] text-muted-foreground truncate max-w-[260px]" title={getFooterContextNotice()}>
					{getFooterContextNotice()}
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{activeSubTab === "pending" && (
						<>
							{/* Secondary: Để sau */}
							<button
								className="border border-border-panel text-muted-foreground hover:text-foreground text-xs px-2.5 py-1 rounded inline-flex items-center gap-1.5 cursor-pointer hover:bg-(--vscode-list-hoverBackground) transition-colors disabled:opacity-50"
								disabled={resolving}
								onClick={() => onAction("defer")}
								type="button">
								<IconBookmark size={13} stroke={1.5} />
								<span>Để sau</span>
							</button>

							{/* Destructive: Từ chối */}
							<button
								className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors disabled:opacity-50"
								disabled={resolving}
								onClick={() => onAction("reject")}
								type="button">
								<IconX size={13} stroke={1.5} />
								<span>{isMerge ? "Từ chối (Cần lý do)..." : "Từ chối"}</span>
							</button>

							{/* Primary: Phê duyệt */}
							<button
								className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer shadow-xs transition-colors disabled:opacity-50"
								disabled={resolving}
								onClick={() => onAction("approve")}
								type="button">
								<IconCheck size={13} stroke={1.5} />
								<span>{isHighRisk ? "Duyệt..." : "Phê duyệt"}</span>
							</button>
						</>
					)}

					{activeSubTab === "deferred" && (
						<>
							{/* Destructive: Từ chối */}
							<button
								className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors disabled:opacity-50"
								disabled={resolving}
								onClick={() => onAction("reject")}
								type="button">
								<IconX size={13} stroke={1.5} />
								<span>Từ chối</span>
							</button>

							{/* Primary: Mở lại */}
							<button
								className="bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors disabled:opacity-50"
								disabled={resolving}
								onClick={() => onAction("reopen")}
								type="button">
								<IconArrowBackUp size={13} stroke={1.5} />
								<span>Mở lại (Chuyển về Chờ duyệt)</span>
							</button>
						</>
					)}

					{activeSubTab === "history" && (
						<div className="flex items-center gap-1.5">
							{item.status === "approved" ? (
								<span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
									<IconCheck size={13} stroke={1.5} />
									<span>Đã chấp thuận</span>
								</span>
							) : (
								<span className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-xs font-medium text-rose-400">
									<IconX size={13} stroke={1.5} />
									<span>Đã bác bỏ</span>
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
