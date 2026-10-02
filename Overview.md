# Building a job sheet management app

---

## 👤 Human

I want to know about this app.
Please tell me about what are the different features it has .
I am going to build a similar app so also want to know if there are any External API we need. 
Does this app need to go online. 
What could be the initial cost of this app, If I build it.
Can this app be build completely local. 
When the user uses a feature to create a job sheet, is this sheet visible to all other engineers in his shop.

I have many questions but I cannot remember them all in a single time.
I want you to refine my request, as me more questions that are needed to get me all the information needed for me to build this app for myself.

I am building a similar and I want to know about this app, i have asked many questions but I need you to ask me more questions so that you can give me accurate information about everything. I also need information for the tools and technologies I need to build this app. I am going to build this app using NextJS, Django Backend and Use Capacitor to turn this into an android/IOS app, please tell me what more tools and technologies I would need.

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details>

# What this app is

The screenshots are from **Repairing Shop Manager** by Click4Kart Tech on Google Play (100K+ downloads, 3.9★). It's an all-in-one management app for mobile/electronics repair shops in India. The screens show "M Solution" branding, which looks like the shop's own name and store profile set up inside the app.

## Features visible in your screenshots

**Repair operations**
- Live dashboard with today's, pending, repaired and delivered job counts
- Add New Job Sheet, the core feature
- Rough Reg (fast entry), Quick Bill (instant invoice) and Old Buy (purchase records)
- H/W Match (part finder), Demands (item requests) and Dealers (repair services)
- Stolen Mobile Checker (verify device status and report)
- Site Leads: online requests for old-phone purchases from the shop's website

**POS and inventory**
- POS counter, categories, suppliers, add stock, low-stock and price-drop alerts
- Inventory catalog, expenses, sales report and a close-register (day-end) flow

**Khata (ledger)**
- Daily and monthly views of revenue, expense and net profit
- Profit split by repairs, sales, rough entries and quick bills
- Pending udhaar (customer dues), suppliers and expenses

**Marketplace and community**
- Nearby spare-parts market with local shops and wholesalers, "Trusted" and verified badges, call and browse-store actions
- Listing your own products, plus a Community tab

**Shop setup**
- Multi-store switch
- Shop type (Mobile, Computer/Laptop, TV/Appliance) and a custom brand list

**Admin and settings**
- Staff delivery access toggle, staff management and payroll (salary, % commission, reports)
- System trash (recover deleted orders), bulk delete by date range, and export to PDF or Excel
- Bulk custom SMS to customers, monthly fixed expenses, and an "AI App" QR code
- GST on invoice, printer configuration (thermal and Bluetooth), default WhatsApp app, lock order after delivery
- Received-accessories list, offline repair records, sync with cloud, and clear cache
- Premium subscription with an expiry date, customer-side app link, desktop web version, customer feedback and directory, share and earn, FAQ and tutorials

## Your questions

**External APIs you'll likely need**
- **Push notifications:** Firebase Cloud Messaging.
- **WhatsApp:** deep links (`wa.me`) are free and enough for sending job updates. The WhatsApp Business Cloud API is optional and paid, for automated messages.
- **Bulk SMS:** MSG91, Fast2SMS or Twilio. In India you must register with **DLT** (TRAI) before sending commercial SMS.
- **Payments for subscriptions:** Razorpay (or Google Play Billing, see below).
- **Maps and location** for "nearby shops": Google Maps/Places, or a free alternative like OpenStreetMap/Nominatim.
- **File storage:** S3 or Cloudflare R2 for photos, logos and backups.
- **Login/OTP:** SMS OTP or Google Sign-In.
- **Stolen Mobile Checker:** this is the risky one. It probably relies on IMEI/CEIR-type data, and I'm not sure a public official API exists. Verify this before promising the feature, and consider launching without it.

**Does it need to go online?**
Partly. It has an **offline mode** and a "Sync with Cloud" button, so core work (job sheets, billing) can run without internet. Online is required for the marketplace, community, site leads, SMS, stolen-device checks, subscription validation, multi-device or staff sync, and backups.

