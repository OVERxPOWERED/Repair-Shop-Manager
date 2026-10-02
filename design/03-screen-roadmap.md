Yes. Now that the **information architecture is established**, we should treat UI generation as a structured design project rather than generating screens randomly.

The goal should be to end up with a **complete visual design system + a coherent image set for every important screen**, where every screen looks like the same application.

The roadmap below is the process I recommend we follow.
> 📢 **Consolidated Master Roadmap:** The unified engineering, visual design, and product roadmap lives in [ROADMAP.md](../ROADMAP.md). This file remains as the detailed screen-by-screen UI generation catalog.

---

# Repair Shop Management App — UI Generation Roadmap

## Overall process

```text
PHASE 0
Design Foundation
       ↓
PHASE 1
Visual Design System
       ↓
PHASE 2
Navigation & Shell
       ↓
PHASE 3
Home & Dashboard
       ↓
PHASE 4
Job Management
       ↓
PHASE 5
Customers
       ↓
PHASE 6
Inventory
       ↓
PHASE 7
Sales & Billing
       ↓
PHASE 8
Finance / Khata
       ↓
PHASE 9
Staff & Management
       ↓
PHASE 10
Reports
       ↓
PHASE 11
Settings & System
       ↓
PHASE 12
Customer Tracking
       ↓
PHASE 13
Future Features
Marketplace / Website / Leads
       ↓
PHASE 14
UX Consistency Review
       ↓
PHASE 15
Complete UI System
```

---

# PHASE 0 — Design Foundation

Before generating more screens, we need to establish the **visual language**.

We already have a strong starting direction from the reference image you provided:

- Clean modern
- Minimal
- Premium
- Lots of whitespace
- Rounded cards
- Thin borders
- Soft shadows
- Black/white dominant palette
- Restrained accent colors
- Simple line icons
- Large typography
- Mobile-first
- Editorial/product-design feel

The generated Home screen should become our **visual reference screen**.

### 0.1 Define the design personality

We need to lock:

```text
Design personality
├── Clean
├── Modern
├── Professional
├── Minimal
├── Premium
├── Practical
└── Workshop-oriented
```

### 0.2 Define visual rules

We will establish:

- Background
- Surface colors
- Primary color
- Status colors
- Typography hierarchy
- Border radius
- Shadow intensity
- Icon style
- Button style
- Card style
- Chips
- Bottom navigation
- Headers
- Lists
- Empty states
- Loading states
- Error states

### Deliverable

**Design System Reference Image**

One image showing:

```text
Typography
Buttons
Cards
Inputs
Chips
Icons
Status badges
Navigation
Lists
Charts
Empty states
```

---

# PHASE 1 — Application Shell

Before individual features, we design the framework that surrounds them.

## Screens

### 1.1 App launch

```text
Splash
```

### 1.2 Onboarding

```text
Welcome
Create Shop
Shop Setup
```

### 1.3 Authentication

```text
Phone Number
OTP
Profile Setup
```

The documented authentication direction is phone number + SMS OTP. Overview

### 1.4 Main application shell

We generate:

```text
Home
Jobs
Customers
Inventory
More
```

with the same bottom navigation.

### 1.5 More menu

Design the categorized More screen we discussed:

```text
Workshop
Money
Tools
Business
System
Settings
```

### Deliverables

```text
01 Splash
02 Welcome
03 Phone Login
04 OTP
05 Shop Setup
06 Main Shell
07 More
```

---

# PHASE 2 — HOME / DASHBOARD

This is our first major feature area.

We already have a concept for the Home screen, so we should now refine it rather than immediately moving on.

## Screens

### 2.1 Home — normal state

The main dashboard.

### 2.2 Home — busy shop

Shows a much larger number of active jobs.

### 2.3 Home — empty/new shop

Useful because the first-time experience will look very different.

```text
No jobs yet
Add your first job sheet
```

### 2.4 Home — notifications

### 2.5 Shop/branch selector

Only becomes visible when multiple branches exist, consistent with the documented multi-location model. Overview

### 2.6 Quick Action expansion

We should visualize the quick-action system:

```text
+ New Job
+ Rough Reg
+ Quick Bill
+ Old Buy
```

### Deliverables

**6–8 images**

This establishes the dashboard language used everywhere else.

---

# PHASE 3 — JOB MANAGEMENT

This is the **largest and most important UI phase**.

