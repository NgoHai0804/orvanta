# ADR-002: Hai kho và snapshot điều lệ

## Status

Proposed

## Date

2026-10-27

## Context

CEO cần cấu hình từng agent trong folder đang mở, **và** cất cả công ty để mở folder khác vẫn Tải được đội. Một đường dẫn `C:\Users\...\.orvanta` nếu vừa chạy vừa cất sẽ đè mất bản, hoặc agent đọc nhầm purpose.

Founder chốt: lưu **cả công ty** (purpose + roster + config agent), không lưu task/run/inbox; **nhiều bản có tên**.

## Decision

1. Workspace `<folder>/.orvanta/` = instance đang chạy (đầy đủ).
2. User `%USERPROFILE%/.orvanta/companies/<slug>/` = snapshot allowlist.
3. Lưu/Tải chủ động. Copy, không symlink.
4. Load tạo `company.id` mới, agent idle. Folder đã có công ty → confirm replace, không merge.
5. Sửa agent trên workspace là authoring; Inbox chỉ cho hire/fire/purpose lúc runtime.

## Alternatives considered

### Một slot `~\.orvanta` = chính công ty

- Rejected: lưu repo B đè repo A.

### User là nguồn sự thật, workspace chỉ cache

- Rejected: đang làm việc thì folder mở phải thắng; mất mạng/permission homedir không được làm hỏng repo.

### Snapshot kèm task/run

- Rejected: founder chọn constitution-only; việc cũ thuộc workspace cũ.

### Thư viện từng agent thay vì cả công ty

- Rejected lần này (founder chọn company snapshot). Có thể thêm module sau, không nhét vào P3.

## Consequences

- Implement P3 inject `rootDir` để test không ghi homedir thật.
- Gitignore workspace `.orvanta/`. User library mặc định ngoài repo.
- P2 không được ghi `~\.orvanta`.
