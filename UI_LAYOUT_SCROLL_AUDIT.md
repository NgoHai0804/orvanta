# BÁO CÁO KIỂM TOÁN LỖI GIAO DIỆN & CƠ CHẾ CUỘN NỘI BỘ (INTERNAL UI & SCROLL AUDIT)
## Kiểm Toán Chuyên Sâu Nội Bộ 4 Trang: HomeView · AgentsView · InboxView · ConsoleView
### Môi Trường Vận Hành: VS Code Webview (Không Gian Động, Bề Ngang Hẹp 250px – 400px)

---

## 1. TÔN CHỈ KIẾN TRÚC & TỔNG QUAN KIỂM TOÁN (EXECUTIVE SUMMARY)

### 1.1. Nguyên tắc kiến trúc tự chủ (Self-Contained View Principle)
Để giao diện hoạt động hoàn hảo trong VS Code Webview mà **không phụ thuộc hay đòi hỏi chỉnh sửa container bên ngoài (`OrvantaShell`, `App.tsx`)**, mỗi View (`HomeView`, `AgentsView`, `InboxView`, `ConsoleView`) phải là một **thực thể tự chủ (self-contained)**:
1. **Tự xác lập kích thước linh hoạt:** Tự gán `h-full w-full min-h-0 min-w-0` để chiếm trọn vẹn và chính xác không gian được cấp phát bởi VS Code, **tuyệt đối không fix cứng chiều cao pixel (`height: Xpx`)** và **không dùng `100vh`** (gây tràn khi VS Code mở thanh trạng thái hoặc terminal).
2. **Tự quản lý cơ chế cuộn (Self-Managed Scrolling):** Mọi trang hoặc thẻ bên trong nếu có nội dung vượt quá chiều cao khả dụng phải tự kích hoạt thanh cuộn dọc (`overflow-y: auto`, `.scroller-y`) trên chính container của nó, bảo đảm `scrollHeight > clientHeight` luôn hoạt động đúng.
3. **Thích ứng với bề ngang hẹp (Narrow Responsive Design):** Trên Sidebar của VS Code, bề ngang thường chỉ dao động từ **280px đến 350px**. Mọi bố cục bên trong component phải ưu tiên dạng 1 cột (`flex-col` hoặc `grid-cols-1`), tránh ép buộc 2 cột (`grid-cols-2`) hoặc chia đôi Master-Detail ngang (`min-w-[220px]`) khi bề ngang chưa đạt ngưỡng an toàn ($\ge 500\text{px}$).
4. **Không tạo bẫy cuộn lồng nhau (No Nested Scroll Traps):** Tránh việc nhét các danh sách cuộn con (`overflow-y-auto max-h-56`) bên trong một trang đã có thanh cuộn chính, gây kẹt chuột và khiến người dùng không thể cuộn xem hết trang.

### 1.2. Bảng tổng hợp các lỗi nội bộ nghiêm trọng tại từng View

| View / Component | Vị trí code chính | Phân loại lỗi nội bộ | Mức độ | Hậu quả thị giác |
|---|---|---|---|---|
| **HomeView** | `HomeView.tsx`: Dòng 226 | Thiếu `h-full`, phụ thuộc flex cha | **CRITICAL** | Mất thanh cuộn hoàn toàn; nửa dưới trang (Purpose, Work Now, Roster) bị xén cụt. |
| **HomeView (Create)** | `HomeView.tsx`: Dòng 737 | Khóa `min-h-40`, `min-h-32` trên form | **HIGH** | Form lập công ty phình to trên cửa sổ thấp, đẩy nút tạo ra ngoài đáy. |
| **AgentsView (Tree)** | `AgentTreeChart.tsx`: Dòng 411 | Flex `justify-center` + `overflow: auto` | **CRITICAL** | Lỗi chuẩn CSS: Các node bên trái sơ đồ tổ chức bị xén cụt, không thể cuộn sang trái. |
| **AgentsView (Split)** | `AgentsView.tsx`: Dòng 331 | Khóa cứng pixel cây `style={{ height }}` | **HIGH** | Cây chiếm hết chiều cao khi viewport thấp, bóp nghẹt Editor bên dưới còn < 150px. |
| **AgentEditor (5 Tabs)** | `AgentEditor.tsx` & các Tab files | Ép 2 cột (`grid-cols-2`), bẫy cuộn lồng | **HIGH** | Vỡ layout trên sidebar hẹp; popover model bị xén; kẹt chuột khi cuộn Rules/Skills. |
| **InboxView** | `InboxView.tsx`: Dòng 180 | Bố cục Master-Detail ngang 2 cột cứng | **CRITICAL** | Cột Detail bị ép còn 80px trên sidebar hẹp; thanh duyệt ghim đáy bị tràn ngang, **mất nút Phê duyệt**. |
| **ConsoleView** | `ConsoleView.tsx`: Dòng 107 | Sibling header (36px) + `{children}` có `h-full` | **CRITICAL** | Đẩy khung Chat Composer tụt xuống đáy 36px, che khuất nút gửi tin nhắn. |
| **TeamSidebar (Console)**| `TeamSidebar.tsx`: Dòng 27 | Độ rộng 190px cố định, thiếu auto-collapse | **MEDIUM** | Chiếm trọn không gian, dồn ép khung chat / timeline còn ~110px. |

---

## 2. KIỂM TOÁN NỘI BỘ TRANG HOME (`HomeView.tsx` & SUBCOMPONENTS)