The source describes job sheets as the core feature, including device information, IMEI, condition, accessories, estimates and job status. Overview

We should not generate this as one image.

We should generate the complete workflow.

---

## 3.1 Jobs Dashboard

```text
All Jobs
Pending
In Progress
Repaired
Delivered
On Hold
```

### Screens

1. Jobs overview
2. Search jobs
3. Filter jobs
4. Empty jobs
5. Job list with many statuses

---

# 3.2 Create Job Sheet

This becomes a dedicated design sequence.

```text
New Job
   ↓
Customer
   ↓
Device
   ↓
IMEI
   ↓
Condition
   ↓
Problem
   ↓
Accessories
   ↓
Estimate
   ↓
Engineer
   ↓
Confirmation
```

### Screens

6. New Job — customer
7. New Job — select existing customer
8. New Job — create customer
9. New Job — device
10. IMEI scanner
11. OCR scanning
12. Device condition
13. Problem/diagnosis
14. Accessories
15. Estimate
16. Engineer assignment
17. Review job
18. Job created confirmation

This is where the documented manual IMEI, camera scanning and OCR requirement becomes visually important.

---

# 3.3 Job Detail

### Screens

19. Job overview
20. Job timeline
21. Device details
22. Customer details
23. Accessories
24. Repair details
25. Parts used
26. Estimate
27. Payments
28. Assigned engineer
29. Activity/audit history

---

# 3.4 Job Actions

### Screens

30. Change status
31. Add part
32. Add payment
33. Send WhatsApp
34. Print job sheet
35. Generate invoice
36. Mark repaired
37. Mark delivered
38. Put on hold
39. Cancel job

---

# 3.5 Job States

We should explicitly generate state variants:

```text
Created
↓
Received
↓
Diagnosing
↓
In Progress
↓
Waiting for Part
↓
Repaired
↓
Ready for Pickup
↓
Delivered
```

Not every one necessarily needs a separate full screen, but the visual states must be defined.

### Phase 3 deliverable

Approximately **35–40 UI images**.

This will be our largest UI generation phase.

---

# PHASE 4 — CUSTOMER MANAGEMENT

The source includes customer history and balances, so the customer experience should connect directly to jobs and payments. Overview

## Screens

### 4.1 Customer list

```text
All
Active
Pending Payment
```

### 4.2 Search customer

### 4.3 Add customer

### 4.4 Customer profile

```text
Customer
Contact
Repair history
Balance
Payments
Notes
```

### 4.5 Customer repair history

### 4.6 Customer payment history

### 4.7 Customer dues

### 4.8 Customer actions

```text
Call
WhatsApp
New Job
Payment
Edit
```

### 4.9 Customer nature/category

The documented product includes customer categorisation, so we should reserve UI for this. Overview

### Deliverable

**8–10 images**

---

# PHASE 5 — INVENTORY

Inventory is another major module.

The source specifies:

- Parts
- Categories
- Suppliers
- Dealers
- Low stock
- Stock deduction
- H/W Match
- Demands Overview

## Screens

### 5.1 Inventory overview

### 5.2 Parts list

### 5.3 Search parts

### 5.4 Part detail

### 5.5 Add part

### 5.6 Edit part

### 5.7 Add stock

### 5.8 Stock movement

### 5.9 Low stock

### 5.10 Out of stock

### 5.11 Categories

### 5.12 Suppliers

### 5.13 Supplier detail

### 5.14 Dealers

### 5.15 Dealer detail

### 5.16 H/W Match

### 5.17 Demands

### 5.18 Create demand

### Deliverable

**15–18 images**

---

# PHASE 6 — SALES & BILLING

The existing feature set includes POS, Quick Bill, Rough Register, Old Buy, sales, returns and register closing. Overview

## Screens

### POS

```text
POS Home
Product Selection
Cart
Customer Selection
Discount
Payment
Receipt
```

### Quick Bill

```text
Quick Bill
Items
Customer
Payment
Invoice
```

### Rough Register

```text
Rough Entry
Entries
Convert to Bill
```

### Old Buy

```text
Old Buy
Purchase Entry
Device Details
Customer
Payment
```

### Register

```text
Register
Cash
UPI
Card
Other
Close Register
Summary
```

### Returns

```text
Return
Select Sale
Return Items
Refund
```

### Deliverable

**15–20 images**

---

# PHASE 7 — PAYMENTS

