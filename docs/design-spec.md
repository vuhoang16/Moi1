# Design Specification — App Quản Lý Cho Thuê Nhà
**Platform:** React Native (iOS + Android)  
**Language:** Vietnamese  
**Design Philosophy:** Noir-Luxe — premium, dark-anchored, gold-accented  
**Last Updated:** 16/04/2026

---

## 1. Design System Tokens

### 1.1 Color Tokens

```typescript
// tokens/colors.ts
export const Colors = {
  // === BRAND PRIMARIES ===
  primary: {
    navy900: '#040b16',      // Deepest navy — splash bg, modal overlays
    navy800: '#0a1628',      // App shell background (dark mode)
    navy700: '#1A222E',      // TopBar, BottomNav fill
    navy600: '#243040',      // Card surface (dark)
    navy500: '#2e3d52',      // Input field background (dark)
  },

  // === GOLD SECONDARIES ===
  gold: {
    gold500: '#C5A059',      // Primary CTA, active icons, status highlights
    gold600: '#b08a3d',      // Gold pressed/active state
    gold700: '#775a19',      // Gold on dark — decorative, dividers
    gold100: '#f5ead6',      // Gold tint surface (light mode alerts)
  },

  // === MINT TERTIARIES ===
  mint: {
    mint400: '#A8D5BA',      // Success states, Đã thanh toán badge
    mint500: '#7ec49a',      // Mint active
    mint100: '#e8f5ee',      // Mint tint surface
  },

  // === NEUTRALS ===
  neutral: {
    white: '#FFFFFF',
    surface: '#f8f9fa',              // App background (light mode)
    surfaceContainerLow: '#f0f2f4',  // Card fill (light)
    surfaceContainerLowest: '#FFFFFF', // Elevated card / modal
    outline: '#c8cdd3',              // Input border (light, disabled only)
    outlineVariant: '#e2e5e8',       // Subtle dividers
    onSurface: '#191c1d',            // Primary text — NO pure black
    onSurfaceVariant: '#42474d',     // Secondary text
    onSurfaceTertiary: '#72777d',    // Placeholder, captions
    scrim: 'rgba(4,11,22,0.6)',      // Modal backdrop
  },

  // === STATUS SEMANTIC ===
  status: {
    // Phòng trống
    vacant:        '#A8D5BA',  // mint400
    vacantText:    '#1a5c38',
    vacantBg:      '#e8f5ee',
    // Đang thuê
    occupied:      '#C5A059',  // gold500
    occupiedText:  '#4a3200',
    occupiedBg:    '#f5ead6',
    // Đang sửa chữa
    maintenance:   '#F4A261',  // amber
    maintenanceText:'#5a2d00',
    maintenanceBg: '#fff0e0',
    // Chưa thanh toán
    unpaid:        '#E76F51',  // coral
    unpaidText:    '#5c1a00',
    unpaidBg:      '#fdecea',
    // Đã thanh toán
    paid:          '#A8D5BA',  // mint
    paidText:      '#1a5c38',
    paidBg:        '#e8f5ee',
    // Quá hạn
    overdue:       '#D62828',  // red
    overdueText:   '#FFFFFF',
    overdueBg:     '#D62828',
  },

  // === GLASSMORPHISM ===
  glass: {
    light70:  'rgba(248,249,250,0.72)',  // Light glass panels
    dark75:   'rgba(26,34,46,0.75)',     // Dark glass panels (nav overlays)
    gold20:   'rgba(197,160,89,0.20)',   // Gold tint glass
  },
};
```

### 1.2 Typography Tokens

```typescript
// tokens/typography.ts
// Fonts: "BeVietnamPro" (headlines) + "Inter" (body/UI)
// NOTE: Vietnamese diacritics require lineHeight multiplier ≥ 1.55 for body, 1.45 for display

export const Typography = {
  // === DISPLAY — Be Vietnam Pro ===
  displayLarge: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 36,
    lineHeight: 52,     // 1.44× — accommodates stacked diacritics (ắ, ộ, ượ)
    letterSpacing: -0.5,
    fontWeight: '700' as const,
  },
  displayMedium: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 28,
    lineHeight: 40,
    letterSpacing: -0.25,
    fontWeight: '700' as const,
  },
  displaySmall: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 22,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },

  // === HEADLINES — Be Vietnam Pro ===
  headlineLarge: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },
  headlineMedium: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },
  headlineSmall: {
    fontFamily: 'BeVietnamPro-Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: '500' as const,
  },

  // === BODY — Inter ===
  bodyLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 26,     // 1.625× — critical for Vietnamese diacritic readability
    letterSpacing: 0.1,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,     // 1.57×
    letterSpacing: 0.1,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 20,     // 1.67× — extra room for stacked diacritics at small sizes
    letterSpacing: 0.2,
    fontWeight: '400' as const,
  },

  // === LABELS — Inter ===
  labelLarge: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },

  // === NUMERIC — Inter Tabular for VND amounts ===
  numericLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  numericMedium: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.25,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  numericSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'] as const,
  },
};
```

### 1.3 Spacing Scale

```typescript
// tokens/spacing.ts
// Base unit: 4px (t-shirt scale)
export const Spacing = {
  px:   1,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,

  // === SEMANTIC SPACING ===
  componentPaddingHorizontal: 16,   // Standard horizontal inset
  componentPaddingVertical:   12,   // Standard vertical padding
  screenHorizontalPadding:    20,   // Screen edge margins
  screenTopPadding:           16,   // Below safe area / TopBar
  cardPadding:                16,   // Internal card padding
  sectionGap:                 24,   // Gap between content sections
  listItemGap:                12,   // Vertical gap in lists
  inlineGap:                  8,    // Gap within a row of elements
  bottomNavHeight:            64,   // BottomNav total height
  topBarHeight:               56,   // TopBar total height
  safeAreaBottom:             34,   // iPhone home indicator approx
  safeAreaTop:                44,   // iPhone notch / Dynamic Island approx
};
```

### 1.4 Border Radius

```typescript
// tokens/radius.ts
export const Radius = {
  none:    0,
  xs:      4,    // Chips, small badges
  sm:      8,    // Base radius — cards, inputs, buttons
  md:      12,   // Large cards, sheets
  lg:      16,   // Bottom sheets, modal corners
  xl:      24,   // Payment cards, profile cards
  full:    9999, // Pills, avatars, FAB
};
```

### 1.5 Elevation / Shadow

