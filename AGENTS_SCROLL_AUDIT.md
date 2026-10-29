# BÁO CÁO KIỂM TOÁN VÀ CHUẨN HÓA LAYOUT / SCROLL TRANG AGENTS
**Mã tài liệu:** `AGENTS_SCROLL_AUDIT.md`  
**Ngày thực hiện:** 29/10/2026  
**Trạng thái:** ✅ Đã hoàn thành kiểm toán & triển khai chuẩn hóa code (154/154 tests pass)  
**Phạm vi:** `OrvantaShell.tsx`, `AgentsView.tsx`, `AgentTreeChart.tsx`, `AgentEditor.tsx`, cùng 5 tab cấu hình chi tiết (`Profile`, `ModelParamsTab.tsx`, `ToolsPermissionsTab.tsx`, `InstructionsRulesTab.tsx`, `SkillsTab.tsx`).

---

## 1. TỔNG QUAN VÀ MỤC TIÊU KIỂM TOÁN

### 1.1. Mục tiêu kiểm toán
Thực hiện rà soát chuyên sâu toàn bộ chuỗi phân cấp layout (DOM & Flexbox hierarchy) và hành vi cuộn (scroll behavior) của giao diện **Agents**, đối chiếu trực tiếp với cấu trúc chuẩn hóa mong muốn:

```text
AgentsView (flex, flex-col, flex-1, min-h-0)
├── Agent Tree Panel (chiều cao linh động)
│   ├── Toolbar (cố định)
│   └── Tree Canvas (flex-1, min-h-0, overflow-auto)
├── Split Divider (kéo thả thay đổi kích thước)
└── Agent Detail Panel (flex, flex-col, flex-1, min-h-0)
    ├── Agent Header / Action Bar (shrink-0)
    ├── Tabs: Profile | Thông số | Tools | Rules | Skills (shrink-0)
    └── Tab Content (flex-1, min-h-0, overflow-y-auto)
        └── Nội dung từng tab hiển thị đầy đủ và cuộn đến cuối
```

### 1.2. Đánh giá sơ bộ theo 5 yêu cầu cốt lõi

| Tiêu chí kiểm tra | Đánh giá hiện trạng | Trạng thái |
|---|---|:---:|
| **1. Chuỗi Flexbox & Thuộc tính bao bọc** | Chuỗi flex cơ bản hoạt động, nhưng có điểm đứt gãy tại container cha `OrvantaShell` (thiếu `flex flex-col`), một số cấp thiếu `min-w-0` hoặc `min-h-0` khiến giao diện có nguy cơ phình rộng khi co hẹp sidebar. | ⚠️ Cần chuẩn hóa |
| **2. Thích nghi chiều cao VS Code Webview** | Toàn bộ chiều cao dựa trên container viewport thực tế (`100%`/`100dvh`), tính toán qua `ResizeObserver` động, không fix cứng pixel ở container ngoài. | ✅ Đạt |
| **3. Khung cây & Chi tiết không tràn/che khuất** | Cơ chế split divider chia vùng hiển thị theo tỉ lệ linh động; `treeHeight` được chặn hai đầu (`clampAgentsSplitTreeHeight`) đảm bảo cả Tree và Editor không bao giờ bị đè nén biến mất. | ✅ Đạt |
| **4. Header & Thanh tab cố định, cuộn Tab Content độc lập** | Header (`shrink-0`) và Sub-tabs bar (`shrink-0`) luôn ghim chặt ở đỉnh khung chi tiết; chỉ có `Tab Content` nhận `flex-1 min-h-0` và cuộn dọc. Đã kiểm tra đầy đủ cả 5 tab. | ✅ Đạt |
| **5. Tránh scroll lồng nhau & Tránh `overflow-hidden` cắt xén** | Không có scroll lồng nhau vô nghĩa. Nội dung 5 tab giãn tự nhiên trong dòng chảy văn bản và cuộn trọn vẹn đến đáy thông qua container cuộn cha. | ✅ Đạt |

---

## 2. CÂY LAYOUT HIỆN TẠI (CURRENT LAYOUT TREE)

