# FixPro Component Library Specification

> Master UI component catalog for Next.js, Tailwind CSS, and shadcn/ui.
> Implements the **FixPro** high-contrast monochrome design system with workshop-optimized touch ergonomics.

---

## 1. Global Shell & Navigation Components

### 1.1 AppHeader
* **Purpose:** Persistent top navigation bar across all main screens.
* **Elements:**
  * Left: Active Shop / Branch selector button with dropdown chevron (`M Solution ▼`).
  * Right: Notification bell with unread indicator badge + User profile avatar.
* **Specs:** Height 56px, background `bg-white/95`, border bottom `border-b border-neutral-100`, backdrop blur `backdrop-blur-sm`, `z-40`.

```tsx
// Example Component Signature
interface AppHeaderProps {
  currentShopName: string;
  hasMultipleBranches: boolean;
  onBranchSwitch: () => void;
  unreadNotificationsCount: number;
}
```

### 1.2 BottomNavigation
* **Purpose:** Primary 5-destination bottom navigation bar for mobile viewports.
* **Destinations:**
  1. **Home** (`LayoutDashboard`) — Operational command center
  2. **Jobs** (`Wrench`) — Active repairs & intake
  3. **Customers** (`Users`) — Customer directory & balances
  4. **Inventory** (`Package`) — Parts & stock catalog
  5. **More** (`Grid` or `Menu`) — Khata, POS, Staff, Reports, Settings
* **Specs:** Height 64px + safe area padding (`pb-safe`), fixed bottom, background `bg-white`, border top `border-t border-neutral-200/80`.
* **Active State:** Solid black icon + font-semibold text.
* **Inactive State:** Neutral-400 icon + font-medium text.

---

## 2. Buttons & Form Controls

### 2.1 PrimaryActionButton
* **Purpose:** Dominant call-to-action on every screen (e.g. `Create My Shop →`, `Save Job Sheet →`).
* **Specs:** Height 54px, full-width or pill, `bg-neutral-950 text-white font-medium text-base rounded-2xl`, flex layout with right-aligned icon (`ArrowRight` or `Check`).
* **Micro-interaction:** Active press downscale (`active:scale-[0.98] transition-transform`).

### 2.2 SecondaryButton / OutlineButton
* **Purpose:** Cancel, back, or secondary actions.
* **Specs:** Height 54px or 48px, `bg-white border border-neutral-200 text-neutral-900 font-medium rounded-2xl hover:bg-neutral-50 active:scale-[0.98]`.

### 2.3 FormInput
* **Purpose:** Text, phone, IMEI, and numeric data entry.
* **Specs:** Height 50px, `rounded-xl`, `border border-neutral-200`, `focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950`.
* **Features:** Optional leading icon prefix (`Phone`, `MapPin`, `Barcode`, `Search`), optional trailing action (e.g., `Scan`, `Clear`).

### 2.4 StepProgressBar
* **Purpose:** Multi-step wizard indicator (Onboarding, 8-step New Job Sheet flow).
* **Specs:** Array of horizontal rounded pills. Active step = `w-10 bg-neutral-950 h-1.5 rounded-full`; Inactive step = `w-10 bg-neutral-200 h-1.5 rounded-full`.

---

## 3. Cards & Information Displays

### 3.1 MetricCounterCard
* **Purpose:** Live operations counter (Today, Pending, Repaired, Delivered).
* **Specs:** `bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between`.
* **Variants:**
  * `Today`: Neutral black count
  * `Pending`: Subtle amber dot indicator + count
  * `Repaired`: Subtle emerald dot indicator + count
  * `Delivered`: Subtle purple dot indicator + count

### 3.2 JobCard
* **Purpose:** Primary item card in job lists, dashboard queues, and search results.
* **Layout:**
  ```text
  ┌────────────────────────────────────────────────────────┐
  │ #JOB-1028                       [ • IN PROGRESS ] (Amber)
  │ 
  │ Rahul Verma                      iPhone 13
  │ Screen Replacement               Due: Today, 5:00 PM
  │ 
  │ ₹4,500 Total  •  ₹2,000 Paid    Engineer: Ahmed Khan →
  └────────────────────────────────────────────────────────┘
  ```
* **Specs:** `bg-white border border-neutral-200/90 rounded-2xl p-4 active:bg-neutral-50 transition-colors shadow-none`.

### 3.3 StatusBadge
* **Purpose:** Color-coded status indicator for jobs, invoices, and payments.
* **Variants:**
  * `received`: `bg-blue-50 text-blue-800 border-blue-200`
  * `diagnosing`: `bg-sky-50 text-sky-800 border-sky-200`
  * `in_repair`: `bg-amber-50 text-amber-800 border-amber-200`
  * `awaiting_parts`: `bg-orange-50 text-orange-800 border-orange-200`
  * `repaired`: `bg-emerald-50 text-emerald-800 border-emerald-200`
  * `ready_for_pickup`: `bg-teal-50 text-teal-800 border-teal-200`
  * `delivered`: `bg-purple-50 text-purple-800 border-purple-200`
  * `cancelled`: `bg-rose-50 text-rose-800 border-rose-200`

### 3.4 CustomerProfileSummaryCard
* **Purpose:** CRM header card displaying customer name, masked phone number, total repair volume, pending balance, and quick call/WhatsApp buttons.

---

## 4. Overlay & Interaction Patterns

### 4.1 BottomSheet (ActionDrawer)
* **Purpose:** Quick actions (Rough Reg, Quick Bill, Add Part, Change Status, Filter).
* **Specs:** Slides up from bottom, `rounded-t-3xl bg-white p-6`, draggable pill handle at top (`w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4`), backdrop blur overlay.

### 4.2 SearchAndFilterBar
* **Purpose:** Persistent search bar with integrated filter trigger and horizontal scrollable filter chips (`All`, `Pending`, `Repaired`, `Delivered`).
