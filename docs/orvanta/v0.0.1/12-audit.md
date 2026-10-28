# Audit docs — 2026-10-27

Rà một lượt trước khi code. Mức: **chặn P4/P5** / **lệch docs** / **rủi UX** / **đã chốt**.

## Chặn kỹ thuật (runtime)

1. **TeamStore vẫn vào `~/.cline` nếu chỉ bật flag.**  
   `CoreSessionConfig` có `teamName`, **không** có `teamDir`.  
   `runtime-builder.ts` gọi `createLocalTeamStore()` **không đối số** → `resolveTeamDataDir()` = data Cline global.  
   Muốn công ty theo workspace **bắt buộc** sửa `@cline/core` (thêm `teamDir` vào config + truyền xuống store). P4 không được ghi “TODO im lặng”. Đã sửa [P4](./phases/P4-chat-sidebar.md).

2. **Reviewer vs handoff — đã chốt:** tool `orvanta_submit_handoff`, không thủng `write_to_file`.

3. **`orvanta://` không phải protocol OS.** Deep-link = state webview. Đã ghi [04](./04-information-architecture.md).

4. **Chỗ để A–D — đã chốt:** cùng sidebar, War room 1 cột.

## Lệch docs (đã/đang sửa)

| Chỗ | Vấn đề | Xử lý |
|---|---|---|
| J2 vs P2 | J2: mọi hire qua Inbox. P2: authoring ghi thẳng khi chưa live | Sửa J2 |
| SPEC-A open multi-root | Chưa chốt | Chốt: folder có `.orvanta/`, không thì `workspaceFolders[0]` |
| Capability map | `company-home` phụ thuộc `purpose-lock` → P1 không làm được | Bỏ phụ thuộc đó |
| README “tháng đầu A” | Đúng tầm nhìn; code theo P1–P9 | Giữ; phases thắng khi code |
| `firstHireFast` trong P1 type | Field schema OK; hành vi P6 | Không xóa field |

## Rủi UX / sản phẩm

4. **Sidebar chật — đã chốt chấp nhận.** War room 1 cột.

5. **Guest ephemeral không có space.** Đề xuất: guest không `org/agents/`, không handoff file; chỉ mailbox; hết session mất. Không hỏi — coi như chốt trừ khi phản đối.

6. **Hai đường Thêm agent** (P2 authoring vs P6 Inbox khi session live) dễ rối UI. Cần label: “Thêm vào roster” vs “Xin hire (đang chạy)”.

## Không vướng (ổn)

- Hai kho workspace / user library + constitution-only + nhiều slug
- Agent không sửa `profile.md`
- P1–P3 không cần LLM
- Rebrand hoãn
- ChatView không unmount
- Gitignore `.orvanta/`
- Snapshot không copy `workspace/`

## Việc P1 không bị chặn

Schema + Home + proto OrvantaService **làm được** mà chưa đụng teamDir. Vướng teamDir chỉ từ P4.