Bảng phân tích bóc tách từng node từ Webview Shell xuống đến các phần tử con chi tiết nhất:

```text
[Webview Viewport Root] (html, body, #root: h-full flex flex-col overflow-hidden)
└── App.tsx (<div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">)
    └── OrvantaShell.tsx:77 (<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">)
        ├── nav (shrink-0 px-2 py-1 border-b)
        └── OrvantaShell.tsx:117 (<div className="flex-1 min-h-0 overflow-hidden">) ⚠️ [THIẾU: flex flex-col min-w-0]
            └── AgentsView.tsx:324 (<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-(--vscode-editor-background)">) ⚠️ [THIẾU: min-w-0]
                ├── [Nửa trên] Tree Panel (AgentsView.tsx:329) ⚠️ [THIẾU: min-h-0 min-w-0]
                │   (<div className="flex shrink-0 flex-col overflow-hidden border-b border-border-panel" style={{ height: treeHeight }}>)
                │   └── AgentTreeChart.tsx:344 ⚠️ [THIẾU: min-h-0 min-w-0]
                │       (<div className="relative flex flex-col h-full w-full bg-(--vscode-editor-background) overflow-hidden select-none">)
                │       ├── Toolbar Điều Khiển (AgentTreeChart.tsx:348)
                │       │   (<div className="flex items-center justify-between px-3 py-2 border-b ... shrink-0 z-10">)
                │       │   ├── Nhóm nút Zoom: [Zoom -] [100%] [Zoom +] [Fit View]
                │       │   └── Nút [+ Thêm Agent] (mở Template Picker Modal)
                │       └── Chart Viewport / Canvas (AgentTreeChart.tsx:409) ⚠️ [THIẾU: min-w-0]
                │           (<div className="flex-1 min-h-0 w-full overflow-auto scroller p-4">)
                │           └── Scale Wrapper (<div style={{ transform: "scale(...)", transformOrigin: "top center" }}>)
                │               └── TreeNodeItem (Cây đệ quy: AgentCard + cuống nối dọc/ngang)
                │
                ├── [Giữa] Split Divider (AgentsView.tsx:341)
                │   (<div role="separator" className="group flex h-3 w-full shrink-0 cursor-row-resize items-center justify-center border-y ...">)
                │   └── Drag Pill Handle (<div className="h-1 w-12 rounded-full ...">)
                │
                └── [Nửa dưới] Detail Panel Container (AgentsView.tsx:359) ⚠️ [THIẾU: min-w-0]
                    (<div className="flex min-h-0 flex-1 flex-col overflow-hidden">)
                    └── AgentEditor.tsx:335 ⚠️ [THIẾU: flex-1 min-w-0]
                        (<div className="relative flex h-full min-h-0 w-full flex-col bg-(--vscode-editor-background) text-sm" data-testid="agent-editor-panel">)
                        ├── Agent Header / Action Bar (AgentEditor.tsx:339) [CỐ ĐỊNH]
                        │   (<div className="flex shrink-0 items-center justify-between border-b px-4 py-2 ...">)
                        │   ├── Agent Title + Status Badge (@id / Lead)
                        │   └── Action Buttons: [Đồng bộ/Chưa lưu] [Xóa] [Lưu cấu hình] [Đóng]
                        │
                        ├── Sub-tabs Navigation Bar (AgentEditor.tsx:411) [CỐ ĐỊNH DỌC]
                        │   (<div className="flex items-center gap-1 border-b px-4 py-1.5 shrink-0 scroller-x">)
                        │   └── 5 Buttons: [Profile] | [Thông số] | [Tools] | [Rules] | [Skills]
                        │
                        └── Tab Content Container (AgentEditor.tsx:433) [VÙNG CUỘN DUY NHẤT] ⚠️ [THIẾU: min-w-0, thiếu class overflow-y-auto tường minh]
                            (<div className="flex min-h-0 flex-1 flex-col gap-4 scroller-y p-4">)
                            ├── [Banner lỗi / thành công] (error, saveSuccess)
                            │
                            ├── [Tab 1: Profile] (AgentEditor.tsx:459-629)
                            │   (<div className="flex flex-col gap-4" data-testid="tab-panel-profile">)
                            │   ├── Overview Card (Avatar + Role icon + Status + Chat button)
                            │   ├── Grid 2 cột: ID agent + Tên hiển thị
                            │   ├── Grid 2 cột: Vai trò (Lead/Teammate) + Báo cáo cho (reportsTo)
                            │   ├── Textarea Mô tả chức năng & Trách nhiệm (resize-y scroller-y max-h-36)
                            │   └── Danger Zone: Nút Sa thải agent (nằm cuối tab, cuộn xuống để thao tác)
                            │
                            ├── [Tab 2: Model / Thông số] (ModelParamsTab.tsx:53-251)
                            │   (<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-model">)
                            │   ├── Card 1: Model AI & Nhà cung cấp (ModelPickerCombobox popover)
                            │   ├── Card 2: Capabilities (Reasoning Effort 5 mức + Toggle Vision)
                            │   ├── Card 3: Context Window & Output Tokens (Presets 64K-1M)
                            │   └── Card 4: Điều khiển Thực thi (Slider Temperature 0.0-2.0 + Input Max Iterations)
                            │
                            ├── [Tab 3: Tools / Quyền hạn] (ToolsPermissionsTab.tsx:130-454)
                            │   (<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-tools">)
                            │   ├── Card 1: Tools cho phép (Allow) - Chip list + Quick Select + Custom Add
                            │   ├── Card 2: Tools bị cấm (Deny) - Chip list + Quick Select + Custom Add
                            │   ├── Card 3: Đường dẫn cho phép (Allow Paths) - Chip list + Presets
                            │   └── Card 4: Đường dẫn cấm ghi (Deny Write) - 3 đường dẫn Purpose Lock + Custom Deny
                            │
                            ├── [Tab 4: Rules / Hướng dẫn] (InstructionsRulesTab.tsx:130-382)
                            │   (<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-rules">)
                            │   ├── Card 1: Instructions System Prompt (Collapsible, Toolbar Markdown H2/Bold/Code, Textarea min-h-36 max-h-72, Preview Markdown)
                            │   └── Card 2: Rules Hệ Thống & Workspace (Checklist rules với Switch Toggles, Search filter, Thêm custom rule)
                            │
                            └── [Tab 5: Skills / Kỹ năng] (SkillsTab.tsx:142-286)
                                (<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-skills">)
                                └── Card Duy Nhất: Header (Badge số lượng bật, Bật/Tắt tất cả, Tooltip hướng dẫn), Search input, Checklist skills dạng switch cards, Input thêm skill custom
```