```typescript
// tokens/elevation.ts
import { Platform } from 'react-native';

const makeElevation = (
  level: number,
  color = 'rgba(4,11,22,0.15)'
) => Platform.select({
  ios: {
    shadowColor: color,
    shadowOffset: { width: 0, height: level * 2 },
    shadowOpacity: 1,
    shadowRadius: level * 4,
  },
  android: { elevation: level * 2 },
});

export const Elevation = {
  level0: makeElevation(0),   // Flat — list items
  level1: makeElevation(1),   // Cards at rest
  level2: makeElevation(2),   // Cards on scroll overlap
  level3: makeElevation(3),   // FAB, BottomNav
  level4: makeElevation(4),   // Modals, bottom sheets
  level5: makeElevation(6),   // Full-screen overlays

  // Gold-tinted glow (CTA buttons, gold accents)
  goldGlow: Platform.select({
    ios: {
      shadowColor: '#C5A059',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
  }),
};
```

### 1.6 Motion Tokens

```typescript
// tokens/motion.ts
export const Motion = {
  // === DURATIONS (ms) ===
  duration: {
    instant:    0,
    fast:       150,   // Micro-interactions: badge pulse, ripple
    normal:     250,   // Standard UI transitions
    moderate:   350,   // Screen slide, card expand
    slow:       500,   // Onboarding, splash
    verySlow:   700,   // Celebration animations (paid invoice)
  },

  // === EASING (Bezier) ===
  easing: {
    standard:     [0.2, 0.0, 0, 1.0],    // Material standard — most transitions
    decelerate:   [0.0, 0.0, 0, 1.0],    // Elements entering screen
    accelerate:   [0.3, 0.0, 1.0, 1.0],  // Elements leaving screen
    spring:       'spring',               // useAnimatedStyle spring config below
  },

  // === SPRING CONFIG (react-native-reanimated) ===
  spring: {
    gentle:  { damping: 20, stiffness: 120, mass: 1 },
    snappy:  { damping: 15, stiffness: 200, mass: 0.8 },
    bouncy:  { damping: 10, stiffness: 180, mass: 0.9 },
  },

  // === SCREEN TRANSITIONS ===
  screenSlide: {
    duration: 350,
    easing: 'decelerate',
    translateX: 40,    // Slide from right, 40px overshoot
  },
  screenFade: {
    duration: 250,
    easing: 'standard',
  },
  modalSlideUp: {
    duration: 400,
    easing: 'decelerate',
    translateY: 'full',  // Slides up from off-screen bottom
  },
};
```

---

## 2. Component Library Specification

### 2.1 Buttons

#### PrimaryButton

```
┌──────────────────────────────────┐
│  [Icon?]   LABEL TEXT            │  ← Be Vietnam Pro Medium 14px
└──────────────────────────────────┘
```

| Property | Value |
|---|---|
| Background | Gold #C5A059 |
| Text | #040b16 (navy900) |
| Border Radius | 8px |
| Height | 52px |
| Padding H | 24px |
| Min Width | 120px |
| Shadow | Elevation.goldGlow |
| Font | labelLarge (Inter-Medium 14) |
| Icon Size | 18px, gap 8px |

States:
- **Default:** bg #C5A059, text #040b16
- **Pressed:** bg #b08a3d (gold600), scale 0.97, duration 150ms
- **Loading:** Gold spinner replaces label, haptic feedback disabled
- **Disabled:** bg #e2e5e8, text #72777d, no shadow

Accessibility: `accessibilityRole="button"`, `accessibilityLabel` required, `accessibilityState={{ disabled, busy }}`

---

#### SecondaryButton

```
┌──────────────────────────────────┐  ← 2px gold border
│  [Icon?]   LABEL TEXT            │
└──────────────────────────────────┘
```

| Property | Value |
|---|---|
| Background | Transparent |
| Border | 2px solid #C5A059 |
| Text | #C5A059 |
| Border Radius | 8px |
| Height | 52px |
| Padding H | 24px |

States:
- **Pressed:** bg rgba(197,160,89,0.12), border #b08a3d
- **Disabled:** border #c8cdd3, text #72777d

---

#### TextButton

No container. Text + optional leading icon.

| Property | Value |
|---|---|
| Text | #C5A059 |
| Font | labelLarge |
| Height | 44px (touch target) |
| Underline on press | Yes, 1px |

---

### 2.2 InputField

```
Label Text *                          ← Inter-Medium 12px, #42474d
┌─────────────────────────────────┐
│  [LeadIcon]  Placeholder text   │   ← height 52px
└─────────────────────────────────┘
  Helper text / error message         ← Inter-Regular 12px
```

| State | Background | Border Treatment | Text |
|---|---|---|---|
| Default | #f0f2f4 | None (bg shift) | #191c1d |
| Focused | #FFFFFF | 2px solid #C5A059, shadow goldGlow subtle | #191c1d |
| Error | #fdecea | 2px solid #E76F51 | #191c1d |
| Disabled | #f8f9fa | None | #72777d, opacity 0.5 |
| Filled | #FFFFFF | None | #191c1d |

Properties:
- Border Radius: 8px
- Height: 52px
- Padding: 16px horizontal, 14px vertical
- Label: always above (not floating) — better for Vietnamese diacritics
- Error icon: `⚠` (SF Symbols / Material: `error`) at right, color #E76F51
- Secure text: eye toggle icon at right for passwords
- `accessibilityLabel` = label text; `accessibilityHint` = helper text

---

### 2.3 Card Variants

All cards: borderRadius 12px, no 1px border, background shift for separation.

#### PropertyCard

```
┌──────────────────────────────────────────┐
│ ╔══════════════════════════════════════╗ │
│ ║  [Property Photo — 16:9]             ║ │  ← borderRadius 8px image
│ ║  ┌─────────────────┐                 ║ │
│ ║  │ Đang Thuê badge │                 ║ │  ← StatusBadge top-left
│ ╚══════════════════════════════════════╝ │
│                                          │
│  Chung cư Sunrise Plaza                  │  ← headlineSmall
│  📍 123 Lê Văn Lương, Q.7, TP.HCM       │  ← bodySmall, onSurfaceVariant
│  ─────────────────────────────────────  │
│  4 phòng  •  2 trống  •  2 đang thuê    │  ← labelMedium chips
│                                          │
│  Thu nhập tháng này                      │  ← labelSmall, tertiary
│  ₫ 24.500.000                            │  ← numericMedium, gold500
└──────────────────────────────────────────┘
```

Elevation: level1 at rest, level2 on press.

---

#### RoomCard