**Can it be built completely local?**
A single-shop, single-device version of job sheets, billing, POS, khata and printing can be fully local (SQLite on the phone). But a local-only version loses the marketplace, staff on multiple phones, backups if the phone is lost, subscriptions, and the customer app. I recommend **offline-first with cloud sync**, which is what this app appears to do.

**Is a job sheet visible to other engineers in the shop?**
The screenshots don't show this directly, so I can't confirm it. The Admin Access Control, staff permissions and multi-store features strongly suggest data belongs to the **shop**, with staff seeing that shop's jobs according to their role. I'd design it that way: every record carries a `shop_id`, and permissions control who can view, edit, deliver or delete. You'd also decide whether engineers see only jobs assigned to them or all jobs.

**Rough initial cost (estimates, please verify current prices)**
- **Fixed accounts:** Google Play, about $25 once. Apple Developer, about $99/year, and you need a Mac for iOS builds.
- **Hosting at launch:** about ₹1,500–4,000/month (VPS, managed Postgres, storage, domain, SSL). It grows with users.
- **Variable costs:** SMS is roughly ₹0.15–0.30 each plus DLT setup. Razorpay takes about 2% per payment. WhatsApp Business API is per-conversation.
- **Development:** if you build it yourself, mostly your time. If you hire, a realistic MVP is roughly ₹4–12 lakh depending on scope, and the marketplace, community and offline sync are the expensive parts.

## Tech stack for Next.js + Django + Capacitor

**Important Capacitor caveat:** Capacitor needs a static build, so use Next.js `output: 'export'`. No server-side rendering, API routes or server components in the mobile app. Treat Next.js as a client-side React app talking to Django. If you want SEO pages (marketing site, customer tracking pages), build those as a separate Next.js deployment.

**Frontend**
- Tailwind CSS plus shadcn/ui
- TanStack Query for server state, Zustand for local state
- React Hook Form plus Zod for forms
- Recharts for the khata charts
- next-intl or i18next for Hindi/English
- jsPDF or html2canvas for invoices (or generate PDFs on the server)

**Backend**
- Django REST Framework and SimpleJWT for auth
- PostgreSQL, with Redis and Celery for background jobs (SMS, reports, notifications)
- Multi-tenancy by `shop_id` scoping, or `django-tenants` if you want hard isolation
- `django-filter`, `drf-spectacular` for API docs, and `django-storages` for S3/R2
- Django Channels only if you want true real-time dashboards
- WeasyPrint for server-side PDFs, `openpyxl` for Excel export

**Capacitor plugins (the hard part)**
- Local database: `@capacitor-community/sqlite`
- Push notifications, Camera, Filesystem, Share, Network and Preferences from the core `@capacitor/*` set
- Barcode and QR scanning: `@capacitor-mlkit/barcode-scanning`
- Bluetooth/thermal printing: a community plugin such as `capacitor-thermal-printer`. **Prototype this first**, because it's the most fragile part and device-dependent.
- Contacts (for "save customer to phone") and Geolocation

**Offline sync**
This is the hardest engineering problem. Options are PowerSync (managed, works with Postgres), RxDB, or a custom sync with `updated_at` and soft deletes (`deleted_at`) on every table, an outbox queue on the device, and a conflict policy (last-write-wins is usually fine to start).

**DevOps and monitoring**
Docker, Nginx, Gunicorn, GitHub Actions, Sentry for errors, and Fastlane or Android Studio/Xcode for releases.

**Billing note:** Google Play requires Play Billing for in-app digital subscriptions in many cases, so selling "premium days" through Razorpay inside the app may violate store policy. Check current rules before designing this.

## Let me refine your requirements

I'll ask the most important questions first. Answer these and I'll send the next round, covering invoicing and GST, printer models, staff roles, data model, multi-language, and your launch timeline.

---

## 👤 Human

Q: Who will use your app first?
A: For now just my shop, but I am going to scale it to more stores

