# WCAG 2.2 Accessibility Audit Report

**Date:** 2026-04-28  
**Platform:** React Native / Expo  
**Files checked:** 38  
**Total issues:** 87 across 23 files

---

## WCAG 2.2 Compliance Summary (before fixes)

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | Fail | Icon buttons, images lack text alternatives |
| 1.3.1 Info and Relationships | Partial | Headers not marked `role="header"` |
| 1.4.1 Use of Color | Fail | `MaintenanceListScreen` status shown with raw key only |
| 2.1.1 Keyboard / Switch Access | Partial | All controls reachable but unlabeled |
| 2.4.6 Headings and Labels | Fail | No heading roles on any screen title |
| 2.5.5 Target Size | Fail | Multiple icon buttons < 48dp |
| 3.3.1 Error Identification | Fail | Error messages not announced via `accessibilityLiveRegion` |
| 4.1.2 Name, Role, Value | Fail | Buttons, cards, chips missing name/role |

---

## Risk Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 10 |
| 🟠 High | 42 |
| 🟡 Medium | 31 |
| 🔵 Low | 4 |

---

## 🔴 Critical Issues (screen reader completely broken)

| # | File | Element | Issue |
|---|------|---------|-------|
| 1 | `ImagePickerGrid.tsx` | `TouchableOpacity` (add photo) | No `accessibilityLabel`, no `accessibilityRole` — icon-only button invisible to VoiceOver/TalkBack |
| 2 | `ImagePickerGrid.tsx` | `IconButton` (remove image) | No `accessibilityLabel` — icon-only delete unlabeled |
| 3 | `ChatScreen.tsx` | `IconButton icon="send"` | No `accessibilityLabel` — critical send button unlabeled |
| 4 | `CreateInvoiceScreen.tsx` | `IconButton icon="plus-circle"` | No `accessibilityLabel` |
| 5 | `CreateInvoiceScreen.tsx` | `IconButton icon="close-circle"` | No `accessibilityLabel` |
| 6 | `CreateChecklistScreen.tsx` | `IconButton icon="close"` | No `accessibilityLabel` |
| 7 | `PropertyDetailScreen.tsx` | `IconButton icon="map-marker"` | Decorative icon presented as interactive — no label |
| 8 | `PropertyDetailScreen.tsx` | Gallery `Image` elements | No `accessibilityLabel`, no `accessibilityRole="image"` |
| 9 | `RoomDetailScreen.tsx` | Gallery `Image` elements | No `accessibilityLabel`, no `accessibilityRole="image"` |
| 10 | `MaintenanceDetailScreen.tsx` | Media `Image` elements | No `accessibilityLabel`, no `accessibilityRole="image"` |

---

## 🟠 High Issues

### Color-only status (WCAG 1.4.1 violation)
- `MaintenanceListScreen.tsx` — Chip shows raw status key (`cho_xu_ly`) with no human label
- `MaintenanceDetailScreen.tsx` — same
- `ContractListScreen.tsx` — Chip missing `accessibilityLabel`
- `InvoiceListScreen.tsx` — color carries meaning, no `accessibilityLabel`
- `InvoiceDetailScreen.tsx`, `ContractDetailScreen.tsx`, `DepositDetailScreen.tsx` — same

### Missing `accessibilityRole="header"` on screen titles (21 screens)
All screen title `Text` components lack `accessibilityRole="header"`.

### Missing `accessibilityLabel` on form inputs
`react-native-paper` `TextInput` with `label` prop does NOT auto-set `accessibilityLabel`. Fields missing it:
- `LoginScreen`: 2 fields
- `RegisterScreen`: 4 fields
- `CreatePropertyScreen`: 8 fields
- `CreateRoomScreen`: 6 fields
- `MaintenanceDetailScreen`: 3 fields
- `SubmitMaintenanceScreen`: 2 fields
- `CreateInvoiceScreen`: 5 fields
- `CreateChecklistScreen`: 5 fields
- `DepositDetailScreen`: 2 fields
- `CreateContract` Steps 3–4: 7 fields

### Missing `accessibilityLiveRegion` on error messages
Error `Text` components not announced to screen readers:
- `LoginScreen` (2), `RegisterScreen` (4), `CreatePropertyScreen` (6), `CreateRoomScreen` (2), `Step3Dates` (2), `Step4Finance` (5), `SubmitMaintenanceScreen` (2)

---

## 🟡 Medium Issues

### Missing `accessibilityRole` on interactive Cards
- `RoleSelectionScreen`, `TenantHomeScreen`, `PropertiesScreen`, `PropertyDetailScreen`, `ContractListScreen`, `ChatListScreen`, `InvoiceListScreen`, `MaintenanceListScreen`, `Step1Room`, `Step2Tenant`

