# Spec — Thư viện công ty (Lưu / Tải)

Module id: `company-library`.

## Objective

CEO bấm **Lưu** → một bản có tên nằm ở `%USERPROFILE%\.orvanta\companies\<slug>\`. Lần sau, folder khác, bấm **Tải** → workspace nhận cùng purpose + cùng đội (từng agent đủ config). Không mang task/inbox/run.

## Đường dẫn

```ts
import { homedir } from "node:os"
import { join } from "node:path"

export function userOrvantaRoot(): string {
  return join(homedir(), ".orvanta")
}

export function companySnapshotDir(slug: string): string {
  return join(userOrvantaRoot(), "companies", slug)
}
```

Windows thực tế: `C:\Users\ngong\.orvanta\companies\orvanta-core\`.

`slug`: `^[a-z][a-z0-9-]{1,47}$`. Từ tên khi Lưu: lowercase, space → `-`, bỏ ký tự lạ. Trùng → dialog “Ghi đè bản này?” hoặc đổi tên.

## `library.json`

```json
{
  "schemaVersion": 1,
  "companies": [
    {
      "slug": "orvanta-core",
      "name": "Orvanta",
      "savedAt": "2026-10-27T12:00:00.000Z",
      "agentCount": 3,
      "purposePreview": "Xây công ty AI theo repo…"
    }
  ]
}
```

Nguồn sự thật phụ: nếu folder `companies/<slug>` tồn tại nhưng không có trong library.json, lần mở thư viện **scan** và sửa mục lục (đừng tin mỗi JSON).

## `companies/<slug>/meta.json`

```json
{
  "schemaVersion": 1,
  "slug": "orvanta-core",
  "name": "Orvanta",
  "savedAt": "2026-10-27T12:00:00.000Z",
  "sourceWorkspace": "D:\\orvanta",
  "orvantaSchemaVersion": 1
}
```

`sourceWorkspace` chỉ để người đọc nhớ; Load **không** yêu cầu path đó còn tồn tại.

## Copy lúc Lưu (allowlist)

Từ workspace → snapshot, **chỉ**:

```
company.json
purpose.md
constraints.md          # nếu có
org/roster.json
org/agents/<id>/profile.md
# không copy org/agents/<id>/workspace/
```

Không copy: `state/`, `inbox/`, `runs/`, `secrets/`, `memory/`, `VERSION` workspace (snapshot có `meta.json`).

Trước copy:

1. Validate workspace company (không broken)
2. Roster: strip `pending_hire` / `pending_fire` — chỉ lưu agent `idle|running|stopped` như `idle` trên snapshot
3. `company.json`: xóa hoặc để trống `workspaceRoot` (Load sẽ set lại)

Ghi atomic: viết `companies/<slug>.tmp/` rồi rename thành `companies/<slug>/` (nếu ghi đè: rename cũ → `<slug>.bak`, rename mới vào, xóa bak). Cập nhật `library.json` sau khi folder ổn.

## Load

1. User chọn slug trên UI thư viện.
2. Workspace **không** có `.orvanta/` → copy allowlist vào workspace, `company.id` = uuid mới, `createdAt`/`updatedAt` now, `workspaceRoot` = folder đang mở, mọi agent `status: idle`, tạo `VERSION`, inbox/state rỗng.
3. Workspace **đã có** `.orvanta/` → modal: “Thay công ty hiện tại? Purpose, đội, inbox, task local sẽ bị xóa.” 
   - Xác nhận: xóa cây workspace `.orvanta/` rồi như bước 2
   - Hủy: no-op
4. Không merge agent từng người (tránh đội lai).

## UI

Trên Home header menu `···` và empty state:

- **Lưu công ty…** — dialog: tên hiển thị + slug (auto từ tên, sửa được) + preview “sẽ lưu N agent, không lưu task”
- **Tải công ty…** — list từ `library.json` + scan: name, agentCount, savedAt, purposePreview. Nút Tải / Xóa bản thư viện
- Empty workspace: primary vẫn “Lập công ty”; secondary “Tải từ thư viện”

Xóa bản thư viện: confirm, xóa folder + bỏ khỏi library.json. Không đụng workspace.

## Lỗi

| Tình huống | Hành vi |
|---|---|
| Chưa có công ty workspace, bấm Lưu | Disable + tooltip “Lập hoặc tải công ty trước” |
| Snapshot thiếu purpose.md | List hiện “hỏng”, không cho Tải |
| Không ghi được homedir (permission) | Banner lỗi, không báo success |
| Slug collision, user cancel overwrite | Không đụng bản cũ |

## Acceptance

- [ ] Lưu → `%USERPROFILE%\.orvanta\companies\<slug>\` có đủ allowlist, **không** có `state/` hay `inbox/`
- [ ] `library.json` có một dòng khớp
- [ ] Mở folder trống, Tải → Home hiện đúng purpose + N agent + config từng người
- [ ] Task/inbox repo nguồn không xuất hiện ở repo đích
- [ ] Lưu hai slug khác nhau không đè
- [ ] Ghi đè cùng slug: confirm; cancel giữ bản cũ
- [ ] Load vào folder đã có công ty: cancel giữ nguyên; confirm thay sạch
- [ ] `company.id` sau Load ≠ id trên snapshot
- [ ] Agent status sau Load = idle
- [ ] Path dùng `homedir()`, test không hardcode `C:\Users`

## Không thuộc

- Đồng bộ cloud
- Auto-save
- Export zip
- Lưu từng agent lẻ (founder đã chọn snapshot cả công ty). Nếu sau này cần thư viện nhân sự lẻ — module mới, không nhét vào đây.