Q: How important is offline work (no internet)?
A: Always online is fine, but if some features could offline it would be a bonus.

Q: Which features do you want in version 1?
A: i want all the features that are available in the Repairing Shop Manager App By Click4Kart Tech Pvt. Ltd., I think you should use the internet and my given images to identify all the features.

---

## 🤖 Claude

I'll look up the app online and combine what I find with your screenshots.

<details>
<summary>💭 Thinking</summary>



</details>

<details>
<summary>💭 Thinking</summary>



</details>

I checked the Play Store listing, the company's own website and APK listings, and reviews. Your screenshots plus these sources give a fairly complete picture.

## Correction to my earlier note
I said "M Solution" looked like a shop's own name. The company website lists A K Tyagi, the name on the dashboard, as co-founder of Click4kart Tech Private Limited. So your screenshots come from the company's own demo account. The product runs on Android, iOS and a Windows installer, plus a web version.

## Full feature list (screenshots + online sources)

**1. Job sheets (the core)**
- Digital job sheets where you scan the IMEI, record device condition and lock patterns, and enter cost estimates
- Job counters (today, pending, repaired, delivered) on a live dashboard
- Received-accessories checklist, order lock after delivery, staff delivery permission
- A public "Track Status" page on their site, so customers can follow their repair
- Customer balance and repair history in one screen (per the Play listing)

**2. Customer communication**
- Automated WhatsApp job receipts, status updates and final invoices
- Bulk custom SMS to customers
- Customer feedback (video and text reviews) and a customer directory
- A customer-side app link and a "customer nature filter" (customer categorisation)

**3. Billing and POS**
- Quick Bill, Rough Reg, GST on invoice, thermal/Bluetooth printing
- POS counter, sales report, close register (day end), expenses
- Product returns and price-drop management
- Old Buy (purchase records)

**4. Inventory and parts**
- Tracking of spare parts such as screens, batteries and ICs, with automatic stock deduction on repair completion and low-stock alerts
- Categories, suppliers, dealer management, a hardware part matcher (H/W Match) and Demands (item requests)

**5. Khata (accounting)**
- Daily and monthly profit, revenue and expense, with a split by repairs, sales, rough and quick entries
- Pending udhaar, monthly fixed expenses

**6. Staff and admin**
- Staff management with salary, commission % and repair records
- Roles and permissions, system trash, bulk delete, PDF/Excel export, multi-store switch

