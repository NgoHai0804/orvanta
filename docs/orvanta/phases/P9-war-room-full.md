# P9 — War room D-full

**Demo:** Card implementer hiện chữ đang stream.

**Phụ thuộc:** host có assistant delta của teammate. Trước khi code: đọc `AgentTeamsRuntime` / hub events. **Không có surface → dừng, ghi ADR, không giả stream bằng poll transcript.**

### Kết quả Spike
- **Event Surface**: Đã kiểm tra chi tiết codebase (`sdk/packages/core` & `sdk/packages/shared`).
- `AgentTeamsRuntime` phát sự kiện `TeamMessageType.AgentEvent` cho mọi teammate thông qua `this.emitEvent({ type: TeamMessageType.AgentEvent, agentId, event })`.
- Các sự kiện agent gồm:
  - `content_start` với `contentType === "text"` (chứa text chunk) và `"reasoning"` (chứa reasoning chunk).
  - `content_update` (chứa partial tool progress).
  - `content_end` (chứa tool output/result hoặc error).
  - `usage` (chứa `inputTokens`, `outputTokens`, `cost`, `totalCost`).
- `SessionRuntime` nhận `assistant-text-delta` từ SDK Agent và `RuntimeEventAdapter` map trực tiếp sang `content_start(text)`.
- **Kết luận:** Host HOÀN TOÀN CÓ surface live text stream và token usage của teammate. Đủ điều kiện ship D-full.

## Việc

- Bridge event teammate → card
- Virtualize > 12 (ưu tiên running)
- Layout 1/2/3 cột
- Cost / token trên expand

## Tasks

- [x] Task: spike ½ ngày — event có/không (ghi kết quả vào PR / tài liệu)  
- [x] Task: stream UI chỉ khi spike OK  
- [x] Verify D-full checklist

## Done P9

- [x] Live token hoặc tài liệu “không ship vì runtime” (Đã ship live token streaming và token/cost metrics)