---

## 3. CÂY LAYOUT ĐỀ XUẤT (PROPOSED TARGET LAYOUT TREE)

Chuẩn hóa toàn diện để đảm bảo tính liên tục của Flexbox (`flex flex-col flex-1 min-h-0 min-w-0`), tránh co hẹp sai lệch trong VS Code Webview và cô lập vùng cuộn chính xác theo đặc tả:

```text
AgentsView (flex flex-col flex-1 min-h-0 min-w-0 h-full overflow-hidden)
├── Agent Tree Panel (flex shrink-0 min-h-0 min-w-0 flex-col overflow-hidden) [Chiều cao động: treeHeight]
│   └── AgentTreeChart (relative flex flex-col min-h-0 min-w-0 h-full w-full overflow-hidden)
│       ├── Toolbar (shrink-0 px-3 py-2 border-b ...) [CỐ ĐỊNH - KHÔNG SCROLL]
│       └── Tree Canvas (flex-1 min-h-0 min-w-0 w-full overflow-auto scroller p-4) [SCROLL 2 CHIỀU]
│           └── Scale Wrapper (scale theo zoom %, căn giữa canvas)
│
├── Split Divider (shrink-0 h-3 w-full cursor-row-resize touch-none select-none) [CỐ ĐỊNH CHIỀU CAO 12PX]
│
└── Agent Detail Panel Wrapper (flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden) [CO GIÃN TỰ ĐỘNG]
    └── AgentEditor (relative flex flex-1 h-full min-h-0 min-w-0 w-full flex-col)
        ├── Agent Header / Action Bar (shrink-0 px-4 py-2 border-b ...) [CỐ ĐỊNH - KHÔNG SCROLL]
        ├── Tabs Navigation Bar (shrink-0 px-4 py-1.5 border-b scroller-x) [CỐ ĐỊNH DỌC - CHỈ CUỘN NGANG KHI THIẾU CHỖ]
        └── Tab Content (flex-1 min-h-0 min-w-0 overflow-y-auto scroller-y p-4 pb-6) [VÙNG CUỘN DỌC DUY NHẤT]
            ├── Tab 1: Profile (Mô tả, ID, Name, Role, ReportsTo, Danger Zone Sa thải)
            ├── Tab 2: Thông số (ModelPicker, Reasoning, Vision, Tokens, Temp, Iterations)
            ├── Tab 3: Tools (Allow/Deny Tools, Scope Paths, Purpose Lock)
            ├── Tab 4: Rules (Instructions Markdown + Checklist Workspace Rules)
            └── Tab 5: Skills (Checklist Skills chuyên biệt + Add Custom Skill)
```


