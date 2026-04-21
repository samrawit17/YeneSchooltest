import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  
  // Modal states
  isModalOpen: Record<string, boolean>
  openModal: (modalId: string) => void
  closeModal: (modalId: string) => void
  toggleModal: (modalId: string) => void
  
  // Notification/Toast state
  notificationCount: number
  incrementNotificationCount: () => void
  decrementNotificationCount: () => void
  resetNotificationCount: () => void
  
  // Loading states
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
  
  // Preferences (non-theme)
  compactMode: boolean
  setCompactMode: (compact: boolean) => void
  
  // Initialize from persistence
  initializeUIState: () => void
}

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('sidebarCollapsed')
  return stored === 'true'
}

const getInitialCompactMode = (): boolean => {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('compactMode')
  return stored === 'true'
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar state
      isSidebarCollapsed: getInitialSidebarState(),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      
      // Modal states
      isModalOpen: {},
      openModal: (modalId: string) => set((state) => ({
        isModalOpen: {
          ...state.isModalOpen,
          [modalId]: true
        }
      })),
      closeModal: (modalId: string) => set((state) => ({
        isModalOpen: {
          ...state.isModalOpen,
          [modalId]: false
        }
      })),
      toggleModal: (modalId: string) => set((state) => ({
        isModalOpen: {
          ...state.isModalOpen,
          [modalId]: !state.isModalOpen[modalId] || false
        }
      })),
      
      // Notification state
      notificationCount: 0,
      incrementNotificationCount: () => set((state) => ({
        notificationCount: state.notificationCount + 1
      })),
      decrementNotificationCount: () => set((state) => ({
        notificationCount: Math.max(0, state.notificationCount - 1)
      })),
      resetNotificationCount: () => set({ notificationCount: 0 }),
      
      // Loading states
      globalLoading: false,
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),
      
      // Preferences
      compactMode: getInitialCompactMode(),
      setCompactMode: (compact: boolean) => {
        set({ compactMode: compact })
        // Apply to document for CSS styling
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          if (compact) {
            root.classList.add('compact')
          } else {
            root.classList.remove('compact')
          }
        }
      },
      
      // Initialize UI state from persistence
      initializeUIState: () => {
        if (typeof window === 'undefined') return
        
        // Initialize sidebar
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
        set({ isSidebarCollapsed: sidebarCollapsed })
        
        // Initialize compact mode
        const compactMode = localStorage.getItem('compactMode') === 'true'
        set({ compactMode: compactMode })
        
        // Apply compact mode class
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          if (compactMode) {
            root.classList.add('compact')
          } else {
            root.classList.remove('compact')
          }
        }
      }
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist specific parts of the state
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        compactMode: state.compactMode
      })
    }
  )
)