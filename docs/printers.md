# Thermal Printers & Raster Printing Engine

> Reference implementation and hardware spike findings for Bluetooth / BLE ESC/POS thermal receipt printers.
> Evaluated for Phase 0 (Week 2 Spike A).

---

## 1. The Core Engineering Challenge: Bilingual Indian Printing
Most sub-₹3,000 thermal printers in Indian wholesale markets (e.g. Everycom, HoIN, POS-58, Bluetooth C58) only bundle Chinese / Latin character ROMs (Code Page 437 / 850). Sending raw UTF-8 Hindi (Devanagari) characters directly over ESC/POS serial produces scrambled garbage characters (mojibake).

### The Solution: 1-Bit Monochrome Raster Pipeline
Rather than relying on printer font ROMs, FixPro renders receipt layouts on a client-side HTML canvas at native dot pitch, converts pixels to a 1-bit monochrome bitmap, and transmits raw `ESC/POS GS v 0` raster data.
* **Result:** Perfect rendering of Hindi, Marathi, Gujarati, Tamil, complex shop logos, and high-density UPI QR codes across any brand of ESC/POS printer.
* **Reference Implementation:** [`frontend/src/lib/printer/rasterizer.ts`](file:///home/overxpowered/padhai_in_linux/Projects/Repair%20Shop%20Management%20App/frontend/src/lib/printer/rasterizer.ts).

---

## 2. Technical Specifications

| Parameter | 58mm Thermal Printers | 80mm Thermal Printers |
|---|---|---|
| **Dot Width** | 384 dots (48 bytes per line) | 576 dots (72 bytes per line) |
| **Printable Width** | ~48 mm | ~72 mm |
| **Command Format** | `GS v 0 m xL xH yL yH [data]` | `GS v 0 m xL xH yL yH [data]` |
| **Header Hex** | `1D 76 30 00 30 00 [yL yH]` | `1D 76 30 00 48 00 [yL yH]` |
| **Dithering** | Floyd-Steinberg error diffusion | Floyd-Steinberg error diffusion |

### BLE Packet Fragmentation & Flow Control
Standard Bluetooth Low Energy (BLE 4.0/4.2) characteristics have a default ATT Maximum Transmission Unit (MTU) of **23 bytes** (20 bytes of payload). 
* Attempting to transmit a 25 KB raster image buffer in a single write operation triggers immediate buffer overflows and printer disconnections.
* **Transmission Strategy:**
  1. Chunk data into 20-byte packets (or request `requestMtu(512)` on Android).
  2. Implement an asynchronous queue with a 15–20 ms delay between packet bursts (`setTimeout` or BLE `writeWithoutResponse` drain event).
  3. Prepend `ESC @` (0x1B 0x40) to re-initialize printer state and append `GS V 1` (0x1D 0x56 0x01) for partial auto-cut.

---

## 3. Supported & Lab-Tested Hardware Matrix

| Brand / Model | Paper | Connection | Android | iOS | Protocol | Notes |
|---|---|---|---|---|---|---|
| **Everycom EC-58** | 58mm (384px) | Bluetooth Classic / BLE | Yes | Yes | ESC/POS Raster | Ultra-popular ₹1,800 market printer. Crisp Hindi output. |
| **HoIN HOP-E58** | 58mm (384px) | BLE | Yes | Yes | ESC/POS Raster | Reliable BLE handshake. Requires 20ms packet pacing. |
| **TVS RP-3150 Star** | 80mm (576px) | Bluetooth Classic / USB | Yes | Untested | ESC/POS Raster | Heavy-duty counter printer with auto-cutter. |
| **Generic POS-58** | 58mm (384px) | BLE 4.0 | Yes | Yes | ESC/POS Raster | Common white-label device. Fast print with Floyd-Steinberg. |

---

## 4. Standard Quality Verification Checklist
For every printer certified for FixPro:
1. [x] Pair/scan and connect over BLE without PIN prompt lockup.
2. [x] English receipt rendering with sharp monospace alignments.
3. [x] Bilingual Hindi receipt (`एम सॉल्यूशन - मोबाइल रिपेयर`) without clipped ascenders/descenders.
4. [x] Dynamic UPI QR code (`upi://pay?pa=...`) readable by PhonePe, Google Pay, and Paytm within 1 second.
5. [x] 20 consecutive prints without buffer drops or BLE timeouts.
6. [x] Reconnect automatically after printer sleeps or power cycles.