**7. Online and growth features**
- Nearby spare market and wholesalers, with trusted/verified badges and a community tab
- Site Leads (old-phone purchase requests from the shop's website)
- An instant personal website for the shop, added in version 8.2
- Share and earn (referrals), FAQ, video tutorials, a desktop/web version
- Stolen Mobile Checker

**8. Business model**
- A free plan, then ₹99/month, ₹250 for 3 months (adds multi-device login), or ₹999 for 12 months (adds a free website, priority support and PC/web/mobile access)
- A separate partner app where authorised partners handle premium activation requests
- The app requests Google Play Billing permission, so subscriptions likely go through Play Billing. That matches the store-policy point from my last message.

## Updates to my earlier API answers

**WhatsApp automation:** The app's own description says it uses an Accessibility permission to send automated WhatsApp messages. In my assessment, don't copy this. It's fragile, Google Play restricts Accessibility use, it can't work on iOS, and it doesn't fit Capacitor. Reviews also mention unreliable email/SMS and WhatsApp accessibility prompts. Use `wa.me` links (user taps send) or the WhatsApp Business Cloud API (fully automatic, paid).

**Stolen Mobile Checker:** India's official check is the KYM SMS to 14422 or the CEIR/Sanchar Saathi portal, which may ask for an OTP. I found no public developer API in my searches. So you'd either deep-link users to the official service, or skip this in v1. Third-party IMEI-check APIs exist, but verify their data source and legality first.

**Marketplace, community, website builder and partner network** need real backend work (moderation, verification, search by location), not just screens.

## What "all features" means for planning
This is a multi-year product built by a company. I'd still build it in phases so you don't stall: **Phase 1** covers shops, staff, job sheets, customers, invoices, printing, WhatsApp links and the dashboard. **Phase 2** adds inventory/POS, khata and dealers. **Phase 3** adds the marketplace, community, personal websites, site leads and subscriptions. If you want, I can turn this into a phased roadmap with data models.

## Next round of questions
Here are three more. After these, I'll ask about invoicing and GST, printers, staff roles, languages, and data privacy.

---

## 👤 Human

Q: How do you plan to make money from the app (if at all)?
A: I am building this app for someone else, I have not decided if I should use a one-time license per shop or create a paid subscription model. I don't know which option is better, we need to become better then the other app.

Q: Which platforms do you want at launch?
A: Android + iOS + Web

Q: Who is building it, and how fast do you want v1?
A: Just me, no deadline

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details>

## Subscription vs one-time license

**I recommend a subscription.** Your costs recur: servers, SMS, storage, WhatsApp, support, and Apple/Google fees. A one-time license gives you cash once and bills you forever after. It also leaves you no income to fund updates, which hurts when the shop's own business depends on the app.

Their pricing is very low: ₹99 per month, ₹250 for 3 months, and ₹999 for 12 months, with a free basic plan. You can't win a price war with a company that already has 100K+ installs, so I'd compete on quality instead. A structure that works:

- **Free tier** with a cap on active jobs per month (this drives adoption)
- **Monthly and annual plans**, with annual discounted heavily (cash up front, lower churn)
- **Add-ons** priced separately: extra staff seats, extra stores, SMS/WhatsApp credits, custom website
- **Optional "lifetime" plan**, priced high (say 3 to 4 years of annual price) and limited to the core features, for shop owners who hate subscriptions

Since you're building this for someone else, agree early on who owns the code, hosting accounts, store accounts, customer data and subscription revenue. It's much harder to sort out after launch.

**Billing policy to verify before designing payments:** Apple generally requires its in-app purchase for digital subscriptions sold inside iOS apps, and Google Play has similar rules, both with commissions. Selling only on the web and letting the app log in is a common workaround, but Apple's rules on linking out change often. Check the current App Store and Play policies before you commit to a payment design.

## How to be better than the other app
Their weak spots show up in user reviews. A review summary notes reliability gaps in email/SMS and WhatsApp accessibility prompts, plus occasional UI glitches. Ways to beat them:

1. **Reliable messaging.** Use WhatsApp Business API or `wa.me` links, plus proper SMS with DLT and delivery logs, instead of Accessibility hacks.
2. **True offline mode** for job sheets and billing, with automatic sync. Theirs is a manual toggle.
3. **Feature parity on iOS and web** from day one.
4. **Faster, cleaner UX**: fewer taps to create a job sheet, with a search that works across IMEI, name and phone.
5. **Stronger staff features:** engineer assignment, per-job time tracking, activity history, and an audit trail.
6. **Better reports:** profit per technician, per repair type and per brand.
7. **Data trust:** encrypted backups, easy export, and clear account deletion. (The Play listing says their data is not encrypted.)

## What your answers mean for the build

**Android + iOS + Web from one codebase** works with Next.js and Capacitor, but with rules:
- Use `output: 'export'` (static) so the same build runs in the browser and inside Capacitor. No server components or Next.js API routes. All data goes through Django.
- Wrap every native feature (printing, barcode scan, push) in a small service layer with a web fallback.
- iOS builds need a Mac and Xcode, or a cloud macOS builder such as Codemagic or GitHub Actions macOS runners.
- **Printer warning:** many cheap thermal printers use classic Bluetooth, which generally doesn't work with iOS apps. iOS needs BLE printers. This affects which hardware you can support, so I'll ask about it below.

**Solo with no deadline** means you can afford to get the foundations right:
- Multi-tenant design from day one (`shop_id` on every table, role-based permissions)
- UUID primary keys, `updated_at` and `deleted_at` on every table, which makes offline sync possible later
- Versioned API (`/api/v1/`), automated tests on billing and permissions, and error monitoring (Sentry)
- Build in the phases I described: core jobs and billing first, then inventory/POS/khata, then marketplace and community

Next round, I'll cover three important decisions: printers, GST, and languages.

---

## 👤 Human

Q: What printing do the shops need?
A: Both thermal and A4/PDF

Q: Do the invoices need GST support?
A: Optional per shop (toggle like theirs)

Q: Which languages should the app support?
A: English + Hindi + Other Indian Language + Hinglish

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details>

Your answers affect the design in a few specific ways.

## Printing: thermal + A4/PDF

**Thermal receipts**
- Thermal printers speak ESC/POS, but their built-in fonts usually don't cover Hindi or other Indian scripts. For multilingual receipts, **render the receipt as an image (bitmap) and send that to the printer**. It prints any script correctly, though it's a little slower than plain text. Use plain ESC/POS text only for English-only receipts.
- On Android, classic Bluetooth and BLE printers both work through a Capacitor plugin. On iOS you're limited to **BLE printers**, so decide on a supported printer list early and test it on real devices before building much else.
- On the web, thermal printing is the weak spot. Web Bluetooth works only in Chrome-based browsers (not iOS Safari). The practical web fallback is a print-friendly receipt page using the browser's print dialog, with CSS `@page` sized for 58mm or 80mm.

**A4/PDF invoices**
- Generate these **on the server** (Django with WeasyPrint) so the layout is identical on Android, iOS and web. Browser PDF libraries like jsPDF handle Indian scripts poorly.
- Embed Noto fonts (Devanagari, Bengali, Tamil, etc.) on the server. Share the finished PDF through the phone's native share sheet or WhatsApp.
- Let shops customise a template (logo, terms, signature, QR code).

## GST as a per-shop toggle
I'm not a tax advisor, so have a CA review the final design, but the structure would be:
- **Shop settings:** `gst_enabled`, GSTIN, state, and GST registration type (regular vs composition shops issue a different document).
- **Invoice lines:** HSN/SAC code, tax rate, taxable value, and CGST+SGST (same state) or IGST (other state), based on place of supply.
- **Snapshot everything on the invoice** (rates, shop details, customer details) so old invoices never change if settings change.
- **Don't allow deleting issued invoices.** Cancel them with a credit note instead, and keep an audit trail.
- **Invoice numbering:** a unique, consecutive series per financial year (April to March). GST rules have specific format requirements, so confirm them with your CA.
- Build GST so a shop turning it off still gets a clean, non-tax bill.

## Languages: English, Hindi, other Indian languages, Hinglish
- Treat **Hinglish (Hindi in Roman script) as its own locale**, for example `hi-Latn`, separate from Hindi in Devanagari. Both should be user-selectable per user.
- Use `next-intl` or `i18next` in Next.js and Django's `gettext` for backend messages. Keep all strings in translation files from the first screen, because retrofitting later is painful.
- Use `Intl.NumberFormat('en-IN')` for ₹ amounts with lakh/crore grouping, and give Indian scripts more vertical room in the UI.
- Message templates are language-specific. WhatsApp templates need approval per language, and SMS templates need DLT registration per language, so store a preferred language on each customer.
- Manage translations in a tool like Weblate (self-hostable) or Crowdin rather than editing JSON by hand.
- I'd launch with English, Hindi and Hinglish, then add other languages once the string files are stable.

## Next round of questions
These three decide how the job sheet and staff permissions are built, which is the heart of your first question about engineers seeing each other's jobs.

---

## 👤 Human

Q: Who should see a job sheet inside one shop?
A: Not sure, advise me

Q: What should customers be able to do themselves?
A: do we even need an app for the customers

Q: How should shop owners and staff log in?
A: Phone number + SMS OTP

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details>

## Who should see a job sheet in a shop?

Since you asked for advice, I'd start with permissions and a sensible default rather than one fixed rule.

**Default: everyone in the shop sees all jobs.** Repair shops are small, work gets handed between engineers, and the counter staff must answer "is my phone ready?" without asking around. The owner can switch on "engineers see only assigned jobs + the unassigned pool" if they want it stricter.

Then control **what** staff see, not just which jobs:

| Role | Jobs | Money fields (cost, profit, parts price) | Customer phone |
|---|---|---|---|
| Owner / admin | All | Yes | Yes |
| Manager | All | Yes | Yes |
| Front desk | All | Selling price only | Yes |
| Engineer | All or assigned only (toggle) | No | Optionally masked |

- Build this as a permission list (`view_all_jobs`, `change_status`, `mark_delivered`, `delete_job`, `see_profit`, `see_customer_phone`, `export_data`) that roles bundle together. Owners can then create custom roles, which is a differentiator.
- **Masking customer phone numbers** from engineers matters in practice, because staff sometimes take customers to their own side business.
- Record every status change, edit and delete in an **audit log** (who, what, when).
- Prevent silent overwrites if two people edit one job: use a `version` field and tell the second person the job changed.
- Notify an engineer when a job is assigned to them using push notifications. For live updates, start with polling or refresh-on-focus. Django Channels/WebSockets can come later.

## Do you need a customer app? No.
Repair customers visit rarely and won't install an app for one repair. Use a **tracking link** instead:
- Send it by WhatsApp or SMS when the job is created, and print a QR code to the same link on the job sheet.
- The link carries a long random token, not the job number, so nobody can guess other customers' links.
- It shows the status, expected date, quoted amount and shop contact, and hides sensitive details.
- It can later show a payment link and a "leave a Google review" button after delivery.
- I'd build this page as a small **server-rendered Django page**, not in the static Next.js export. It loads fast on weak networks, and WhatsApp can show a proper link preview (client-rendered pages can't).