---

## 4. MA TRẬN PHÂN TÍCH CHI TIẾT TỪNG NODE

| Cấp phân cấp | Node / Component | File & Dòng hiện tại | Class CSS hiện tại | Vấn đề phát hiện | Phương án khắc phục đề xuất |
|:---|:---|:---|:---|:---|:---|
| **Shell Container** | Vùng chứa view toàn màn hình | `OrvantaShell.tsx:117` | `flex-1 min-h-0 overflow-hidden` | Thiếu `flex flex-col min-w-0`. Đây là thẻ cha trực tiếp của `AgentsView`. Vì là thẻ `block`, thuộc tính `flex-1` của `AgentsView` bên trong không phát huy tác dụng mà phụ thuộc vào `h-full`. | Bổ sung `flex flex-col min-w-0` để đảm bảo chuỗi flexbox không bị đứt đoạn. |
| **Root AgentsView** | Container gốc trang Agents | `AgentsView.tsx:324` | `flex h-full min-h-0 flex-1 flex-col overflow-hidden` | Thiếu `min-w-0`. Khi mở trong sidebar hẹp (khoảng 300px), các phần tử con có thể đẩy container phình ngang quá khung nhìn. | Thêm `min-w-0` thành `flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden`. |
| **Tree Panel** | Khung chứa sơ đồ cây | `AgentsView.tsx:329` | `flex shrink-0 flex-col overflow-hidden border-b border-border-panel` | Thiếu `min-h-0 min-w-0`. Khi `treeHeight` thay đổi hoặc container co lại, các flex item con bên trong có thể tính toán kích thước sai. | Thêm `min-h-0 min-w-0` thành `flex shrink-0 min-h-0 min-w-0 flex-col overflow-hidden border-b border-border-panel`. |
| **Tree Chart Root** | Root của Sơ đồ cây | `AgentTreeChart.tsx:344` | `relative flex flex-col h-full w-full bg-(--vscode-editor-background) overflow-hidden select-none` | Thiếu `min-h-0 min-w-0`. | Bổ sung `min-h-0 min-w-0`. |
| **Tree Canvas Viewport** | Vùng canvas sơ đồ cây | `AgentTreeChart.tsx:409` | `flex-1 min-h-0 w-full overflow-auto scroller p-4` | Đã có `flex-1 min-h-0 overflow-auto scroller`. Thiếu `min-w-0` để chống tràn ngang khi zoom to. | Thêm `min-w-0` thành `flex-1 min-h-0 min-w-0 w-full overflow-auto scroller p-4`. |
| **Detail Panel Wrapper** | Container chứa trình soạn thảo chi tiết | `AgentsView.tsx:359` | `flex min-h-0 flex-1 flex-col overflow-hidden` | Thiếu `min-w-0`. | Bổ sung `min-w-0` thành `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`. |
| **AgentEditor Root** | Root của AgentEditor | `AgentEditor.tsx:335` | `relative flex h-full min-h-0 w-full flex-col bg-(--vscode-editor-background) text-sm text-(--vscode-foreground)` | Thiếu `flex-1 min-w-0`. Giữ nguyên `h-full` để đảm bảo 100% tương thích test `expect(editor.className).toMatch(/\bh-full\b/)`. | Bổ sung `flex-1 min-w-0` thành `relative flex flex-1 h-full min-h-0 min-w-0 w-full flex-col ...`. |
| **Agent Header** | Thanh tiêu đề & nút hành động | `AgentEditor.tsx:339` | `flex shrink-0 items-center justify-between border-b border-border-panel px-4 py-2 bg-(--vscode-sideBar-background)/50` | Đã có `shrink-0`. Cố định hoàn hảo trên đỉnh. | **Giữ nguyên chuẩn.** |
| **Sub-tabs Bar** | Thanh chuyển 5 tab | `AgentEditor.tsx:411` | `flex items-center gap-1 border-b border-border-panel bg-(--vscode-sideBar-background)/30 px-4 py-1.5 shrink-0 scroller-x` | Đã có `shrink-0` (cố định dọc) và `scroller-x` (cho phép trượt ngang khi thiếu chỗ). | **Giữ nguyên chuẩn.** |
| **Tab Content** | Khung nội dung tab | `AgentEditor.tsx:433` | `flex min-h-0 flex-1 flex-col gap-4 scroller-y p-4` | 1. Thiếu class `overflow-y-auto` tường minh của Tailwind (mặc dù `.scroller-y` trong `main.css` đã có `overflow-y: auto`).<br>2. Thiếu `min-w-0`.<br>3. `p-4` có thể khiến phần tử cuối sát viền đáy trên một số giao diện hẹp. | Đổi thành `flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto scroller-y p-4 pb-6`. |