### 2.1. Container gốc `HomeView`: Thiếu `h-full`, đứt gãy cơ chế tự cuộn
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/HomeView.tsx` — Dòng 226
- **Code hiện tại:**
  ```tsx
  <div className="flex min-h-0 flex-1 flex-col gap-3 scroller-y p-3 text-sm">
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Container gốc của `HomeView` chỉ khai báo `flex min-h-0 flex-1 flex-col gap-3 scroller-y`. Thẻ này **hoàn toàn thiếu class `h-full`** (`height: 100%`).
  2. Khi component được nhúng vào bất kỳ container cha nào, nếu component con không tự định nghĩa `height: 100%` (hoặc container cha không phải là flex container), chiều cao tính toán của nó sẽ rơi về giá trị mặc định của CSS: `height: auto`.
  3. Chiều cao tự nhiên của `HomeView` khi chứa đầy đủ Header + Banners + Purpose Card + Work Now + Team Roster sẽ đạt tới **1000px – 1500px**.
  4. Vì `height: auto` nở rộng theo đúng kích thước nội dung con, bên trong chính `HomeView` **chiều cao cuộn bằng đúng chiều cao phần tử (`scrollHeight == clientHeight`)**.
  5. Do đó, class `scroller-y` (`overflow-y: auto`) trên `HomeView` **KHÔNG BAO GIỜ XUẤT HIỆN THANH CUỘN**.
  6. Trong khi đó, khung nhìn VS Code Webview bên ngoài bị giới hạn chiều cao (ví dụ: 600px) và có thuộc tính `overflow: hidden`.
  7. **HẬU QUẢ:** Phần nội dung từ 601px đến 1500px của `HomeView` (gồm thẻ Purpose, bảng Work Now, danh sách Roster) bị xén cụt hoàn toàn khỏi tầm nhìn, và người dùng không có cách nào cuộn chuột xuống được.
- **Giải pháp khắc phục nội bộ:**
  - Sửa dòng 226 `HomeView.tsx` thành:
    ```tsx
    <div className="flex h-full w-full min-h-0 flex-col gap-3 overflow-y-auto scroller-y p-3 pb-6 text-sm">
    ```
  - Bổ sung `h-full w-full` và `pb-6` để đảm bảo `HomeView` tự kiểm soát chiều cao 100% không gian và luôn cuộn mượt mà tới phần tử cuối cùng.

### 2.2. Khối Purpose Card: Thiếu chỉ báo mờ và cuộn khi xem Markdown dài
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/HomeView.tsx` — Dòng 483
- **Code hiện tại:**
  ```tsx
  <div className={expandedPurpose ? "" : "max-h-48 overflow-hidden line-clamp-8"}>
      <MarkdownBlock markdown={purpose} />
  </div>
  ```
- **Nguyên nhân:** Khối Purpose khi thu gọn bị cắt ngang bằng `max-h-48 overflow-hidden line-clamp-8` nhưng thiếu hiệu ứng gradient mờ ở đáy (`pointer-events-none absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t ...`). Khi người dùng bấm "Xem thêm", khối phình to làm trang dài thêm; nếu Lỗi 2.1 chưa sửa thì toàn bộ các khối bên dưới Purpose sẽ bị đẩy biến mất khỏi màn hình.

### 2.3. Bảng Work Now & Thẻ TaskRow trên Sidebar hẹp
- **File liên quan:** `HomeView.tsx` — Dòng 80-149 (`TaskRow`) & Dòng 428-446
- **Nguyên nhân:**
  - Trong `TaskRow`, một hàng ngang flex chứa cùng lúc: Icon trạng thái + Tiêu đề task + Badge agent phụ trách + Nút yêu cầu quyết định / Nút chi tiết.
  - Trên màn hình hẹp (< 320px), các phần tử này chen chúc, tiêu đề task bị co ngắn còn 4-5 chữ.
  - Danh sách task không có giới hạn chiều cao nội bộ hay phân trang nhỏ; khi có 15-20 tasks đang chạy, khối này nở dài vô hạn chiếm hết không gian trang Home.

### 2.4. Danh sách Team Roster: Ép 2 cột (`grid-cols-2`) trên khung hẹp
- **File liên quan:** `HomeView.tsx` — Dòng 572
- **Code hiện tại:**
  ```tsx
  <div className="grid grid-cols-2 gap-2">
  ```
- **Nguyên nhân:** Bắt buộc chia 2 cột cho danh sách thẻ Agent. Trên sidebar 280px (trừ đi padding 24px), mỗi thẻ Agent chỉ còn **$\approx 125\text{px}$**. Bên trong thẻ chứa: Avatar + Tên + Badge vai trò (Lead/Teammate) + Chấm trạng thái + Số task đã xong. Không gian 125px không đủ chỗ khiến text bị nhảy dòng 3-4 hàng, badge bị vỡ nát.
- **Giải pháp khắc phục nội bộ:** Đổi thành `grid grid-cols-1 sm:grid-cols-2 gap-2` để hiển thị 1 cột hoàn chỉnh trên sidebar hẹp.

### 2.5. Form Lập công ty (`CreateCompanyForm`): Khóa cứng chiều cao tối thiểu Textarea
- **File liên quan:** `HomeView.tsx` — Dòng 718, 737, 739
- **Code hiện tại:**
  ```tsx
  <form className="flex min-h-0 flex-1 flex-col gap-3 scroller-y p-3 text-sm" onSubmit={handleSubmit}>
      ...
      <label className="flex min-h-40 flex-1 flex-col gap-1">
          <textarea className="min-h-32 flex-1 resize-y rounded ..." />
  ```
- **Nguyên nhân:** Form cũng thiếu `h-full` (Dòng 718). Đồng thời, việc đặt `min-h-40` (160px) trên `label` và `min-h-32` (128px) trên `textarea` khiến form có chiều cao tối thiểu vượt quá chiều cao khả dụng khi VS Code bị thu hẹp (ví dụ khi mở Terminal panel, chiều cao chỉ còn 400px - 450px). Khi form nở ra ngoài, cụm nút `[Lập công ty]` và `[Tải từ thư viện]` ở đáy form bị đẩy ra ngoài vùng nhìn thấy và bị cắt cụt.
- **Giải pháp khắc phục nội bộ:** Bổ sung `h-full w-full overflow-y-auto` cho `<form>`, giảm `min-h-32` của textarea thành `min-h-24` linh động.

### 2.6. Modal Sửa Purpose (`EditPurposeModal.tsx`): Thiếu khống chế chiều cao và cuộn
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/EditPurposeModal.tsx` — Dòng 32-34
- **Nguyên nhân:** Thẻ `<form className="w-full max-w-lg rounded-lg border ... p-4 space-y-3">` nằm trong overlay `fixed inset-0 flex items-center justify-center p-4` nhưng **không có `max-h-[90vh]` hay `overflow-y-auto`**. Trên màn hình có chiều cao thấp (< 450px), modal dài hơn cửa sổ và không thể cuộn, khiến nút submit ở đáy modal bị cắt mất hoàn toàn.


