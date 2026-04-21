'use client';

import { useUIStore } from '@/lib/uiStore';
import { SidebarToggle } from '@/components/SidebarToggle';

export function LayoutWithUI({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed, compactMode } = useUIStore();

  return (
    <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-900 ${compactMode ? 'compact' : ''}`}>
      {/* Sidebar Toggle Button (for mobile) */}
      <div className="lg:hidden fixed top-4 left-4 z-50 p-2">
        <SidebarToggle />
      </div>
      
      {/* Main Content */}
      <div className={`flex-1 overflow-hidden ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                School Management System
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* User menu would go here */}
              <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <span className="material-icons">account_circle</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
      
      {/* Sidebar (collapsible) */}
      <aside className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r shadow-lg transform transition-transform duration-300 ease-in-out ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'} z-40`}>
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="material-icons text-white">school</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">EduPortal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">School Management</p>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="material-icons">dashboard</span>
              <span className="text-gray-700 dark:text-gray-200">Dashboard</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="material-icons">people</span>
              <span className="text-gray-700 dark:text-gray-200">Students</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="material-icons">school</span>
              <span className="text-gray-700 dark:text-gray-200">Classes</span>
            </a>
          </nav>
        </div>
      </aside>
    </div>
  );
}