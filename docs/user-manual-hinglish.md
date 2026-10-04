# FixPro User Manual (Hinglish)

Yeh guide shop owner, front desk aur engineer ke liye hai. Isme FixPro ke woh sab features samjhaye gaye hain jo abhi app me available hain. Jo features "Soon" likhe dikhte hain (POS, Khata, Expenses, Salary, Branches, Old Buy, GST Reports), woh abhi kaam nahi karte.

> Note: App ke menu ke naam aur kuch labels aapki chuni hui bhasha (English / Hindi / Hinglish) me dikhenge. Is guide me hum English naam bracket me likhte hain.

---

## 1. App kya hai?

FixPro repair shop ka register hai jo phone me chalta hai:
- Customer ka phone/device aaya to **Job Sheet** banti hai.
- Job ka status badalta hai (Received se Delivered tak).
- Bill (Invoice) banta hai, payment (Cash / UPI) note hoti hai.
- Customer ko tracking link, SMS ya WhatsApp bheja ja sakta hai.
- Receipt printer (Bluetooth thermal) se ya PDF se nikalti hai.

App Android, iPhone aur web browser, teeno par chalta hai.

---

## 2. Pehli baar login

1. App kholo. **Welcome** screen aayegi. Bhasha badalni ho to upar se chuno.
2. **Phone number** daalo (10 digit) aur "Send OTP" dabao.
3. SMS me aaya **6 digit OTP** daalo.
   - OTP baar-baar mangoge to thoda ruknna padega (kuch seconds ka cooldown). Ghanta bhar me limited OTP milte hain.
   - Galat OTP kuch baar daalne par block ho jata hai, naya OTP mangao.
4. Pehli baar ho to **apna naam** daalo (Profile Setup).
5. Agar kisi shop ne aapko invite bheja hai to **Invitations** screen aayegi: "Accept" dabao.
6. Agar aap naye owner ho to **Shop Setup** (Onboarding) chalega:
   - Shop ka naam, type (Mobile / Computer / Appliance / Multi), phone
   - Address, city, pincode, state
   - GST on karna ho to GSTIN (15 character) daalo, warna off rakho
   - UPI ID (customer se direct paise lene ke liye)
   - "Create My Shop" dabao.

Ek hi phone se aap kai shops ke member ho sakte ho. Upar header me **Shop Switcher** se shop badal sakte ho.

---

## 3. Neeche ke 5 tabs

| Tab | Kaam |
|---|---|
| Home | Aaj ka summary, quick actions |
| Jobs | Saari repair jobs, naya job |
| Customers | Customers aur unke devices |
| Inventory | Abhi placeholder hai (stock feature baad me aayega) |
| More | Settings, staff, reports, invoices, logout |

---

## 4. Home

- **Counts**: Pending, In Progress, Repaired, Delivered.
- **Recent Jobs**: haal ki jobs. "View all" se Jobs list.
- **Add Job Sheet**: naya job shuru karo.
- Agar kisi ne invite bheja hai to upar banner dikhega "Pending Shop Invitation".

---

## 5. Naya Job banana (Intake, 8 steps)

Jobs tab me "+" button ya Home se "Add Job Sheet". Har step ke baad "Next".

1. **Customer**: purana customer search karo (naam ya phone) ya naya banao.
2. **Device**: brand, model, color. IMEI daalo ya **barcode scan** karo ya photo se **OCR** (camera). 
   - IMEI 15 digit ka hona chahiye aur sahi (Luhn check) hona chahiye.
   - OCR se aaya number hamesha khud check karke confirm karo. App apne aap save nahi karta.
   - "Check IMEI" se device stolen/blocked hai ya nahi, sarkari Sanchar Saathi (CEIR) par khud verify karo. Chori ka phone repair nahi karna hai.
3. **Problem**: customer ki shikayat (fault description), pehle se maujood damage.
4. **Condition / Photos**: device ki photos (screen crack, body damage). Photo app khud chhoti kar deta hai.
5. **Accessories**: sath me kya mila (SIM, cover, charger, memory card...). Checklist Settings me badal sakte ho.
6. **Estimate**: andazan kharcha (estimate), advance, expected delivery date. Pattern lock / PIN yahan likh sakte ho. Yeh lock suraksha ke liye encrypt hokar save hota hai aur sirf permission wale log dekh sakte hain.
7. **Assignment**: kaunsa engineer karega (optional).
8. **Confirmation**: sab check karke "Create". Job number milta hai (shop ke hisab se 1, 2, 3...).

Draft beech me chhut jaye to dobara kholne par wahin se continue hota hai.

Job banne ke baad **Share sheet** aata hai: receipt print karo, PDF share karo, WhatsApp pe bhejo.

---