---

## 3. KIỂM TOÁN NỘI BỘ TRANG AGENTS (`AgentsView.tsx` & SUBCOMPONENTS)

### 3.1. Sơ đồ cây tổ chức `AgentTreeChart.tsx`: Lỗi kinh điển CSS Flex Centering Clip
- **Vị trí code:** `apps/vscode/webview-ui/src/orvanta/AgentTreeChart.tsx` — Dòng 411
- **Code hiện tại:**
  ```tsx
  {/* Chart Viewport */}
  <div className="flex min-h-0 flex-1 items-start justify-center scroller p-6">
      {tree ? (
          <div
              style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
              }}>
              <TreeNodeItem ... />
          </div>
      ) : ( ... )}
  </div>
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Thẻ container có class `items-start justify-center scroller` (`display: flex; justify-content: center; overflow: auto;`).
  2. Mỗi node `AgentCard` có chiều rộng `w-46.25 min-w-42.5` (~170px-185px) cộng với padding và connector line. Khi công ty có từ 3 đến 5 agents cấp dưới (Coordinator quản lý Implementer, Reviewer, Researcher, Skeptic), tổng chiều rộng của cây là từ **700px đến 1000px**.
  3. Khi chiều rộng webview chỉ có 300px - 400px, nội dung cây tràn ra cả hai bên của viewport.
  4. **Lỗi chuẩn CSS Flexbox ("Scroll-to-center clipping bug"):** Khi một flex container có `justify-content: center` bị tràn nội dung, nửa bên trái của nội dung sẽ tràn vào **vùng tọa độ âm (negative coordinate space)**.
  5. Trình duyệt (Chromium/WebKit) **không hỗ trợ cuộn về tọa độ âm** trong văn bản LTR. Thanh cuộn ngang chỉ cho phép kéo sang bên phải.
  6. **HẬU QUẢ:** Toàn bộ các Agent nằm ở nhánh bên trái của cây bị cắt đứt hoàn toàn khỏi màn hình và **không có cách nào dùng chuột hay bàn phím để cuộn sang trái xem được**.
- **Giải pháp khắc phục nội bộ:**
  - Loại bỏ `justify-center` trực tiếp trên container cuộn; thay bằng container cuộn `overflow: auto` bình thường (`scroller`), bên trong bọc một thẻ đệm có `min-w-fit min-h-fit mx-auto flex items-start justify-center p-6`:
    ```tsx
    <div className="flex-1 min-h-0 w-full scroller p-4">
        <div className="min-w-fit min-h-fit mx-auto flex items-start justify-center">
            {/* Tree transform container */}
        </div>
    </div>
    ```

### 3.2. Thanh ngăn cách kéo thả (`AgentsView.tsx`) & Lỗi khóa cứng chiều cao Pixel
- **Vị trí code:** `apps/vscode/webview-ui/src/orvanta/AgentsView.tsx` — Dòng 16-20, 158, 331
- **Code hiện tại:**
  ```tsx
  export const AGENTS_SPLIT_MIN_TREE = 180
  export const AGENTS_SPLIT_MIN_EDITOR = 220
  export const AGENTS_SPLIT_DIVIDER = 12
  ...
  <div
      className="flex shrink-0 flex-col overflow-hidden border-b border-border-panel"
      data-testid="agents-tree-panel"
      style={{ height: treeHeight }}>
      <AgentTreeChart ... />
  </div>
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Phần cây sơ đồ tổ chức ở nửa trên được fix cứng chiều cao bằng inline style pixel: `style={{ height: treeHeight }}` (mặc định $\ge 180\text{px}$, thường là $250\text{px} - 350\text{px}$).
  2. Thanh divider chiếm thêm `12px` (`h-3`).
  3. Khi panel VS Code của người dùng bị thu hẹp chiều cao (ví dụ mở cửa sổ VS Code chia đôi màn hình hoặc mở Terminal ở dưới, chiều cao webview chỉ còn 450px - 500px):
     $$\text{Chiều cao còn lại cho Editor} = 450\text{px} - 280\text{px (Cây)} - 12\text{px (Divider)} = 158\text{px}$$
  4. Trong 158px này, `AgentEditor` có:
     - Header bar (Avatar, Name, Actions): ~42px
     - 5-Tabs Navigation bar: ~36px
     - Padding container: ~32px
     - **Chiều cao còn lại thực tế cho form nhập liệu: chỉ còn ~48px!**
  5. **HẬU QUẢ:** Toàn bộ nội dung form cấu hình của Agent bị bóp nghẹt thành một khe hẹp chỉ cao vài chục pixel, người dùng hoàn toàn không thể đọc hay chỉnh sửa được bất kỳ trường thông tin nào.
