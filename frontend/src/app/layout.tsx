import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FixPro — Repair Shop Management",
  description: "All-in-one management platform for mobile and electronics repair shops.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="min-h-screen bg-neutral-100 flex justify-center font-sans">
        {/* Mobile Viewport Wrapper */}
        <div className="w-full max-w-md min-h-screen bg-white shadow-xl relative flex flex-col pt-safe pb-safe">
          {children}
        </div>
      </body>
    </html>
  );
}
