# TỔNG QUAN DỰ ÁN ORVANTA
## Hệ Điều Hành Công Ty AI Cho Repository (AI Company Layer for Repositories)

---

## Tóm Lược Điều Hành (Executive Summary)

**Orvanta** là một nền tảng tiên phong biến mỗi kho mã nguồn (Git repository) thành một **Công ty AI độc lập, có tổ chức và tự vận hành**, được xây dựng trên nền tảng coding agent mạnh mẽ Cline.

Thay vì chỉ tương tác với một chatbot AI đơn lẻ, vô danh và dễ bị "lệch mục tiêu" sau vài câu lệnh, Orvanta cung cấp cho nhà sáng lập (Founder) và người quản lý (CEO):
1. **Một cơ cấu tổ chức hoàn chỉnh**: Các Agent được phân vai rõ ràng (Coordinator, Architect, Implementer, Reviewer...), có phân cấp quản lý theo sơ đồ hình cây (`reportsTo`), có quyền hạn công cụ và bộ quy chuẩn làm việc riêng biệt.
2. **Quy trình thực thi có kỷ luật**: Hoạt động theo mô hình *Hub-and-Spoke*, giao việc kèm tiêu chuẩn nghiệm thu (*Definition of Done - DoD*), nghiệm thu chéo độc lập (*Maker - Checker*), và bắt buộc nộp sản phẩm cụ thể (*Deliverable Artifacts*) vào thư mục của dự án thay vì chỉ chat suông.
3. **Trung tâm chỉ huy trực quan trên VS Code**: Hệ thống 4 bề mặt tích hợp nguyên bản vào editor gồm **Company Home**, **Agents (Org Tree)**, **CEO Inbox**, và **Console (Kênh liên lạc & Tác chiến)**.

> **Sứ mệnh của Orvanta**: Trao quyền cho mọi Founder/Tech Lead trở thành một **"CEO nhẹ" (Lightweight CEO)** — chỉ tập trung thiết lập mục tiêu chiến lược và phê duyệt các quyết định cốt lõi, trong khi cả một bộ máy AI chuyên nghiệp tự giác vận hành, giải quyết công việc hàng ngày ngay trong chính repository.

---

