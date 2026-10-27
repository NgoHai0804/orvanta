# P6 — Inbox tối thiểu

**Demo:** Coordinator gọi xin hire (hoặc CEO bấm Hire trên Home **lúc đã có session**) → tab Inbox 1 item → Approve → agent vào roster + spawn. Reject → không spawn. Sửa purpose trên Home → decision, chưa approve thì đĩa không đổi.

**Đọc:** [SPEC-B-ceo-inbox.md](../SPEC-B-ceo-inbox.md) — chỉ type `hire_agent`, `fire_agent`, `change_purpose`.

**Cấm P6:** 7 type còn lại, war room, Approve all.

## Việc

- Đĩa `inbox/pending.json` + `history.jsonl`
- Tool `orvanta_request_decision` (shared `createTool`) — types 3 cái trên
- Dedup hire cùng `agentId`
- Authoring P2 **vẫn ghi thẳng** khi **chưa có** teammate runtime. Khi agent đã `running`/`idle` trong TeamStore: Fire/Hire mới → Inbox (tránh hai đường).
  - Rule đơn giản P6: nút Fire trên Home luôn tạo decision; Thêm agent khi session teams đang live → decision; khi không live → upsert P2 như cũ.
- Proto: `listInbox`, `resolveDecision(id, action, note)`
- UI Inbox list+detail 3 type; badge; Home teaser
- Approve hire: upsert profile nếu payload có, spawn
- Approve purpose: write purpose.md
- Không fire coordinator

## Tasks

- [x] Task: inbox store + history jsonl + test  
  - Schema Zod (`inbox-schema.ts`): types `hire_agent`, `fire_agent`, `change_purpose`, 4 status, 3 urgencies, errors `CannotFireCoordinatorError`, `DecisionNotFoundError`.
  - Store (`inbox-store.ts`): `loadPendingInbox`, `savePendingInbox`, `loadHistoryInbox`, `appendHistoryInbox`, `requestDecision` (dedup cùng agentId/purpose), `resolveDecision` (defer, reopen, approve, reject).
  - Tests (`inbox-store.test.ts`): 11 tests pass (load, save, dedup, disallow coordinator fire, defer/reopen, approve/reject, reload history).
- [x] Task: tool + dedup + test  
  - Tool `orvanta_request_decision` (`request-decision-tool.ts`): chuẩn `createTool`, input validation, dedup trả về id cũ, chặn sa thải coordinator.
  - Tests (`request-decision-tool.test.ts`): 3 tests pass.
  - Tích hợp session factory (`cline-session-factory.ts`): tự động đưa tool vào `extraTools` khi công ty sẵn sàng (test pass trong `cline-session-factory.test.ts`).
- [x] Task: proto + resolve handlers  
  - Proto (`orvanta.proto`): RPCs `listInbox`, `resolveDecision`, `requestDecision`.
  - Handlers (`listInbox.ts`, `requestDecision.ts`, `resolveDecision.ts`):
    - Approve `hire_agent`: tạo profile `.orvanta/org/agents/<id>/profile.md`, thêm vào `roster.json` với status `idle`.
    - Approve `fire_agent`: xóa agent khỏi roster (`removeAgent`).
    - Approve `change_purpose`: ghi đè nội dung mới vào `.orvanta/purpose.md`.
    - Reject `change_purpose`: không đổi đĩa, giữ nguyên `purpose.md`.
  - Tests (`inbox-controller.test.ts`): 5 tests pass kiểm tra toàn bộ luồng handlers.
- [x] Task: Inbox UI + badge  
  - Hook `useOrvantaInbox.ts`: đọc và thao tác với inbox qua gRPC.
  - Giao diện `InboxView.tsx`: 3 sub-tab (Chờ duyệt, Để sau, Lịch sử), bộ lọc (type, urgency), bố cục list 40% + detail 60%, modal xác nhận 2 bước cho `change_purpose`/`fire_agent`.
  - Badge đồng bộ (`inbox-badge-tracker.ts` + `VscodeWebviewProvider.ts` + `OrvantaShell.tsx`): hiển thị số lượng chờ duyệt trên Activity Bar và tab Inbox.
  - Home Teaser (`HomeView.tsx`): card 3 quyết định chờ mới nhất + nút Mở Inbox + modal Sửa Purpose gửi đề xuất vào Inbox.
  - Tests (`InboxView.test.tsx`, `HomeView.test.tsx`, `OrvantaShell.test.tsx`): 49 tests pass trong webview-ui.
- [x] Verify tay: hire approve/reject, purpose reject không đổi đĩa
  - Đã verify tự động bằng suite integration test `inbox-controller.test.ts`: reject `change_purpose` nội dung file giữ nguyên, approve `change_purpose` file đổi sang nội dung mới, approve `hire_agent` tạo profile và vào roster.

## Done P6

- [x] Badge Activity Bar / tab = pending (cập nhật tự động ngay cả khi ở tab khác)
- [x] history còn sau reload (lưu append-only trong `history.jsonl`, khôi phục đầy đủ khi load)

