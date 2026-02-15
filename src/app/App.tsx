import { useEffect } from 'react'
import { Providers } from './Providers'
import { AppRouter } from './Router'
import { useThemeStore } from '@/stores/themeStore'

export function App() {
    const { isDark } = useThemeStore()

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    return (
        <Providers>
            <AppRouter />
        </Providers>
    )
}