```
┌──────────────────────────────────────────┐
│  P.101          [Đang Thuê badge]         │  ← headlineSmall + badge right
│  Nguyễn Văn A  •  Phòng đơn              │  ← bodyMedium
│  Hợp đồng đến: 31/12/2026                │  ← bodySmall, tertiary
│  ─────────────────────────────────────  │
│  ₫ 4.500.000 / tháng     [→ Chi tiết]    │  ← numeric + TextButton
└──────────────────────────────────────────┘
```

---

#### InvoiceCard

```
┌──────────────────────────────────────────┐
│  Hóa đơn tháng 04/2026   [Chưa TT badge] │
│  P.101 — Nguyễn Văn A                    │  ← bodyMedium
│  ─────────────────────────────────────  │
│  Tiền phòng      ₫  4.500.000            │
│  Điện (120 kWh)  ₫    216.000            │
│  Nước             ₫     90.000           │
│  Internet         ₫    150.000           │
│  ─────────────────────────────────────  │
│  Tổng cộng       ₫  4.956.000            │  ← numericMedium, gold500
│                                          │
│  [Thanh Toán Ngay]      [Xem Chi Tiết]   │
└──────────────────────────────────────────┘
```

---

#### MaintenanceCard

```
┌──────────────────────────────────────────┐
│  🔧  Sửa vòi nước nhà bếp    [Đang SCC] │  ← icon 20px + headlineSmall
│  P.203 · Nguyễn Thị B                   │  ← bodySmall
│  Gửi lúc: 14:32 · 15/04/2026            │  ← labelSmall, tertiary
│  Ưu tiên: [Cao badge]                    │
│  ─────────────────────────────────────  │
│  Ghi chú: "Nước chảy liên tục..."       │  ← bodySmall, truncated 2 lines
│  [Xem Ảnh (3)]           [Xử Lý]        │
└──────────────────────────────────────────┘
```

---

#### ChatPreviewCard

```
┌──────────────────────────────────────────┐
│  [Avatar 40px]  Nguyễn Văn A             │  ← headlineSmall
│                 P.101 · Tầng 1            │  ← labelSmall, tertiary
│                 "Anh ơi, hóa đơn..."     │  ← bodySmall, 1 line, truncated
│                 14:32                     │  ← labelSmall, right-aligned
│                 [● 2 unread badge]        │  ← top-right of avatar
└──────────────────────────────────────────┘
```

---

### 2.4 StatusBadge

Pill shape (borderRadius: 9999). All badges have 6px vertical / 10px horizontal padding.

| Label | Background | Text Color | Icon |
|---|---|---|---|
| Trống | #e8f5ee | #1a5c38 | ○ |
| Đang Thuê | #f5ead6 | #4a3200 | ● |
| Đang Sửa Chữa | #fff0e0 | #5a2d00 | 🔧 |
| Chưa Thanh Toán | #fdecea | #5c1a00 | ! |
| Đã Thanh Toán | #e8f5ee | #1a5c38 | ✓ |
| Quá Hạn | #D62828 | #FFFFFF | ⚠ |

Font: Inter-Medium 11px, letterSpacing 0.5. No 1px border — use only background.

---

### 2.5 Avatar

Circular. Fallback: initials on gold gradient bg.

| Size | Diameter | Font |
|---|---|---|
| xs | 24px | labelSmall |
| sm | 32px | labelMedium |
| md | 40px | labelLarge |
| lg | 56px | headlineSmall |
| xl | 80px | headlineMedium |

Unread dot (chat): 10px solid #E76F51 circle, white 2px border, top-right of avatar.

---

### 2.6 BottomNav

```
┌────────────────────────────────────────────────────────────┐
│  [Trang Chủ]  [Phòng]  [Hóa Đơn]  [Sửa Chữa]  [Chat]    │
│   (icon+label)                                             │
└────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Height | 64px + safeAreaBottom |
| Background | rgba(26,34,46,0.92) — glassmorphism dark |
| Backdrop blur | 20px |
| Active icon | gold500 #C5A059 |
| Inactive icon | #72777d |
| Active label | Inter-Medium 11px, gold500 |
| Inactive label | Inter-Regular 11px, #72777d |
| Active indicator | Gold pill 56×32px behind icon, opacity 0.15 |
| Badge (unread) | #E76F51 circle, top-right of icon |

Tabs:
1. **Trang Chủ** — icon: `home`
2. **Phòng** — icon: `door` / `apartment`
3. **Hóa Đơn** — icon: `receipt`
4. **Sửa Chữa** — icon: `build` / `wrench`
5. **Chat** — icon: `chat-bubble`

---

### 2.7 TopBar

```
┌───────────────────────────────────────────────────────┐
│  [← Back / ≡ Menu]   Screen Title   [Action?] [Bell]  │
└───────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Height | 56px |
| Background | #1A222E (navy700) |
| Title font | BeVietnamPro-SemiBold 18px, #FFFFFF |
| Back icon | `arrow-left`, 24px, #FFFFFF |
| Action icon | 24px, #C5A059 (gold) |
| Notification bell | 24px, #FFFFFF; badge: red dot |
| Bottom shadow | Elevation.level1 |

Variants:
- **Standard:** Back + Title + optional action
- **Home (Chủ Nhà):** Menu icon + "Xin chào, [Tên]" + Avatar right
- **Home (Khách Thuê):** Room label left + Avatar right

---

### 2.8 PaymentMethodCard

```
┌──────────────────────────────────────────┐
│  ┌──────┐                                │
│  │[LOGO]│  MoMo                          │  ← headlineSmall
│  └──────┘  Ví điện tử MoMo               │  ← bodySmall, tertiary
│                              [○ Select]  │  ← radio right
└──────────────────────────────────────────┘
```

Selected state: 2px solid #C5A059 border + gold20 background.

| Method | Logo Color | Display Name |
|---|---|---|
| MoMo | #AE2070 brand pink | Ví MoMo |
| ZaloPay | #006AF5 brand blue | ZaloPay |
| QR Code | #040b16 (QR pattern) | Quét mã QR |
| Chuyển khoản | #1A222E | Chuyển khoản ngân hàng |
| Tiền mặt | #42474d | Tiền mặt |

---

### 2.9 ChatBubble

**Sent (right-aligned):**
```
                    ┌───────────────────────────┐
                    │  Anh ơi cho tôi hỏi về    │  ← white text on navy700
                    │  hóa đơn tháng này ạ.     │  ← bodyMedium, lineHeight 22
                    └────────────────────────┐  │
                                             └──┘  ← tail bottom-right
                                   14:32 ✓✓       ← labelSmall, tertiary
```

