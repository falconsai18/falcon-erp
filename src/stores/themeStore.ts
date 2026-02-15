import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
    isDark: boolean
    toggle: () => void
    setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            isDark: true,
            toggle: () =>
                set((state) => {
                    const newDark = !state.isDark
                    if (newDark) {
                        document.documentElement.classList.add('dark')
                    } else {
                        document.documentElement.classList.remove('dark')
                    }
                    return { isDark: newDark }
                }),
            setDark: (dark) =>
                set(() => {
                    if (dark) {
                        document.documentElement.classList.add('dark')
                    } else {
                        document.documentElement.classList.remove('dark')
                    }
                    return { isDark: dark }
                }),
        }),
        { name: 'falcon-theme' }
    )
)
