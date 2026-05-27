import type { Metadata, Viewport } from "next";
import { Lexend_Deca, Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ToastProvider";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { AcademicYearProvider } from "@/context/AcademicYearContext";
import PushNotificationManager from "@/components/PushNotificationManager";

const lexend = Lexend_Deca({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
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
    <html lang="en" suppressHydrationWarning className={`${lexend.variable} ${cairo.variable}`}>
      <body
        className={lexend.className}
        style={
          {
            "--font-sans": 'var(--font-lexend), "Lexend Deca", "Segoe UI", system-ui, sans-serif',
            "--font-ethiopic":
              '"Noto Sans Ethiopic", "Abyssinica SIL", "Nyala", "Ebrima", sans-serif',
            "--font-arabic":
              'var(--font-cairo), "Cairo", "Noto Naskh Arabic", "Amiri", sans-serif',
          } as React.CSSProperties
        }
      >
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var parseUserId = function(rawUser) {
                  if (!rawUser) return null;
                  try {
                    var parsedUser = JSON.parse(rawUser);
                    return parsedUser && parsedUser.id ? parsedUser.id : null;
                  } catch (e) {
                    return null;
                  }
                };

                var userId = parseUserId(localStorage.getItem('user')) || parseUserId(sessionStorage.getItem('user'));
                var key = userId ? 'theme-storage:' + userId : 'theme-storage';
                var stored = userId ? localStorage.getItem(key) : localStorage.getItem('theme-storage');
                if (stored) {
                  var parsed = JSON.parse(stored);
                  var t = parsed.theme || (parsed.state && parsed.state.theme);
                  if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