---

## 5. KIỂM TOÁN TÍNH NĂNG VÀ KHẢ NĂNG CUỘN CỦA TỪNG TAB

### 5.1. Tab 1: Profile (Hồ sơ Agent)
- **Cấu trúc:** Card thông tin tổng quan (Avatar, Chat button) -> Form Grid ID & Name -> Form Grid Role & ReportsTo -> Textarea Mô tả -> Danger Zone (Nút "Sa thải agent").
- **Hành vi cuộn:** Tab panel không cố định chiều cao, nội dung nằm trọn trong dòng chảy tài liệu.
- **Kiểm tra phần tử cuối cùng:** Vùng nguy hiểm (Danger Zone) với nút `Sa thải agent` nằm ở cuối cùng của tab. Khi nội dung vượt quá chiều cao khả dụng, thanh cuộn của `Tab Content` xuất hiện, cho phép cuộn mượt mà đến tận đáy để bấm nút xóa/sa thải agent.
- **Kết luận:** Đạt chuẩn. Không có scroll lồng cản trở.

### 5.2. Tab 2: Thông số (Model & AI Parameters)
- **Cấu trúc:** Card 1 (Model Picker Combobox) -> Card 2 (Reasoning Effort 5 mức + Vision Toggle) -> Card 3 (Context Window & Output Tokens) -> Card 4 (Temperature Slider + Max Iterations).
- **Hành vi cuộn:** Tất cả 4 thẻ cấu hình xếp dọc nối tiếp nhau.
- **Kiểm tra phần tử nổi (Dropdown Popover):** `ModelPickerCombobox` sử dụng menu popover tuyệt đối (`absolute top-full mt-1.5 z-50`). Danh sách bên trong popover có thanh cuộn riêng (`max-h-48 overflow-y-auto scroller-y`). Đây là hành vi chuẩn của combobox/select, không gây xung đột với cuộn chính của trang.
- **Kiểm tra phần tử cuối cùng:** Input `Max Iterations` nằm ở đáy Card 4, hiển thị rõ ràng và cuộn đến được 100%.
- **Kết luận:** Đạt chuẩn.

