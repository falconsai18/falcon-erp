import { useAuthStore } from '@/features/auth/store/authStore'
import { Menu, Bell } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface MobileHeaderProps {
    onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    const { user } = useAuthStore()

    return (
        <header className="lg:hidden h-16 border-b border-gray-200 dark:border-dark-300/50 bg-white dark:bg-dark-50 flex items-center justify-between px-4 sticky top-0 z-30">
            {/* Left - Hamburger Menu */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMenuClick(); }}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                aria-label="Open menu"
            >
                <Menu size={24} className="text-gray-700 dark:text-gray-200 pointer-events-none" />
            </button>

            {/* Center - Logo/Brand */}
            <div className="flex items-center gap-2">
                {/* TAL Logo */}
                <img src="/logo.svg" alt="TAL Logo" className="h-10 w-auto flex-shrink-0" />
                <span className="font-bold text-gray-900 dark:text-white text-lg">FALCON</span>
            </div>

            {/* Right - Notifications & Avatar */}
            <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-sm font-bold">
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
            </div>
        </header>
    )
}
