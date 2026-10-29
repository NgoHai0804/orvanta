export interface ChatTab {
	/** Định danh duy nhất của tab trên Webview UI (uuid hoặc timestamp string) */
	id: string

	/** Tiêu đề hiển thị trên thanh tab (thường lấy theo yêu cầu đầu tiên của CEO) */
	title: string

	/** Agent ID đang phụ trách hoặc đang được focus trong phiên này (ví dụ: "coordinator", "implementer", "team-feed") */
	activeAgentId: string

	/**
	 * BẢN ĐỒ AGENT TASK: Gắn kết từng Agent với Task ID tương ứng trong phiên này
	 * Ví dụ: { "coordinator": "task-01", "implementer": "task-02" }
	 */
	agentTasks: Record<string, string>

	/**
	 * BẢN ĐỒ DRAFT INPUT: Lưu nội dung đang gõ dở theo từng Agent để không bị mất khi chuyển đổi
	 * Ví dụ: { "coordinator": "", "implementer": "Hãy viết thêm test..." }
	 */
	agentDrafts?: Record<string, string>

	/** Danh sách các Agent IDs tham gia trong phiên này */
	agentIds: string[]

	/** Thời điểm tạo tab (timestamp) */
	createdAt: number

	/** Thời điểm tương tác cuối cùng (timestamp) */
	lastActiveAt: number

	/** Trạng thái cờ đang chạy (running) hay chờ người dùng */
	isRunning?: boolean

	/** @deprecated Tương thích ngược: Task ID của activeAgentId */
	taskId?: string

	/** @deprecated Tương thích ngược: Draft input của activeAgentId */
	draftInput?: string
}

export interface ChatTabsState {
	/** Danh sách các tab đang mở */
	tabs: ChatTab[]

	/** ID của tab đang được chọn hiển thị */
	activeTabId: string

	/** Trạng thái mở/đóng của History Drawer */
	isHistoryOpen: boolean
}

export const CONSOLE_TABS_STORAGE_KEY = "orvanta_console_tabs_state"
export const DEFAULT_TAB_TITLE = "Phiên làm việc mới"
export const MAX_TABS_COUNT = 15