**Received (left-aligned):**
```
[Av]  ┌───────────────────────────┐
      │  Hóa đơn đã được gửi vào  │  ← onSurface text on surface bg
      │  email của bạn rồi ạ.     │
      └──┐────────────────────────┘
         └  ← tail bottom-left
      14:33                            ← labelSmall, tertiary
```

| Property | Sent | Received |
|---|---|---|
| Background | #1A222E (navy700) | #f0f2f4 (surfaceContainerLow) |
| Text color | #FFFFFF | #191c1d |
| Border radius | 12px (2px bottom-right) | 12px (2px bottom-left) |
| Max width | 72% screen | 72% screen |
| Padding | 12px 14px | 12px 14px |
| Image bubble | 200×150px, radius 8px | same |

---

### 2.10 NotificationItem

```
┌──────────────────────────────────────────┐
│  [●]  [Icon 20px]  Hóa đơn tháng 4...   │  ← unread dot (gold) + title
│                    P.101 · 5 phút trước  │  ← bodySmall, tertiary
│                    "Bạn có hóa đơn..."   │  ← bodySmall, 1 line
└──────────────────────────────────────────┘
```

Unread: left 4px gold accent bar + surfaceContainerLow background.
Read: surface background, no bar.
Swipe-left action: "Xóa" (delete, red).

---

### 2.11 ChecklistItem

```
┌──────────────────────────────────────────┐
│  [☐/☑]  Kiểm tra điều hòa               │  ← checkbox 20px + bodyMedium
│          Tốt  ·  [Xấu]  ·  [Thiếu]      │  ← condition chips (optional)
│          [📷 Thêm ảnh]                   │  ← TextButton (camera)
└──────────────────────────────────────────┘
```

Checked state: text strikethrough, mint400 checkbox fill.
Condition chips: 6px v / 12px h padding, 4px radius.

---

## 3. Screen Specifications

### Screen 01: Màn Hình Chào (Splash)

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│          [App Logo SVG]         │  ← center, animated fade-in
│       Quản Lý Cho Thuê Nhà      │  ← displaySmall, gold500
│       ─────── ★ ───────         │  ← gold divider
│                                 │
│                                 │
│         Phiên bản 1.0.0         │  ← bodySmall, tertiary
└─────────────────────────────────┘
  Background: navy900 #040b16
```

**States:** Single (no loading/error)
**Interactions:** Auto-navigate after 2s → Giới Thiệu (first launch) or Đăng Nhập (returning)
**Animation:** Logo scales from 0.7 → 1.0 with spring (snappy), subtitle fades in 300ms delay

---

### Screen 02: Giới Thiệu 1/2/3 (Onboarding)

**Layout:**
```
┌─────────────────────────────────┐
│  ○ ● ○  (page dots, top right)  │
│                                 │
│  [Illustration — 60% height]    │
│                                 │
│  Quản lý dễ dàng hơn bao giờ   │  ← displayMedium, center
│                                 │
│  Theo dõi hóa đơn, hợp đồng,   │  ← bodyLarge, center, tertiary
│  và yêu cầu sửa chữa           │
│  trong một ứng dụng.            │
│                                 │
│  [Tiếp theo ──────────────────] │  ← PrimaryButton full-width
│  [Bỏ qua]                       │  ← TextButton center
└─────────────────────────────────┘
```

Pages:
1. "Quản lý phòng trọ thông minh" — property illustration
2. "Hóa đơn tự động mỗi tháng" — invoice illustration
3. "Kết nối chủ nhà & khách thuê" — chat/community illustration

**Interactions:** Swipe left/right to change page, dots update. Last page: "Bắt Đầu" replaces "Tiếp Theo".

---

### Screen 03: Đăng Nhập

**Layout:**
```
┌─────────────────────────────────┐
│  ←                              │  ← back (hidden on first launch)
│                                 │
│  Chào mừng trở lại              │  ← displaySmall, navy900
│  Đăng nhập để tiếp tục          │  ← bodyMedium, tertiary
│                                 │
│  Số điện thoại / Email          │  ← InputField
│  ┌─────────────────────────┐    │
│  │ 📱 +84 │ 0912 345 678   │    │
│  └─────────────────────────┘    │
│                                 │
│  Mật khẩu                       │  ← InputField (secure)
│  ┌─────────────────────────┐    │
│  │ ••••••••          [👁]  │    │
│  └─────────────────────────┘    │
│                    Quên mật khẩu?│  ← TextButton right-align
│                                 │
│  [Đăng Nhập ──────────────────] │  ← PrimaryButton
│                                 │
│  ─────────── hoặc ──────────    │
│                                 │
│  [G  Đăng nhập với Google     ] │  ← SecondaryButton
│                                 │
│  Chưa có tài khoản? Đăng ký    │  ← bodyMedium + TextButton inline
└─────────────────────────────────┘
```

**States:**
- Default
- Loading: button shows spinner, inputs disabled
- Error: "Sai số điện thoại hoặc mật khẩu" — InputField error state, red helper
- Success: navigate with 350ms slide transition

**Accessibility:** `accessibilityLabel="Số điện thoại"`, phone field `keyboardType="phone-pad"`, password `secureTextEntry`

---

### Screen 04: Trang Chủ — Khách Thuê

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar: "Xin chào, Văn A 👋"] │  ← + Avatar right
│                                 │
│  ┌─────────────────────────┐    │  ← Glass card (dark75)
│  │  Phòng 101 · Tầng 1    │    │
│  │  Chung cư Sunrise Plaza │    │
│  │  Hợp đồng: 01/01–31/12 │    │
│  │  [●  Đang Thuê]        │    │
│  └─────────────────────────┘    │
│                                 │
│  Hóa Đơn Tháng Này              │  ← section header
│  ┌─────────────────────────┐    │
│  │  ₫ 4.956.000  [Chưa TT]│    │
│  │  Hạn: 10/04/2026        │    │
│  │  [Thanh Toán Ngay]      │    │
│  └─────────────────────────┘    │
│                                 │
│  Tiện Ích Nhanh                 │  ← 2×2 grid
│  [📋 Hóa Đơn] [🔧 Sửa Chữa]   │
│  [💬 Chat]    [📄 Hợp Đồng]    │
│                                 │
│  Thông Báo Gần Đây              │
│  [NotificationItem × 3]         │
│                                 │
│  [BottomNav]                    │
└─────────────────────────────────┘
```

**States:** Loading (skeleton shimmer), Error (retry card), Empty (new tenant onboarding prompt)
**Interactions:** Pull to refresh, notification item tap → Thông Báo screen, "Thanh Toán Ngay" → Thanh Toán Tổng Quan

---

