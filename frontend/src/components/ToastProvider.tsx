"use client";

import { Toaster } from 'sonner';
export function ToastProvider() {
  return (
    <div>
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          closeButton: true,
          closeButtonAriaLabel: 'Close notification',
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            width: 'auto',
            minWidth: '360px',
            maxWidth: 'min(92vw, 640px)',
            borderRadius: '12px',
            padding: '16px 48px 16px 16px',
            boxShadow: '0 10px 40px rgba(15, 23, 42, 0.18)',
            border: '1px solid hsl(var(--border))',
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
        }
        .sonner-toaster [data-content] {
          width: max-content !important;
          max-width: calc(min(92vw, 640px) - 96px) !important;
        }
        .sonner-toaster [data-description] {
          white-space: normal !important;
        }
        .sonner-toaster [data-button],
        .sonner-toaster [data-action] {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-radius: 8px !important;
          border: 1px solid hsl(var(--primary)) !important;
        }
        .sonner-toaster [data-cancel] {
          background: hsl(var(--secondary)) !important;
          color: hsl(var(--secondary-foreground)) !important;
          border-radius: 8px !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        .sonner-toaster [data-close-button] {
          background: hsl(var(--secondary)) !important;
          color: hsl(var(--secondary-foreground)) !important;
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
          background: hsl(var(--accent)) !important;
          transform: scale(1.05) !important;
        }
        .sonner-toaster [data-close-button] svg {
          color: hsl(var(--muted-foreground)) !important;
          width: 14px !important;
          height: 14px !important;
        }
        .sonner-toaster [data-close-button]:hover svg {
          color: hsl(var(--foreground)) !important;
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
