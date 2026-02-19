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
                <svg width="44" height="40" viewBox="0 0 120 110" className="flex-shrink-0" style={{overflow:'visible', pointerEvents:'none'}}>
                    <ellipse cx="60" cy="48" rx="52" ry="34" fill="white" stroke="#3a7d2c" strokeWidth="2.8"/>
                    <path d="M57,66 C53,54 47,38 42,18" fill="none" stroke="#3a7d2c" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M59,66 C57,53 57,37 58,16" fill="none" stroke="#e8dfc0" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M61,66 C63,53 68,38 74,19" fill="none" stroke="#cc2222" strokeWidth="6" strokeLinecap="round"/>
                    <line x1="59" y1="60" x2="59" y2="72" stroke="#2d6e1e" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="53" y1="65" x2="65" y2="65" stroke="#2d6e1e" strokeWidth="2" strokeLinecap="round"/>
                    <text x="72" y="75" textAnchor="middle" fill="#2d6e1e" fontSize="20" fontWeight="900" fontStyle="italic" fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="1">FAL</text>
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