### Screen 05: Dashboard Chủ Nhà

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar: ≡  "Tổng Quan"]       │  ← + bell (notifications) right
│                                 │
│  ┌─────────────────────────┐    │  ← KPI glass card (dark75)
│  │  Tổng Thu Tháng 04/2026 │
│  │  ₫ 48.500.000           │    │  ← numericLarge, gold
│  │  ↑ 12% so với tháng 3   │    │  ← bodySmall, mint (positive)
│  └─────────────────────────┘    │
│                                 │
│  Tổng Quan Phòng                │  ← section header
│  ┌──────┐ ┌──────┐ ┌──────┐    │  ← 3-column stat chips
│  │  8   │ │  6   │ │  2   │    │
│  │Tổng  │ │ĐT    │ │Trống │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  Hóa Đơn Chờ Xử Lý   [Xem tất] │  ← section + TextButton
│  [InvoiceCard × 2]              │  ← horizontal scroll or list
│                                 │
│  Yêu Cầu Sửa Chữa   [Xem tất]  │
│  [MaintenanceCard × 2]          │
│                                 │
│  [BottomNav]                    │
└─────────────────────────────────┘
```

**States:** Loading (skeleton), Error (network error + retry), Empty (no properties — prompt to add first property)

---

### Screen 06: Danh Sách Phòng

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Danh Sách Phòng"]   │  ← + [+ Thêm] icon right
│                                 │
│  [🔍 Tìm kiếm phòng...]         │  ← InputField search
│                                 │
│  Bộ lọc: [Tất Cả] [Trống] [ĐT] [ĐSC]  ← filter chips horizontal scroll
│                                 │
│  8 phòng · 6 đang thuê          │  ← bodySmall, tertiary
│                                 │
│  [RoomCard P.101]               │
│  [RoomCard P.102]               │
│  [RoomCard P.201]               │
│  ...                            │
│                                 │
│  [BottomNav]                    │
└─────────────────────────────────┘
```

**States:** Loading (3 skeleton cards), Empty (illustration + "Thêm phòng đầu tiên"), Error (retry)
**Interactions:** Room card tap → Chi Tiết Phòng, filter chip tap → filter list (animated height change), FAB "+ Thêm Phòng" if no rooms

---

### Screen 07: Chi Tiết Phòng

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Phòng 101"]         │  ← + [⋮ More] right
│                                 │
│  ┌─────────────────────────┐    │  ← Room hero image 16:9
│  │  [Photo]  [StatusBadge] │    │
│  └─────────────────────────┘    │
│                                 │
│  Thông Tin Phòng                │
│  Diện tích: 30m²  •  Tầng: 1   │
│  Giá thuê: ₫ 4.500.000/tháng   │
│                                 │
│  Khách Thuê Hiện Tại            │
│  [Avatar 40]  Nguyễn Văn A      │
│               SĐT: 0912 345 678 │
│               [Gọi]  [Nhắn Tin] │
│                                 │
│  Hợp Đồng                      │
│  Từ 01/01/2026 đến 31/12/2026  │
│  Còn 259 ngày                   │
│  [Xem Hợp Đồng]                 │
│                                 │
│  Hóa Đơn Gần Đây               │
│  [InvoiceCard mini × 3]         │
│                                 │
│  Lịch Sử Sửa Chữa              │
│  [MaintenanceCard mini × 2]     │
│                                 │
│  [BottomNav]                    │
└─────────────────────────────────┘
```

---

### Screen 08: Hóa Đơn Tháng

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Hóa Đơn Tháng 4"]  │  ← + [↓ Tải PDF] right
│                                 │
│  ← Tháng 3  [ 04/2026 ]  Tháng 5 →  ← month nav
│                                 │
│  Phòng 101 — Nguyễn Văn A      │  ← bodyMedium
│  [Chưa Thanh Toán badge]        │
│  Hạn thanh toán: 10/04/2026    │
│                                 │
│  Chi Tiết Hóa Đơn              │
│  Tiền phòng         4.500.000 ₫ │
│  ─────────────────────────────  │
│  Điện (120 kWh)       216.000 ₫ │
│  Nước (8m³)            90.000 ₫ │
│  Internet              150.000 ₫│
│  ─────────────────────────────  │
│  Tổng cộng          4.956.000 ₫ │  ← numericMedium, gold
│                                 │
│  [Thanh Toán Ngay ─────────────]│  ← PrimaryButton
│  [Gửi Nhắc Nhở cho Khách]       │  ← SecondaryButton
└─────────────────────────────────┘
```

---