- **Giải pháp khắc phục nội bộ:**
  - Không fix cứng `height: treeHeight` bằng pixel cố định khi container tổng thể quá nhỏ.
  - Bổ sung nút Toggle thu gọn hẳn cây tổ chức (Collapse Tree to Header Bar) ngay trên thanh divider hoặc header để nhường 100% không gian cho Editor khi cần chỉnh sửa chi tiết.



### 3.3. Thanh tiêu đề và điều hướng của `AgentEditor.tsx`: Tràn ngang trên panel hẹp
- **Vị trí code:** `apps/vscode/webview-ui/src/orvanta/AgentEditor.tsx` — Dòng 339-408
- **Code hiện tại:**
  ```tsx
  <div className="flex shrink-0 items-center justify-between border-b border-border-panel px-4 py-2 bg-(--vscode-sideBar-background)/50">
      <div className="flex items-center gap-2 truncate pr-2">
          {/* Title & Badge */}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
          {/* Status Indicator ("Chưa lưu" / "Đã đồng bộ") */}
          {/* Delete Button */}
          {/* Save Button */}
          {/* Close Button */}
      </div>
  </div>
  ```
- **Nguyên nhân:** Cụm bên phải chứa tới 4 thành phần con với khoảng cách `gap-2.5 shrink-0`. Khi sidebar rộng 300px, cụm bên phải chiếm tới ~220px, đè bẹp phần tiêu đề bên trái và làm thanh header bị tràn bề ngang hoặc rớt dòng gây vỡ layout.

### 3.4. Kiểm toán nội bộ 5 Chuyên đề cấu hình (5 Tabs) trong `AgentEditor`

#### Tab 1: Profile (Hồ sơ Agent)
- **File liên quan:** `AgentEditor.tsx` — Dòng 522, 547, 462
- **Lỗi phát hiện:**
  1. **Ép 2 cột trên không gian hẹp:**
     `className="grid grid-cols-2 gap-3.5"` dùng cho cả cặp (ID & Tên hiển thị) và cặp (Vai trò & Reports To). Khi bề ngang webview là 280px - 320px, mỗi ô input/select chỉ rộng khoảng 120px - 135px. Nhãn "Quản lý bởi (Reports To)" và chữ trong ô dropdown bị cắt chữ nghiêm trọng (`Company Coor...`).
  2. **Thẻ Overview Card quá tải nút bấm:** Dòng 489-518 chứa cùng lúc: Avatar + Tên + 3 nút bấm (`[Chat]`, `[War room]`, `[Sa thải agent]`) trong một hàng ngang flex. Trên màn hình hẹp, cụm 3 nút bị đẩy tràn ra ngoài biên phải của thẻ.
- **Giải pháp:** Đổi `grid-cols-2` thành `grid-cols-1 sm:grid-cols-2`; cho phép cụm nút của Overview Card tự wrap khi bề ngang $< 350\text{px}$.

#### Tab 2: Thông số AI (ModelParamsTab & ModelPickerCombobox)
- **File liên quan:** `ModelParamsTab.tsx` (Dòng 85, 140, 202) & `ModelPickerCombobox.tsx` (Dòng 118-120)
- **Lỗi phát hiện:**
  1. **Popover Combobox bị xén cụt bởi container cuộn cha:**
     Trong `ModelPickerCombobox.tsx`:
     ```tsx
     <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-border-panel bg-(--vscode-sideBar-background) shadow-2xl p-2.5 max-h-84 flex flex-col gap-2">
     ```
     Combobox dùng `position: absolute` và nằm bên trong container cha `AgentEditor` đang có `overflow-y: auto` (`scroller-y`). Theo quy tắc dựng hình CSS, một phần tử `absolute` nằm trong một vùng cuộn `overflow-y: auto` sẽ **bị xén đứt (clipped)** nếu nó vươn ra ngoài biên đáy của vùng cuộn, hoặc làm thanh cuộn của vùng cha dài thêm bất thường. Người dùng mở danh mục model sẽ không thể cuộn xuống xem các model ở phía dưới.
  2. **Nút bấm Preset Tokens bị tràn ngang:**
     Dòng 140 `ModelParamsTab.tsx` dùng `grid grid-cols-2`. Bên trong cột Context Window nhồi nhét 4 nút bấm preset `[64K] [128K] [200K] [1M]` trong 1 hàng ngang ~120px. Các nút này bị đè lên nhau hoặc tràn ra khỏi thẻ card.
  3. **Reasoning Effort ép 5 cột (`grid-cols-5`):**
     Dòng 85 chia 5 cột cho 5 mức suy luận (`none`, `low`, `medium`, `high`, `max`). Trên sidebar 280px, mỗi nút chỉ có chiều rộng ~45px, chữ bên trong bị rớt dòng và méo mó.

#### Tab 3: Tools & Quyền Hạn (ToolsPermissionsTab)
- **File liên quan:** `ToolsPermissionsTab.tsx` — Dòng 132, Dòng 270
- **Lỗi phát hiện:**
  1. **Ép 2 cột song song cho 2 bảng công cụ phức tạp:**
     Dòng 132 dùng `grid grid-cols-2 gap-3.5` chia đôi màn hình: Cột trái chứa "Tools cho phép (Allow)", Cột phải chứa "Tools bị cấm (Deny)".
     Bên trong mỗi cột lại chứa: Danh sách tag chips + Dropdown phân loại danh mục + Ô input nhập custom tool + Nút [Thêm].
     Dòng 270 tiếp tục dùng `grid grid-cols-2 gap-3.5` chia đôi màn hình cho Allow Scope Paths và Deny Write Paths.
  2. **Hậu quả:** Trên màn hình hẹp, 2 cột bị bóp nghẹt chỉ còn ~130px mỗi bên. Các tag chips bị bẻ gãy chữ, ô input bị teo nhỏ không thể gõ được tên tool, và nút [Thêm] bị tràn ra ngoài viền thẻ card.
