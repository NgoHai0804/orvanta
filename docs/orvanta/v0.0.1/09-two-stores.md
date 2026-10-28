# Hai kho: workspace vs user

Chốt 2026-10-27.

## Lời khuyên (đã thành luật)

Đừng để `C:\Users\<bạn>\.orvanta` vừa là chỗ **chạy** vừa là chỗ **cất**. Hai job khác nhau. Trộn là load repo B đè nhầm việc repo A, hoặc agent đọc nhầm purpose.

| Kho | Đường dẫn (Windows) | Việc |
|---|---|---|
| **Workspace (đang chạy)** | `<folder đang mở>\.orvanta\` | Công ty của **repo này**: purpose, từng agent đã cấu hình, inbox, task, run |
| **User (thư viện)** | `%USERPROFILE%\.orvanta\companies\<slug>\` | Snapshot **điều lệ + đội** để lần sau Load vào folder khác |

User không phải nguồn sự thật lúc đang làm. Workspace mới là. User chỉ có bản khi CEO **bấm Lưu**.

## Workspace — đang mở thì ghi ở đây

Mọi sửa agent (model, prompt, tool) ghi ngay vào:

```
D:\orvanta\.orvanta\org\agents\<agentId>.md
D:\orvanta\.orvanta\org\roster.json
```

Reload cửa sổ / mở lại folder = vẫn còn. Không cần Lưu lên user mới giữ được **trong repo này**.

## User — khi CEO muốn cất để Load sau

```
C:\Users\<bạn>\.orvanta\
  VERSION                 # 1
  library.json            # mục lục
  companies\
    orvanta-core\
      meta.json
      company.json
      purpose.md
      constraints.md
      org\
        roster.json
        agents\
          coordinator.md
          implementer.md
          reviewer.md
```

Nhiều bản, có tên. Lưu repo B không đè repo A.

Unix/mac: `~/.orvanta/companies/<slug>/`. Luôn dùng `os.homedir()`, không hardcode `C:\Users`.

## Snapshot mang gì — đã chốt

**Có:** purpose, constraints, company.policies, roster, **toàn bộ cấu hình từng agent**.

**Không:** `state/`, `inbox/`, `runs/`, `secrets/`, `memory/`. Đó là việc của một workspace. Repo mới cần đội + mục tiêu, không cần task hôm qua.

Khi Load: tạo instance mới (`company.id` mới), status agent về `idle`, không mang `pending_*`.

## Authoring vs runtime hire

| | Authoring (Home / Agent editor) | Runtime (Inbox) |
|---|---|---|
| Ai | CEO cấu hình đội | Coordinator xin thêm người lúc đang chạy |
| Ghi | Thẳng workspace `.orvanta` | Decision rồi mới spawn |
| Pha | P2 | P5+ |

Không bắt CEO duyệt Inbox mỗi lần sửa prompt reviewer trên Home. Inbox là răng khi **đội** muốn đổi tổ chức lúc đã chạy.

## Load khi folder đã có công ty

Giả định (sửa nếu sai): dialog “Thay công ty hiện tại? Việc/inbox/run local sẽ xóa.” Cancel = không đụng. Không merge roster thầm.

## Không làm

- Symlink workspace → user (đổi thư viện là vỡ repo đang mở)
- Tự động Lưu mỗi keystroke lên user
- Một file `C:\Users\...\ .orvanta` làm cả công ty đang chạy
- Lưu vào `~/.cline`
