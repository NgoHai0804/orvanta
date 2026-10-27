# Orvanta — tài liệu sản phẩm

Orvanta là lớp **công ty AI theo từng repo**, xây trên fork Cline. Người dùng (CEO nhẹ) set mục tiêu; đội agent tự chia việc; agent không lệch role; việc chạy xuyên session; CEO chỉ duyệt quyết định lớn.

Bộ tài liệu này mô tả **đầy đủ chức năng A + B + C + D** trước khi viết code. Implementation chưa bắt đầu.

## Cách đọc

| Thứ tự | File | Đọc khi nào |
|---|---|---|
| 1 | [00-vision.md](./00-vision.md) | Bức tranh: vấn đề, metaphor, thương hiệu |
| 2 | [01-intent.md](./01-intent.md) | Intent đã chốt với founder |
| 3 | [02-principles.md](./02-principles.md) | Luật thiết kế, CEO nhẹ, Not Doing |
| 4 | [03-capability-map.md](./03-capability-map.md) | Module, phụ thuộc, thứ tự build |
| 5 | [04-information-architecture.md](./04-information-architecture.md) | Màn hình, điều hướng, badge |
| 6 | [05-schema-orvanta.md](./05-schema-orvanta.md) | Hợp đồng thư mục `.orvanta/` |
| 7 | [06-purpose-lock.md](./06-purpose-lock.md) | Cơ chế giữ agent đúng mục tiêu |
| 8 | [07-user-journeys.md](./07-user-journeys.md) | Hành trình người dùng end-to-end |
| 9 | [08-glossary.md](./08-glossary.md) | Thuật ngữ |
| 10 | [09-two-stores.md](./09-two-stores.md) | Workspace `.orvanta` vs `%USERPROFILE%\.orvanta` |
| 11 | [10-agent-spaces.md](./10-agent-spaces.md) | Vùng từng agent, lock, mailbox + handoff |
| 12 | [11-rebrand.md](./11-rebrand.md) | Đổi tên Orvanta, gỡ Cline Inc — không rename `@cline/*` vội |
| 13 | [12-audit.md](./12-audit.md) | Rà soát lệch / vướng trước khi code |
| 14 | [13-flow-ceo-coding.md](./13-flow-ceo-coding.md) | Luồng CEO giao việc coding (ví dụ rate limit) |
| — | [SPEC-agent-config.md](./SPEC-agent-config.md) | Sửa từng agent, ghi workspace |
| — | [SPEC-company-library.md](./SPEC-company-library.md) | Lưu / Tải công ty (nhiều slug) |
| — | [phases/README.md](./phases/README.md) | **Chỗ agent đọc để code** — P1…P9 |
| — | [SPEC-A-company-home.md](./SPEC-A-company-home.md) | **A** Company home |
| — | [SPEC-B-ceo-inbox.md](./SPEC-B-ceo-inbox.md) | **B** Inbox CEO |
| — | [SPEC-C-chat-sidebar.md](./SPEC-C-chat-sidebar.md) | **C** Chat + sidebar đội |
| — | [SPEC-D-war-room.md](./SPEC-D-war-room.md) | **D** War room live |
| — | [CHECKLIST.md](./CHECKLIST.md) | Checklist chức năng (nguồn sự thật khi implement) |
| — | [ROADMAP.md](./ROADMAP.md) | Pha triển khai, dù vision là A–D đủ |
| — | [../decisions/ADR-001-orvanta-company-on-cline.md](../decisions/ADR-001-orvanta-company-on-cline.md) | Quyết định kiến trúc: lớp trên Cline, không rebuild runtime |

## Bốn bề mặt (A–D)

```
┌─────────────────────────────────────────────────────────┐
│  Activity Bar · Orvanta                                 │
│  Home (A) · Inbox (B) · Chat (C) · War room (D)         │
└─────────────────────────────────────────────────────────┘
        │            │           │              │
        ▼            ▼           ▼              ▼
   purpose        quyết định   nói chuyện    nhìn live
   roster         hire/scope   coordinator   từng agent
   việc đang chạy merge/fire   + sidebar đội stream song song
   badge inbox
```

Tháng đầu **implement A trước**. Chat Cline (lõi của C) đã tồn tại — không viết lại. B và D được spec đầy đủ ở đây để không mất tầm nhìn.

## Giả định đang dùng (sửa ngay nếu sai)

1. Surface chính là **VS Code extension** hiện có (`apps/vscode`), không tạo extension mới.
2. Runtime đội = Cline Agent Teams (`enableAgentTeams`), không viết orchestrator mới.
3. Workspace `<folder>/.orvanta/` = công ty đang chạy. User `%USERPROFILE%/.orvanta/companies/<slug>/` = snapshot điều lệ+đội khi CEO bấm Lưu. Cả hai gitignore / ngoài repo.
4. Một người dùng (founder). Chưa multi-user, chưa marketplace.
5. Thương hiệu: Indigo · Violet · Dark Navy.
6. Cấu hình từng agent ghi thẳng workspace. Authoring ≠ Inbox hire.

## Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Intent | Đã chốt (kèm thư viện công ty) |
| Spec A–D + agent + library | Đã viết |
| Pha code P1–P9 | Đã viết — agent bắt đầu từ P1 |
| Code | Chưa bắt đầu |
| ADR-001 / ADR-002 | Proposed |