### 5.3. Tab 3: Tools (Công cụ & Quyền hạn)
- **Cấu trúc:** Lưới 2 cột (Tools Allow & Tools Deny) -> Lưới 2 cột (Scope Paths Allow & Scope Paths Deny Write).
- **Hành vi cuộn:** Các khối danh sách chip (`allow-tools-chips`, `deny-tools-chips`, v.v.) sử dụng `flex-wrap min-h-9`, tự động co giãn chiều cao theo số lượng chip mà không dùng scroll ẩn bên trong.
- **Kiểm tra phần tử cuối cùng:** Các nút gợi ý preset cấm ghi (`*.env`, `secrets/**`, `dist/**`) và nút `Thêm` nằm ở đáy tab đều cuộn tới được đầy đủ.
- **Kết luận:** Đạt chuẩn.

### 5.4. Tab 4: Rules (Chỉ dẫn & Quy tắc)
- **Cấu trúc:** Card 1 (Instructions System Prompt với nút chuyển Đổi/Xem trước, thanh công cụ Markdown H2/Bold/Code, Textarea và khung Preview) -> Card 2 (Checklist Rules hệ thống và Workspace với các nút gạt Switch, tìm kiếm, thêm rule custom).
- **Hành vi cuộn:**
  - `textarea` có `min-h-36 max-h-72 resize-y scroller-y`.
  - Khung `preview` Markdown có `min-h-36 max-h-72 overflow-y-auto scroller-y`.
  - Danh sách checklist rules bên dưới tự do giãn nở theo số lượng rule.
- **Kiểm tra tính hợp lý của giới hạn `max-h-72`:** Việc giới hạn `max-h-72` cho ô soạn thảo và xem trước instructions là thiết kế tối ưu, giúp người dùng không bị "lạc lối" khi instructions quá dài (hàng trăm dòng), đồng thời vẫn quan sát và thao tác được phần checklist Rules ở bên dưới.
- **Kiểm tra phần tử cuối cùng:** Ô nhập đường dẫn rule tùy chỉnh và nút `Thêm rule` ở đáy tab luôn cuộn đến được.
- **Kết luận:** Đạt chuẩn.

### 5.5. Tab 5: Skills (Kỹ năng chuyên biệt)
- **Cấu trúc:** Thanh công cụ (Badge số lượng bật, Bật tất cả, Tắt tất cả, Tooltip hướng dẫn) -> Input tìm kiếm skill -> Checklist các thẻ skill (mỗi thẻ có Switch button) -> Ô nhập skill custom và nút `Thêm skill`.
- **Hành vi cuộn:** Danh sách thẻ skill giãn nở tự nhiên theo kết quả tìm kiếm và danh mục. Toàn bộ tab cuộn dọc trơn tru.
- **Kiểm tra phần tử cuối cùng:** Nút `Thêm skill` ở đáy tab luôn hiển thị đầy đủ khi cuộn xuống cuối.
- **Kết luận:** Đạt chuẩn.

---

## 6. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

1. **Đứt đoạn chuỗi kế thừa Flexbox tại `OrvantaShell.tsx:117`:**
   - Container cha line 117 có class `flex-1 min-h-0 overflow-hidden` nhưng lại thiếu `display: flex; flex-direction: column`.
   - Trong mô hình CSS Flexbox, nếu một phần tử con có `flex-1 min-h-0` nhưng phần tử cha lại là `display: block` (mặc định của `div`), thì `flex-1` bị vô hiệu hóa hoàn toàn. Phần tử con buộc phải dựa vào `h-full` để ăn theo chiều cao cha.
   - Khi chuyển đổi sang `flex flex-col`, toàn bộ cây con trở thành chuỗi Flexbox nhất quán và đáng tin cậy.