Payment is important enough that I would treat it as a reusable UI system.

The documented architecture includes cash, UPI, card, bank and credit/udhaar as payment modes, plus advance/part payments. Overview

## Screens

1. Payment modal
2. Cash payment
3. UPI payment
4. Card payment
5. Advance payment
6. Partial payment
7. Balance due
8. Refund
9. Payment history
10. UPI QR
11. Payment confirmation

This gives us components that can then be reused inside:

- Job
- POS
- Invoice
- Customer
- Khata

---

# PHASE 8 — INVOICES

Because invoices appear in multiple workflows, we should design them independently.

## Screens

```text
Invoice Preview
Invoice Detail
A4 Invoice
Thermal Invoice
PDF Preview
Share Invoice
Print Invoice
Invoice History
```

Also:

```text
GST ON
GST OFF
```

because GST is configurable per shop. Overview

---

# PHASE 9 — KHATA / FINANCE

The documented Khata functionality covers revenue, expenses, profit and dues. Overview

## Screens

### Finance dashboard

### Revenue

### Expenses

### Add expense

### Profit

### Customer dues

### Supplier dues

### Fixed expenses

### Payment ledger

### Daily view

### Monthly view

### Transaction detail

### Financial charts

### Deliverable

**12–15 images**

---

# PHASE 10 — STAFF & PERMISSIONS

The app needs a proper staff management system.

The documented requirements include salary, commission, repair records, roles and permissions. Overview

## Screens

```text
Staff Dashboard
Staff List
Staff Detail
Add Staff
Edit Staff
Roles
Create Role
Permissions
Salary
Commission
Performance
Activity Log
```

And we should visualize different permission states:

```text
Owner
Manager
Front Desk
Engineer
Custom Role
```

The role model should support the documented distinction between seeing jobs, money fields, customer information and actions. Overview

---

# PHASE 11 — REPORTS

## Screens

```text
Reports Home
Business Overview
Repair Report
Sales Report
Inventory Report
Profit & Loss
Expense Report
Staff Performance
Customer Report
GST Report
```

### Filters

Every report should establish the same filter component:

```text
Today
Yesterday
This Week
This Month
This Year
Custom
```

and optionally:

```text
Branch
Engineer
Brand
Repair Type
Payment Method
```

---

# PHASE 12 — BUSINESS / BRANCH MANAGEMENT

## Screens

```text
Shop Profile
Edit Shop
Shop Logo
Business Hours
Branch List
Branch Detail
Add Branch
Switch Branch
Branch Settings
```

Remember that a single-shop user shouldn't be overwhelmed by branch functionality.

---

# PHASE 13 — SETTINGS

This is a large section.

## Account

```text
Profile
Phone
Security
Devices
```

## Shop

```text
Shop Details
Business Hours
Logo
Address
```

## GST

```text
GST Toggle
GSTIN
Registration Type
Tax Rates
```

## Invoice

```text
Template
Numbering
Terms
Signature
```

## Printing

```text
Thermal Printer
A4 Printer
PDF
Printer Connection
```

## Messaging

```text
WhatsApp
SMS
Templates
```

## Language

```text
English
Hindi
Hinglish
Other Indian Languages
```

The source specifically calls for English, Hindi, Hinglish and other Indian-language support. Overview

## Data

```text
Backup
Sync
Export
Trash
Delete
```

## Security

```text
App Lock
Devices
Sessions
Permissions
Audit Log
```

### Deliverable

**20+ settings images**, but many can be grouped into composite design sheets rather than individual generation tasks.

---

# PHASE 14 — SYSTEM STATES

This is extremely important and often forgotten.

For every major module we need to design:

### Empty

```text
No jobs yet
No customers
No inventory
No payments
```

### Loading

```text
Skeleton
Spinner
Progress
```

### Error

```text
Something went wrong
Retry
```

### Offline

Even though always-online is acceptable, offline capability is intended as a bonus and the earlier architecture allows offline-first behavior. Overview

So:

```text
Offline banner
Pending sync
Sync completed
Sync failed
```

### Permission denied

```text
You don't have permission
Request access
```

### Destructive actions

```text
Delete
Cancel
Remove
Clear
```

These should all use the same visual language.

---

# PHASE 15 — CUSTOMER TRACKING

This is a separate web experience rather than another screen inside the staff app.

The documented approach is a tracking link/QR instead of requiring customers to install an app. Overview

