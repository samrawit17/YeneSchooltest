'use client';

import { useUIStore } from '@/lib/uiStore';

export function SidebarToggle() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <button
      onClick={toggleSidebar}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      title="Toggle sidebar"
    >
      {isSidebarCollapsed ? (
        <span className="material-icons">menu_open</span>
      ) : (
        <span className="material-icons">menu</span>
      )}
    </button>
  );
}