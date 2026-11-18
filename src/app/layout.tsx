import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { BottomNav } from "@/components/customer/BottomNav";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["600", "800"] });
const body = Nunito_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Gohyou",
  description: "Pesan gohyong, lacak antreanmu.",
  icons: {
    icon: "/images/logo-gohyong.jpeg",
    shortcut: "/images/logo-gohyong.jpeg",
    apple: "/images/logo-gohyong.jpeg",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FBF9F4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body><SiteHeader />
        <div className="mx-auto min-h-dvh max-w-5xl pb-20 md:pb-8">{children}</div>
        <BottomNav /></body>
    </html>
  );
}