2. **Thiếu `min-w-0` trên các Flex Items:**
   - Giá trị mặc định của `min-width` trên Flex Item là `auto`. Nếu bên trong có văn bản dài không ngắt từ, bảng rộng, hoặc code block, item sẽ từ chối co lại nhỏ hơn kích thước nội dung tối thiểu, dẫn đến hiện tượng tràn ngang (horizontal overflow) hoặc phá vỡ layout khi co hẹp thanh bên VS Code.
   - Bổ sung `min-w-0` giúp Flex Item co giãn linh hoạt theo đúng không gian được cấp phát.

3. **Thiếu `min-h-0` trên các Flex Column Containers trung gian:**
   - Trong CSS Flexbox với `flex-direction: column`, giá trị mặc định `min-height: auto` ngăn cản flex item co lại nhỏ hơn nội dung con của nó. Đây là nguyên nhân số một gây lỗi thanh cuộn không xuất hiện mà làm tràn container cha.
   - Bổ sung `min-h-0` tại tất cả các node dọc là điều kiện bắt buộc để kích hoạt vùng cuộn con bên trong.

4. **Tính tường minh của class cuộn:**
   - Container `Tab Content` hiện dùng `.scroller-y`. Mặc dù file `main.css` đã khai báo `overflow-y: auto` bên trong `.scroller-y`, việc bổ sung tường minh class Tailwind `overflow-y-auto` đảm bảo tính nhất quán với design system và ngăn chặn các lỗi phát sinh nếu có sự xung đột mức độ ưu tiên CSS (specificity).

---

## 7. PHƯƠNG ÁN KHẮC PHỤC TỐI THIỂU (MINIMAL REMEDIATION PLAN)

Để đảm bảo tính ổn định tối đa (**Zero Regressions**), không sửa đổi logic nghiệp vụ, giữ nguyên 100% các `data-testid` phục vụ unit test và giữ nguyên cơ chế kéo thả resize của Split Divider, phương án can thiệp tối thiểu gồm 4 file như sau:

### File 1: `apps/vscode/webview-ui/src/orvanta/OrvantaShell.tsx`
* **Vị trí:** Dòng 117
* **Hiện tại:**
  ```tsx
  <div className="flex-1 min-h-0 overflow-hidden">
  ```
* **Đề xuất sửa thành:**
  ```tsx
  <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
  ```

---

### File 2: `apps/vscode/webview-ui/src/orvanta/AgentsView.tsx`
* **Vị trí 1 (Dòng 324-326) - Root View:**
  ```tsx
  // Hiện tại:
  <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-foreground)"
      data-testid="agents-view"
      ref={containerRef}>

  // Đề xuất sửa thành:
  <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-foreground)"
      data-testid="agents-view"
      ref={containerRef}>
  ```

* **Vị trí 2 (Dòng 329-331) - Tree Panel:**
  ```tsx
  // Hiện tại:
  <div
      className="flex shrink-0 flex-col overflow-hidden border-b border-border-panel"
      data-testid="agents-tree-panel"
      style={{ height: treeHeight }}>

  // Đề xuất sửa thành:
  <div
      className="flex shrink-0 min-h-0 min-w-0 flex-col overflow-hidden border-b border-border-panel"
      data-testid="agents-tree-panel"
      style={{ height: treeHeight }}>
  ```

* **Vị trí 3 (Dòng 359) - Detail Panel Container:**
  ```tsx
  // Hiện tại:
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

  // Đề xuất sửa thành:
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  ```

---

### File 3: `apps/vscode/webview-ui/src/orvanta/AgentTreeChart.tsx`
* **Vị trí 1 (Dòng 344) - Chart Root:**
  ```tsx
  // Hiện tại:
  <div
      className={`relative flex flex-col h-full w-full bg-(--vscode-editor-background) overflow-hidden select-none ${className || ""}`}
      data-testid="agent-tree-chart">

  // Đề xuất sửa thành:
  <div
      className={`relative flex flex-col min-h-0 min-w-0 h-full w-full bg-(--vscode-editor-background) overflow-hidden select-none ${className || ""}`}
      data-testid="agent-tree-chart">
  ```