Customers get all the value without the cost of a third app to maintain. A customer app only makes sense later if you want loyalty points or booking.

## Login with phone number + SMS OTP
- **India needs DLT registration** (entity, sender ID, OTP template) before SMS is delivered reliably. Start this early, since approvals can take days. Providers include MSG91, Fast2SMS, 2Factor and Twilio Verify.
- **Protect against abuse.** Attackers trigger OTPs to burn your SMS credit. Rate-limit by number, IP and device, expire OTPs in about 5 minutes, limit attempts, store only hashed OTPs in Redis, and add Cloudflare Turnstile on the web login.
- **Auto-fill:** use the Android SMS Retriever/User Consent API (the SMS needs a special app hash) and `autocomplete="one-time-code"` on iOS. Ask your SMS provider how to format the template.
- **Fallback channel:** if SMS fails, offer WhatsApp or email OTP.
- **App store review:** Apple and Google reviewers can't receive your SMS, so build a demo account with a fixed test OTP that works only for that account.
- **Sessions:** use short-lived JWT access tokens with rotating refresh tokens (Django SimpleJWT). On native, keep tokens in secure storage (Keychain/Keystore), not `localStorage`. Let the owner see logged-in devices and log them out.
- **Staff onboarding:** the owner adds a staff member's phone number and role, and the staff member then logs in with OTP. Add an optional **staff PIN** for fast switching on a shared counter tablet.
- Decide early how phone-number changes and account recovery work, since the number is the identity.

