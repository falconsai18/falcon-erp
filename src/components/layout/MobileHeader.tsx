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
                {/* TAL Sacred Geometry Logo - Mobile Header */}
                <svg width="40" height="40" viewBox="0 0 200 200" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="holoHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff0080"/>
                            <stop offset="25%" stopColor="#00ffff"/>
                            <stop offset="50%" stopColor="#ffff00"/>
                            <stop offset="75%" stopColor="#ff00ff"/>
                            <stop offset="100%" stopColor="#00ff88"/>
                        </linearGradient>
                        <linearGradient id="chromeHeader" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#e0e0e0"/>
                            <stop offset="50%" stopColor="#ffffff"/>
                            <stop offset="100%" stopColor="#a0a0a0"/>
                        </linearGradient>
                        <linearGradient id="goldHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffd700"/>
                            <stop offset="50%" stopColor="#ffec8b"/>
                            <stop offset="100%" stopColor="#daa520"/>
                        </linearGradient>
                    </defs>
                    <rect width="200" height="200" fill="#0a0a0f" rx="20"/>
                    <g transform="translate(100, 100)">
                        <path d="M0 -70 L60 -35 L60 35 L0 70 L-60 35 L-60 -35 Z" fill="none" stroke="url(#holoHeader)" strokeWidth="1" opacity="0.5"/>
                        <ellipse cx="0" cy="0" rx="65" ry="45" fill="none" stroke="url(#chromeHeader)" strokeWidth="2"/>
                        <ellipse cx="0" cy="0" rx="62" ry="42" fill="none" stroke="url(#holoHeader)" strokeWidth="1" strokeDasharray="5,3" opacity="0.8"/>
                        <ellipse cx="0" cy="-25" rx="18" ry="28" fill="none" stroke="url(#goldHeader)" strokeWidth="1.5" opacity="0.9"/>
                        <ellipse cx="-35" cy="-15" rx="15" ry="22" fill="none" stroke="url(#goldHeader)" strokeWidth="1" opacity="0.7"/>
                        <ellipse cx="35" cy="-15" rx="15" ry="22" fill="none" stroke="url(#goldHeader)" strokeWidth="1" opacity="0.7"/>
                        <circle cx="0" cy="-25" r="1.5" fill="#ffd700"/>
                        <circle cx="-35" cy="-15" r="1" fill="#ffd700"/>
                        <circle cx="35" cy="-15" r="1" fill="#ffd700"/>
                        <text x="0" y="8" fontFamily="Arial Black, sans-serif" fontSize="32" fill="url(#chromeHeader)" textAnchor="middle" letterSpacing="4">TAL</text>
                        <line x1="-35" y1="18" x2="35" y2="18" stroke="url(#holoHeader)" strokeWidth="1.5"/>
                    </g>
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
