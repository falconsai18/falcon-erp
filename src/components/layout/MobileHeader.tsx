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
                <svg width="42" height="28" viewBox="0 0 120 80" className="flex-shrink-0" style={{overflow:'hidden', pointerEvents:'none'}}>
                    <defs>
                        <clipPath id="flameClipMobileHeader">
                            <path d="M60,8 C66,16 74,27 72,38 C70,47 65,53 60,55 C55,53 50,47 48,38 C46,27 54,16 60,8 Z"/>
                        </clipPath>
                        <filter id="ovalGlowMobileHeader" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="1" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                    <ellipse cx="60" cy="38" rx="57" ry="34" fill="none" stroke="#16a34a" strokeWidth="2.5" filter="url(#ovalGlowMobileHeader)"/>
                    <ellipse cx="60" cy="38" rx="50" ry="28" fill="none" stroke="#16a34a" strokeWidth="0.7" opacity="0.35"/>
                    <rect x="44" y="8" width="32" height="16" fill="#16a34a" clipPath="url(#flameClipMobileHeader)"/>
                    <rect x="44" y="24" width="32" height="15" fill="#f5f5f5" clipPath="url(#flameClipMobileHeader)"/>
                    <rect x="44" y="39" width="32" height="16" fill="#dc2626" clipPath="url(#flameClipMobileHeader)"/>
                    <text x="60" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="12" fontWeight="900" fontStyle="italic" fontFamily="system-ui" letterSpacing="2">FAL</text>
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
