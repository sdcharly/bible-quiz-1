import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/contexts/UserContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MaintenanceCheck } from "@/components/maintenance-check";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { WebVitalsReporter } from "./web-vitals";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scrolls of Wisdom - Biblical Knowledge Quest",
  description:
    "Embark on a divine journey through scripture with AI-powered wisdom quests. A sacred platform for guides and disciples to explore biblical knowledge and strengthen faith through engaging assessments.",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <MaintenanceCheck />
            <SiteHeader />
            {children}
            <SiteFooter />
            <WebVitalsReporter />
            <SpeedInsights />
            <Analytics />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
