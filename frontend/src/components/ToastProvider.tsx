"use client";

import { Toaster } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export function ToastProvider() {
  return (
    <div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: 'none',
          },
          icons: {
            success: <CheckCircle className="w-5 h-5 text-green-400" />,
            error: <XCircle className="w-5 h-5 text-red-400" />,
            info: <Info className="w-5 h-5 text-blue-400" />,
            warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          },
        }}
        className="sonner-toaster"
      />
      <style jsx global>{`
        .sonner-toaster [data-type="success"] {
          border-left: 4px solid #22c55e !important;
          background: #14532d !important;
        }
        .sonner-toaster [data-type="error"] {
          border-left: 4px solid #ef4444 !important;
          background: #7f1d1d !important;
        }
        .sonner-toaster [data-type="info"] {
          border-left: 4px solid #3b82f6 !important;
          background: #1e3a5f !important;
        }
        .sonner-toaster [data-type="warning"] {
          border-left: 4px solid #eab308 !important;
          background: #713f12 !important;
        }
        .sonner-toaster [data-close-button] {
          background: rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          width: 28px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        .sonner-toaster [data-close-button]:hover {
          background: rgba(255,255,255,0.2) !important;
          transform: scale(1.05) !important;
        }
        .sonner-toaster [data-close-button] svg {
          color: #94a3b8 !important;
          width: 14px !important;
          height: 14px !important;
        }
        .sonner-toaster [data-close-button]:hover svg {
          color: #fff !important;
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