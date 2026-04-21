'use client';

import React, { ReactNode, useEffect } from 'react';
import { useThemeStore } from '@/lib/themeStore';

export function ThemeProvider({ 
  children, 
}: { 
  children: ReactNode; 
}) {
  const { theme, setTheme, resolvedTheme, initializeTheme } = useThemeStore();

  // Initialize theme on first mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Handle theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    }
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        useThemeStore.getState().setTheme('system');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, resolvedTheme]);

  return <>{children}</>;
}

export function useTheme() {
  return useThemeStore();
}