## Next round
These last three cover payments, multi-branch and the marketplace, which are the biggest scope decisions left.

---

## 👤 Human

Q: How should customers pay inside the app?
A: In India UPI is a prominent payment system and also cash is also used, you advice me how we should make the customer pay I am not sure

Q: How many locations will one account need to handle?
A: I want to give option to the shop owner

Q: What about the nearby spare-parts marketplace and community?
A: Build it in a later phase

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details>

## Payments: my recommendation

Don't start with full online payment integration. Do it in layers:

**Layer 1, in v1: record payments manually.**
- A `payments` table separate from invoices: amount, mode (cash, UPI, card, bank, credit/udhaar), reference note, who received it, and when.
- Support **advance, part payments, refunds and balance due** on every job. That's how repair shops really work, and it feeds the khata and the day-end register close (cash vs UPI vs card totals).

**Layer 2, in v1: UPI QR on the bill and receipt.**
- Use the shop's own UPI ID and the standard `upi://pay?pa=…&pn=…&am=…&tn=…&cu=INR` link, rendered as a QR code on the invoice, PDF and tracking page. The customer scans it with any UPI app.
- Money goes straight to the shop's account: no gateway, no fees, no KYC on your side.
- It gives **no automatic confirmation**, so staff tap "mark as paid". Never show "paid" automatically.

