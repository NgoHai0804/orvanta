# Spec D — War room

Module id: `war-room`. Chỗ CEO **nhìn** đội đang làm, không phải chỗ duyệt (B) hay ra lệnh chính (C).

## Objective

Một lưới live: mỗi agent một card, stream suy nghĩ / tool / lỗi song song. CEO tin đội đang làm đúng việc mà không đọc một transcript tuần tự. Click một card để đào; “Nói với…” để nhảy C.

Tham chiếu UX nội bộ: `apps/examples/multi-agent` (war room 4 card + SSE). Orvanta làm **trong** webview VS Code, nguồn event = TeamStore + session events, không phải demo `Promise.all` 4 Agent tách.

## User stories

1. Tôi muốn thấy tất cả agent cùng lúc: ai đang nghĩ, ai đang gọi tool, ai xong, ai lỗi.
2. Tôi muốn 20 dòng mới nhất trên card, không phải full log.
3. Tôi muốn mở rộng một agent để đọc transcript riêng.
4. Tôi muốn filter theo task hoặc chỉ running.
5. Tôi muốn guest ephemeral hiện rõ là tạm.
6. Tôi muốn đóng war room mà run không chết.
7. Tôi muốn từ card nhảy Chat focus agent đó.
8. Tôi muốn thấy purpose một dòng trên header — nhớ đội vì ai.
9. Tôi muốn pause stream (tiết kiệm render) mà runtime vẫn chạy.
10. Tôi không muốn war room trở thành chỗ approve hire/merge.

## Bố cục

```
┌─ War room ───────────────────────────────────────────┐
│ {company.name} · {purpose one-liner}                 │
│ Filter: [All | Running | Idle | Failed]  Task ▾      │
│ Layout: [2 col | 3 col | 1 col]   [Pause stream]     │
├──────────────────────────────────────────────────────┤
│ ┌─ Coordinator ─┐ ┌─ Implementer ─┐ ┌─ Reviewer ─┐  │
│ │ running       │ │ running       │ │ idle       │  │
│ │ task: …       │ │ task: …       │ │            │  │
│ │ ───────────── │ │ ───────────── │ │            │  │
│ │ stream…       │ │ stream…       │ │ —          │  │
│ │ [Mở] [Nói]    │ │ [Mở] [Nói]    │ │            │  │
│ └───────────────┘ └───────────────┘ └───────────────┘│
│ Guest: ┌─ scout-1 ─┐                                 │
├─ Expand (optional) ──────────────────────────────────┤
│ Full transcript agent X · tokens · tools             │
└──────────────────────────────────────────────────────┘
```

**Chốt:** sidebar → mặc định **1 cột** (stack). Layout 2/3 cột chỉ khi user kéo panel rất rộng (không bắt buộc D-min). Pop-out không làm.

## Card agent

### Header

- displayName, role badge
- status: `idle` | `queued` | `running` | `completed` (run vừa xong, 30s) | `failed` | `cancelled` | `interrupted` | `stopped`
- elapsed nếu running
- task title (click filter task)

### Body stream

Nối các event (tối đa 20 dòng, ring buffer):

| Event | Hiện |
|---|---|
| assistant text delta | text, gộp thành dòng đến newline / 80 ký tự |
| reasoning (nếu provider có) | italic, prefix “think” |
| tool call start | `▸ {toolName}` |
| tool result (rút) | `◂ {ok|err} {1 dòng}` |
| purpose-lock deny | `✕ lock {tool}` nhấn |
| run progress | `{currentActivity}` |
| error | `! {message}` |

Không hiện nội dung `secrets/`. Truncate tool result 160 ký tự.

Auto-scroll card nếu user đang ở đáy; nếu scroll lên thì không kéo (nút “Nhảy xuống”).

### Footer

- `Mở` = expand panel
- `Nói` = `orvanta://view/chat?agent={id}`
- Không có Approve, Hire, Fire trên card

## Expand panel

- Full transcript run hiện tại + N run trước (tối đa 3) của agent đó
- Tool blocks giống Cline (read-only, không approval ở đây — approval vẫn trên Chat lead / Cline cards)
- Meta: runId, startedAt, model, token/cost nếu có
- `Nói với agent` lặp footer

Đóng expand: Esc hoặc nút. Grid vẫn stream.

## Filter & layout