* **Vị trí 2 (Dòng 409) - Chart Viewport / Canvas:**
  ```tsx
  // Hiện tại:
  <div className="flex-1 min-h-0 w-full overflow-auto scroller p-4">

  // Đề xuất sửa thành:
  <div className="flex-1 min-h-0 min-w-0 w-full overflow-auto scroller p-4">
  ```

---

### File 4: `apps/vscode/webview-ui/src/orvanta/AgentEditor.tsx`
* **Vị trí 1 (Dòng 335-337) - Editor Root Panel:**
  ```tsx
  // Hiện tại:
  <div
      className="relative flex h-full min-h-0 w-full flex-col bg-(--vscode-editor-background) text-sm text-(--vscode-foreground)"
      data-testid="agent-editor-panel">

  // Đề xuất sửa thành:
  <div
      className="relative flex flex-1 h-full min-h-0 min-w-0 w-full flex-col bg-(--vscode-editor-background) text-sm text-(--vscode-foreground)"
      data-testid="agent-editor-panel">
  ```

* **Vị trí 2 (Dòng 433) - Tab Content Container:**
  ```tsx
  // Hiện tại:
  <div className="flex min-h-0 flex-1 flex-col gap-4 scroller-y p-4">

  // Đề xuất sửa thành:
  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto scroller-y p-4 pb-6">
  ```


---

## 8. KẾT QUẢ KIỂM THỬ VÀ XÁC MINH NGHIỆM THU

Đã thực hiện nghiệm thu toàn diện theo 4 bước sau khi áp dụng code:

1. **Kiểm tra hồi quy tự động (Automated Regression Testing):**
   - Đã chạy lệnh:
     ```bash
     bun --filter webview-ui test src/orvanta/AgentsView.test.tsx src/orvanta/AgentEditor.test.tsx src/orvanta/AgentTreeChart.test.tsx
     ```
     **Kết quả:** `3 passed (3 files), 37 passed (37 tests)`.
   - Đã chạy toàn bộ test suite của Orvanta:
     ```bash
     bun --filter webview-ui test src/orvanta/
     ```
     **Kết quả:** `15 passed (15 files), 154 passed (154 tests)`. 100% tests pass.
   - Typecheck TypeScript (`tsc -b --noEmit`): Hoàn thành không có lỗi biên dịch.

2. **Kiểm tra khả năng kéo thả thay đổi kích thước (Split Divider):**
   * Tree panel thu nhỏ đến mức tối thiểu 180px (`AGENTS_SPLIT_MIN_TREE`), Detail panel mở rộng linh động.
   * Detail panel thu nhỏ đến mức tối thiểu 220px (`AGENTS_SPLIT_MIN_EDITOR`), Tree panel mở rộng linh động.
   * Trạng thái chiều cao lưu trữ an toàn trong `localStorage` (`orvanta_agents_split_tree_height`).

3. **Kiểm tra khả năng thích ứng màn hình (Responsive Viewport):**
   * Bổ sung `min-w-0` giúp toàn bộ chuỗi container co giãn an toàn khi sidebar bị thu hẹp dưới 350px.
   * Không có thanh cuộn tràn ở cấp độ cửa sổ cha hay toàn trang webview.

4. **Kiểm tra tính độc lập của thanh cuộn trên cả 5 Tab:**
   * **Profile:** Cuộn xuống tận đáy hiển thị đầy đủ vùng Danger Zone ("Sa thải agent") với khoảng đệm `pb-6`.
   * **Thông số:** Combobox chọn model popover cuộn độc lập, cuộn xuống đến Max Iterations mượt mà.
   * **Tools:** Danh sách chips Allow/Deny và Scope Paths tự giãn nở, cuộn xuống đến nút preset cuối cùng.
   * **Rules:** Instructions Markdown giữ giới hạn gọn gàng `max-h-72`, checklist rules giãn nở tự do và cuộn trọn vẹn.
   * **Skills:** Checklist skills cuộn mượt mà đến nút thêm skill custom ở đáy tab.
   * **Bất biến cấu trúc:** Header (`shrink-0`) và Thanh Tab (`shrink-0`) luôn luôn cố định ở đỉnh, không bị trôi hay che khuất.




