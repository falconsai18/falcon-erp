import { useAuthStore } from '@/features/auth/store/authStore'
import { Menu, Bell } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface MobileHeaderProps {
    onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    const { user } = useAuthStore()

    return (
        <header className="lg:hidden h-16 border-b border-gray-200 dark:border-dark-300/50 bg-white dark:bg-dark-50 flex items-center justify-between px-4 sticky top-0 z-40">
            {/* Left - Hamburger Menu */}
            <button
                onClick={onMenuClick}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                aria-label="Open menu"
            >
                <Menu size={24} className="text-gray-700 dark:text-gray-200" />
            </button>

            {/* Center - Logo/Brand */}
            <div className="flex items-center gap-2">
                {/* Logo SVG - Small version */}
                <svg width="28" height="28" viewBox="0 0 100 100" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#22c55e">
                                <animate attributeName="stop-color" values="#22c55e;#3b82f6;#8b5cf6;#ef4444;#22c55e" dur="4s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="50%" stopColor="#3b82f6">
                                <animate attributeName="stop-color" values="#3b82f6;#8b5cf6;#ef4444;#22c55e;#3b82f6" dur="4s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="100%" stopColor="#8b5cf6">
                                <animate attributeName="stop-color" values="#8b5cf6;#ef4444;#22c55e;#3b82f6;#8b5cf6" dur="4s" repeatCount="indefinite" />
                            </stop>
                        </linearGradient>
                    </defs>
                    {/* Hexagon frame */}
                    <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="url(#flameGradient)" strokeWidth="2"/>
                    {/* FAL text */}
                    <text x="50" y="58" textAnchor="middle" fill="#3b82f6" fontSize="28" fontWeight="bold" fontFamily="system-ui">FAL</text>
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
