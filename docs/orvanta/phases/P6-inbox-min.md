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

- [ ] Task: inbox store + history jsonl + test  
- [ ] Task: tool + dedup + test  
- [ ] Task: proto + resolve handlers  
- [ ] Task: Inbox UI + badge  
- [ ] Verify tay: hire approve/reject, purpose reject không đổi đĩa

## Done P6

- [ ] Badge Activity Bar / tab = pending
- [ ] history còn sau reload