### Screen 09: Thanh Toán Tổng Quan

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Thanh Toán"]        │
│                                 │
│  Số tiền cần thanh toán         │  ← bodyMedium, tertiary
│  ₫ 4.956.000                    │  ← numericLarge, gold
│  Hóa đơn T4/2026 · P.101       │  ← bodySmall
│                                 │
│  Chọn Phương Thức Thanh Toán   │
│  [PaymentMethodCard MoMo]       │
│  [PaymentMethodCard ZaloPay]    │
│  [PaymentMethodCard QR Code]    │
│  [PaymentMethodCard Chuyển khoản│
│                                 │
│  [Tiếp Theo ───────────────────]│
└─────────────────────────────────┘
```

---

### Screen 10: Thanh Toán Phương Thức

Contextual screen — varies by method:

**MoMo/ZaloPay:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Thanh Toán MoMo"]   │
│  Đang chuyển hướng đến MoMo...  │  ← loading state
│  [App logo animation]           │
└─────────────────────────────────┘
→ Deep link to MoMo app, return with result
```

**QR Code:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Quét Mã QR"]        │
│  Quét mã để thanh toán          │  ← bodyMedium
│  ┌─────────────────────────┐    │
│  │  [QR Code 200×200px]    │    │  ← generated QR
│  └─────────────────────────┘    │
│  ₫ 4.956.000                    │  ← numericLarge, gold
│  Nội dung: P101 T4/2026         │  ← bodySmall
│  Hiệu lực: 15 phút ⏱           │
│  [Tải Xuống QR]  [Chia Sẻ QR]  │
└─────────────────────────────────┘
```

---

### Screen 11: Bảo Trì Danh Sách

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Yêu Cầu Sửa Chữa"] │
│                                 │
│  [🔍 Tìm kiếm...]               │
│                                 │
│  [Tất Cả] [Chờ] [Đang SCC] [Xong]  ← filter chips
│                                 │
│  5 yêu cầu · 2 đang xử lý      │
│                                 │
│  [MaintenanceCard × list]       │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 12: Gửi Yêu Cầu Sửa Chữa (Khách Thuê)

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Gửi Yêu Cầu"]      │
│                                 │
│  Loại sự cố *                   │
│  [Điện] [Nước] [Thiết bị] [Khác]│  ← chip select
│                                 │
│  Mô tả sự cố *                  │
│  ┌─────────────────────────┐    │
│  │ Nhập mô tả chi tiết...  │    │  ← multiline input, min 4 lines
│  └─────────────────────────┘    │
│                                 │
│  Ưu tiên                        │
│  [Thấp] [● Trung Bình] [Cao]   │  ← radio chips
│                                 │
│  Đính kèm ảnh (tùy chọn)       │
│  [+ Thêm ảnh]                   │  ← image picker, up to 5
│  [img1] [img2]                  │
│                                 │
│  [Gửi Yêu Cầu ────────────────]│
└─────────────────────────────────┘
```

---

### Screen 13: Xử Lý Sửa Chữa (Chủ Nhà)

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Xử Lý Sửa Chữa"]   │
│                                 │
│  [MaintenanceCard — full detail]│
│                                 │
│  Ảnh đính kèm (3)               │
│  [img1] [img2] [img3]           │  ← horizontal scroll, 80×80px
│                                 │
│  Phân Công Thợ                  │
│  [InputField: Tên thợ]          │
│  [InputField: SĐT thợ]          │
│  [InputField: Ngày hẹn — date]  │
│                                 │
│  Ghi Chú Xử Lý                  │
│  [multiline InputField]         │
│                                 │
│  Chi Phí Sửa Chữa               │
│  [InputField: ₫ số tiền]        │
│                                 │
│  Cập Nhật Trạng Thái            │
│  [Đang SCC] [● Hoàn Thành]     │  ← radio chips
│                                 │
│  [Lưu Thay Đổi ───────────────]│
└─────────────────────────────────┘
```

---

### Screen 14: Tạo Hợp Đồng

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Tạo Hợp Đồng"]     │
│                                 │
│  Thông Tin Phòng                │  ← section
│  [InputField: Chọn phòng — dropdown]
│                                 │
│  Thông Tin Khách Thuê           │
│  [InputField: Họ và tên *]      │
│  [InputField: CCCD/CMND *]      │
│  [InputField: Số điện thoại *]  │
│  [InputField: Email]            │
│                                 │
│  Thời Hạn Hợp Đồng             │
│  [DatePicker: Ngày bắt đầu]     │
│  [DatePicker: Ngày kết thúc]    │
│                                 │
│  Điều Khoản                     │
│  Tiền thuê:  [InputField: ₫]    │
│  Tiền cọc:   [InputField: ₫]    │
│  Thanh toán: [chọn ngày 1-28]   │
│                                 │
│  Dịch Vụ Kèm Theo               │
│  [ChecklistItem: Điện]          │
│  [ChecklistItem: Nước]          │
│  [ChecklistItem: Internet]      │
│                                 │
│  [Xem Trước]  [Tạo Hợp Đồng]   │
└─────────────────────────────────┘
```

---

### Screen 15: Báo Cáo Tài Chính

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Báo Cáo Tài Chính"]│  ← + [↓ Xuất] right
│                                 │
│  [2025] ← [Năm 2026] → [───]   │  ← year nav
│                                 │
│  ┌─────────────────────────┐    │  ← summary KPI card
│  │  Tổng Thu: ₫ 582.000.000│
│  │  Tổng Chi: ₫  48.000.000│
│  │  Lợi Nhuận: ₫534.000.000│  ← gold
│  └─────────────────────────┘    │
│                                 │
│  [Bar Chart — 12 tháng]         │  ← react-native-chart-kit or Victory
│  (tap bar → monthly breakdown)  │
│                                 │
│  Chi Tiết Theo Phòng            │
│  P.101  ₫ 54.000.000  6 tháng  │
│  P.102  ₫ 48.000.000  5 tháng  │
│  ...                            │
└─────────────────────────────────┘
```

---

### Screen 16: Chat Danh Sách

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar "Tin Nhắn"]            │
│                                 │
│  [🔍 Tìm kiếm cuộc hội thoại...]│
│                                 │
│  [ChatPreviewCard × list]       │  ← sorted by latest
│                                 │
└─────────────────────────────────┘
```

Unread count badge on BottomNav tab.

---

### Screen 17: Chat 1-1

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Nguyễn Văn A"]     │  ← + Avatar + online dot
│             P.101 · Đang hoạt  │  ← subtitle below title
│                                 │
│  ┌─── Ngày 15/04/2026 ────────┐ │  ← date separator pill
│                                 │
│  [ChatBubble received × 1]     │
│  [ChatBubble sent × 1]         │
│  [ChatBubble received × 1]     │
│                                 │
│  [Đang nhập...] (typing indicator)
│                                 │
│  ─────────────────────────────  │
│  [📎][📷]  [Nhập tin nhắn...]  [▶]│  ← input bar + send
└─────────────────────────────────┘
```

Input bar: surfaceContainerLow bg, 52px height, 8px radius. Send button: gold filled circle 40px.

---

### Screen 18: Thông Báo

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Thông Báo"]        │  ← + "Đánh dấu tất cả đã đọc" right
│                                 │
│  [Tất Cả] [Hóa Đơn] [Sửa Chữa] [Hợp Đồng]
│                                 │
│  Hôm nay                        │  ← date group header
│  [NotificationItem × 2]        │
│                                 │
│  Hôm qua                       │
│  [NotificationItem × 3]        │
│                                 │
│  14/04/2026                    │
│  [NotificationItem × 1]        │
└─────────────────────────────────┘
```

---

### Screen 19: Checklist Đồ (Kiểm Tra Tài Sản)

**Layout:**
```
┌─────────────────────────────────┐
│  [TopBar ← "Kiểm Tra Tài Sản"] │
│  P.101 · Ngày vào: 01/01/2026  │
│                                 │
│  Tiến độ: ████████░░  8/10     │  ← progress bar, gold fill
│                                 │
│  Phòng Khách (4 hạng mục)      │  ← section collapsible
│  [ChecklistItem: Sofa]         │
│  [ChecklistItem: Bàn trà]      │
│  [ChecklistItem: TV]           │
│  [ChecklistItem: Điều hòa]     │
│                                 │
│  Phòng Ngủ (3 hạng mục)        │
│  [ChecklistItem × 3]           │
│                                 │
│  Nhà Bếp (3 hạng mục)          │
│  [ChecklistItem × 3]           │
│                                 │
│  [Lưu Checklist ──────────────]│
└─────────────────────────────────┘
```

---

## 4. Navigation Architecture

```
App
├── AuthStack (Stack.Navigator)
│   ├── Splash             → auto-pop after 2s
│   ├── Onboarding         → swipeable pages
│   └── Login              → replace on success
│
├── TenantTab (Bottom.Navigator) [role === 'tenant']
│   ├── TrangChu           → Tenant Home
│   ├── HoaDon             → Invoice List
│   │   └── HoaDonDetail   → Stack: Invoice Detail
│   │       └── ThanhToanTongQuan
│   │           └── ThanhToanPhuongThuc
│   ├── SuaChua            → Maintenance List
│   │   └── GuiYeuCau      → Stack: Submit Request
│   ├── Chat               → Chat List
│   │   └── Chat1v1        → Stack: 1-1 Chat
│   └── ThongBao           → Notifications (modal)
│
├── OwnerTab (Bottom.Navigator) [role === 'owner']
│   ├── Dashboard          → Owner Dashboard
│   ├── DanhSachPhong      → Room List
│   │   ├── ChiTietPhong   → Stack: Room Detail
│   │   │   └── TaoHopDong → Stack: Create Contract
│   │   └── ChecklistDo    → Stack: Asset Checklist
│   ├── HoaDon             → Invoice Management
│   │   ├── HoaDonThang    → Stack: Monthly Invoice
│   │   └── BaoCaoTaiChinh → Stack: Financial Report
│   ├── SuaChua            → Maintenance List
│   │   └── XuLySuaChua    → Stack: Process Maintenance
│   └── Chat               → Chat List
│       └── Chat1v1        → Stack: 1-1 Chat
│
└── Modals (global, above all navigators)
    ├── NotificationModal
    ├── ImageViewerModal
    └── ConfirmationModal
```

### Deep Link Scheme: `quanlythue://`

| Deep Link | Target Screen |
|---|---|
| `quanlythue://invoice/:id` | HoaDonDetail |
| `quanlythue://room/:id` | ChiTietPhong |
| `quanlythue://maintenance/:id` | XuLySuaChua or ChiTietSuaChua |
| `quanlythue://chat/:userId` | Chat1v1 |
| `quanlythue://payment/:invoiceId` | ThanhToanTongQuan |
| `quanlythue://contract/:id` | TaoHopDong (edit mode) |

Push notifications → deep link resolver → navigate to correct screen within role's navigator.

---

## 5. Animation Specifications

### 5.1 Screen Transitions

| Transition | Duration | Easing | Notes |
|---|---|---|---|
| Stack push | 350ms | decelerate | SlideInRight (entering) |
| Stack pop | 300ms | accelerate | SlideOutRight (exiting) |
| Tab switch | 200ms | standard | FadeIn + slight scale 0.97→1 |
| Modal slide-up | 400ms | decelerate | translateY from screen bottom |
| Modal dismiss | 300ms | accelerate | translateY to screen bottom |
| Bottom sheet | 380ms | spring (gentle) | |

### 5.2 Loading States

**Skeleton Shimmer:**
- Background: linear gradient sweep (surfaceContainerLow → outlineVariant → surfaceContainerLow)
- Direction: left to right
- Duration: 1200ms looping
- Apply to: CardPlaceholder, AvatarPlaceholder, TextLinePlaceholder

**Spinner:**
- Gold (#C5A059) arc, 2px stroke width
- Rotate 360° in 750ms, linear
- Sizes: 16px (inline button), 24px (standard), 40px (full-screen)

**Pull to Refresh:**
- Gold spinner replaces system indicator
- Trigger threshold: 72px pull distance
- Spring back animation: 300ms spring (snappy)

### 5.3 Micro-Interactions

| Interaction | Animation | Duration |
|---|---|---|
| Button press | scale 1.0 → 0.97, opacity → 0.85 | 150ms |
| Button release | scale 0.97 → 1.0 | 200ms spring (bouncy) |
| StatusBadge appear | scale 0 → 1, fade in | 200ms spring |
| Chat message send | slide-in from right + fade | 200ms decelerate |
| Payment success | Checkmark draw animation + confetti burst | 700ms |
| Notification badge | scale 0 → 1 (pop) | 250ms spring (bouncy) |
| Filter chip select | bg color transition | 150ms standard |
| Checklist item check | checkbox fill sweep + text strikethrough | 300ms |
| Card swipe (delete) | translateX reveal action | native gesture |
| Input focus | border fade-in + shadow appear | 200ms |
| Month navigation | slide + fade (←/→ direction) | 300ms |

### 5.4 Haptic Feedback

| Event | Haptic Pattern |
|---|---|
| PrimaryButton press | `impactAsync(LIGHT)` |
| Payment success | `notificationAsync(SUCCESS)` |
| Payment failure | `notificationAsync(ERROR)` |
| Toggle/switch | `impactAsync(MEDIUM)` |
| Checklist item check | `impactAsync(LIGHT)` |
| Pull to refresh trigger | `impactAsync(MEDIUM)` |
| Long press | `impactAsync(HEAVY)` |

---

## 6. Vietnamese UX Considerations

### 6.1 Diacritic Typography Rules

Vietnamese uses stacked diacritics (tone + vowel modifier on same character: ộ, ượ, ắ). Standard line heights from Western design systems clip these marks.

**Required minimums:**
- Body text (14–16px): lineHeight multiplier ≥ 1.55 → 22–26px
- Small text (11–12px): lineHeight multiplier ≥ 1.6 → 18–20px
- Display (22–36px): lineHeight multiplier ≥ 1.4 → 32–52px
- Button labels (14px): lineHeight 20px minimum — prevents clipping inside touch targets

**Do not:**
- Use `numberOfLines` without `adjustsFontSizeToFit` on diacritically dense text
- Use `lineHeight < 20` for any visible body text
- Clip text containers without adequate padding-top (add 2px extra top padding for labels)

### 6.2 VND Currency Formatting

```typescript
// utils/currency.ts
export const formatVND = (amount: number): string => {
  // Format: 4.956.000 ₫  (periods as thousand separators, ₫ suffix with space)
  return (
    amount
      .toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      })
      // vi-VN gives "4.956.000 ₫" — verify and standardize:
      .replace(/\s₫/, ' ₫')
  );
};

// Display rules:
// - Always suffix: "4.956.000 ₫" (NOT "₫4.956.000")
// - Period as thousands separator (vi standard): 4.956.000 NOT 4,956,000
// - No decimal places for VND
// - In tables: right-align amounts
// - In badges/chips: compact "4,9tr ₫" for amounts ≥ 1.000.000

export const formatVNDCompact = (amount: number): string => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}tỷ ₫`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr ₫`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k ₫`;
  return `${amount} ₫`;
};
```

### 6.3 Date & Time Formatting

```typescript
// utils/date.ts
// Standard: dd/MM/yyyy  (NOT MM/dd/yyyy)
// Time: HH:mm (24-hour, Vietnamese standard)

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }); // → "16/04/2026"

