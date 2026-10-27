# ADR-001: Orvanta là lớp công ty trên Cline, không phải runtime mới

## Status

Proposed

## Date

2026-10-27

## Context

Orvanta cần một đội AI bền theo workspace, đúng mục tiêu, CEO nhẹ duyệt quyết định lớn. Repo là fork Cline: đã có Agent loop, ChatView, Agent Teams (`TeamRuntimeState`, TeamStore, `team_*` tools), sub-agent, presets `.cline/agents/`.

Cám dỗ: viết orchestrator / queue / “company runtime” riêng, hoặc extension VS Code mới song song `apps/vscode`.

## Decision

1. **Giữ Cline runtime.** Orvanta thêm hiến pháp (`.orvanta/`), purpose-lock, Inbox, và bốn màn A–D trong webview hiện có.
2. **Một extension.** Đổi brand và thêm view trong `apps/vscode`, không tạo package extension thứ hai.
3. **TeamStore theo workspace.** Khi công ty valid, persist team dưới `.orvanta/`, không `~/.cline/data/teams`.
4. **ChatView không viết lại, không unmount.** Sidebar đội + chip focus là lớp mỏng.
5. **Hire bền = Inbox + spawn Cline.** Không có vòng đời agent thứ hai.

## Alternatives considered

### Viết orchestrator Orvanta riêng

- Pros: mô hình “công ty” sạch, không mang cờ Cline.
- Cons: nhân đôi loop, tool, approval, persistence; lệch ngay khi Cline đổi teams.
- Rejected: job là quản lý và khóa mục tiêu, không phải tự chế agent.

### Extension mới gọi `@cline/sdk`

- Pros: tách brand sạch.
- Cons: mất ChatView, settings, approval UX; tháng đầu xây lại nhà.
- Rejected: surface đã chốt = quản lý trong chỗ đang code, trên nền chat đã có.

### Chỉ dùng `.cline/agents/` + `/team`

- Pros: gần như không code.
- Cons: state global, không inbox, không home, không lock răng, không gitignore theo ý founder.
- Rejected: không giải pain “lệch mục tiêu” và “không có công ty”.

### AI CEO tự trị

- Pros: khớp slogan “giống công ty”.
- Cons: không ai giữ purpose; founder đã chọn CEO nhẹ.
- Rejected.

## Consequences

- Phải bật `enableAgentTeams` trong VS Code session factory khi có công ty (hiện hardcode `false`).
- Phải nối purpose-lock vào pipeline tool (deny structured, không throw).
- Schema `.orvanta/` và TeamStore phải đồng bộ `teamName` / agentId.
- D-full phụ thuộc việc host có stream event teammate hay không; nếu thiếu, ship D-min.
- Rebase Cline upstream sẽ đụng `apps/vscode` và team tools — chấp nhận, vì ta sống trên chúng.

## Follow-up

- Founder duyệt docs `docs/orvanta/` rồi mới P1.
- Khi implement persist path, ghi chú chính xác thư mục TeamStore trong schema nếu lệch `state/team`.