## Screens

```text
Tracking Landing
Repair Status
Job Details
Payment
UPI QR
Ready for Pickup
Delivered
Feedback
```

---

# PHASE 16 — FUTURE FEATURES

These should be visually designed **last**.

## Marketplace

```text
Marketplace
Nearby Shops
Parts
Wholesalers
Dealer Profile
Product Detail
My Listings
Orders
```

## Community

```text
Community
Posts
Post Detail
Create Post
```

## Website Builder

```text
Website Dashboard
Customize Website
Services
Contact
Preview
Publish
```

## Site Leads

```text
Leads
Lead Detail
Contacted
Converted
Closed
```

These are explicitly positioned as later-phase functionality in the documented product plan. Overview

---

# PHASE 17 — UI CONSISTENCY PASS

This is where we take **all generated screens** and compare them.

We check:

### Typography

```text
H1
H2
H3
Body
Caption
Numbers
Labels
```

### Components

```text
Cards
Buttons
Inputs
Dropdowns
Chips
Tabs
Lists
Tables
Modals
Bottom sheets
FABs
```

### Navigation

```text
Header
Back button
Bottom navigation
More menu
Branch selector
```

### Status

```text
Pending
In Progress
Repaired
Delivered
Cancelled
On Hold
Low Stock
Paid
Unpaid
```

Everything should look like it came from **one design system**.

---

# PHASE 18 — FINAL UI MAP

At the end, we'll produce one giant visual map:

```text
                    REPAIR SHOP APP
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
     OPERATE             MANAGE             ANALYZE
       │                   │                   │
   ┌───┼───┐          ┌────┼────┐         ┌────┼────┐
   │   │   │          │    │    │         │    │    │
 Jobs Customers   Inventory Staff     Reports Finance
   │                 │
   │                 ├── Parts
   │                 ├── Suppliers
   │                 └── Dealers
   │
   ├── New Job
   ├── Active
   ├── Repaired
   └── Delivered

             ┌─────────────────┐
             │      HOME       │
             │ Daily Overview  │
             └─────────────────┘

             ┌─────────────────┐
             │      MORE       │
             │ Business/System │
             └─────────────────┘
```

This becomes our **master UI architecture document**.

---

# How we should actually generate the images

I strongly recommend that we **do not generate 150 images individually without a process**.

Instead, we'll work in **screen families**.

For example:

### Job family

```text
01 Jobs Dashboard
02 Job List
03 New Job
04 Customer Selection
05 Device
06 IMEI
07 Condition
08 Accessories
09 Diagnosis
10 Estimate
11 Engineer
12 Review
13 Job Detail
14 Timeline
15 Payment
16 Delivery
```

We'll make these screens **one family at a time**.

That allows us to maintain:

- Same header
- Same cards
- Same typography
- Same spacing
- Same navigation
- Same iconography
- Same terminology
- Same status colors

---

# Our generation workflow for every screen

For every screen, we will follow this exact process:

### Step 1 — Define purpose

```text
What is this screen for?
Who uses it?
What action should the user take?
```

### Step 2 — Define information

```text
What data appears?
What is primary?
What is secondary?
```

### Step 3 — Define hierarchy

```text
Header
Primary content
Secondary content
Actions
Navigation
```

### Step 4 — Generate image

Use the established visual system.

### Step 5 — Review

I'll help identify:

```text
UX problems
Missing information
Visual clutter
Bad hierarchy
Inconsistent components
```

### Step 6 — Generate revision

If needed, regenerate.

### Step 7 — Lock the screen

Once approved:

> **SCREEN LOCKED**

We don't casually change its visual language later.

---

# The order I recommend we follow

We should **not start with Settings**.

The most logical sequence is:

```text
01  Design System
        ↓
02  App Shell
        ↓
03  Home
        ↓
04  Jobs
        ↓
05  New Job Sheet
        ↓
06  Job Detail
        ↓
07  Customers
        ↓
08  Inventory
        ↓
09  POS / Billing
        ↓
10  Payments / Invoices
        ↓
11  Khata
        ↓
12  Staff
        ↓
13  Reports
        ↓
14  Branch Management
        ↓
15  Settings
        ↓
16  System States
        ↓
17  Customer Tracking
        ↓
18  Marketplace / Future
        ↓
19  Consistency Pass
        ↓
20  Final UI System
```