export const formatDateMonth = (date: Date): string =>
  `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`; // → "Tháng 4/2026"

export const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  return formatDate(date);
};

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }); // → "14:32"
```

### 6.4 Payment Logo Usage

| Provider | Logo Treatment | Color | Do NOT |
|---|---|---|---|
| MoMo | Official MoMo SVG logo | #AE2070 brand pink | Recolor, stretch, add effects |
| ZaloPay | Official ZaloPay SVG logo | #006AF5 brand blue | Recolor, stretch, add effects |
| VietQR | VietQR mark (standard) | Black or system | Custom QR styling over mark |

Logo sizes in PaymentMethodCard: 40×40px in a 48×48 container (white bg, 8px radius).
Always accompany logos with Vietnamese text name ("Ví MoMo", "ZaloPay") — do not rely on logo alone for identification (accessibility, brand recognition).

### 6.5 Phone Number Formatting

```typescript
// Vietnamese mobile: 10 digits, starting 03/05/07/08/09
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0,4)} ${digits.slice(4,7)} ${digits.slice(7)}`;
    // → "0912 345 678"
  }
  return phone;
};
```

### 6.6 Keyboard & Input Considerations

- Phone number fields: `keyboardType="phone-pad"`, no country selector by default (assume VN +84)
- Currency input: `keyboardType="numeric"`, format on blur (not on keystroke)
- Vietnamese text input: `autoCorrect={false}` — iOS auto-correct mangles diacritics frequently
- Date pickers: use custom Vietnamese date picker wheel or modal calendar — avoid native date pickers (inconsistent label language on Android)
- Search: `keyboardType="default"`, Vietnamese IME compatible (Telex/VNI input methods)

