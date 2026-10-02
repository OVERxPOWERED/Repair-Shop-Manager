# Domain Glossary (repair-shop vocabulary)

Use these terms consistently in code, UI copy and docs. Hindi/Hinglish labels are suggestions for the translation files; have a native speaker review them.

| Term | Meaning | Hindi / Hinglish hint |
|---|---|---|
| Shop | One physical location (branch) | दुकान / Dukaan |
| Organisation | Owner's account holding one or more shops | संगठन / Account |
| Job sheet | The record created when a device is received for repair | जॉब शीट / Job Sheet |
| Job number | Per-shop running number shown to the customer | जॉब नंबर |
| Engineer / Technician | Staff member who repairs devices | इंजीनियर / Mistri |
| Front desk | Staff who receives devices and handles customers | रिसेप्शन |
| Accessories received | Items handed over with the device (SIM tray, cover, charger) | साथ में मिला सामान |
| Estimate | Quoted repair cost before work | अनुमान / Estimate |
| Advance | Money received before the repair is complete | एडवांस |
| Delivered | Device handed back to the customer | डिलीवर / Delivered |
| Rough Reg | Quick, minimal entry for a walk-in job with little detail | रफ एंट्री |
| Quick Bill | Instant invoice without a full job sheet | क्विक बिल |
| Old Buy | Purchase of a used phone from a customer | पुराना खरीद |
| Site lead | Old-phone purchase request submitted from the shop's website | साइट लीड |
| H/W Match | Hardware part compatibility finder (which part fits which model) | पार्ट मैच |
| Demands | Items customers asked for that the shop does not stock | मांग |
| Dealer / Supplier | Vendor from whom parts are bought | डीलर / सप्लायर |
| Khata | Ledger/bookkeeping view of income, expense and dues | खाता |
| Udhaar | Credit given to a customer; amount still owed | उधार |
| POS | Point of sale counter for selling products and accessories | POS |
| Close register | Day-end cash reconciliation | रजिस्टर बंद करें |
| IMEI | 15-digit device identifier (dual-SIM phones have two) | IMEI |
| KYM | "Know Your Mobile": official IMEI status check in India | KYM |
| GSTIN | GST registration number | GSTIN |
| HSN / SAC | Classification codes for goods / services on GST invoices | HSN / SAC |
| CGST / SGST / IGST | Tax components: central+state (same state) or integrated (other state) | CGST / SGST / IGST |
| Bill of supply | Document issued instead of a tax invoice by composition-scheme sellers | बिल ऑफ सप्लाई |
| Credit note | Document that reduces/cancels an issued invoice | क्रेडिट नोट |
| UPI | Instant payment system used for most customer payments | UPI |
| DLT | India's registration system required for commercial SMS | DLT |
| Tracking link | Public page where a customer follows their repair status | ट्रैकिंग लिंक |
| Trash | Soft-deleted records that can be restored | ट्रैश |
| Lock after delivery | Prevent status changes once a job is delivered | डिलीवरी के बाद लॉक |

## Job statuses (default set)
`received` → `diagnosing` → `awaiting_approval` → `awaiting_parts` → `in_repair` → `repaired` → `ready_for_pickup` → `delivered`
Exits: `cancelled`, `returned_unrepaired`. Allowed transitions are defined in one table in the jobs service; the UI reads them from the API.
