import type { Metadata, Viewport } from "next";
import { Lexend_Deca, Noto_Naskh_Arabic, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ToastProvider";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { AcademicYearProvider } from "@/context/AcademicYearContext";
import PushNotificationManager from "@/components/PushNotificationManager";

const lexendDeca = Lexend_Deca({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ethiopic",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
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
      <body className={`${lexendDeca.variable} ${notoSansEthiopic.variable} ${notoNaskhArabic.variable} ${lexendDeca.className}`}>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var key = 'theme-storage';
                var stored = localStorage.getItem(key);
                if (stored) {
                  var parsed = JSON.parse(stored);
                  var t = parsed.state.theme;
                  if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } else {
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }

                var brandSettingsRaw = localStorage.getItem('sms-brand-settings');
                var userRaw = localStorage.getItem('user');
                if (brandSettingsRaw && userRaw) {
                  var brandSettings = JSON.parse(brandSettingsRaw);
                  var user = JSON.parse(userRaw);
                  var schoolId = user && user.schoolId;
                  var cached = schoolId ? brandSettings[schoolId] : null;
                  var themeColor = cached && cached.themeColor;

                  if (/^#([0-9A-Fa-f]{6})$/.test(themeColor)) {
                    var r = parseInt(themeColor.slice(1, 3), 16);
                    var g = parseInt(themeColor.slice(3, 5), 16);
                    var b = parseInt(themeColor.slice(5, 7), 16);
                    var red = r / 255;
                    var green = g / 255;
                    var blue = b / 255;
                    var max = Math.max(red, green, blue);
                    var min = Math.min(red, green, blue);
                    var h = 0;
                    var s = 0;
                    var l = (max + min) / 2;

                    if (max !== min) {
                      var d = max - min;
                      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                      switch (max) {
                        case red:
                          h = ((green - blue) / d + (green < blue ? 6 : 0)) / 6;
                          break;
                        case green:
                          h = ((blue - red) / d + 2) / 6;
                          break;
                        default:
                          h = ((red - green) / d + 4) / 6;
                          break;
                      }
                    }

                    document.documentElement.style.setProperty('--brand-color', themeColor);
                    document.documentElement.style.setProperty('--brand-color-rgb', r + ', ' + g + ', ' + b);
                    document.documentElement.style.setProperty('--primary', Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%');
                    document.documentElement.style.setProperty('--ring', Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%');
                  }
                }
              } catch(e) {}
            })();
          `
        }} />
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
