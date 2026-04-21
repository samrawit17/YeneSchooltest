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
        const stored = localStorage.getItem('theme') as Theme | null
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          set({ theme: stored })
          const resolved = stored === 'system' ? getSystemTheme() : stored
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