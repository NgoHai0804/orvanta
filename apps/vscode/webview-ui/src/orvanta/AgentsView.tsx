import { OrvantaAgentProfile, type OrvantaCompanyResponse, type OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { useMemo, useState } from "react"
import { AgentEditor } from "./AgentEditor"
import { AgentTreeChart } from "./AgentTreeChart"
import { buildAgentTree } from "./tree-utils"

export type AgentsViewProps = {
	company?: OrvantaCompanyResponse | null
	profiles?: Record<string, OrvantaAgentProfile>
	onSaveAgentProfile?: (profile: OrvantaAgentProfile) => Promise<boolean>
	onDeleteAgentProfile?: (agentId: string) => Promise<boolean>
	onChatWithAgent?: (agentId: string) => void
	onOpenWarRoom?: () => void
}

export function createTemplateProfile(templateKey: string, parentId: string, existingIds: string[]): OrvantaAgentProfile {
	const baseId = templateKey === "blank" ? "new-agent" : templateKey
	let targetId = baseId
	let counter = 1
	while (existingIds.includes(targetId)) {
		targetId = `${baseId}-${counter++}`
	}

	const templates: Record<string, Partial<OrvantaAgentProfile>> = {
		implementer: {
			displayName: "Code Implementer",
			role: "teammate",
			description: "Hiện thực hóa mã nguồn, giải quyết tính năng và sửa lỗi",
			instructions:
				"## Trách nhiệm chính\n- Viết mã nguồn chất lượng cao theo đặc tả\n- Tuân thủ coding guidelines và conventions",
			tools: { allow: ["read_files", "edit_file", "new_file", "list_files"], deny: [] },
		},
		reviewer: {
			displayName: "Code Reviewer",
			role: "teammate",
			description: "Đánh giá chất lượng mã nguồn, phát hiện bug, bảo mật và logic",
			instructions:
				"## Trách nhiệm chính\n- Rà soát mã nguồn kỹ lưỡng trước khi merge\n- Đảm bảo tuân thủ tiêu chuẩn chất lượng",
			tools: { allow: ["read_files", "search_files", "list_files"], deny: ["edit_file", "new_file"] },
		},
		researcher: {
			displayName: "Tech Researcher",
			role: "teammate",
			description: "Tìm kiếm thông tin, giải pháp kỹ thuật, nghiên cứu tài liệu",
			instructions: "## Trách nhiệm chính\n- Khảo sát tài liệu kỹ thuật\n- Đánh giá các thư viện và giải pháp kiến trúc",
			tools: { allow: ["read_files", "fetch_web_content", "fetch_web_search"], deny: ["edit_file", "new_file"] },
		},
		skeptic: {
			displayName: "Critical Skeptic",
			role: "teammate",
			description: "Phản biện kiến trúc, phát hiện edge cases và rủi ro tiềm ẩn",
			instructions:
				"## Trách nhiệm chính\n- Đặt câu hỏi phản biện về thiết kế hệ thống\n- Tìm kiếm các điểm nghẽn và rủi ro",
			tools: { allow: ["read_files", "search_files", "search_codebase"], deny: ["edit_file", "new_file"] },
		},
		blank: {
			displayName: "New Agent",
			role: "teammate",
			description: "Mô tả nhiệm vụ agent mới",
			instructions: "## Hướng dẫn hoạt động\n- Nhập hướng dẫn cho agent tại đây",
			tools: { allow: ["read_files", "edit_file", "new_file"], deny: [] },
		},
	}

	const t = templates[templateKey] || templates.blank

	return OrvantaAgentProfile.create({
		id: targetId,
		displayName: t.displayName || targetId,
		role: t.role || "teammate",
		description: t.description || "",
		instructions: t.instructions || "",
		reportsTo: parentId || "coordinator",
		tools: t.tools || { allow: ["read_files"], deny: [] },
		scopePaths: {
			allow: ["**/*"],
			denyWrite: [],
		},
	})
}

const AgentsView = ({
	company,
	profiles,
	onSaveAgentProfile,
	onDeleteAgentProfile,
	onChatWithAgent,
	onOpenWarRoom,
}: AgentsViewProps) => {
	const rosterAgents = useMemo<OrvantaRosterAgent[]>(() => {
		if (!company) return []
		const anyCompany = company as any
		return anyCompany.company?.roster?.agents || company.agents || []
	}, [company])

	const profilesMap = useMemo<Record<string, OrvantaAgentProfile>>(() => {
		if (profiles) return profiles
		return (company as any)?.profiles || {}
	}, [company, profiles])

	const tree = useMemo(() => {
		return buildAgentTree(rosterAgents, profilesMap)
	}, [rosterAgents, profilesMap])

	const [selectedAgentId, setSelectedAgentId] = useState<string>("coordinator")
	const [newProfileDraft, setNewProfileDraft] = useState<OrvantaAgentProfile | null>(null)

	// Determine existing IDs
	const existingIds = useMemo(() => {
		const ids = new Set<string>(rosterAgents.map((a: OrvantaRosterAgent) => a.id))
		Object.keys(profilesMap).forEach((id) => ids.add(id))
		return Array.from(ids)
	}, [rosterAgents, profilesMap])

	// Determine active profile for editor
	const activeProfile = useMemo<OrvantaAgentProfile | null>(() => {
		if (newProfileDraft) {
			return newProfileDraft
		}

		if (profilesMap[selectedAgentId]) {
			return profilesMap[selectedAgentId]
		}

		const rosterAgent = rosterAgents.find((a: OrvantaRosterAgent) => a.id === selectedAgentId)
		if (rosterAgent) {
			return OrvantaAgentProfile.create({
				id: rosterAgent.id,
				displayName: rosterAgent.displayName || rosterAgent.id,
				role: rosterAgent.role || "teammate",
				description: "",
				instructions: `## ${rosterAgent.displayName || rosterAgent.id}\n- Hướng dẫn thực thi nhiệm vụ`,
				reportsTo: rosterAgent.reportsTo || (rosterAgent.id === "coordinator" ? undefined : "coordinator"),
			})
		}

		if (selectedAgentId === "coordinator") {
			return OrvantaAgentProfile.create({
				id: "coordinator",
				displayName: "Company Coordinator",
				role: "lead",
				description: "Điều phối viên công ty",
				instructions: "## Trách nhiệm Coordinator\n- Điều phối toàn bộ hoạt động",
			})
		}

		return null
	}, [newProfileDraft, selectedAgentId, profilesMap, rosterAgents])

	const isNew = Boolean(newProfileDraft)
	const isCoordinator = !isNew && activeProfile?.id === "coordinator"

	const handleSelectAgent = (agentId: string) => {
		setNewProfileDraft(null)
		setSelectedAgentId(agentId)
	}

	const handleAddAgent = (templateKey: string) => {
		const parentId = selectedAgentId || "coordinator"
		const draft = createTemplateProfile(templateKey, parentId, existingIds)
		setNewProfileDraft(draft)
	}

	const handleSave = async (profile: OrvantaAgentProfile): Promise<boolean> => {
		if (onSaveAgentProfile) {
			const success = await onSaveAgentProfile(profile)
			if (success) {
				setNewProfileDraft(null)
				setSelectedAgentId(profile.id)
			}
			return success
		}
		setNewProfileDraft(null)
		setSelectedAgentId(profile.id)
		return true
	}

	const handleDelete = async (agentId: string): Promise<boolean> => {
		if (onDeleteAgentProfile) {
			const success = await onDeleteAgentProfile(agentId)
			if (success) {
				setNewProfileDraft(null)
				setSelectedAgentId("coordinator")
			}
			return success
		}
		setNewProfileDraft(null)
		setSelectedAgentId("coordinator")
		return true
	}

	return (
		<div
			className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0e1a] text-slate-200"
			data-testid="agents-view">
			{/* Top Panel: Tree Chart (Split 42%) */}
			<div
				className="flex shrink-0 flex-col overflow-hidden border-b border-border-panel"
				style={{ height: "42%", minHeight: "220px" }}>
				<AgentTreeChart
					onAddAgent={handleAddAgent}
					onSelectAgent={handleSelectAgent}
					selectedAgentId={isNew ? null : selectedAgentId}
					tree={tree}
				/>
			</div>

			{/* Split Divider / Resizer Bar */}
			<div
				className="flex h-2 w-full shrink-0 items-center justify-center bg-slate-900 border-y border-border-panel/40 cursor-row-resize hover:bg-indigo-950/40 transition-colors"
				data-testid="split-divider">
				<div className="h-0.5 w-10 rounded-full bg-slate-600" />
			</div>

			{/* Bottom Panel: Agent Detail Editor (58% flex-1) */}
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden relative">
				{activeProfile ? (
					<AgentEditor
						allProfiles={profilesMap}
						existingIds={existingIds}
						initialProfile={activeProfile}
						isCoordinator={isCoordinator}
						isNew={isNew}
						key={`${activeProfile.id}-${isNew ? "new" : "edit"}`}
						onChatWithAgent={onChatWithAgent}
						onClose={() => setNewProfileDraft(null)}
						onDelete={isNew ? undefined : handleDelete}
						onOpenWarRoom={onOpenWarRoom}
						onSave={handleSave}
						rosterAgents={rosterAgents}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-slate-400 text-xs">
						<span>Chọn một agent trên sơ đồ cây để xem và chỉnh sửa chi tiết</span>
					</div>
				)}
			</div>
		</div>
	)
}

export default AgentsView
