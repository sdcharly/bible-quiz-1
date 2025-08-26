import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/contexts/UserContext";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MaintenanceCheck } from "@/components/maintenance-check";
import "./globals.css";
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
  manifest: '/manifest.json',
  openGraph: {
    title: 'Scrolls of Wisdom - Biblical Knowledge Quest',
    description: 'Embark on a divine journey through scripture with AI-powered wisdom quests.',
    type: 'website',
    locale: 'en_US',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f59e0b' },
    { media: '(prefers-color-scheme: dark)', color: '#d97706' },
  ],
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