### Missing `accessibilityLabel` on FAB buttons
- `PropertiesScreen`, `PropertyDetailScreen`, `ContractListScreen`

### Touch targets too small (WCAG 2.5.5 — minimum 48dp)
- `ImagePickerGrid.tsx`: remove `IconButton` at `size={18}` → ~34dp
- `CreateChecklistScreen.tsx`: `IconButton icon="close"` at `size={18}` → ~34dp
- `CreateInvoiceScreen.tsx`: `IconButton icon="close-circle"` at `size={20}` → ~36dp
- `MaintenanceDetailScreen.tsx`: star rating `Button compact` → ~36dp
- `CreateRoomScreen.tsx`: amenity `Chip compact` → ~32dp

---

## 🔵 Low Issues

- `ContractDetailScreen.tsx` signature Modal: missing `accessibilityViewIsModal={true}`
- `DepositDetailScreen.tsx` Dialog: same concern
- `PDFViewerScreen.tsx`: `Pdf` component no `accessibilityLabel`
- `EmptyState.tsx`: illustration image no `accessibilityRole`

---

## Per-Screen Status Table

| Screen | Critical | High | Medium | Low | Status |
|--------|----------|------|--------|-----|--------|
| LoginScreen | 0 | 4 | 0 | 0 | ❌ Fail |
| RegisterScreen | 0 | 6 | 2 | 0 | ❌ Fail |
| RoleSelectionScreen | 0 | 1 | 2 | 0 | ❌ Fail |
| Landlord HomeScreen | 0 | 1 | 3 | 0 | ❌ Fail |
| Tenant HomeScreen | 0 | 1 | 1 | 0 | ❌ Fail |
| PropertiesScreen | 0 | 1 | 3 | 0 | ❌ Fail |
| PropertyDetailScreen | 2 | 2 | 4 | 0 | ❌ Fail |
| RoomDetailScreen | 2 | 1 | 2 | 0 | ❌ Fail |
| ContractListScreen | 0 | 2 | 2 | 0 | ❌ Fail |
| ContractDetailScreen | 0 | 2 | 1 | 1 | ❌ Fail |
| InvoiceListScreen | 0 | 2 | 2 | 0 | ❌ Fail |
| InvoiceDetailScreen | 0 | 2 | 2 | 0 | ❌ Fail |
| MaintenanceListScreen | 0 | 3 | 2 | 0 | ❌ Fail |
| MaintenanceDetailScreen | 1 | 3 | 4 | 0 | ❌ Fail |
| ChecklistScreen | 0 | 1 | 2 | 0 | ❌ Fail |
| CreateChecklistScreen | 1 | 1 | 1 | 0 | ❌ Fail |
| ChatScreen | 1 | 1 | 1 | 0 | ❌ Fail |
| ChatListScreen | 0 | 1 | 2 | 0 | ❌ Fail |
| NotificationsScreen | 0 | 1 | 1 | 0 | ❌ Fail |
| PDFViewerScreen | 0 | 0 | 0 | 1 | ⚠️ Warn |
| CreatePropertyScreen | 0 | 3 | 1 | 0 | ❌ Fail |
| CreateRoomScreen | 0 | 2 | 3 | 0 | ❌ Fail |
| CreateInvoiceScreen | 2 | 2 | 2 | 0 | ❌ Fail |
| DepositDetailScreen | 0 | 2 | 1 | 1 | ❌ Fail |
| ReportsScreen | 0 | 1 | 3 | 0 | ❌ Fail |
| SubmitMaintenanceScreen | 0 | 2 | 3 | 0 | ❌ Fail |
| TenantMaintenanceScreen | 0 | 1 | 1 | 0 | ❌ Fail |
| CreateContract/index | 0 | 1 | 0 | 0 | ❌ Fail |
| CreateContract/Step1Room | 0 | 1 | 2 | 0 | ❌ Fail |
| CreateContract/Step2Tenant | 0 | 1 | 2 | 0 | ❌ Fail |
| CreateContract/Step3Dates | 0 | 3 | 0 | 0 | ❌ Fail |
| CreateContract/Step4Finance | 0 | 6 | 0 | 0 | ❌ Fail |
| CreateContract/Step5Terms | 0 | 1 | 1 | 0 | ❌ Fail |
| ImagePickerGrid | 2 | 0 | 1 | 0 | ❌ Fail |
| EmptyState | 0 | 0 | 1 | 0 | ⚠️ Warn |
