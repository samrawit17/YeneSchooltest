import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  initializeTheme: () => void
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const isClient = typeof window !== 'undefined'

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      
      setTheme: (theme) => {
        set({ theme })
        const resolved = theme === 'system' ? getSystemTheme() : theme
        set({ resolvedTheme: resolved })
        
        if (isClient) {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(resolved)
          
          if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => {
              set({ resolvedTheme: getSystemTheme() })
              const root = window.document.documentElement
              root.classList.remove('light', 'dark')
              root.classList.add(getSystemTheme())
            }
            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
          }
        }
      },
      
      initializeTheme: () => {
        if (!isClient) return
        let storedTheme: Theme | null = null

        try {
          const persisted = localStorage.getItem('theme-storage')
          if (persisted) {
            const parsed = JSON.parse(persisted)
            const persistedTheme = parsed?.state?.theme
            if (persistedTheme && ['light', 'dark', 'system'].includes(persistedTheme)) {
              storedTheme = persistedTheme as Theme
            }
          }
        } catch {
          storedTheme = null
        }

        // Legacy fallback if an older plain `theme` key exists
        if (!storedTheme) {
          const legacyTheme = localStorage.getItem('theme') as Theme | null
          if (legacyTheme && ['light', 'dark', 'system'].includes(legacyTheme)) {
            storedTheme = legacyTheme
          }
        }

        if (storedTheme) {
          set({ theme: storedTheme })
          const resolved = storedTheme === 'system' ? getSystemTheme() : storedTheme
          set({ resolvedTheme: resolved })
          
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(resolved)
        } else {
          set({ theme: 'system' })
          const resolved = getSystemTheme()
          set({ resolvedTheme: resolved })
          
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(resolved)
        }
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => (isClient ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
    }
  )
)
