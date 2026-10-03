import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = { variable: "font-sans-var" };
const fontDeva = { variable: "font-deva-var" };

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
