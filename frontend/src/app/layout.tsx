import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import ContentWrapper from "@/components/ContentWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "AthletiX Market — AI Nutrition & Expert Marketplace",
  description: "Get AI-powered meal plans and hire top nutritionists & fitness coaches. The future of health, powered by intelligence.",
  icons: {
    icon: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("athletix-locale")?.value;
  const initialLocale = savedLocale === "ar" ? "ar" : "en";

  return (
    <html lang={initialLocale} className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col relative font-sans" suppressHydrationWarning>
        {/* Background image below navbar */}
        <div
          style={{
            position: "fixed",
            top: "96px",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            backgroundImage: "url(/bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />

        <LocaleProvider initialLocale={initialLocale}>
          <NavbarWrapper />
          <ContentWrapper>{children}</ContentWrapper>
          <FooterWrapper />
        </LocaleProvider>
      </body>
    </html>
  );
}
