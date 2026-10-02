# FixPro Design System & Visual Specification

> Derived from official design reference mockups in [`design/screens/`](screens/):
> - [`1.1-splash.png`](screens/1.1-splash.png) (Launch & Brand Splash)
> - [`1.2-onboarding.png`](screens/1.2-onboarding.png) (Welcome, Shop Setup, Shop Details)
> - [`1.3-image.png`](screens/1.3-image.png) (Authentication & Profile Setup)
> - [`1.4-main-app-shell.png`](screens/1.4-main-app-shell.png) (The 5 Main Screens: Home, Jobs, Customers, Inventory, More)

---

## 1. Brand Identity & Visual Language

* **Brand Name:** **FixPro**
* **Tagline:** Repair Shop Management
* **Visual Aesthetic:** **Minimalist, Editorial, High-Contrast Monochrome, Workshop-Grade, Distraction-Free.**
* **Core Philosophy:** Technicians and counter staff operate in fast-paced environments with oily hands, bright shop lights, and hurried customers. The UI prioritizes **extreme contrast, large touch targets, zero visual clutter, and instant legibility**.

---

## 2. Color Palette & Design Tokens

### 2.1 Core Neutral Palette (Monochrome Dominant)

The app utilizes a stark, modern black-and-white foundation inspired by premium engineering tools (Apple, Teenage Engineering, Linear).

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `canvas-bg` | `#FFFFFF` | `bg-white` | Primary screen canvas background |
| `surface-subtle` | `#F8F9FA` | `bg-neutral-50` | Input backgrounds, sub-cards, secondary blocks |
| `surface-card` | `#FFFFFF` | `bg-white` | Elevated cards, modal dialogs, bottom sheets |
| `surface-dark` | `#111827` | `bg-neutral-900` | Dark hero cards on Home dashboard |
| `border-subtle` | `#F1F3F5` | `border-neutral-100` | Dividers, subtle list separators |
| `border-default` | `#E4E4E7` | `border-neutral-200` | Standard card and form input borders |
| `border-strong` | `#A1A1AA` | `border-neutral-400` | Active input focus rings, active tab borders |
| `text-primary` | `#09090B` | `text-neutral-950` | Headings, primary labels, emphasized amounts |
| `text-secondary` | `#52525B` | `text-neutral-600` | Subtitles, helper text, timestamps |
| `text-muted` | `#A1A1AA` | `text-neutral-400` | Inactive icons, placeholders, disabled states |
| `brand-black` | `#09090B` | `bg-neutral-950` | Primary action buttons, active tab indicators, app icon |
| `brand-white` | `#FFFFFF` | `text-white` | Text/icons inside primary action buttons |

### 2.2 Functional Status Palette (Restrained & High-Legibility)

Status colors are used strictly for informational states (job statuses, alerts, stock warnings), never for gratuitous decoration. Each status uses a high-contrast dark text on a soft, light pastel container.

| Status | State | Background | Border | Text | Badge Preview |
|---|---|---|---|---|---|
| **Received / Diagnosing** | Blue | `#EFF6FF` (`blue-50`) | `#BFDBFE` (`blue-200`) | `#1E40AF` (`blue-800`) | `[ • Received ]` |
| **Pending / In Progress** | Amber | `#FFFBEB` (`amber-50`) | `#FDE68A` (`amber-200`) | `#92400E` (`amber-800`) | `[ • In Progress ]` |
| **Repaired / Ready** | Emerald | `#ECFDF5` (`emerald-50`) | `#A7F3D0` (`emerald-200`) | `#065F46` (`emerald-800`) | `[ • Repaired ]` |
| **Delivered / Completed** | Violet | `#FAF5FF` (`purple-50`) | `#E9D5FF` (`purple-200`) | `#6B21A8` (`purple-800`) | `[ • Delivered ]` |
| **Critical / Damage / Overdue** | Rose | `#FEF2F2` (`rose-50`) | `#FECDD3` (`rose-200`) | `#9F1239` (`rose-800`) | `[ • Urgent ]` |

---

## 3. Typography Hierarchy

* **Primary Font:** **Plus Jakarta Sans** or **Inter** (Google Fonts).
* **Number Figures:** Tabular lining figures (`font-variant-numeric: tabular-nums`) for currency amounts, job IDs, and IMEI numbers to ensure columns align perfectly.

| Level | Size | Weight | Line Height | Tracking | Tailwind Example |
|---|---|---|---|---|---|
| **Display / Splash** | 30px / 1.875rem | Bold (700) | 36px | `-0.02em` | `text-3xl font-bold tracking-tight text-neutral-950` |
| **Screen Title (H1)** | 24px / 1.5rem | Bold (700) | 30px | `-0.015em` | `text-2xl font-bold tracking-tight text-neutral-950` |
| **Card Header (H2)** | 18px / 1.125rem | SemiBold (600) | 24px | `-0.01em` | `text-lg font-semibold text-neutral-900` |
| **Section Label (H3)** | 14px / 0.875rem | Medium (500) | 20px | `0.02em` | `text-sm font-medium uppercase tracking-wider text-neutral-500` |
| **Body Large** | 16px / 1rem | Regular (400) | 24px | `normal` | `text-base text-neutral-800` |
| **Body Default** | 14px / 0.875rem | Regular (400) | 20px | `normal` | `text-sm text-neutral-700` |
| **Caption / Subtext** | 12px / 0.75rem | Regular (400) | 16px | `normal` | `text-xs text-neutral-500` |
| **Data / Monetary** | 20px / 1.25rem | Bold (700) | 26px | `-0.01em` | `text-xl font-bold tabular-nums text-neutral-950` |

---

