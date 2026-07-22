import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'survey' | 'nitrate'

const STORAGE_KEY = 'uchronia-theme'

function readInitial(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'survey' || stored === 'nitrate') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'nitrate' : 'survey'
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme === 'nitrate' ? 'dark' : 'light'
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'survey',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    apply(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'survey' ? 'nitrate' : 'survey'))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