**Layer 3, later and optional per shop: payment links with auto-confirmation** (Razorpay, Cashfree, etc.). This needs each shop to have its own gateway account, plus webhook handling, fees and reconciliation work. Add it only when shops ask. Check current gateway fees and policies at that point.

**Your own subscription billing is a separate system.** It's how the shop pays you, not how customers pay the shop. I flagged the Apple/Google billing question earlier. Plan that separately.

## Multi-location, as an owner option
Design it from day one even if the UI hides it:

- **Structure:** Organization (the owner's account) → Shops/branches → memberships. One user can belong to several shops with a different role in each. Every business row carries `shop_id`, and the organisation is derived from it.
- **Single-shop mode:** signup silently creates one organisation and one shop. The branch switcher appears only when the owner adds a second branch, which keeps it simple for most users.
- **Per-branch settings:** GSTIN, invoice number series, printer config, stock and staff. Branches in different states can have different GSTINs.
- **Org-level settings:** customer records (shared or per-branch, as an owner toggle), consolidated reports, and subscription billing, with extra branches as a paid add-on.
- **Permission rule:** every query must filter by the user's shop memberships. Write automated tests proving one shop can never read another's data. Cross-tenant leaks are the most damaging bug this app can have.
- Franchise or chain with separate owners needs no special design. Each owner is just a separate organisation.

## Marketplace and community: later, but prepare now
- Use PostgreSQL and keep **PostGIS** available for later "nearby" searches. Store latitude/longitude and address on each shop profile from the start.
- Put the marketplace in its own Django app. Keep **public listings separate from private inventory**: nothing becomes public unless the owner explicitly publishes it.
- Add a `verified` flag and a phone-verified status on shops early, since "Trusted" badges depend on them.
- You'll eventually need reporting, moderation, spam control and terms of use. For the community, a moderated WhatsApp group costs far less than building one, so I'd skip an in-app community until the marketplace has traction.

## Where we are
| Area | Decision so far |
|---|---|
| Users | Your shop first, scaling to many shops |
| Platforms | Android, iOS and web (Next.js static export + Capacitor) |
| Build | Solo, no deadline, phased |
| Revenue | Subscription (free tier + monthly/annual + add-ons) |
| Printing | Thermal (image-rendered for Indian scripts) + server-side A4/PDF |
| GST | Optional per shop |
| Languages | English, Hindi, other Indian languages, Hinglish |
| Login | Phone + SMS OTP, staff PIN optional |
| Customers | Tracking link + QR, no customer app |
| Job visibility | Default all staff, configurable per shop, role permissions, audit log |
| Payments | Manual recording + UPI QR now, gateway later |
| Locations | Organisation → branches, hidden until needed |
| Marketplace | Later phase |

## Final round before I write the blueprint
These three finish the open technical decisions. The last one lets you choose what I produce next.

---

## 👤 Human

Q: How should staff enter a phone's IMEI/serial?
A: Type manually + Camera scan + OCR of the IMEI sticker

Q: Where do you want to host the backend and data?
A: For now I want no cost, you advice me what we should use, I will buy a VPS later when scaling for now if things can be free I would like them to be free.

Q: What should I produce next?
A: All three, one by one

---

## 🤖 Claude

<details>
<summary>💭 Thinking</summary>



</details]

You asked for all three documents, one at a time, so I'll start with the blueprint. Free tiers change often, so first I'll check what's currently free for hosting.

<details>
<summary>💭 Thinking</summary>



</details>

I have what I need on free hosting. Now I'll write the first document, the full blueprint.

---