- **Giải pháp:** Chuyển `grid-cols-2` thành `grid-cols-1 sm:grid-cols-2`.

#### Tab 4: Rules & Hướng Dẫn Vận Hành (InstructionsRulesTab)
- **File liên quan:** `InstructionsRulesTab.tsx` — Dòng 214, 229, 301
- **Lỗi phát hiện:**
  1. **Hiện tượng bẫy cuộn lồng nhau (Nested Scroll Trap):**
     - Textarea Instructions: có class `scroller-y` với `min-h-36 max-h-72 resize-y`.
     - Danh sách Checklist Rules: có class `max-h-56 min-h-0 overflow-y-auto scroller-y`.
     - Cả hai khối này lại nằm trong vùng cuộn của `AgentEditor`: `<div className="flex min-h-0 flex-1 flex-col gap-4 scroller-y p-4">`.
  2. **Hậu quả:** Khi người dùng lăn chuột để cuộn xem các trường bên dưới của tab Rules, con trỏ chuột rơi vào vùng Textarea hoặc vùng Checklist Rules sẽ lập tức kích hoạt thanh cuộn con bên trong và dừng việc cuộn trang chính. Người dùng cảm thấy giao diện bị "đơ" hoặc "kẹt cứng không cuộn xuống được".
- **Giải pháp:** Bỏ `max-h-56` và `overflow-y-auto` trên Checklist Rules, để container cha của Editor cuộn thống nhất một thanh cuộn từ trên xuống dưới.

#### Tab 5: Kỹ Năng Chuyên Biệt (SkillsTab)
- **File liên quan:** `SkillsTab.tsx` — Dòng 202
- **Lỗi phát hiện:**
  - Danh sách skills được khống chế bởi `max-h-60 min-h-0 overflow-y-auto scroller-y`.
  - Tương tự Tab 4, việc nhốt danh sách skills vào một container cuộn con có chiều cao tối đa cố định (240px) bên trong một vùng cuộn cha gây ra hiện tượng 2 thanh cuộn dọc nằm sát nhau, gây khó khăn cho thao tác chuột và che khuất nội dung mô tả skill.
- **Giải pháp:** Xóa bỏ `max-h-60` và `overflow-y-auto` con, tích hợp danh sách vào dòng cuộn chính của Editor.


---

## 4. KIỂM TOÁN NỘI BỘ TRANG INBOX (`InboxView.tsx` & SUBCOMPONENTS)

```
┌────────────────────────────────────────────────────────┐
│ Sub-tabs: [Chờ duyệt (N)] [Để sau] [Lịch sử]  [Làm mới]│
├────────────────────────────────────────────────────────┤
│ Filter bar: [Loại: Tất cả ▼]  [Độ khẩn cấp: Tất cả ▼]  │
├──────────────────────────┬─────────────────────────────┤
│ Cột 1: InboxList         │ Cột 2: InboxDetail          │
│ (w-2/5 min-w-[220px])    │ (flex-1 min-w-0)            │
│                          │ ┌─────────────────────────┐ │
│ [Thẻ 1]                  │ │ Header                  │ │
│ [Thẻ 2]                  │ ├─────────────────────────┤ │
│ [Thẻ 3]                  │ │ Body (.scroller-y)      │ │
│                          │ ├─────────────────────────┤ │
│ Trên khung 300px:        │ │ Sticky Action Footer:   │ │
│ Chiếm 220px              │ │ [Để sau][Từ chối][Duyệt]│ │
│                          │ └─────────────────────────┘ │
│                          │ BỊ BÓP CÒN 80PX!          │
│                          │ NÚT DUYỆT BỊ CHE MẤT 100%! │
└──────────────────────────┴─────────────────────────────┘
```

### 4.1. Bố cục Master-Detail 2 cột ngang cố định: Tê liệt trên Sidebar hẹp
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/InboxView.tsx` — Dòng 179-191
- **Code hiện tại:**
  ```tsx
  {/* Master-Detail 2-Column Split Layout */}
  <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex w-2/5 min-w-[220px] max-w-[420px] flex-col border-r border-border-panel min-h-0 h-full overflow-hidden bg-(--vscode-sideBar-background)/20">
          <InboxList ... />
      </div>
      <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-(--vscode-editor-background)">
          <InboxDetail ... />
      </div>
  </div>
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Cột Master (`InboxList`) được thiết lập: `w-2/5 min-w-[220px]`.
  2. Khi người dùng mở Orvanta trong VS Code Sidebar thông thường (chiều rộng dao động từ **280px đến 350px**):
     $$\text{Chiều rộng còn lại cho Cột Detail} = 300\text{px} - 220\text{px (Cột List)} = \mathbf{80\text{px}}!$$
  3. Cột Detail (`InboxDetail`) chỉ nhận được bề ngang 80px (hoặc tối đa 130px nếu sidebar rộng 350px).
  4. Mẫu bố cục 2 cột ngang song song chỉ phù hợp với màn hình Web rộng ($\ge 800\text{px}$). Trong VS Code Webview panel, đây là nguyên nhân trực tiếp làm hỏng giao diện.

