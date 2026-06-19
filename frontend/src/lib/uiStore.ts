import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  isModalOpen: Record<string, boolean>;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;

  notificationCount: number;
  incrementNotificationCount: () => void;
  decrementNotificationCount: () => void;
  resetNotificationCount: () => void;

  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
}

const applyCompactMode = (compact: boolean): void => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.toggle('compact', compact);
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        isSidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
        toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

        isModalOpen: {},
        openModal: (modalId) =>
          set((state) => ({
            isModalOpen: { ...state.isModalOpen, [modalId]: true },
          })),
        closeModal: (modalId) =>
          set((state) => ({
            isModalOpen: { ...state.isModalOpen, [modalId]: false },
          })),
        toggleModal: (modalId) =>
          set((state) => ({
            isModalOpen: {
              ...state.isModalOpen,
              [modalId]: !state.isModalOpen[modalId],
            },
          })),

        notificationCount: 0,
        incrementNotificationCount: () =>
          set((state) => ({ notificationCount: state.notificationCount + 1 })),
        decrementNotificationCount: () =>
          set((state) => ({
            notificationCount: Math.max(0, state.notificationCount - 1),
          })),
        resetNotificationCount: () => set({ notificationCount: 0 }),

        globalLoading: false,
        setGlobalLoading: (loading) => set({ globalLoading: loading }),

        compactMode: false,
        setCompactMode: (compact) => {
          set({ compactMode: compact });
          applyCompactMode(compact);
        },
      }),
      {
        name: 'ui-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          isSidebarCollapsed: state.isSidebarCollapsed,
          compactMode: state.compactMode,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.compactMode) {
            applyCompactMode(true);
          }
        },
      },
    ),
    { name: 'ui-store' },
  ),
);
