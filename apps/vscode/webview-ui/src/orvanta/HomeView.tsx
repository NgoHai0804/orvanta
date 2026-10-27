import { AGENT_TEMPLATES, COORDINATOR_PROFILE_TEMPLATE, PURPOSE_TEMPLATE, parseAgentProfile } from "@cline/shared/orvanta"
import { EmptyRequest, StringRequest } from "@shared/proto/cline/common"
import { OrvantaAgentProfile, type OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { useState } from "react"
import MarkdownBlock from "@/components/common/MarkdownBlock"
import { OrvantaServiceClient } from "@/services/grpc-client"
import AgentEditor from "./AgentEditor"
import LibraryDialog, { type LibraryDialogMode } from "./LibraryDialog"

const emptyRequest = {} as EmptyRequest

function templateToProto(content: string, overrideId?: string): OrvantaAgentProfile {
	try {
		const parsed = parseAgentProfile(content)
		return OrvantaAgentProfile.create({
			id: overrideId !== undefined ? overrideId : parsed.id,
			displayName: parsed.displayName,
			role: parsed.role,
			description: parsed.description,
			modelId: parsed.modelId ?? undefined,
			maxIterations: parsed.maxIterations || 40,
			temperature: parsed.temperature ?? undefined,
			instructions: parsed.instructions,
			filePath: parsed.filePath,
			tools: {
				allow: parsed.tools?.allow ?? [],
				deny: parsed.tools?.deny ?? [],
			},
			scopePaths: {
				allow: parsed.scopePaths?.allow ?? [],
				denyWrite: parsed.scopePaths?.denyWrite ?? [],
			},
		})
	} catch {
		return OrvantaAgentProfile.create({
			id: overrideId || "",
			displayName: "",
			role: "teammate",
			description: "",
			maxIterations: 40,
			instructions: "",
			tools: { allow: [], deny: [] },
			scopePaths: { allow: ["**/*"], denyWrite: [] },
		})
	}
}

type HomeViewProps = {
	company: OrvantaCompanyResponse
	loading?: boolean
	creating: boolean
	createError?: string
	onCreate: (name: string, purpose: string) => Promise<unknown>
	onRefresh?: () => Promise<void>
	agentProfiles?: Record<string, OrvantaAgentProfile>
	onSaveAgentProfile?: (profile: OrvantaAgentProfile) => Promise<boolean>
	onDeleteAgentProfile?: (agentId: string) => Promise<boolean>
}

const HomeView = ({
	company,
	loading,
	creating,
	createError,
	onCreate,
	onRefresh,
	onSaveAgentProfile,
	onDeleteAgentProfile,
}: HomeViewProps) => {
	const [expandedPurpose, setExpandedPurpose] = useState(false)
	const [showTemplatePicker, setShowTemplatePicker] = useState(false)
	const [activeEditorProfile, setActiveEditorProfile] = useState<OrvantaAgentProfile | undefined>()
	const [isEditorNew, setIsEditorNew] = useState(false)
	const [showMenu, setShowMenu] = useState(false)
	const [libraryDialogMode, setLibraryDialogMode] = useState<LibraryDialogMode | undefined>()

	const handleSelectTemplate = (templateKey: string) => {
		const tmpl = AGENT_TEMPLATES.find((t) => t.id === templateKey)
		if (!tmpl) return
		const proto = templateToProto(tmpl.template, templateKey === "blank" ? "" : templateKey)
		setActiveEditorProfile(proto)
		setIsEditorNew(true)
		setShowTemplatePicker(false)
	}

	const handleOpenAgent = async (agentId: string) => {
		try {
			const res = await OrvantaServiceClient.listAgentProfiles(emptyRequest)
			const found = res.profiles.find((p) => p.id === agentId)
			if (found) {
				setActiveEditorProfile(found)
				setIsEditorNew(false)
				return
			}
		} catch (err) {
			console.error("listAgentProfiles error", err)
		}
		const agent = (company.agents ?? []).find((a) => a.id === agentId)
		const fallback =
			agent?.role === "lead"
				? templateToProto(COORDINATOR_PROFILE_TEMPLATE, agentId)
				: OrvantaAgentProfile.create({
						id: agentId,
						displayName: agent?.displayName || agentId,
						role: (agent?.role as string) || "teammate",
						description: "",
						maxIterations: 40,
						instructions: "",
						tools: { allow: [], deny: [] },
						scopePaths: { allow: ["**/*"], denyWrite: [] },
					})
		setActiveEditorProfile(fallback)
		setIsEditorNew(false)
	}

	const handleSaveAgent = async (profile: OrvantaAgentProfile): Promise<boolean> => {
		if (onSaveAgentProfile) {
			return onSaveAgentProfile(profile)
		}
		try {
			await OrvantaServiceClient.upsertAgentProfile(profile)
			if (onRefresh) {
				await onRefresh()
			}
			return true
		} catch (err) {
			console.error("upsertAgentProfile error", err)
			return false
		}
	}

	const handleDeleteAgent = async (agentId: string): Promise<boolean> => {
		if (onDeleteAgentProfile) {
			return onDeleteAgentProfile(agentId)
		}
		try {
			await OrvantaServiceClient.deleteAgentProfile(StringRequest.create({ value: agentId }))
			if (onRefresh) {
				await onRefresh()
			}
			return true
		} catch (err) {
			console.error("deleteAgentProfile error", err)
			return false
		}
	}

	const errors = company.errors ?? []
	const agents = company.agents ?? []
	const purpose = company.purpose ?? ""

	if (loading && company.status === "missing" && !company.id) {
		return (
			<div className="flex flex-1 items-center justify-center p-4 text-xs opacity-70">
				<span className="codicon codicon-loading codicon-modifier-spin mr-2" />
				Đang tải…
			</div>
		)
	}

	const noFolder = errors.includes("no_folder")
	if (company.status === "missing" && noFolder) {
		return (
			<div className="flex flex-col gap-2 p-3 text-sm">
				<h2 className="text-base font-semibold">Orvanta</h2>
				<p className="opacity-80">Mở một folder workspace để lập công ty.</p>
			</div>
		)
	}

	if (company.status === "broken") {
		return (
			<div className="flex flex-col gap-2 p-3 text-sm">
				<h2 className="text-base font-semibold text-error">Công ty bị lỗi</h2>
				<ul className="list-disc pl-4 text-error text-xs space-y-1">
					{errors.length > 0 ? (
						errors.map((error) => <li key={error}>{error}</li>)
					) : (
						<li>Cấu trúc thư mục .orvanta không hợp lệ.</li>
					)}
				</ul>
			</div>
		)
	}

	if (company.status === "ready") {
		const purposeTagline = (() => {
			const lines = purpose
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
			const contentLine = lines.find((line) => !/^#\s*purpose$/i.test(line)) || lines[0] || ""
			return contentLine.replace(/^#+\s*/, "").slice(0, 120)
		})()

		return (
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm">
				<header className="flex items-start justify-between">
					<div>
						<h2 className="text-base font-semibold">{company.name}</h2>
						{purposeTagline && <p className="text-xs opacity-75">{purposeTagline}</p>}
					</div>
					<div className="relative">
						<button
							className="rounded px-2 py-0.5 text-xs font-bold opacity-70 hover:bg-white/10 hover:opacity-100"
							onClick={() => setShowMenu((prev) => !prev)}
							title="Tùy chọn thư viện"
							type="button">
							···
						</button>
						{showMenu && (
							<div className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded border border-border-panel bg-(--vscode-editor-background) p-1 shadow-xl">
								<button
									className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-white/5"
									onClick={() => {
										setShowMenu(false)
										setLibraryDialogMode("save")
									}}
									type="button">
									Lưu công ty…
								</button>
								<button
									className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-white/5"
									onClick={() => {
										setShowMenu(false)
										setLibraryDialogMode("load")
									}}
									type="button">
									Tải công ty…
								</button>
							</div>
						)}
					</div>
				</header>
				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold uppercase tracking-wide opacity-70">Purpose</h3>
						<button
							className="text-xs text-(--vscode-textLink-foreground) hover:underline"
							onClick={() => setExpandedPurpose((prev) => !prev)}
							type="button">
							{expandedPurpose ? "Thu gọn" : "Xem thêm"}
						</button>
					</div>
					<div className={expandedPurpose ? "" : "max-h-48 overflow-hidden line-clamp-8"}>
						<MarkdownBlock markdown={purpose} />
					</div>
				</section>
				<section className="relative flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold uppercase tracking-wide opacity-70">Roster</h3>
						<button
							className="rounded border border-border-panel px-2 py-0.5 text-xs hover:bg-white/5"
							onClick={() => setShowTemplatePicker(true)}
							type="button">
							+ Thêm agent
						</button>
					</div>
					<div className="flex flex-col gap-2">
						{agents.map((agent) => (
							<button
								className="flex w-full cursor-pointer items-center justify-between rounded border border-border-panel bg-(--vscode-editor-background) px-2.5 py-2 text-left hover:border-(--vscode-focusBorder)"
								key={agent.id}
								onClick={() => handleOpenAgent(agent.id)}
								type="button">
								<div>
									<div className="font-medium text-xs">{agent.displayName}</div>
									<div className="text-[11px] opacity-60">@{agent.id}</div>
								</div>
								<div className="flex items-center gap-1.5 text-xs">
									<span className="rounded bg-(--vscode-badge-background) px-1.5 py-0.5 text-[10px] font-semibold uppercase text-(--vscode-badge-foreground)">
										{agent.role}
									</span>
									<span className="rounded border border-border-panel px-1.5 py-0.5 text-[10px] opacity-80">
										{agent.status}
									</span>
									<span className="text-[11px] opacity-50 hover:opacity-100">Sửa →</span>
								</div>
							</button>
						))}
					</div>
				</section>

				{/* Template Picker Modal */}
				{showTemplatePicker && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
						<div className="flex max-w-sm w-full flex-col gap-3 rounded border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-sm">Chọn template agent</h3>
								<button
									className="text-xs opacity-60 hover:opacity-100"
									onClick={() => setShowTemplatePicker(false)}
									type="button">
									✕
								</button>
							</div>
							<div className="flex flex-col gap-1.5">
								{AGENT_TEMPLATES.map((tmpl) => (
									<button
										className="flex flex-col rounded border border-border-panel p-2 text-left hover:bg-white/5"
										key={tmpl.id}
										onClick={() => handleSelectTemplate(tmpl.id)}
										type="button">
										<span className="font-medium text-xs">{tmpl.label}</span>
										<span className="text-[11px] opacity-70">{tmpl.description}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Agent Editor Overlay */}
				{activeEditorProfile && (
					<AgentEditor
						existingIds={agents.map((a) => a.id)}
						initialProfile={activeEditorProfile}
						isCoordinator={activeEditorProfile.role === "lead"}
						isNew={isEditorNew}
						onClose={() => setActiveEditorProfile(undefined)}
						onDelete={handleDeleteAgent}
						onSave={handleSaveAgent}
					/>
				)}

				{/* Library Dialog Overlay */}
				{libraryDialogMode && (
					<LibraryDialog
						currentCompany={company}
						mode={libraryDialogMode}
						onClose={() => setLibraryDialogMode(undefined)}
						onCompanyLoaded={async () => {
							setLibraryDialogMode(undefined)
							if (onRefresh) {
								await onRefresh()
							}
						}}
					/>
				)}
			</div>
		)
	}

	return (
		<>
			<CreateCompanyForm
				creating={creating}
				error={createError}
				onCreate={onCreate}
				onOpenLoadLibrary={() => setLibraryDialogMode("load")}
			/>
			{libraryDialogMode && (
				<LibraryDialog
					currentCompany={company}
					mode={libraryDialogMode}
					onClose={() => setLibraryDialogMode(undefined)}
					onCompanyLoaded={async () => {
						setLibraryDialogMode(undefined)
						if (onRefresh) {
							await onRefresh()
						}
					}}
				/>
			)}
		</>
	)
}

const CreateCompanyForm = ({
	creating,
	error,
	onCreate,
	onOpenLoadLibrary,
}: {
	creating: boolean
	error?: string
	onCreate: (name: string, purpose: string) => Promise<unknown>
	onOpenLoadLibrary: () => void
}) => {
	const [name, setName] = useState("")
	const [purpose, setPurpose] = useState(PURPOSE_TEMPLATE)
	const [clientError, setClientError] = useState<string | undefined>()

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()
		const trimmedName = name.trim()
		const trimmedPurpose = purpose.trim()
		if (!trimmedName) {
			setClientError("Vui lòng nhập tên công ty")
			return
		}
		if (trimmedPurpose.length < 20) {
			setClientError("Purpose phải có ít nhất 20 ký tự")
			return
		}
		setClientError(undefined)
		void onCreate(trimmedName, trimmedPurpose)
	}

	const displayError = clientError || error

	return (
		<form className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm" onSubmit={handleSubmit}>
			<h2 className="text-base font-semibold">Lập công ty cho folder này</h2>
			<label className="flex flex-col gap-1">
				<span className="text-xs font-bold uppercase tracking-wide opacity-70">Tên</span>
				<input
					className="rounded border border-border-panel bg-input-background px-2 py-1"
					maxLength={64}
					onChange={(event) => {
						setName(event.target.value)
						if (clientError) setClientError(undefined)
					}}
					placeholder="Tên công ty"
					required
					value={name}
				/>
			</label>
			<label className="flex min-h-40 flex-1 flex-col gap-1">
				<span className="text-xs font-bold uppercase tracking-wide opacity-70">Purpose</span>
				<textarea
					className="min-h-32 flex-1 resize-y rounded border border-border-panel bg-input-background px-2 py-1 font-mono text-xs"
					onChange={(event) => {
						setPurpose(event.target.value)
						if (clientError) setClientError(undefined)
					}}
					required
					value={purpose}
				/>
			</label>
			{displayError && <p className="text-xs text-error">{displayError}</p>}
			<div className="flex items-center gap-2">
				<button
					className="flex-1 rounded bg-(--vscode-button-background) px-3 py-1.5 text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-50"
					disabled={creating}
					type="submit">
					{creating ? "Đang ghi .orvanta…" : "Lập công ty"}
				</button>
				<button
					className="rounded border border-border-panel px-3 py-1.5 text-xs hover:bg-white/5"
					onClick={onOpenLoadLibrary}
					type="button">
					Tải từ thư viện
				</button>
			</div>
		</form>
	)
}

export default HomeView
