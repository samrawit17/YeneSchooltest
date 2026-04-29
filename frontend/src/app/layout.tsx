import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ToastProvider";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { AcademicYearProvider } from "@/context/AcademicYearContext";
import PushNotificationManager from "@/components/PushNotificationManager";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

// Force dynamic rendering to avoid static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "SMS Portal - School Management System",
  description: "A comprehensive school management system",
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ToastProvider />
          <PushNotificationManager />
          <AcademicYearProvider>
            <BreadcrumbProvider>
              {children}
            </BreadcrumbProvider>
          </AcademicYearProvider>
        </Providers>
      </body>
    </html>
  );
}