### 6.7 Localization Structure

```typescript
// All user-facing strings in vi-VN:
const strings = {
  common: {
    loading: 'Đang tải...',
    error: 'Đã có lỗi xảy ra',
    retry: 'Thử lại',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    back: 'Quay lại',
    next: 'Tiếp theo',
    done: 'Hoàn thành',
    search: 'Tìm kiếm',
    filter: 'Bộ lọc',
    all: 'Tất cả',
    empty: 'Không có dữ liệu',
  },
  // ... per-screen keys
};
```

---

## 7. Accessibility Specification

### 7.1 Touch Targets

Minimum 44×44pt for all interactive elements (Apple HIG / Android Material).
- BottomNav items: full tap zone height (64px ÷ 5 items = adequate)
- Small icons: wrap in 44×44 Pressable with `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`
- StatusBadge: if tappable, ensure 44px tap target via padding or hitSlop

### 7.2 Color Contrast Ratios

| Combination | Ratio | WCAG Level |
|---|---|---|
| Gold #C5A059 on Navy #040b16 | 6.8:1 | AAA |
| White on Navy #1A222E | 12.1:1 | AAA |
| #191c1d on #f8f9fa | 16.2:1 | AAA |
| #42474d on #f0f2f4 | 7.1:1 | AA |
| Gold #C5A059 on White | 2.8:1 | Fail — NEVER use gold text on white |
| Mint text #1a5c38 on #e8f5ee | 5.9:1 | AA |

**Rule:** Gold (#C5A059) is ONLY used as text/icon color on dark navy backgrounds. Use navy text on gold buttons.

### 7.3 Screen Reader Labels

Every interactive element requires `accessibilityLabel` in Vietnamese:
```typescript
// Example patterns:
<PrimaryButton accessibilityLabel="Thanh toán ngay 4.956.000 đồng" />
<StatusBadge accessibilityLabel="Trạng thái: Đang thuê" />
<Avatar accessibilityLabel="Ảnh đại diện Nguyễn Văn A" />
<ChatBubble accessibilityLabel="Tin nhắn đã gửi: Anh ơi, 14 giờ 32 phút" />
```

Dynamic content: use `accessibilityLiveRegion="polite"` for notification badges, payment status updates.

---

## 8. Error & Empty State Design

### Empty States

Each empty state includes: illustration (centered, 40% screen width), heading (headlineMedium), body text (bodyMedium, center, max 2 lines), CTA button.

| Screen | Heading | Body | CTA |
|---|---|---|---|
| Danh Sách Phòng | "Chưa có phòng nào" | "Thêm phòng đầu tiên để bắt đầu quản lý" | "Thêm Phòng" |
| Hóa Đơn | "Chưa có hóa đơn" | "Hóa đơn sẽ xuất hiện khi có khách thuê" | — |
| Sửa Chữa | "Mọi thứ đang ổn!" | "Không có yêu cầu sửa chữa nào đang chờ" | — |
| Chat | "Chưa có tin nhắn" | "Nhắn tin với khách thuê của bạn" | — |
| Thông Báo | "Không có thông báo" | "Bạn đã xem hết tất cả" | — |

### Error States

Network error card (inline, replaces content):
```
    [WiFi-off illustration — 80px]
    Không thể kết nối
    Kiểm tra kết nối internet của bạn
    [Thử lại]
```

Server error: same pattern, "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."

Form validation: inline under each field (InputField error state), summary toast at top of form on submit.

---

## 9. Design QA Checklist

Before shipping each screen:

- [ ] All Vietnamese text has `lineHeight ≥ fontSize × 1.55` for body, `≥ 1.45` for display
- [ ] No 1px borders — only background color shifts
- [ ] No pure black (#000000) anywhere — use #191c1d
- [ ] Gold (#C5A059) only as text/icon on dark backgrounds OR as button background with dark text
- [ ] All interactive elements ≥ 44×44pt touch target
- [ ] StatusBadge uses background-only separation (no border)
- [ ] Currency formatted as `x.xxx.xxx ₫` (vi-VN locale)
- [ ] Dates formatted as `dd/MM/yyyy`
- [ ] Loading, empty, and error states implemented for all data-driven screens
- [ ] `accessibilityLabel` provided for all interactive elements
- [ ] Haptic feedback implemented for primary actions
- [ ] Glassmorphism elements: 70–80% opacity + backdrop-blur 20–40px
- [ ] Font families loaded: BeVietnamPro (Bold, SemiBold, Medium) + Inter (Bold, SemiBold, Medium, Regular)
- [ ] Payment logos: official SVGs, unmodified, 40×40px in 48×48 container
