# FixPro Design Hub & UI Specifications

Welcome to the **FixPro** design specification and visual architecture hub. This directory holds all visual tokens, information architecture maps, screen roadmaps, component catalogs, and visual reference mockups.

---

## 📂 Directory Structure

```text
design/
├── README.md                          # This index file
├── 01-design-system.md                # Visual style guide, tokens, typography, colors, radii
├── 02-information-architecture.md     # 5-tab navigation, operational flows & screen hierarchy
├── 03-screen-roadmap.md               # 18-phase UI roadmap, screen families & states
├── 04-component-library.md            # Master UI component specs (shadcn + Tailwind)
└── screens/                           # Visual mockups & screen design references
    ├── 1.1-splash.png                 # Splash screen with illustration & brand
    ├── 1.2-onboarding.png             # 3-step onboarding flow (Welcome, Shop Setup, Details)
    ├── 1.3-image.png                  # Complete authentication flow (Phone, OTP, Profile, Ready)
    ├── 1.4-main-app-shell.png         # The 5 Main Tabs (Home, Jobs, Customers, Inventory, More)
    └── ...                            # (Add new mockup screens here)
```

> **Note:** The `UI-Information/` folder is maintained as a seamless symlink to `design/`. Any images or files added to either location are automatically synchronized.

---

## 🎨 Visual Identity Summary

* **Brand:** **FixPro** — Repair Shop Management
* **Aesthetic:** High-contrast monochrome, clean line-art illustration, minimalist typography, workshop-grade durability.
* **Palette:**
  * **Canvas:** Pure White (`#FFFFFF`) / Light Off-White (`#F8F9FA`)
  * **Brand Primary:** Deep Black (`#09090B`)
  * **Dark Hero Card:** Deep Charcoal (`#111827`)
  * **Borders:** Subtle Hairline Gray (`#E4E4E7`)
  * **Status:** Restrained soft pastels with high-contrast text (Emerald, Amber, Blue, Purple, Rose).
* **Typography:** Plus Jakarta Sans / Inter with tabular figures for numbers and prices.
* **Navigation:** 5 primary tabs: `Home`, `Jobs`, `Customers`, `Inventory`, `More`.

---

## 🖼️ Reference Screen Catalog

1. **[`screens/1.1-splash.png`](screens/1.1-splash.png):** App launch screen with the technician workbench illustration, brand name, loader, and feature highlights.
2. **[`screens/1.2-onboarding.png`](screens/1.2-onboarding.png):** 3-step welcome and shop onboarding wizard with logo upload and address entry.
3. **[`screens/1.3-image.png`](screens/1.3-image.png):** 5-screen authentication sequence: Welcome, Phone entry with custom numeric keypad, 6-box OTP entry with resend timer, Profile setup, and Account confirmation.
4. **[`screens/1.4-main-app-shell.png`](screens/1.4-main-app-shell.png):** Master 5-tab application shell:
   - **Home:** Dark hero metric card, 8-tile quick action grid, revenue/low-stock widgets, recent job sheets.
   - **Jobs:** Search & filter bar, status pill carousel, detailed job cards, and bottom-right FAB.
   - **Customers:** Search, filter chips, monogram avatar cards, and red/green due balance indicators.
   - **Inventory:** Barcode search, 2x2 metric summary grid, and categorized parts navigation rows.
   - **More:** Grouped settings hub for Sales, Finance, Staff, and Business.
