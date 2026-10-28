# 02 – Icons Migration (Emoji → Tabler Icons)

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Cài đặt `@tabler/icons-react`, thay thế mọi emoji decorative và ký tự Unicode trang trí bằng SVG icons từ Tabler Icons. Đảm bảo stroke 1.5px, size nhất quán.

---

## Bước 1: Cài đặt thư viện

```bash
cd apps/vscode/webview-ui
bun add @tabler/icons-react
```

**Lý do chọn `@tabler/icons-react`:**
- Tabler Icons là bộ icon được chỉ định trong specs
- Package React render SVG inline, kiểm soát được stroke, size, color
- Tree-shakeable: chỉ bundle icon đang dùng

---

## Bước 2: Cách sử dụng chuẩn

```tsx
import { IconHome, IconUsers, IconInbox, IconTerminal2 } from '@tabler/icons-react'

// Size và stroke nhất quán
<IconHome size={16} stroke={1.5} />    // --icon-sm: nav, sidebar
<IconHome size={20} stroke={1.5} />    // --icon-md: header actions
<IconHome size={24} stroke={1.5} />    // --icon-lg: feature icons
```

**Quy tắc màu:**
```tsx
// Icon kế thừa màu từ CSS (currentColor)
<IconHome size={16} stroke={1.5} className="text-foreground" />
<IconHome size={16} stroke={1.5} className="text-muted-foreground" />
```

---

## Bước 3: Tạo wrapper component chuẩn

**File mới:** `src/components/ui/icon.tsx`

```tsx
import type { Icon, IconProps } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

type IconSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,  // nav items, sidebar
  md: 20,  // header buttons
  lg: 24,  // feature icons
}

interface AppIconProps extends Omit<IconProps, 'size'> {
  icon: Icon
  size?: IconSize | number
  className?: string
}

export const AppIcon = ({ icon: IconComponent, size = 'sm', className, ...props }: AppIconProps) => {
  const resolvedSize = typeof size === 'number' ? size : SIZE_MAP[size]
  return (
    <IconComponent
      size={resolvedSize}
      stroke={1.5}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}
```

---

## Bước 4: Danh sách emoji cần thay thế

### `src/orvanta/TeamSidebar.tsx` – `getAgentRoleIcon()`

| Emoji trước đây | Tabler Icon thay thế | Role |
|---|---|---|
| `⭐` | `IconStar` | Lead / Coordinator |
| `📐` | `IconRuler` | Architect |
| `💻` | `IconCode` | Implementer / Coder |
| `🔍` | `IconSearch` | Reviewer / Auditor |
| `📝` | `IconPencil` | Copywriter |
| `🎯` | `IconTarget` | Sales / Outreach |
| `⚡` | `IconBolt` | Ephemeral / Guest |
| `🤖` | `IconRobot` | Default agent |

**Hàm mới:**
```tsx
import { IconStar, IconRuler, IconCode, IconSearch, IconPencil, IconTarget, IconBolt, IconRobot } from '@tabler/icons-react'

function getAgentRoleIconComponent(role: string, id: string): React.ElementType {
  const r = (role || '').toLowerCase()
  const i = (id || '').toLowerCase()
  if (r === 'lead' || i === 'coordinator') return IconStar
  if (r === 'architect' || i.includes('architect')) return IconRuler
  if (r === 'implementer' || r === 'coder') return IconCode
  if (r === 'reviewer' || r === 'auditor') return IconSearch
  if (r === 'copywriter' || r === 'content') return IconPencil
  if (r === 'sales' || r === 'outreach') return IconTarget
  if (r === 'ephemeral' || r === 'guest') return IconBolt
  return IconRobot
}
```

### `src/orvanta/OrvantaShell.tsx` – Tab navigation

| Tab | Icon |
|---|---|
| Home | `IconHome` |
| Agents | `IconUsers` |
| Inbox | `IconInbox` |
| Console | `IconTerminal2` |

### `src/App.tsx` – Nút dismiss (`✕`) & link arrow

| Symbol | Thay bằng |
|---|---|
| `✕` (trong button dismiss) | `IconX` size 12 |
| `→` (trong link text) | `IconArrowRight` size 12 |

---

## Checklist

- [x] Cài `@tabler/icons-react`: `bun add @tabler/icons-react`
- [x] Tạo `src/components/ui/icon.tsx` wrapper component (`AppIcon`)
- [x] Thay emoji trong `TeamSidebar.tsx` `getAgentRoleIcon()` → `getAgentRoleIconComponent()`
- [x] Thay các ký tự decorative `★`, `«`, `»`, `#`, `📢`, `▲`, `▼` trong `TeamSidebar.tsx`
- [x] Thêm tab icons vào `OrvantaShell.tsx` (`IconHome`, `IconUsers`, `IconInbox`, `IconTerminal2`)
- [x] Thay `✕` dismiss button và `→` trong `App.tsx` bằng `IconX`, `IconArrowRight`
- [x] Thay emoji và ký tự điều hướng trong `HomeView.tsx` (`IconBuildingStore`, `IconUsers`, `IconCompass`, `IconTarget`, `IconPlus`, `IconRefresh`, v.v.)
- [x] Thay icon trong `TeamFeedView.tsx` (`IconHash`, `IconBroadcast`, `IconActivity`, `IconClock`, `IconCornerDownRight`)
- [x] Thay icon trong `AgentTreeChart.tsx` (`IconPlus`, `IconTrash`, `IconFolderPlus`, `IconFolder`, v.v.)
- [x] Thay icon trong `AgentEditor.tsx` (`IconCheck`, `IconPlus`, v.v.)
- [x] Thay icon trong `WarRoomView.tsx` (`IconPlayerPlay`, `IconPlayerPause`, `IconX`)
- [x] Thay icon trong `LibraryDialog.tsx` (`IconX`)
- [x] Verify icon size nhất quán: `size={16}` cho nav/items, `size={20}` cho headers
- [x] Verify stroke = `1.5` trên mọi icon
- [x] Verify màu kế thừa từ CSS (`currentColor`)
- [x] Typecheck & Unit tests pass 100% (141/141 tests pass)

---

## Lưu ý

> **Giữ nguyên emoji trong nội dung text** (ví dụ: message AI, user content). Chỉ thay emoji/unicode **decorative** dùng làm icon chức năng trong UI component.

> **Không dùng `lucide-react`** cho icon mới dù đã có trong `package.json`. Spec chỉ định Tabler Icons. Giữ lucide cho các component đang dùng, đừng thay ngược lại.
