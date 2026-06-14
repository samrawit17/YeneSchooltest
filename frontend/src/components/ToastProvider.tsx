"use client";

import { Toaster } from 'sonner';
import { useThemeStore } from '@/lib/themeStore';

export function ToastProvider() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div>
      <Toaster
        position="top-right"
        closeButton
        theme={isDark ? 'dark' : 'light'}
        expand
        visibleToasts={4}
        toastOptions={{
          closeButton: true,
          closeButtonAriaLabel: 'Close notification',
          duration: 4000,
          style: {
            background: isDark ? '#1A1A1A' : '#ffffff',
            color: isDark ? '#F2F2F2' : '#0f172a',
            width: 'auto',
            minWidth: '360px',
            maxWidth: 'min(92vw, 640px)',
            borderRadius: '12px',
            padding: '16px 48px 16px 16px',
            boxShadow: isDark ? '0 10px 40px rgba(0, 0, 0, 0.5)' : '0 10px 40px rgba(15, 23, 42, 0.18)',
            border: isDark ? '1px solid #2A2A2A' : '1px solid #e2e8f0',
            zIndex: 99999,
          },
        }}
        className="sonner-toaster"
      />
      <style jsx global>{`
        .sonner-toaster [data-type="success"] {
          border-left: 4px solid hsl(var(--primary)) !important;
        }
        .sonner-toaster [data-type="error"] {
          border-left: 4px solid hsl(var(--primary)) !important;
        }
        .sonner-toaster [data-type="info"] {
          border-left: 4px solid hsl(var(--primary)) !important;
        }
        .sonner-toaster [data-type="warning"] {
          border-left: 4px solid hsl(var(--primary)) !important;
        }
        .sonner-toaster [data-sonner-toast] {
          width: auto !important;
          min-width: 360px !important;
          max-width: min(92vw, 640px) !important;
          opacity: 1 !important;
          z-index: 99999 !important;
        }
        .sonner-toaster [data-content] {
          width: auto !important;
          max-width: calc(min(92vw, 640px) - 96px) !important;
          opacity: 1 !important;
          display: flex !important;
        }
        .sonner-toaster [data-title] {
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .sonner-toaster [data-description] {
          white-space: normal !important;
          opacity: 1 !important;
        }
        .sonner-toaster [data-button],
        .sonner-toaster [data-action] {
          background: #e35336 !important;
          color: #ffffff !important;
          border-radius: 8px !important;
          border: 1px solid #e35336 !important;
          font-weight: 600 !important;
        }
        .sonner-toaster [data-cancel] {
          border-radius: 8px !important;
          font-weight: 600 !important;
        }
        .sonner-toaster [data-close-button] {
          border-radius: 9999px !important;
          width: 28px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          left: auto !important;
          right: 10px !important;
          top: 10px !important;
          transform: none !important;
          transition: all 0.2s ease !important;
        }
        .sonner-toaster [data-close-button]:hover {
          transform: scale(1.05) !important;
        }
        .sonner-toaster [data-close-button] svg {
          width: 14px !important;
          height: 14px !important;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .sonner-toast {
          animation: slideIn 0.3s ease-out !important;
        }
      `}</style>
    </div>
  );
}
