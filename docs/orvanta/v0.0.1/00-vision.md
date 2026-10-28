# Vision — Orvanta

## How Might We

> How might we để một founder mở repo và thấy một **công ty AI** — có mục tiêu, có người đúng việc, có việc đang chạy — mà không phải nhắc lại role mỗi session, và không phải babysit từng task?

## Vấn đề

Cline đã là một coding agent mạnh. Nó cũng đã có:

- Chat + tool (file, shell, search, browser)
- Sub-agent (parent → child, sống trong một session)
- Agent Teams (peer-to-peer, task board, mailbox, mission log, outcomes)
- Agent presets tại `<cwd>/.cline/agents/`

Nhưng với người dùng muốn **một đội bền theo project**:

| Thực tế Cline hôm nay | Hệ quả |
|---|---|
| Bật team bằng prompt / flag (`enableAgentTeams` đang `false` trong VS Code) | Đội không phải first-class trong editor |
| State team nằm `~/.cline/data/teams/[name]/` | Không dính workspace; clone repo là mất công ty |
| Role chỉ là `rolePrompt` string | Agent dễ tự đổi scope, reviewer viết code, implementer “cải thiện thêm” |
| Hire / shutdown teammate là tool của lead | CEO không thấy, không duyệt |
| Chat là ngôi nhà duy nhất | Quản lý đội = đọc transcript |
| Không có màn hình “công ty” | Cảm giác vẫn là một chatbot, không phải một tổ chức |

Pain thật: **agent lệch mục tiêu** + **phải tạo lại / nhắc lại đội** + **không có chỗ đứng ngoài để điều hành**.

## Metaphor: công ty, không phải chat

Orvanta không bán “thêm agent”. Orvanta bán một **công ty nhỏ gắn vào repo**.

| Công ty thật | Orvanta |
|---|---|
| Điều lệ / mission | `purpose.md` |
| Sơ đồ tổ chức | roster trong `.orvanta/org/` |
| Nhân sự | agent có role, model, tool policy |
| CEO | người dùng — duyệt quyết định lớn |
| Daily stand-up | Company home |
| Hộp thư sếp | Inbox CEO |
| Họp 1:1 | Chat với coordinator hoặc một agent |
| Open office | War room |

Người dùng **không phải** AI CEO. Họ là **CEO nhẹ**: set mục tiêu, duyệt hire / đổi scope / merge; đội tự chia việc hàng ngày.

## Tầm nhìn sản phẩm (đủ A–D)

Khi mở workspace, Orvanta khởi tạo (hoặc khôi phục) công ty local. Người dùng thấy bốn bề mặt:

- **A — Company home:** mục tiêu, roster, việc đang chạy, badge quyết định chờ.
- **B — Inbox CEO:** chỉ những thứ cần người — hire, fire, đổi purpose/scope, merge, escalate, ngân sách.
- **C — Chat + sidebar:** nói chuyện với coordinator (và từng agent), sidebar đội luôn hiện trạng thái.
- **D — War room:** lưới live từng agent đang nghĩ / gọi tool / xong.

Bốn bề mặt đọc **cùng một nguồn sự thật**: `.orvanta/` + TeamRuntimeState của Cline.

## Thương hiệu

| Token | Dùng cho |
|---|---|
| Dark Navy | Nền chính, chrome editor |
| Indigo | Hành động chính, tab active, focus |
| Violet | Accent đội, badge, agent đang chạy |

Không lấy palette Cline làm identity. Icon Activity Bar, empty state, và home header mang Orvanta.

## Thành công trông như thế nào

Sau hai tuần dùng trên repo của chính mình:

1. Mở VS Code → Activity Bar Orvanta → thấy **cùng** purpose và roster hôm qua.
2. Giao một mục tiêu; coordinator chia task; implementer không tự mở epic mới.
3. Reviewer không được write file ngoài phạm vi review.
4. Hire agent mới nằm trong Inbox, không xuất hiện lặng lẽ.
5. Đóng máy, mở lại ngày hôm sau: task `in_progress` vẫn đúng chỗ; run bị `interrupted` được đánh dấu, không biến mất.
6. Không phải dán lại system prompt mỗi buổi sáng.

## Cạnh tranh (nội bộ)

Orvanta không cạnh tranh với CrewAI / AutoGen trên giấy. Nó cạnh tranh với **chính Cline chat** khi founder muốn điều hành đội. Nếu Orvanta chỉ là Cline đổi tên + sidebar, nó thất bại.
