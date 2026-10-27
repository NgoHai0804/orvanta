# Đổi tên Orvanta — gỡ lớp Cline (user-facing)

**Hoãn (2026-10-27):** Founder chọn tập trung multi-agent, chưa đổi chữ UI. R1/R2 không làm cho đến khi được gọi lại.

Không rename nội bộ `@cline/*` trong một PR. Đó là hàng nghìn import, proto `package cline`, id extension `claude-dev` — làm một lần là vỡ build và mất chỗ rebase.

## Lời khuyên

| Lớp | Làm | Không làm lúc này |
|---|---|---|
| **Người thấy** | Chữ “Cline” → “Orvanta”, icon, Activity Bar, walkthrough, marketplace copy | Đổi `publisher` / `saoudrizwan.claude-dev` nếu còn debug F5 local |
| **Sản phẩm Cline Inc** | Ẩn/gỡ Account Cline, Marketplace Cline, ClinePass, cloud Cline, telemetry cline.bot | Xóa hết code cloud trong một PR (rất rộng) — **tắt UI + gate** trước |
| **Runtime** | Giữ package `@cline/core` … | Đổi tên package thành `@orvanta/*` (pha riêng, sau khi sản phẩm sống) |
| **Lệnh** | Title command = Orvanta; id `cline.*` tạm giữ | Rename command id (phá keybinding user) |

“Xóa cái ảnh hưởng tới Cline” = **cắt dây về Cline Inc** (account, store, cloud), không phải xóa Agent Teams.

## Việc user-facing (pha R1 — được phép làm sớm, song song P1)

File chính:

- `apps/vscode/package.json`: `displayName` → `Orvanta`; Activity Bar `title` → `Orvanta`; mô tả; keywords; walkthrough title
- `apps/vscode/package.json` `contributes.commands[].title`: New Task → Orvanta: New Task (hoặc ẩn bớt nút Cline+)
- README gốc repo: banner Orvanta (không xóa license Apache — fork vẫn phải ghi nguồn Cline trong NOTICE)
- Webview chuỗi visible: Settings header, Welcome “Meet Cline”
- `docs/orvanta/*` đã là Orvanta; chỗ “Chat Cline” trong spec = “Chat Orvanta (runtime cũ)” — đổi dần cho đỡ lẫn

Không đổi ở R1:

- `"name": "claude-dev"`
- `"publisher": "saoudrizwan"`
- command id `cline.plusButtonClicked`
- proto `package cline`
- `sdk/packages/*` name `@cline/shared`

## Việc cắt Cline Inc (pha R2 — sau P1 Home sống)

Ẩn view, không xóa service ngay:

- Marketplace view + nút MCP marketplace
- Account / ClinePass / subscribe
- Cloud session / organization switch
- Walkthrough Cline
- Telemetry endpoint Cline (tắt hoặc no-op)

Giữ: model provider (Anthropic, OpenRouter…) — đó không phải “Cline brand”, đó là LLM.

## Việc rename package (pha R3 — không hẹn)

`@orvanta/shared` … chỉ khi không còn rebase Cline thường xuyên. Ghi NOTICE: based on Cline.

## Cấm

- Xóa `@cline/core` team tools vì “mang tên Cline”
- Đổi id extension giữa chừng rồi quên launch config
- Xóa license / copyright Cline (pháp lý fork)

## Checklist R1

- [ ] Activity Bar đọc “Orvanta”
- [ ] displayName Orvanta
- [ ] Welcome không nói “Meet Cline”
- [ ] README repo không còn hero Cline (có NOTICE nguồn)
- [ ] F5 extension vẫn load (`claude-dev` id còn)