- All / Running / Idle / Failed (failed gồm `failed` + `interrupted`)
- Task dropdown từ `TeamTask` chưa `completed` + “Không gắn task”
- Search tên agent (optional, checklist)
- Pause stream: ngừng append UI, hiện “Paused · runtime vẫn chạy”. Resume nhảy tới live.

## Empty

| Tình huống | Copy |
|---|---|
| Chưa công ty | “Lập công ty trên Home.” CTA |
| Có công ty, 1 coordinator idle | Card idle + “Giao việc trên Chat.” |
| Filter running mà không ai chạy | “Không ai đang chạy. Xóa filter?” |

## Hiệu năng

- Nguồn: subscribe team events (`TeamMessageType`: RunStarted, RunProgress, RunCompleted, AgentEvent, …) + assistant deltas của teammate nếu host expose
- Không poll 100ms toàn snapshot. Snapshot 1s chỉ cho status counts
- Tối đa card mount: 12. Vượt: virtualize, ưu tiên running
- Pause khi tab D `isHidden` (không vẽ delta) — **vẫn** giữ ring buffer ngắn để mở ra không trống
- Không ghi toàn bộ token stream vào `.orvanta/` (quá lớn). Chỉ summary run optional

## Mapping event

| Cline `TeamMessageType` | Card |
|---|---|
| `TeammateSpawned` | thêm card |
| `TeammateShutdown` | card `stopped` |
| `RunQueued` | status queued |
| `RunStarted` | running, clear buffer mới |
| `RunProgress` | dòng activity |
| `RunCompleted` | completed, giữ 30s rồi idle |
| `RunFailed` | failed + error |
| `RunCancelled` | cancelled |
| `RunInterrupted` | interrupted |
| `AgentEvent` | map sang text/tool nếu payload cho phép |
| `TeamTaskUpdated` | đổi task title trên card |
| `TeamMissionLog` | không spam card; optional dòng nhỏ kind=blocked |

Assistant token của teammate: nếu runtime chưa stream ra host, card hiện activity + “không có live token” — **vẫn hợp lệ** cho D tối thiểu. Live token là acceptance mở rộng (D-full).

## D tối thiểu vs D đủ

| | D-min | D-full |
|---|---|---|
| Card status + task + activity | bắt buộc | có |
| 20 dòng tool/progress | bắt buộc | có |
| Token stream live | không bắt buộc | bắt buộc |
| Expand transcript | bắt buộc (từ result đã persist) | + live |
| 12+ virtualize | nên | bắt buộc |
| Pop-out editor tab | không | optional |

Spec chức năng **đủ** = D-full. Roadmap có thể ship D-min trước.

## Brand

- Grid nền Navy
- Card running: viền Violet 1px
- Card failed: viền amber, không chỉ red
- Pause = Indigo button secondary

## Accessibility

- Card là `article` với `aria-live="polite"` chỉ khi running và tab visible (tránh đọc liên tục)
- Pause cũng tắt `aria-live`
- Expand là dialog hoặc complementary với focus trap
- Filter là toolbar

## Không thuộc D

- Duyệt decision
- Sửa purpose
- Composer đầy đủ (chỉ deep-link C)
- Orchestration mới
- Demo HTML tách cổng :3456

## Acceptance

### D-min

- [ ] Mọi roster agent + guest có card
- [ ] Status khớp run trong ≤ 1s
- [ ] Task title đúng assignee
- [ ] Progress/tool/deny hiện trên buffer 20 dòng
- [ ] Expand đọc được result persist của run vừa xong
- [ ] Nói → Chat focus
- [ ] Đóng tab D không cancel run
- [ ] Pause dừng append
- [ ] Empty/no-company đúng copy
- [ ] Không nút approve trên card
- [ ] Ẩn tab D không giết runtime; buffer còn khi quay lại

### D-full (cùng spec, pha sau D-min)

- [ ] Token stream live trên card running
- [ ] Virtualize > 12 card
- [ ] Filter search tên
- [ ] Layout 1/2/3 cột theo width
- [ ] Cost/token trên expand nếu host có

## Open questions (D)

- Teammate stream đã ra VS Code host chưa? Phải kiểm `AgentTeamsRuntime` event surface trước khi hứa D-full. Nếu chưa: D-min là shippable, D-full = thêm bridge event.
- Pop-out editor group: hữu ích khi CEO kéo war room ra màn hai. Không chặn D-min.