## 6. Jobs list aur Job detail

**Jobs list**
- Search (job number, customer, device).
- Filter: Pending, In Progress, Repaired, Delivered, Closed.
- Har card par job no., customer, device, status badge (rang ke sath text bhi likha hota hai).

**Job detail** me:
- Customer aur device ki detail, IMEI.
- **Status badlo** ("Change status" sheet). Sirf allowed agla status dikhta hai.
- **Technician assign** karo.
- **Line items**: kaam (labour) aur parts jodo, quantity, rate, cost. Total apne aap banta hai.
- **Payments**: advance ya baaki paisa, Cash/UPI. UPI QR se customer paise de sakta hai.
- **Notes**: internal notes.
- **Photos**: aur photos jodo ya dekho.
- **History**: kab kisne status badla.
- **Messages**: customer ko SMS / WhatsApp ka log aur "send".
- **Receipt**: print ya PDF.
- **Invoice banao** (neeche dekho).
- **Edit**: job ki detail badlo.
- **Delete**: job trash me jata hai (permission chahiye).
- **Reopen**: delivered/band job dobara kholna (permission chahiye, reason likhna padta hai).

### Status ka flow

```
Received → Diagnosing → Awaiting Approval → In Repair → Repaired → Ready for Pickup → Delivered
```
Beech me: Awaiting Parts (parts ka wait), Returned Unrepaired (ban nahi paya), Cancelled.
- Delivered, Cancelled, Returned Unrepaired ke baad status badal nahi sakta. Dobara kholne ke liye **Reopen** use karo.
- "Delivered" karne ke liye "deliver" ki permission chahiye (engineer ko shop setting par depend karta hai).
- Delivery ke baad shop setting ke hisab se job **lock** ho sakti hai aur warranty ki date set hoti hai.
- Status badalne par (agar shop ne on rakha ho) customer ko automatic SMS jata hai.

---

## 7. Customers

- Customer list, search (naam / phone).
- Naya customer, edit, delete (trash).
- Customer detail me uske devices aur purani jobs.
- Ek hi phone number ek shop me do baar nahi ban sakta.
- Engineer ko phone number masked (chhupa hua) dikh sakta hai, yeh shop setting hai.
- **Customer ka data anonymize** karne ki request ho to owner/manager ise kar sakte hain. Naam "Anonymized Customer" ho jata hai, phone hat jata hai, lekin purane bill aur jobs ke amount bane rehte hain (tax rules ke liye).

---

## 8. Invoices (Bill)

Job detail se "Create invoice" ya More > Invoices.

- **Draft** banta hai pehle. Draft badal sakte ho.
- **Issue** karte hi bill **pakka** ho jata hai. Issue hua bill kabhi edit ya delete nahi hota.
- Galti ho to **Cancel** karo (credit note ban jata hai). Iske liye alag permission chahiye.
- GST on ho to GST invoice (CGST/SGST ya IGST) banta hai, warna simple bill.
- Invoice number har financial year (April se March) ke hisab se continue chalta hai.
- **PDF**: A4 PDF banta hai. Share sheet se WhatsApp ya kisi bhi app me bhej sakte ho.
- **Print**: thermal printer se receipt.
- **Payments**: bill par payment record karo (Cash / UPI). Refund ke liye alag permission.

GST rate, HSN code ka sahi hona aapki zimmedari hai. Pehli baar CA se bill ka format check karwa lo.

---

## 9. Thermal printer

More > Thermal Printer (Bluetooth & ESC/POS).
1. Printer on karo aur phone ka Bluetooth on rakho. Android par Nearby devices / Location ki permission allow karo.
2. Settings me printer dhundo, connect karo, 58mm ya 80mm chuno.
3. "Test print" karke dekho.
Hindi text bhi sahi chhapta hai kyunki app text ko tasveer bana kar print karta hai.

---

## 10. Customer Tracking link

Har job ka ek **tracking link** hota hai (`/t/...`). Customer link kholkar apni job ka status dekh sakta hai bina login ke.
- Link WhatsApp / SMS se bhejo.
- Shop setting me tracking link on/off aur link kitne din chale, set kar sakte ho.
- Customer us page se bill ka PDF bhi dekh sakta hai (agar bill issue ho chuka ho).

---

## 11. Messages (SMS / WhatsApp)

More > Messaging & Templates.
- Kaun se status par automatic SMS jaye, yeh chuno.
- WhatsApp message ka template badlo. Placeholder: `{customer_name}`, `{job_no}`, `{device_name}`, `{status}`, `{estimate_amount}`, `{balance_amount}`, `{tracking_url}`. Neeche live preview dikhta hai.
- Commercial SMS ke liye TRAI DLT registration chahiye. Jab tak registration nahi hota, SMS sirf test mode me hota hai. WhatsApp button se aap khud message bhej sakte ho.