## 4. Key Screen Patterns (From Reference Mockups)

### 4.1 Home Screen Architecture (`1.4-main-app-shell.png`)
* **Persistent Top Header:** Shop icon + Store Name dropdown (`M Solution ▾`), branch category (`Mobile Repair Shop`), notification bell with unread badge, and user avatar.
* **Greeting & Date:** `Good Morning, Burhanuddin` with date pill selector (`Thu, 2 Oct >`).
* **Dark Hero Metric Card:**
  * Background: Solid deep black (`bg-neutral-950 text-white rounded-3xl p-5`).
  * Metric: Today's Jobs (`12`) with percentage trend indicator (`↑ +20% from yesterday`).
  * Right: Technical line illustration of technician repairing phone.
  * Bottom Strip: 4 mini counters with vertical dividers (`In Progress: 4 | Pending: 3 | Repaired: 3 | Delivered: 2`).
* **Quick Actions Grid (8 Tiles):**
  * Tile 1 (Featured CTA): Solid black rounded rectangle `[+ Add Job Sheet]`.
  * Tiles 2–8: Clean white stroke tiles with line icons: `Rough Reg`, `Quick Bill`, `Old Buy`, `H/W Match`, `Demands`, `Stolen Check`, `Dealers`.
* **Financial & Inventory Summary:**
  * Revenue card: `₹24,850` with percentage trend badge and mini sparkline chart.
  * Low Stock card: Quick list of critical parts with remaining stock badge (`3 left`, `4 left`).
* **Recent Job Sheets:** Horizontal card feed with thumbnail, customer name, issue, status badge, and relative timestamp (`2h ago`).

### 4.2 Jobs Screen Architecture (`1.4-main-app-shell.png`)
* **Search & Filter Header:** Persistent search bar with integrated filter icon button (`Search by name, phone, job ID, IMEI...`).
* **Filter Pills Carousel:** Horizontal scrollable pills: `All 12` (active black pill), `Pending 3`, `In Progress 4`, `Repaired 3`, `Delivered 2`.
* **Job List Item Card:**
  * Left: Device thumbnail/icon.
  * Title: `#JOB-1028 Rahul Verma` + Color-coded status badge (`In Progress`, `Pending`, `Repaired`).
  * Subtitle: Device model (`iPhone 13`) and repair item (`Screen Replacement`).
  * Bottom Row: Date/time (`2 Oct, 10:30 AM`) and total cost (`₹4,500`).
* **Floating Action Button (FAB):** Solid black circle with white plus icon (`+`) anchored to bottom right.

### 4.3 Customers Screen Architecture (`1.4-main-app-shell.png`)
* **Search & Filter:** Search by name or phone + filter pills (`All 328`, `Active 28`, `Pending Payment 16`).
* **Customer List Item:**
  * Monogram avatar circle with initials (`RV`, `SP`, `AK`).
  * Name & Phone number (`+91 98765 43210`).
  * Right side: Job history count + Due status (e.g. `5 jobs • ₹4,500 due` in red text, or `No due` in muted green).

### 4.4 Inventory Screen Architecture (`1.4-main-app-shell.png`)
* **Search with Barcode Scanner:** Search input with integrated camera barcode icon button.
* **2x2 Metric Grid:** `Total Items (428)`, `Low Stock (12)`, `Out of Stock (4)`, `Stock Value (₹2.4L)`.
* **Navigation Rows:** Clean grouped list rows with icons, counts, and right chevrons (`All Parts`, `Low Stock`, `Categories`, `Suppliers`, `Stock Movements`, `H/W Match`, `Demands`, `Dealers`).

### 4.5 More Screen Architecture (`1.4-main-app-shell.png`)
* Grouped menu cards categorized into logical modules:
  * **Sales & Billing:** POS Counter, Quick Bill, Rough Register, Old Buy, Sales History.
  * **Finance & Reports:** Khata (Accounts), Expenses, Reports, GST Reports.
  * **Staff & Team:** Staff Management, Roles & Permissions, Salary & Commission.
  * **Business:** Shop Profile, Branches, Site Leads, Customer Feedback.

### 4.6 Auth & Onboarding Architecture (`1.2-onboarding.png` & `1.3-image.png`)
* **Welcome Screen:** Line-art technician illustration, app logo, and dual sign-in options (`Continue with Phone →`, `Continue with Google`).
* **Phone Entry:** Country flag selector (`🇮🇳 +91 ▾`), phone input with clear button, custom in-app numeric keypad for rapid one-handed typing.
* **OTP Challenge:** 6 individual rounded input boxes, auto-focus, SMS resend timer (`Resend (28s)`).
* **Profile Setup:** User avatar with camera badge, Name input, optional Email input.
* **Shop Setup Wizard:** Multi-step bar progress indicator, shop logo upload, shop type dropdown, phone number, and street address.
* **Confirmation Screen:** Celebration checkmark badge, "Welcome, [Name]!", with immediate CTA to begin shop configuration.

---

## 5. UI Ergonomics & Component Rules

1. **Tap Target Minimums:** All interactive elements maintain a minimum bounding box of **48px x 48px** to ensure usability when technicians have tools or gloves in hand.
2. **One-Handed Thumb Zone:** High-frequency actions (FAB, Primary Bottom Buttons, Bottom Navigation, Search) are positioned within the lower half of the screen.
3. **Contrast Compliance:** Every text-on-background combination strictly satisfies WCAG AA (minimum 4.5:1 for body text, 3:1 for large text).
4. **Haptic Feedback:** Native mobile interactions (via Capacitor `@capacitor/haptics`) trigger subtle tick feedback on OTP entry, barcode scan success, and status changes.