### 4.2. Chân trang Sticky Action Footer bị cắt cụt — CEO không thể phê duyệt
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/inbox/InboxDetail.tsx` — Dòng 521-559
- **Code hiện tại:**
  ```tsx
  <div className="shrink-0 border-t border-border-panel p-2.5 bg-(--vscode-sideBar-background)/80 backdrop-blur-xs flex items-center justify-between gap-2">
      <div className="text-[11px] text-muted-foreground truncate max-w-[260px]" title={getFooterContextNotice()}>
          {getFooterContextNotice()}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
          {/* Secondary: Để sau */}
          <button className="... text-xs px-2.5 py-1 ...">Để sau</button>
          {/* Destructive: Từ chối */}
          <button className="... text-xs px-3 py-1 ...">Từ chối</button>
          {/* Primary: Phê duyệt */}
          <button className="... text-xs px-3 py-1 ...">Phê duyệt</button>
      </div>
  </div>
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Nhóm 3 nút bấm hành động `[Để sau]` (~65px) + `[Từ chối]` (~70px) + `[Phê duyệt]` (~90px) cộng với khoảng cách `gap-1.5` đòi hỏi **tối thiểu 240px bề ngang**.
  2. Dòng thông báo context notice bên trái đòi hỏi thêm tối thiểu **100px - 260px**.
  3. Tổng bề ngang tối thiểu cần thiết để thanh Sticky Footer hiển thị bình thường là **$\ge 360\text{px}$**.
  4. Khi cột Detail bị ép xuống còn 80px - 150px (do Lỗi 4.1), toàn bộ cụm nút hành động bị đẩy tràn ra khỏi cạnh phải của màn hình.
  5. Vì `InboxDetail` có `overflow: hidden`, **toàn bộ các nút "Phê duyệt", "Từ chối", "Để sau" bị cắt cụt và biến mất hoàn toàn**.
  6. **HẬU QUẢ TÊ LIỆT NGHIỆP VỤ:** CEO mở trạm kiểm soát quyền lực cao nhất của công ty nhưng không thấy nút bấm để duyệt hay từ chối bất kỳ quyết định nào!

### 4.3. Các khối thông tin trong `InboxDetail.tsx` bị vỡ layout
- **Khối Maker-Checker Audit (Dòng 133):** Thiết lập `grid grid-cols-2 gap-2`. Với bề ngang hẹp, tên của Maker và Checker bị gãy vụn thành từng ký tự đơn lẻ.
- **Khối Code Diff & Deliverable Artifacts (Dòng 223):** Thẻ `<pre className="scroller ... max-h-72">` bị bó hẹp trong khung vài chục pixel, không thể hiển thị nổi một dòng mã hay một payload JSON.

### 4.4. Giải pháp khắc phục nội bộ cho InboxView
- Chuyển đổi mô hình hiển thị sang **Responsive Master-Detail dạng Stack hoặc Navigation Flow**:
  - Khi chiều rộng container $< 550\text{px}$: Hiển thị `InboxList` toàn màn hình. Khi người dùng bấm vào một quyết định, chuyển sang hiển thị `InboxDetail` kèm nút `[< Quay lại]` trên header.
  - Khi chiều rộng $\ge 550\text{px}$: Giữ nguyên bố cục 2 cột song song.
  - Trên thanh Sticky Action Footer: Cho phép các nút hành động tự động wrap hoặc co giãn toàn bộ chiều rộng (`w-full`) khi không gian bị hạn chế.


---

## 5. KIỂM TOÁN NỘI BỘ TRANG CONSOLE (`ConsoleView.tsx` & SUBCOMPONENTS)

### 5.1. Bố cục nội bộ `ConsoleView`: Sibling Header (36px) + `{children}` có `h-full`
- **File liên quan:** `apps/vscode/webview-ui/src/orvanta/ConsoleView.tsx` — Dòng 57-60, 107
- **Code hiện tại:**
  ```tsx
  // Dòng 57: Vùng hiển thị kênh agent 1:1
  <div
      className="flex-col flex-1 min-h-0 h-full w-full overflow-hidden"
      style={{ display: isTeamFeed ? "none" : "flex" }}>
      {/* Sibling 1: Header kênh agent */}
      <div className="shrink-0 h-[36px] min-h-[36px] border-b border-border-panel ...">
          {/* Back button, Agent badge, Status */}
      </div>

      {/* Sibling 2: Khung ChatView */}
      <div className="flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden relative">
          {children}
      </div>
  </div>
  ```
- **Bằng chứng kỹ thuật (Root Cause Evidence):**
  1. Thẻ bao ngoài (dòng 57) là một flex container `flex flex-col`.
  2. Sibling 1 là thanh header cao đúng **36px** (`h-[36px] min-h-[36px]`).
  3. Sibling 2 (dòng 107, bọc `{children}` tức ChatView) lại khai báo đồng thời: `flex-1` VÀ `h-full` (`height: 100%`).
  4. Trong chuẩn CSS Flexbox, khi một flex child trong column container có thuộc tính `height: 100%`, nó sẽ đòi hỏi chiều cao bằng đúng 100% của container cha.
  5. Khi đó:
     $$\text{Tổng chiều cao} = 36\text{px (Header)} + 100\%\text{ (ChatView)} = 100\% + 36\text{px}$$
  6. Vì container cha có `overflow: hidden`, phần tử con Sibling 2 bị **đẩy tụt xuống đáy đúng 36px**.
  7. **HẬU QUẢ:** Toàn bộ 36px đáy của ChatView — nơi chứa **khung chat Composer, nút chọn tệp và nút GỬI TIN NHẮN** — bị đẩy ra ngoài vùng nhìn thấy và bị xén cụt. Người dùng không thể thấy trọn vẹn khung soạn thảo tin nhắn.
- **Giải pháp khắc phục nội bộ:**
  - Xóa bỏ class `h-full` ở dòng 57 và dòng 107 của `ConsoleView.tsx`, chỉ giữ lại:
    ```tsx
    <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden relative">
        {children}
    </div>
    ```
  - Khi đó, flexbox engine sẽ tự động phân bổ chiều cao cho `children` chính xác bằng `calc(100% - 36px)`, khớp hoàn toàn với khung nhìn.

### 5.2. Thanh bên Channels (`TeamSidebar.tsx`): Không tự động thu gọn trên màn hình hẹp
- **Vị trí code:** `apps/vscode/webview-ui/src/orvanta/TeamSidebar.tsx` — Dòng 25-28, 127
- **Code hiện tại:**
  ```tsx
  const MIN_SIDEBAR_WIDTH = 160
  const MAX_SIDEBAR_WIDTH = 280
  const DEFAULT_SIDEBAR_WIDTH = 190
  const COLLAPSED_SIDEBAR_WIDTH = 48
  ```
