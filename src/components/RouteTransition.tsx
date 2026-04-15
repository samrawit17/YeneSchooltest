"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Route change started
    setIsNavigating(true);
    
    // Route change completed - use a small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gray-200 dark:bg-slate-700 overflow-hidden">
      <div className="h-full bg-blue-600 dark:bg-blue-400 animate-route-transition" />
      <style jsx>{`
        @keyframes route-transition {
          0% {
            width: 0%;
            margin-left: 0;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 100%;
            margin-left: 0;
          }
        }
        .animate-route-transition {
          animation: route-transition 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