## Mục Lục
- [1. Khái Niệm & Định Vị: "Công Ty AI, Không Chỉ Là Chatbot"](#1-khái-niệm--định-vị-công-ty-ai-không-chỉ-là-chatbot)
- [2. Vấn Đề Thực Tế & Đột Phá Của Orvanta So Với Cline Thuần](#2-vấn-đề-thực-tế--đột-phá-của-orvanta-so-với-cline-thuần)
- [3. Cơ Chế Vận Hành & Kiến Trúc Thực Thi Tự Động](#3-cơ-chế-vận-hành--kiến-trúc-thực-thi-tự-động)
- [4. Bốn Bề Mặt Giao Diện Chỉ Huy Chính](#4-bốn-bề-mặt-giao-diện-chỉ-huy-chính)
- [5. Chuẩn Hóa Trải Nghiệm & Design System](#5-chuẩn-hóa-trải-nghiệm--design-system)
- [6. Cấu Trúc Lưu Trữ Dữ Liệu Bền Vững](#6-cấu-trúc-lưu-trữ-dữ-liệu-bền-vững)
- [7. Giá Trị Thực Tiễn Cho Doanh Nghiệp & Founder](#7-giá-trị-thực-tiễn-cho-doanh-nghiệp--founder)

---

## 1. Khái Niệm & Định Vị: "Công Ty AI, Không Chỉ Là Chatbot"

### 1.1. Metaphor: Công Ty Thực Tế vs. Hệ Thống Orvanta
Trong các công cụ AI hiện nay, lập trình viên thường phải đóng vai trò "người giám sát chi tiết" (micromanager): vừa chỉ đạo từng dòng code, vừa sửa lỗi, vừa nhắc đi nhắc lại bối cảnh dự án. Orvanta chuyển dịch mô thức này sang mô hình **Tổ chức Doanh nghiệp**:

| Khái niệm Công ty Ngoài Đời | Cơ chế Tương ứng trong Orvanta | Chức năng & Ý nghĩa |
|---|---|---|
| **Điều lệ & Sứ mệnh (Company Mission)** | `.orvanta/purpose.md` | Bản tuyên ngôn mục tiêu bất biến của repo; mọi Agent phải tuân thủ nghiêm ngặt. |
| **Sơ đồ Tổ chức (Org Chart)** | Sơ đồ cây tại tab `Agents` (`org/roster.json`) | Mô hình hóa quan hệ chỉ huy đa cấp dựa trên `reportsTo`. |
| **Hồ sơ & Chuyên môn Nhân viên** | `.orvanta/org/profiles/*.md` | Quy định Model AI, bộ công cụ (Tools), hướng dẫn nghiệp vụ (Instructions) và Kỹ năng (Skills). |
| **Giám đốc Điều hành (CEO)** | **Người dùng (Founder / Tech Lead)** | Đưa ra bài toán chiến lược, phê duyệt các quyết định lớn, không cần can thiệp vụn vặt. |
| **Tổng Quản lý (General Manager)** | `@coordinator` Agent | Tiếp nhận mục tiêu từ CEO, khảo sát codebase, lập kế hoạch, chia việc cho cấp dưới. |
| **Họp Giao ban Hàng ngày (Daily Stand-up)** | Trang **Company Home** | Nắm bắt mục tiêu, nhân sự hiện diện và các công việc đang xử lý (Work Now). |
| **Bàn Phê duyệt Quyết định của Sếp** | Trang **CEO Inbox** | Nơi CEO phê duyệt tuyển dụng (Hire), sa thải (Fire), đổi mục tiêu (Change Purpose) hoặc gỡ tắc (Escalation). |
| **Văn phòng Tác chiến & Kênh trao đổi** | Trang **Console** (`#team-feed` & `@agent`) | Giám sát trạng thái hoạt động theo thời gian thực và chỉ đạo 1:1 khi cần. |
| **Sản phẩm Bàn giao (Deliverables)** | `.orvanta/artifacts/**` | Mọi thành phẩm (mã nguồn, tài liệu, spec, test) đều được đóng gói thành file thực tế. |

### 1.2. Triết lý "CEO Nhẹ" (Lightweight CEO)
Orvanta định vị người dùng không phải là người trực tiếp gõ từng dòng lệnh, cũng không phải một "AI Bot" thụ động. Người dùng đóng vai trò **CEO chiến lược**:
* **Không làm vú em (No Babysitting):** Không phải nhắc lại "Hãy nhớ bạn là lập trình viên frontend" sau mỗi phiên làm việc.
* **Quyền phủ quyết tối cao (Ultimate Approval):** Các hành động rủi ro cao (chỉnh sửa phạm vi, thay đổi kiến trúc lớn, tuyển thêm Agent ngốn token) đều bắt buộc phải qua CEO Inbox.
* **Toàn quyền quan sát (Full Observability):** Có thể quan sát toàn bộ đội ngũ đang làm gì ở cấp độ vĩ mô, hoặc can thiệp vi mô vào từng kênh làm việc cụ thể.


---

## 2. Vấn Đề Thực Tế & Đột Phá Của Orvanta So Với Cline Thuần

Cline là một trợ lý lập trình mã nguồn mở xuất sắc với khả năng thao tác công cụ linh hoạt (file, shell, browser, search) và đã có các tính năng mầm mống về sub-agent hay agent teams. Tuy nhiên, khi đưa vào môi trường dự án thực tế đòi hỏi sự bền bỉ dài lâu, Cline thuần bộc lộ các hạn chế lớn mà Orvanta giải quyết triệt để:

### 2.1. Năm Lỗ Hổng Cốt Lõi Của Chatbot Thuần
1. **Lệch mục tiêu & Mở rộng phạm vi bừa bãi (Scope Creep & Goal Drift):** Agent thường tự ý sửa đổi những phần code không được yêu cầu, Reviewer tự nhảy vào viết code, hoặc Implementer tự "cải tiến thêm" gây hỏng kiến trúc sẵn có.
2. **Hội chứng mất trí nhớ sau phiên (Amnesia Trap):** Mỗi buổi sáng mở VS Code lên, người dùng phải nhập lại System Prompt, giải thích lại quy tắc dự án và thiết lập lại vai trò từ đầu.
3. **Cấu hình trôi nổi, không dính workspace:** Dữ liệu team trong Cline thuần lưu tại thư mục hệ thống cá nhân (`~/.cline/data/teams/`), khi clone repository sang máy khác hoặc chia sẻ cho đồng nghiệp thì toàn bộ cơ cấu đội ngũ biến mất.
4. **Vòng lặp vô tận & Cháy token (P2P Ping-Pong Trap):** Nếu cho phép các sub-agent tự do nhắn tin chéo ngang hàng, chúng thường sa vào các đoạn hội thoại cảm ơn, chào hỏi, tranh luận lý thuyết vô tận, đốt hàng trăm nghìn token mà không có sản phẩm.
5. **Trải nghiệm vô danh & Phân mảnh giao diện:** Giao diện chat truyền thống chỉ hiển thị một avatar robot "Cline" duy nhất cho tất cả các thao tác; người dùng không phân biệt được ai đang sửa file, ai đang kiểm tra, và phải liên tục chuyển qua lại giữa các màn hình rời rạc.

### 2.2. Bảng So Sánh Chi Tiết: Cline Thuần vs. Orvanta

| Tiêu Chí So Sánh | Cline Thuần | Orvanta (Lớp Công Ty AI Cho Repo) |
|---|---|---|
| **Vị trí Lưu trữ Dữ liệu** | Thư mục global máy tính cá nhân (`~/.cline/`) | Nằm trọn vẹn trong Git repo tại `.orvanta/` (bền vững, clone là có đủ) |
| **Bảo Vệ Mục Tiêu Dự Án** | Dễ bị trôi dạt ngữ cảnh qua các lượt prompt | Khóa chặt bằng `.orvanta/purpose.md` và cơ chế Purpose-Lock kiểm soát quyền hạn |
| **Cơ Cấu Đội Ngũ Nhân Sự** | Danh sách phẳng hoặc cấu hình cắm tạm thời | Sơ đồ cây phân cấp đa tầng trực quan (`reportsTo`), có vai trò rõ ràng |
| **Giao Tiếp Giữa Các Agent** | Dễ rơi vào P2P chat tự do, lặp vô tận | **Hub-and-Spoke Orchestration**: Giao việc và báo cáo chỉ qua Quản lý trực tiếp |
| **Bằng Chứng Hoàn Thành Việc** | Các đoạn văn bản giải thích trôi nổi trong chat | **Artifact-Driven**: Bắt buộc xuất file thực tế tại `.orvanta/artifacts/**` |
| **Kiểm Định Chất Lượng** | Người làm tự báo cáo "Đã xong" (Maker = Checker) | **Maker - Checker Separation**: Thẩm định độc lập bởi Reviewer theo tiêu chuẩn DoD |
| **Quyền Quyết Định Lớn** | Sub-agent có thể tự âm thầm sinh/tắt agent | **CEO Inbox**: Bắt buộc con người phê duyệt Tuyển dụng, Sa thải, Đổi mục tiêu |
| **Nhận Diện Thị Giác** | Avatar "Cline" đơn điệu, thông báo diff chung chung | **Agent Attribution**: Avatar, Tên, Màu sắc vai trò hiển thị trên từng diff, command, thinking |
| **Bố Cục Không Gian Làm Việc** | Chat đơn luồng hoặc War Room tách biệt | Hợp nhất trên **Console** (Kênh `#team-feed` toàn đội & Kênh `@agent` 1:1) |

---

## 3. Cơ Chế Vận Hành & Kiến Trúc Thực Thi Tự Động

Orvanta không chỉ là giao diện trực quan; phía sau nó là một **Bộ máy thực thi tự động (Autonomous Execution Engine)** hoạt động dựa trên 5 nguyên lý nghiêm ngặt:

```
                       [ CEO / NGƯỜI DÙNG ]
                                ▲
                 (Báo cáo Tổng hợp / Duyệt Inbox)
                                ▼
                   [ AGENT CHỦ (COORDINATOR) ]
  (1. Khảo sát & Lập Task Board) ──► (2. Hợp đồng Giao việc kèm DoD)
                                           │
         ┌───────────────────┬─────────────┴─────────────┬──────────────────┐
         ▼                   ▼                           ▼                  ▼
    [RESEARCHER]       [ARCHITECT]                 [IMPLEMENTER]        [WRITER]
 (Nghiên cứu/Dữ liệu)(Thiết kế/Spec)            (Code/Cấu hình)     (Tài liệu/Content)
         │                   │                           │                  │
         └───────────────────┴─────────────┬─────────────┴──────────────────┘
                                           ▼ (Nộp Deliverable File vào .orvanta/artifacts/)
                                  [REVIEWER / SKEPTIC]
                               (Kiểm duyệt chéo độc lập)
                                           │
                         ┌─────────────────┴─────────────────┐
                    (ĐẠT tiêu chuẩn)                  (KHÔNG ĐẠT)
                         │                                   │
                         ▼                                   ▼
              Coordinator tổng hợp kết quả           Gửi biên bản yêu cầu sửa
                 & Báo cáo lại cho CEO               (Tối đa 2 lần vòng lặp)
                                                             │
                                                     (Quá 2 lần thất bại)
                                                             ▼
                                                    [ ESCALATE CEO INBOX ]
```

### 3.1. Điều Phối Hình Nan Hoa (Hub-and-Spoke Orchestration)
* **Luồng phân cấp nghiêm ngặt:** Mọi nhiệm vụ đều xuất phát từ Quản lý trực tiếp (Coordinator hoặc Tech Lead) giao xuống cho nhân sự cấp dưới theo đúng quan hệ `reportsTo` trong cây tổ chức.
* **Cấm giao tiếp ngang hàng (Anti P2P Ping-Pong):** Các Agent cấp dưới tuyệt đối không tự ý nhắn tin trực tiếp với nhau để tranh luận ngoài lề. Mọi yêu cầu đầu vào, tài liệu phụ thuộc đều phải thông qua Quản lý trực tiếp để điều phối.
* **Nạp sơ đồ tổ chức vào nhận thức (System Prompt Injection):** Coordinator khi khởi động được tự động nạp toàn bộ cấu trúc nhân sự, vai trò, công cụ cho phép/bị cấm và kỹ năng của từng Agent, giúp Coordinator giao việc chính xác cho đúng chuyên gia mà không bị mù mờ.

### 3.2. Bằng Chứng Là Sản Phẩm Bàn Giao (Artifact-Driven Deliverables)
* **Không nghiệm thu văn bản suông:** Bất kỳ nhiệm vụ nào cũng phải tạo ra hoặc cập nhật file sản phẩm cụ thể lưu trữ tại `.orvanta/artifacts/` (ví dụ: `.orvanta/artifacts/research/market-report.md`, `.orvanta/artifacts/marketing/email-sequence.md`, hay mã nguồn hoàn chỉnh).
* **Rõ ràng và minh bạch:** Quản lý và Reviewer chỉ thẩm định công việc dựa trên nội dung thực tế của file sản phẩm bàn giao trên đĩa cứng, không căn cứ vào lời tự khẳng định trong khung chat.

### 3.3. Tách Biệt Người Làm - Người Duyệt (Maker - Checker Separation)
* **Không vừa đá bóng vừa thổi còi:** Agent thực thi (Maker: Implementer, Writer, Designer) sau khi hoàn tất file sản phẩm không được tự ý đánh dấu hoàn thành task.
* **Thẩm định độc lập:** Quản lý sẽ điều động Reviewer (Checker) đọc file sản phẩm và đối chiếu khắt khe với **Definition of Done (DoD)** đã quy định trong hợp đồng giao việc.
* **Khóa quyền bảo vệ (Tool Policy Enforcement):** Reviewer chỉ có quyền đọc file (`read_files`), chạy lệnh kiểm tra (`execute_command` như `bun test`, `npm run lint`) và ghi biên bản nhận xét vào thư mục `.orvanta/artifacts/reviews/`. Reviewer tuyệt đối bị cấm dùng lệnh ghi/sửa code (`write_to_file`, `apply_diff`) trên mã nguồn dự án để tránh tự ý phá hỏng thiết kế.

### 3.4. Vòng Lặp Phản Hồi Có Giới Hạn (Bounded Feedback Loop)
* **Quy tắc 2 lần tối đa:** Nếu Reviewer phát hiện sản phẩm chưa đạt chuẩn DoD, Reviewer sẽ ghi rõ lý do và yêu cầu Maker sửa lại. Vòng lặp sửa chữa này chỉ được phép diễn ra **tối đa 2 lần**.
* **Tự động leo thang (Escalate lên CEO Inbox):** Nếu sau 2 lần sửa chữa mà sản phẩm vẫn không vượt qua khâu kiểm định, hệ thống lập tức khóa tác vụ và gửi một phiếu yêu cầu giải quyết lên **CEO Inbox**. Người dùng sẽ can thiệp trực tiếp để đưa ra phán quyết cuối cùng (chấp thuận ngoại lệ, hướng dẫn bổ sung hoặc hủy nhiệm vụ), ngăn chặn triệt để tình trạng cháy token và bế tắc ngầm.

### 3.5. Kiến Trúc Bộ Nhớ 3 Tầng (3-Tier Memory Architecture)
* **Tầng 1 - Bộ nhớ phiên (Session Memory):** Ngữ cảnh ngắn hạn của phiên chat hiện thời, tự giải phóng khi xong việc để tiết kiệm token.
* **Tầng 2 - Bộ nhớ nhân sự (Agent Memory - `memory.md`):** Được lưu tại `.orvanta/org/memory/<agent-id>.md`. Lưu giữ kinh nghiệm thực chiến riêng biệt của từng Agent qua các phiên (ví dụ: Coder ghi nhớ "Repo này dùng pnpm chứ không phải npm", Reviewer ghi nhớ "CEO thích code tối giản không comment thừa").
* **Tầng 3 - Tri thức công ty (Company Knowledge):** Gồm mục tiêu (`purpose.md`), các quy ước chung (`conventions.md`) và thư viện tài nguyên chung của tổ chức.

---

## 4. Bốn Bề Mặt Giao Diện Chỉ Huy Chính

Hệ thống điều hành Orvanta tích hợp trực tiếp vào thanh bên (Activity Bar) của VS Code thông qua bộ 4 bề mặt chỉ huy tương ứng với 4 tab điều hướng: **`Home | Agents | Inbox | Console`**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ORVANTA COMMAND SHELL                           │
│     [ 🏠 Home ]   [ 👥 Agents ]   [ 📥 Inbox (2) ]   [ 🎮 Console ]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  (Màn hình hiển thị nội dung chuyên biệt theo từng bề mặt làm việc)    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Company Home (Tổng Hành Dinh Điều Hành)
* **Bảng tin Mục tiêu & Sứ mệnh (Purpose Banner):** Hiển thị mục tiêu cốt lõi của công ty trích xuất từ file `purpose.md`. Tại đây, CEO có thể đọc nhanh định hướng dài hạn hoặc bấm nút đề xuất đổi mục tiêu.
* **Bảng Điều Phối Nhiệm Vụ (Work Now Dashboard):** Trực quan hóa tiến độ công việc đang chạy thời gian thực, phân loại thành 3 cột trạng thái:
  - *Đang thực thi (In Progress):* Các nhiệm vụ đang được Agent xử lý kèm thời gian chạy.
  - *Bị nghẽn (Blocked):* Các công việc gặp sự cố hoặc chờ phê duyệt giải quyết.
  - *Chờ xử lý (Task Queue):* Danh sách việc tồn đọng đã được Coordinator lên lịch.
* **Huy hiệu Quyết định Đang Chờ (Inbox Teaser):** Đưa ra cảnh báo nổi bật kèm số lượng quyết định khẩn cấp đang đợi CEO phê duyệt (ví dụ: `2 quyết định đang chờ duyệt`).
* **Tóm tắt Đội ngũ (Roster Summary):** Thống kê số lượng nhân sự, trạng thái sẵn sàng (Ready) hay đang bận (Busy).

### 4.2. Agents — Sơ Đồ Cây Tổ Chức Đa Tầng (Multi-Level Tree Org Chart)
Khác với danh sách nhân sự phẳng đơn điệu trong các công cụ khác, tab **Agents** tổ chức toàn bộ nhân sự theo cấu trúc doanh nghiệp thực thụ:
* **Bố cục Split View Trên - Dưới:**
  - **Nửa trên (Interactive Tree Chart):** Sơ đồ cây phân cấp trực quan mô hình hóa quan hệ chỉ huy qua trường `reportsTo`. Coordinator làm Root; các Tech Lead / Manager làm nhánh con phụ trách các Teammate cấp dưới. Người dùng có thể nhấp chọn từng node Agent để xem chi tiết.
  - **Nửa dưới (Detail Configuration Panel):** Trình biên tập chi tiết Agent đang được chọn, chia tách khoa học thành **5 Tab Chuyên Biệt**:
    1. **Profile:** Tên hiển thị, vai trò (`role: lead | implementer | reviewer`), avatar, người quản lý trực tiếp (`reportsTo`) và mô tả năng lực cốt lõi.
    2. **Model & Thông số AI:** Combobox chọn Model thông minh từ các Provider hàng đầu (Anthropic Claude 3.7 Sonnet, OpenAI GPT-4o, Google Gemini 2.0 Flash, DeepSeek V3/R1...), tinh chỉnh mức độ suy luận (Reasoning Effort: Low/Med/High/Max), kích thước Context Window (128K - 1M), Max Output Tokens và nhiệt độ Temperature.
    3. **Tools & Quyền hạn:** Chính sách phân quyền công cụ chặt chẽ (Allow/Deny policy) theo từng nhóm (File Operations, Terminal Shell, Web/Browser, Team Coordination). Bảo vệ các đường dẫn nhạy cảm (`mandatory protected paths`).
    4. **Instructions & Rules:** Hệ thống hướng dẫn nghiệp vụ (System Instructions) và gán các bộ quy tắc riêng biệt (`.cline/rules/`, `.cursorrules`) cho từng Agent.
    5. **Skills:** Kho kỹ năng chuyên môn hóa được gán trực tiếp (`.agents/skills/`), giúp Agent có thể tự kích hoạt các workflow phức tạp.


### 4.3. CEO Inbox (Cổng Phê Duyệt Quyết Định Tối Cao Của CEO)
CEO Inbox là bức tường lửa bảo vệ dự án, đảm bảo AI không bao giờ tự ý đưa ra các quyết định có độ rủi ro cao hoặc vượt quá thẩm quyền:
* **Các loại quyết định bắt buộc qua Inbox:**
  - **Tuyển dụng Agent mới (Hire Agent):** Khi Coordinator nhận thấy thiếu chuyên môn và muốn tuyển thêm Agent (ví dụ: cần thêm Security Auditor).
  - **Sa thải / Loại bỏ Agent (Fire/Shutdown Agent):** Khi cần tinh gọn đội ngũ hoặc Agent hoạt động không hiệu quả.
  - **Thay đổi Sứ mệnh / Mục tiêu (Change Purpose/Scope):** Mọi điều chỉnh về mục tiêu dự án trong `purpose.md` phải được CEO ký duyệt.
  - **Leo thang xử lý bế tắc (Escalation):** Khi nhiệm vụ bị trả về quá 2 lần trong khâu Maker-Checker hoặc gặp lỗi không thể tự giải quyết.
  - **Duyệt ngân sách & quyền hạn nhạy cảm (Budget & Permissions):** Cấp quyền ghi vào các thư mục bảo mật hoặc thực thi các lệnh nguy hiểm.
* **Giao diện Master - Detail chuyên nghiệp:**
  - Danh sách quyết định bên trái lọc theo loại (`hire`, `fire`, `purpose`, `escalation`) và độ khẩn cấp (`urgent`, `normal`, `low`).
  - Khung nội dung chi tiết bên phải phân tích rõ: Bối cảnh, lý do đề xuất, bằng chứng (diff/file liên quan), và **Phân tích rủi ro (Risk Analysis)** giúp CEO đưa ra quyết định chính xác chỉ sau một cái nhấp chuột (`Approve` hoặc `Reject`).

### 4.4. Console (Trung Tâm Tác Chiến Đa Tác Nhân — Mission Console)
Phiên bản v0.0.4 đã hợp nhất toàn diện hai tab Chat và War Room riêng lẻ thành một màn hình tác chiến tập trung duy nhất mang tên **Console**:
* **Kiến trúc Kênh liên lạc (Channels Architecture):** Tương tự Slack/Discord chuyên biệt cho Multi-Agent:
  - **Kênh toàn đội (`📢 #team-feed`):**
    + *Lưới thẻ Agent trực tiếp (Mini War Room Grid):* Hiển thị thẻ trạng thái thời gian thực của mọi Agent (Đang suy nghĩ, Đang chạy lệnh shell, Đang sửa code, Đang nhàn rỗi) kèm hiệu ứng đèn pulse nhấp nháy màu Violet.
    + *Dòng thời gian hoạt động toàn công ty (Global Activity Timeline):* Ghi nhận tức thì từng sự kiện quan trọng (Ai vừa hoàn thành file, Ai vừa bàn giao cho Reviewer, Ai vừa gửi phản hồi).
  - **Kênh riêng từng Agent (`🤖 @agent-id`):**
    + Khi CEO muốn làm việc sâu với một cá nhân (như `@coordinator`, `@implementer`, `@reviewer`).
    + Xem trọn vẹn transcript suy nghĩ, các file diff do chính Agent đó sửa đổi.
    + **Chỉ đạo 1:1 trực tiếp (Direct Steer):** CEO có thể gửi lời nhắc hoặc chỉ thị riêng cho Agent qua Mailbox mà không làm loãng luồng trao đổi chung của cả đội.
* **Hệ thống Định Danh Tác Nhân (Agent Attribution Engine):**
  - Xóa bỏ vĩnh viễn chữ "Cline" chung chung gây nhầm lẫn.
  - Mọi khối tin nhắn, khối suy nghĩ (`ThinkingRow`), lệnh terminal (`CommandOutputRow`) và khối diff sửa file (`DiffEditRow`) đều mang **`AgentBadge`** nhận diện trực quan: Avatar đại diện, Tên nhân sự và Màu sắc chuẩn của vai trò (Tím Violet cho Lead, Xanh Dương Navy cho Implementer, Vàng Cam cho Reviewer, v.v.).
* **Thanh Điều Hướng Thu Gọn Linh Hoạt (Collapsible Sidebar):**
  - Chuyển đổi linh hoạt giữa chế độ Mở rộng (Expanded 180px–260px) và chế độ Thu gọn (Mini-mode 48px).
  - Ở chế độ Mini-mode, sidebar chỉ hiển thị các icon avatar tròn cùng đèn trạng thái, giúp mở rộng tối đa không gian xem code diff và chat trên khung VS Code hẹp.

---

## 5. Chuẩn Hóa Trải Nghiệm & Design System

Để mang lại cảm giác một công cụ phát triển phần mềm đẳng cấp công nghiệp (Enterprise-grade Tool) thay vì một plugin chắp vá, Orvanta v0.0.5 thiết lập hệ thống Design System chuẩn mực, thích ứng nguyên bản với VS Code Extension:

### 5.1. Bảy Nguyên Tắc Trải Nghiệm Thị Giác
1. **Giao diện tinh gọn & tối giản (Lean & Minimal):** Loại bỏ màu nền sặc sỡ và hiệu ứng rườm rà. Sử dụng bảng màu trung tính đồng bộ biến số màu gốc của VS Code (`--vscode-sideBar-background`, `--vscode-editor-background`, `--vscode-border-panel`).
2. **Loại bỏ 100% Emoji trang trí:** Toàn bộ biểu tượng trong hệ thống được thay thế đồng nhất bằng **Tabler Icons SVG** nét mảnh (`stroke={1.5}`), kích thước từ 12px đến 16px, tạo phong thái chuyên nghiệp và sắc sảo.
3. **Mật độ thông tin cao (High Information Density):** Giảm khoảng cách đệm (padding/gap từ 24px xuống 8px–12px) để hiển thị trọn vẹn dữ liệu trong không gian bề ngang hẹp của thanh bên editor (250px – 400px).
4. **Khóa tràn trang 100dvh (100dvh Lock):** Khóa cứng kích thước khung nhìn, triệt tiêu hoàn toàn thanh cuộn bao ngoài toàn trang. Mỗi phân vùng (cột danh sách, khung chat, chi tiết cấu hình) đều tự quản lý thanh cuộn độc lập.
5. **Thanh cuộn siêu mảnh (Micro Thin Scrollbar):** Áp dụng class `.scroller-y` cố định độ rộng **6px**, bo góc viền tinh tế và màu sắc hòa nhập nhẹ nhàng vào nền, không bao giờ che khuất văn bản mã nguồn.
6. **Bảng màu nhận diện thương hiệu Orvanta:**
   - **Dark Navy (`#0F172A` / Neutral Dark):** Nền tảng chỉ huy vững chắc.
   - **Indigo (`#4F46E5`):** Điểm nhấn tương tác chính, nút hành động, tab đang chọn.
   - **Violet (`#8B5CF6`):** Điểm nhấn năng lượng của Agent đang hoạt động, hiệu ứng pulse running.
7. **Thành phần dùng chung thống nhất (Design Tokens & Primitives):** Bộ component `Button`, `Badge`, `Card`, `Tooltip`, `Dialog` được tái sử dụng xuyên suốt cả 4 trang giao diện.

---

## 6. Cấu Trúc Lưu Trữ Dữ Liệu Bền Vững (`.orvanta/`)

Mọi thông tin về cơ cấu tổ chức, mục tiêu, bộ nhớ và sản phẩm bàn giao của Orvanta đều được số hóa thành các file tĩnh lưu trữ trực tiếp trong thư mục `.orvanta/` tại gốc repository:

```
.orvanta/
├── purpose.md                     # Bản tuyên ngôn mục tiêu bất biến của công ty
├── org/
│   ├── roster.json                # Sơ đồ nhân sự và cây chỉ huy (id, role, reportsTo)
│   ├── profiles/                  # Hồ sơ chuyên sâu của từng nhân sự
│   │   ├── coordinator.md         # Profile, tools, rules, model của Coordinator
│   │   ├── implementer.md         # Profile của Kỹ sư lập trình
│   │   └── reviewer.md            # Profile của Chuyên viên kiểm duyệt độc lập
│   └── memory/                    # Bộ nhớ dài hạn tích lũy qua các phiên
│       ├── coordinator.md         # Kinh nghiệm điều phối dự án
│       ├── implementer.md         # Ghi chú kỹ thuật về codebase
│       └── reviewer.md            # Các tiêu chuẩn chất lượng riêng của repo
├── inbox/                         # Hộp thư lưu vết các quyết định của CEO
│   ├── pending/                   # Các yêu cầu đang chờ phê duyệt
│   └── resolved/                  # Lịch sử các quyết định đã duyệt/từ chối
├── history/                       # Lịch sử các cuộc hội thoại & phiên làm việc của repo
│   ├── sessions.json              # Danh mục các phiên làm việc (tokens, chi phí, metadata)
│   └── tasks/                     # Transcript chi tiết tin nhắn theo từng Task ID
└── artifacts/                     # BẰNG CHỨNG DUY NHẤT: Sản phẩm bàn giao
    ├── marketing/                 # Bản thảo chiến dịch, email, bài viết
    ├── sales/                     # Tài liệu bán hàng, kịch bản chào hàng
    ├── research/                  # Báo cáo phân tích kỹ thuật, khảo sát
    ├── reviews/                   # Biên bản thẩm định của Reviewer
    └── build/                     # Kết quả build, test reports
```

### Ưu điểm vượt trội của kiến trúc này:
* **Tính di động 100% (Repository-Bound):** Khi một lập trình viên khác clone repository, họ nhận được nguyên vẹn "Công ty AI" với đầy đủ kinh nghiệm và nhân sự đã được huấn luyện mà không cần cài đặt lại từ đầu.
* **Theo dõi lịch sử với Git (Version Controlled):** Mọi sự thay đổi về nhân sự (thêm role, đổi model), đổi mục tiêu dự án, hay các sản phẩm bàn giao đều được commit vào Git, dễ dàng rollback hoặc audit khi cần.

---

## 7. Giá Trị Thực Tiễn Cho Doanh Nghiệp & Founder

### 7.1. Lợi Ích Cốt Lõi Khi Đưa Orvanta Vào Quy Trình Phát Triển
1. **Giải phóng thời gian điều hành (10x Founder Leverage):** Founder không cần phải cặm cụi code từng hàm hay ngồi canh chatbot sinh câu trả lời. Bạn chỉ cần giao đầu bài mục tiêu trong `Home` hoặc `purpose.md`, toàn bộ đội ngũ sẽ tự phân rã việc, triển khai code và kiểm thử chéo.
2. **Loại bỏ rủi ro phá vỡ mã nguồn (Risk-Free Autonomy):** Nhờ cơ chế phân quyền công cụ nghiêm ngặt (Reviewer không được sửa code bừa bãi, các đường dẫn nhạy cảm được bảo vệ) cùng cổng kiểm soát **CEO Inbox**, dự án được bảo vệ an toàn 100% trước những hành vi tự phát của AI.
3. **Tiết kiệm tối đa chi phí Token API:** Mô hình Hub-and-Spoke ngăn chặn việc sub-agent nhắn tin vòng tròn; cơ chế Bounded Feedback Loop khóa cứng tối đa 2 lần sửa; các mô hình AI được phân bổ đúng việc (Model mạnh giá cao như Claude 3.7 / GPT-4o cho Coordinator/Architect, Model nhanh gọn chi phí thấp như Haiku / Flash / DeepSeek cho Implementer/Researcher).
4. **Chuẩn hóa tri thức tổ chức:** Thay vì tri thức nằm rải rác trong đầu cá nhân, mọi quy ước, kinh nghiệm và sản phẩm đều được lưu trữ trực tiếp vào repository thành tài sản số lâu dài của doanh nghiệp.

### 7.2. Lộ Trình Tiến Hóa Của Nền Tảng (Evolution Roadmap)

| Phiên Bản | Tên Gọi Trọng Tâm | Đóng Góp Kiến Trúc Chủ Lực |
|:---:|---|---|
| **v0.0.1** | *Nền Tảng Ban Đầu* | Định hình tầm nhìn "Công ty AI gắn repo"; 4 bề mặt Home, Inbox, Chat, War Room; purpose-lock bảo vệ mục tiêu. |
| **v0.0.2** | *Roster & Cây Tổ Chức Đa Tầng* | Tách tab Agents; mô hình hóa cây nhân sự đa tầng qua `reportsTo`; form cấu hình 5 tabs chuyên sâu (Profile, Model, Tools, Instructions, Skills). |
| **v0.0.3** | *Kiến Trúc Thực Thi Tự Động* | Bộ máy Autonomous Execution: Hub-and-Spoke điều phối có trật tự; Artifact-Driven Deliverables nộp file làm bằng chứng; quy trình Maker-Checker tách biệt; Bounded Feedback Loop tối đa 2 lần; Bộ nhớ 3 tầng. |
| **v0.0.4** | *Mission Console Tập Trung* | Hợp nhất Chat & War Room thành tab Console duy nhất; kiến trúc Channels (`#team-feed` & `@agent`); Agent Attribution định danh từng dòng code; Sidebar thu gọn linh hoạt 48px. |
| **v0.0.5** | *Chuẩn Hóa Design System* | Tinh giản giao diện theo chuẩn VS Code; 100% Tabler Icons nét mảnh; khóa tràn khung 100dvh; thanh cuộn siêu mỏng 6px; đồng bộ tokens toàn diện. |
| **v0.1.0** | *Chrome-like Multi-Chat Tabs & Workspace History* | Thanh Chrome Tab Bar bao trùm ConsoleView Root; hỗ trợ mở và quản lý nhiều cuộc trò chuyện song song; nút tạo tab mới [+]; lưu trữ bền vững lịch sử phiên vào `.orvanta/history/` cùng repo; khay History Drawer xem lại và chat tiếp mượt mà. |

---

## 8. Hướng Dẫn Bắt Đầu Nhanh (Quick Start)

1. **Khởi tạo Công ty trong Repository:**
   - Mở VS Code trong thư mục dự án của bạn.
   - Bấm vào biểu tượng Orvanta trên thanh Activity Bar.
   - Hệ thống tự động tạo thư mục `.orvanta/` với các thiết lập mặc định hoặc nạp lại công ty đã có.
2. **Thiết lập Sứ mệnh (Purpose):**
   - Mở file `.orvanta/purpose.md` hoặc chỉnh sửa trực tiếp trên thẻ **Purpose Banner** tại trang **Home**.
   - Mô tả rõ: Dự án này là gì, khách hàng mục tiêu là ai, các nguyên tắc kiến trúc bắt buộc phải tuân theo.
3. **Kiểm tra Cơ cấu Đội ngũ (Agents):**
   - Chuyển sang tab **Agents** để quan sát sơ đồ cây tổ chức.
   - Xem hoặc tùy chỉnh Model AI và quyền hạn công cụ của từng thành viên (`coordinator`, `implementer`, `reviewer`).
4. **Giao Nhiệm vụ & Vận hành:**
   - Mở tab **Console**, nhập yêu cầu chiến lược cho `@coordinator` (ví dụ: *"Khảo sát và xây dựng module xác thực người dùng bằng JWT"*).
   - Theo dõi tiến độ thời gian thực trên kênh `#team-feed`.
   - Khi có quyết định cần duyệt (hoặc khi việc hoàn tất cần nghiệm thu lớn), mở tab **Inbox** để kiểm tra và bấm **Approve**.

---

## Lời Kết

**Orvanta** không chỉ đơn thuần là một công cụ lập trình hay một lớp giao diện bọc ngoài. Orvanta đại diện cho một **bước chuyển dịch về cách con người xây dựng phần mềm**: từ việc tự mình gõ từng dòng lệnh hay điều khiển một chatbot thụ động, sang việc trở thành một **nhà lãnh đạo điều hành cả một tổ chức AI tinh nhuệ, có kỷ luật và gắn kết bền bỉ theo từng dự án**.