- **Bằng chứng kỹ thuật:**
  1. Chiều rộng mặc định của thanh Channels là `190px` (ngay cả mức tối thiểu kéo thả cũng là `160px`).
  2. Khi người dùng mở Console lần đầu trên thanh Sidebar VS Code rộng 300px:
     $$\text{Không gian còn lại cho Khung Chat / Timeline} = 300\text{px} - 190\text{px} = \mathbf{110\text{px}}!$$
  3. `TeamSidebar` hoàn toàn không có listener `ResizeObserver` để tự động kích hoạt trạng thái Mini-mode (`isCollapsed = true`, rộng 48px) khi phát hiện container có chiều rộng dưới 420px.
  4. Người dùng không biết phím tắt `Ctrl+B` để thu gọn, dẫn đến việc nhìn thấy một khung chat dị dạng chỉ rộng 110px.
- **Giải pháp khắc phục nội bộ:** Bổ sung `ResizeObserver` nội bộ trong `TeamSidebar` hoặc `ConsoleView` để tự động chuyển về 48px khi chiều rộng $< 420\text{px}$.

### 5.3. Kênh chung `#team-feed` (`TeamFeedView.tsx`): Vỡ giao diện lưới và timeline
- **Vị trí code:** `apps/vscode/webview-ui/src/orvanta/TeamFeedView.tsx` — Dòng 132, 228
- **Lỗi phát hiện:**
  1. **Mini War Room Grid (Dòng 132):**
     `className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5"`
     Bắt buộc chia tối thiểu 2 cột. Khi bề ngang còn lại chỉ có 110px - 180px, mỗi thẻ Agent chỉ rộng từ 50px đến 85px. Các thông tin quan trọng (Tên agent, Icon, Status dot, Tiêu đề task đang chạy, Đồng hồ đếm giây) bị đè chồng chéo lên nhau và bị xén cụt.
  2. **Global Activity Timeline (Dòng 228):**
     `className="shrink-0 min-w-28"` (dành cho `AgentBadge`, chiếm 112px) kết hợp với cột thời gian `[HH:mm:ss]` (chiếm ~60px).
     Tổng chiều rộng của 2 cột định danh này đã là $112\text{px} + 60\text{px} = 172\text{px}$, vượt quá toàn bộ chiều rộng của vùng hiển thị! Cột nội dung sự kiện (text, think, tool, diff) bị đẩy ra khỏi rìa màn hình.
- **Giải pháp:** Chuyển grid thành `grid-cols-1 sm:grid-cols-2`; thu nhỏ badge timeline khi container hẹp.


---

## 6. MA TRẬN TỔNG HỢP LỖI NỘI BỘ VÀ GIẢI PHÁP TỰ CHỦ CHO TỪNG VIEW

| View | File & Dòng code | Hiện tượng lỗi | Nguyên nhân nội bộ | Giải pháp sửa đổi nội bộ View |
|---|---|---|---|---|
| **HomeView** | `HomeView.tsx`: 226 | Mất cuộn hoàn toàn, nửa dưới trang bị xén. | Thiếu `h-full`, tính `height: auto` nên không kích hoạt `scroller-y`. | Sửa thành `flex h-full w-full min-h-0 flex-col gap-3 overflow-y-auto scroller-y p-3 pb-6 text-sm`. |
| **HomeView** | `HomeView.tsx`: 572 | Danh sách Roster bị vỡ avatar và chữ. | Bắt buộc `grid grid-cols-2` trên khung hẹp ~125px. | Đổi thành `grid-cols-1 sm:grid-cols-2`. |
| **HomeView** | `HomeView.tsx`: 737 | Form lập công ty che mất nút tạo trên màn hình thấp. | `min-h-40` trên label và `min-h-32` trên textarea; thiếu `h-full`. | Bổ sung `h-full w-full overflow-y-auto` cho form; giảm `min-h-32` còn `min-h-24`. |
| **AgentsView** | `AgentTreeChart.tsx`: 411 | Các node bên trái sơ đồ tổ chức bị xén cụt vĩnh viễn. | `justify-center` + `scroller` đẩy nội dung vào tọa độ âm. | Đổi container cuộn thành `overflow: auto`, bọc thẻ con `min-w-fit mx-auto flex justify-center`. |
| **AgentsView** | `AgentsView.tsx`: 331 | Cây tổ chức chiếm hết diện tích, bóp Editor còn < 150px. | Fix cứng pixel `style={{ height: treeHeight }}` không co giãn theo viewport. | Thêm nút Toggle thu gọn cây (Collapse Tree) lên thanh divider/header bar. |
| **AgentEditor** | `AgentEditor.tsx`: 522, 547 | Cột nhập Profile bị cắt ngắn nhãn và text. | Ép `grid grid-cols-2 gap-3.5` trên khung < 320px. | Đổi thành `grid-cols-1 sm:grid-cols-2`. |
| **AgentEditor** | `ModelPickerCombobox.tsx`: 118 | Popover danh mục model bị xén cụt đáy. | Popover `position: absolute` nằm trong vùng `overflow-y: auto`. | Tính toán hướng mở linh hoạt hoặc hiển thị dạng dialog cố định. |
| **AgentEditor** | `ToolsPermissionsTab.tsx`: 132, 270 | 2 cột Allow/Deny Tools & Paths bị co rúm, vỡ chip và input. | Ép `grid grid-cols-2` trên bề ngang hẹp. | Đổi thành `grid-cols-1 sm:grid-cols-2`. |
| **AgentEditor** | `InstructionsRulesTab.tsx`: 301 & `SkillsTab.tsx`: 202 | Bẫy cuộn lồng nhau (Nested Scroll Trap), kẹt chuột khi cuộn. | Danh sách con có `max-h-56` / `max-h-60` và `overflow-y-auto` riêng. | Bỏ `max-h-*` và `overflow-y-auto` con, hòa vào luồng cuộn chính của Editor. |
| **InboxView** | `InboxView.tsx`: 180 | Cột Detail bị bóp còn ~80px trên sidebar hẹp. | Bố cục ngang 2 cột cố định với Cột 1 `min-w-[220px]`. | Thêm chế độ Stack (Master $\rightarrow$ Detail) khi bề ngang container $< 550\text{px}$. |
| **InboxView** | `InboxDetail.tsx`: 521 | **Mất hoàn toàn các nút Phê duyệt / Từ chối**. | Sticky Action Footer đòi hỏi $\ge 240\text{px}$, bị xén ngang khi Cột 2 hẹp. | Cho phép nút tự động wrap hoặc full-width khi không gian hẹp. |
| **ConsoleView** | `ConsoleView.tsx`: 107 | Khung nhập Chat Composer bị đẩy tụt đáy 36px, che mất nút gửi. | Sibling 1 cao 36px, Sibling 2 bọc ChatView mang `h-full` gây tràn. | Xóa bỏ `h-full` ở dòng 57 và dòng 107 `ConsoleView.tsx`. |
| **ConsoleView** | `TeamSidebar.tsx`: 27 | Sidebar Channels chiếm 190px cố định, ép khung chat còn 110px. | Không có listener tự động thu gọn về 48px khi container hẹp. | Bổ sung `ResizeObserver` tự động kích hoạt `isCollapsed = true` khi container $< 420\text{px}$. |

