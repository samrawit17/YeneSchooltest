"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { CalendarProvider } from "@/context/CalendarContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import RouteTransition from "@/components/RouteTransition";
import { useAuth } from "@/context/AuthContext";

function SubscriptionWrapper({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <SubscriptionProvider schoolId={user?.schoolId}>
      {children}
    </SubscriptionProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            retry: 1, // Reduce retries for faster failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CalendarProvider>
          <ThemeProvider>
            <RouteTransition />
            <SubscriptionWrapper>
              {children}
            </SubscriptionWrapper>
          </ThemeProvider>
        </CalendarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
