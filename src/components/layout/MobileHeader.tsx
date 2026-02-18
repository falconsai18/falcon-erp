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
                onClick={onMenuClick}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                aria-label="Open menu"
            >
                <Menu size={24} className="text-gray-700 dark:text-gray-200" />
            </button>

            {/* Center - Logo/Brand */}
            <div className="flex items-center gap-2">
                {/* FAL Oval Logo - Mobile Header */}
                <svg width="42" height="28" viewBox="0 0 120 80" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="falFlameMobileHeader" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#dc2626">
                                <animate attributeName="stop-color" values="#dc2626;#ea580c;#16a34a;#dc2626" dur="3s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="50%" stopColor="#ea580c">
                                <animate attributeName="stop-color" values="#ea580c;#16a34a;#dc2626;#ea580c" dur="3s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="100%" stopColor="#16a34a">
                                <animate attributeName="stop-color" values="#16a34a;#dc2626;#ea580c;#16a34a" dur="3s" repeatCount="indefinite" />
                            </stop>
                        </linearGradient>
                        <linearGradient id="ovalGradMobileHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#16a34a" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <filter id="falGlowMobileHeader" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                    <ellipse cx="60" cy="38" rx="57" ry="34" fill="none" stroke="url(#ovalGradMobileHeader)" strokeWidth="2.5" filter="url(#falGlowMobileHeader)"/>
                    <ellipse cx="60" cy="38" rx="49" ry="27" fill="none" stroke="#16a34a" strokeWidth="0.8" opacity="0.3"/>
                    <path d="M60,10 C65,17 71,26 69,35 C67,43 63,49 60,51 C57,49 53,43 51,35 C49,26 55,17 60,10 Z" fill="url(#falFlameMobileHeader)" opacity="0.9"/>
                    <text x="60" y="41" textAnchor="middle" fill="#ea580c" fontSize="17" fontWeight="900" fontFamily="system-ui" filter="url(#falGlowMobileHeader)" letterSpacing="1">FAL</text>
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