---

## 12. More menu ke baaki features

### Reports (More > Reports)
Date range chuno: kitni jobs aayi / delivered hui, kitna collection (Cash/UPI), revenue, aur (sirf jinko permission hai unko) profit. Profit sirf owner/manager ko dikhta hai.

### Staff aur Roles
- **Staff**: naya member invite karo (phone number + role), role badlo, suspend, reactivate, remove.
- **Roles**: 4 default roles: Owner, Manager, Front Desk, Engineer. Role ki permissions dekh sakte ho.
- Sab kuch ki permission server par check hoti hai, button chhupa hone ka matlab permission nahi.

| Kaam | Owner | Manager | Front Desk | Engineer |
|---|---|---|---|---|
| Saari jobs dekhna | Haan | Haan | Haan | Shop setting par |
| Job banana / edit | Haan | Haan | Haan | Haan (apni assigned job) |
| Status badalna | Haan | Haan | Haan | Haan |
| Deliver karna | Haan | Haan | Haan | Shop setting par |
| Invoice issue, payment lena | Haan | Haan | Haan | Nahi |
| Refund, invoice cancel | Haan | Haan | Nahi | Nahi |
| Delete / restore | Haan | Haan | Nahi | Nahi |
| Export, permanent delete | Haan | Nahi | Nahi | Nahi |
| Cost / profit dekhna | Haan | Haan | Nahi | Nahi |

### Settings (More > Business & Store)
- **Shop Profile**: naam, address, phone, state, **logo upload** (bill par aata hai).
- **Billing & GST**: GST on/off, GSTIN, scheme, invoice prefix (jaise INV), round off, bill ki terms, UPI ID.
- **Jobs & Workflow**: delivery ke baad lock, engineer sirf apni job dekhe, engineer ko phone masked, default warranty din, tracking link on/off.
- **Brand Catalog**: device brands jodo / hatao.
- **Accessories Checklist**: intake me dikhne wale accessories.
- **Messaging & Templates**: upar dekha.

### Data & Storage
- **Trash & Restore**: delete kiya hua data kuch din trash me rehta hai. Wahan se restore ya hamesha ke liye delete (sirf owner).
- **Export Data**: customers, jobs, invoices, payments ko Excel (.xlsx) me download karo (sirf owner).

### Language
Language badalne ke liye More > Language: English, Hindi, ya Hinglish.

---

## 13. Account aur Privacy

- **Devices & Sessions**: kin kin phones/computers par aap login ho. Kisi ko "Revoke" karke logout kara sakte ho. "Log out of all devices" se sab jagah se logout.
- **Log Out**: sirf is phone se.
- **Delete Account** (More > Account & Security):
  - Request karne par 7 din ka **grace period** milta hai. Request ke baad aap sab devices se logout ho jaoge. 7 din ke andar dobara login karoge to request cancel ho jayegi (More me "Cancel Deletion Request" bhi hai).
  - 7 din baad aapka naam aur phone hamesha ke liye anonymize ho jata hai.
  - Bill aur financial record tax kanoon ke karan read-only rakhe jate hain.
  - Agar aap shop ke akele Owner ho aur shop me aur staff active hai, to account delete nahi hoga. Pehle ownership transfer karo ya staff hatao.
  - Bina app ke bhi `/account/delete/` web page se OTP dekar request kar sakte ho.
- **Privacy Policy** aur **Terms of Service** More > Legal & Support me hain.

---

## 14. Aam sawal aur samasya

| Samasya | Kya karein |
|---|---|
| OTP nahi aaya | Kuch second ruko, phir dobara mango. SMS provider abhi test mode me ho sakta hai. |
| "Permission denied" | Aapke role ko yeh kaam allowed nahi. Owner se kaho. |
| "Record changed, reload" | Kisi aur ne wahi cheez badli. Screen reload karo, phir dobara badlo. |
| Printer connect nahi ho raha | Bluetooth on hai? Nearby/Location permission di? Printer pehle kisi aur phone se to connected nahi? |
| Internet nahi hai | App ko internet chahiye. Offline mode abhi nahi hai. |
| Pehli request dheemi | Free server so jata hai, pehli request me kuch second lagte hain. |
| Galat bill issue ho gaya | Edit nahi hoga. Bill Cancel karo (credit note) aur naya banao. |

---

## 15. Zaroori suraksha baatein

- Chori ya blacklisted phone ki repair na karein. IMEI ko Sanchar Saathi par check karo.
- Kisi ko apna OTP na batao.
- Customer ke SMS / WhatsApp bhejne se pehle uski sahmati lo.
- Staff ke jaane par use turant Suspend ya Remove karo.
