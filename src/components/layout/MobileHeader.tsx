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
                {/* FAL Oval Logo - Mobile Header */}
                <svg width="44" height="40" viewBox="0 0 130 120" className="flex-shrink-0" style={{overflow:'visible', pointerEvents:'none'}}>
                    <path d="M48,76 C44,62 38,46 40,28 C42,16 50,6 54,2 C58,10 60,22 58,38 C56,54 52,66 50,76 Z" fill="#2d7a2d"/>
                    <path d="M54,76 C52,62 50,46 54,28 C57,16 64,6 66,2 C70,10 70,24 68,38 C66,54 60,66 56,76 Z" fill="#7ab648"/>
                    <path d="M60,76 C60,64 62,48 68,32 C71,20 76,10 78,6 C82,14 82,28 78,42 C74,56 66,68 62,76 Z" fill="#cc2222"/>
                    <ellipse cx="62" cy="88" rx="54" ry="28" fill="white" stroke="#8dc63f" strokeWidth="3"/>
                    <text x="62" y="100" textAnchor="middle" fill="#2d6e1e" fontSize="26" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="3">FAL</text>
                </svg>
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
