import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Plus Jakarta Sans has no Devanagari glyphs; the browser falls back to this font per character.
const fontDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FixPro",
  description: "Repair shop management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDeva.variable}`}>
      <body className="flex min-h-screen justify-center bg-neutral-100 font-sans">
        <div className="pt-safe pb-safe relative flex min-h-screen w-full max-w-md flex-col bg-white shadow-xl">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
