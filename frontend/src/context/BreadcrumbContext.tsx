"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbContextType {
  items: BreadcrumbItem[] | null;
  setItems: (items: BreadcrumbItem[] | null) => void;
}

interface BreadcrumbState {
  items: BreadcrumbItem[] | null;
  pathname: string;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<BreadcrumbState>({ items: null, pathname });

  const setItems = useCallback((items: BreadcrumbItem[] | null) => {
    setState({ items, pathname });
  }, [pathname]);

  const scopedItems = state.pathname === pathname ? state.items : null;

  return (
    <BreadcrumbContext.Provider value={{ items: scopedItems, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  }
  return context;
}