---

## 7. LỘ TRÌNH KHẮC PHỤC KỸ THUẬT NỘI BỘ (ACTIONABLE INTERNAL ROADMAP)

> **Lưu ý:** Báo cáo này tuân thủ nguyên tắc **"Chỉ tìm lỗi, chưa sửa code"**. Dưới đây là lộ trình các bước kỹ thuật được đề xuất để triển khai hoàn toàn bên trong từng View mà không cần đụng chạm container bên ngoài.

### Bước 1: Sửa chữa nội bộ `HomeView.tsx` & `CreateCompanyForm`
1. Tại `HomeView.tsx` dòng 226: Thêm `h-full w-full overflow-y-auto pb-6` vào container gốc để trang tự chủ hoàn toàn về chiều cao và thanh cuộn.
2. Tại `HomeView.tsx` dòng 572: Đổi `grid-cols-2` thành `grid-cols-1 sm:grid-cols-2`.
3. Tại `HomeView.tsx` dòng 718, 737: Bổ sung `h-full w-full overflow-y-auto` cho form tạo công ty; nới lỏng `min-h-40` và `min-h-32` để đảm bảo nút bấm không bị đẩy khỏi màn hình trên viewport thấp.
4. Tại `EditPurposeModal.tsx`: Thêm `max-h-[90%]` và `overflow-y-auto` cho thẻ form modal.

### Bước 2: Sửa chữa nội bộ `AgentsView.tsx`, `AgentTreeChart.tsx` & `AgentEditor.tsx`
1. Tại `AgentTreeChart.tsx` dòng 411: Tách thẻ cuộn và thẻ căn giữa để giải quyết triệt để lỗi mất node bên trái do `justify-center`.
2. Tại `AgentsView.tsx`: Bổ sung nút thu gọn sơ đồ cây (Collapse Tree) lên thanh ngăn cách divider để giải phóng 100% diện tích cho `AgentEditor` khi cần.
3. Tại 5 Tabs của `AgentEditor`:
   - Profile: Đổi `grid-cols-2` thành `grid-cols-1 sm:grid-cols-2`.
   - Tools: Đổi `grid-cols-2` thành `grid-cols-1 sm:grid-cols-2`.
   - Rules & Skills: Bỏ `max-h-*` và `overflow-y-auto` con trong checklist để triệt tiêu hiện tượng cuộn lồng nhau.
   - Model: Xử lý z-index và cơ chế hiển thị của Popover Combobox để không bị cắt bởi container cuộn.

### Bước 3: Sửa chữa nội bộ `InboxView.tsx` & `InboxDetail.tsx`
1. Tại `InboxView.tsx`: Triển khai cơ chế responsive tự động:
   - Khi chiều rộng container $< 550\text{px}$: Hiển thị `InboxList` toàn màn hình. Khi bấm vào quyết định, chuyển sang hiển thị `InboxDetail` kèm nút `[< Quay lại]`.
   - Khi chiều rộng $\ge 550\text{px}$: Giữ bố cục 2 cột song song.
2. Tại `InboxDetail.tsx` dòng 521: Cho phép các nút trên thanh Sticky Action Footer tự động wrap khi không gian hẹp, đảm bảo CEO luôn nhìn thấy và bấm được nút Phê duyệt / Từ chối.

### Bước 4: Sửa chữa nội bộ `ConsoleView.tsx` & `TeamSidebar.tsx`
1. Tại `ConsoleView.tsx` dòng 57 và 107: Loại bỏ `h-full`, chỉ giữ lại `flex flex-col flex-1 min-h-0 w-full overflow-hidden`, giải phóng 36px đáy bị che khuất và phục hồi đầy đủ khung nhập tin nhắn của ChatView.
2. Tại `TeamSidebar.tsx`: Bổ sung cơ chế tự động chuyển sang Mini-mode (48px) khi bề ngang container $< 420\text{px}$.
3. Tại `TeamFeedView.tsx`: Cho phép Mini War Room hiển thị 1 cột linh hoạt trên không gian hẹp.

