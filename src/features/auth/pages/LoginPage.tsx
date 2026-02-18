import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, Loader2, Shield, Zap, BarChart3, Package } from 'lucide-react'

const DEMO_USERS = [
    { email: 'admin@falcon.com', password: 'admin123', role: 'Admin', icon: Shield, color: 'text-red-400' },
    { email: 'manager@falcon.com', password: 'manager123', role: 'Manager', icon: Zap, color: 'text-blue-400' },
    { email: 'production@falcon.com', password: 'prod123', role: 'Production', icon: Package, color: 'text-green-400' },
    { email: 'viewer@falcon.com', password: 'viewer123', role: 'Viewer', icon: BarChart3, color: 'text-purple-400' },
]

// FAL Oval Logo Component — Inspired by FAL letterhead (Since 1989)
function FalconLogo({ size = 120 }: { size?: number }) {
    // Maintain aspect ratio: viewBox 120x80, so height = size * (80/120)
    const h = Math.round(size * (80 / 120))
    return (
        <svg width={size} height={h} viewBox="0 0 120 80" className="mx-auto">
            <defs>
                {/* Flame gradient: red(base) → orange(mid) → green(tip) — Ayurvedic colors */}
                <linearGradient id="falFlameLogin" x1="0%" y1="100%" x2="0%" y2="0%">
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
                {/* Green oval border gradient */}
                <linearGradient id="ovalGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#16a34a" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                {/* Glow filter */}
                <filter id="falGlowLogin" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                {/* Flame shadow */}
                <filter id="flameShadowLogin" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#ea580c" floodOpacity="0.4"/>
                </filter>
            </defs>

            {/* Outer oval border — green */}
            <ellipse cx="60" cy="38" rx="57" ry="34"
                fill="none"
                stroke="url(#ovalGradLogin)"
                strokeWidth="2.5"
                filter="url(#falGlowLogin)"
            />
            {/* Inner oval — subtle decorative */}
            <ellipse cx="60" cy="38" rx="49" ry="27"
                fill="none"
                stroke="#16a34a"
                strokeWidth="0.8"
                opacity="0.3"
            />

            {/* Flame / Leaf shape — teardrop upward */}
            <path
                d="M60,10 C65,17 71,26 69,35 C67,43 63,49 60,51 C57,49 53,43 51,35 C49,26 55,17 60,10 Z"
                fill="url(#falFlameLogin)"
                filter="url(#flameShadowLogin)"
                opacity="0.92"
            />
            {/* Inner highlight on flame */}
            <path
                d="M60,16 C63,22 66,29 64,36 C63,40 61,44 60,46 C59,44 57,40 56,36 C54,29 57,22 60,16 Z"
                fill="white"
                opacity="0.13"
            />

            {/* FAL text — bold orange */}
            <text
                x="60" y="41"
                textAnchor="middle"
                fill="#ea580c"
                fontSize="17"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, Arial, sans-serif"
                filter="url(#falGlowLogin)"
                letterSpacing="1"
            >FAL</text>

            {/* Since 1989 — below oval */}
            <text
                x="60" y="70"
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="6.5"
                fontFamily="system-ui, -apple-system, Arial, sans-serif"
                letterSpacing="0.5"
            >Since 1989</text>
        </svg>
    )
}

export function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { login } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        console.log('Attempting login with:', email)
        const result = await login(email, password)
        console.log('Login result:', result)

        if (result.success) {
            navigate('/', { replace: true })
        } else {
            setError(result.error || 'Login failed')
        }
        setIsSubmitting(false)
    }

    const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail)
        setPassword(demoPassword)
        setError('')
        setIsSubmitting(true)

        const result = await login(demoEmail, demoPassword)

        if (result.success) {
            navigate('/', { replace: true })
        } else {
            setError(result.error || 'Demo login failed')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-dark flex">
            {/* Left - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dark via-dark-50 to-dark relative overflow-hidden items-center justify-center">
                {/* Background glow */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-success-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-premium-500/5 rounded-full blur-3xl" />

                <div className="relative z-10 text-center space-y-8 px-12">
                    <FalconLogo size={140} />
                    <h1 className="text-5xl font-bold">
                        <span className="text-brand-400">FALCON</span>
                        <span className="text-white"> ERP</span>
                    </h1>
                    <p className="text-xl text-dark-500">Ayurvedic Products Management</p>
                    <p className="text-sm text-dark-600">Since 1989</p>

                    <div className="grid grid-cols-2 gap-4 mt-12 max-w-md mx-auto">
                        {[
                            { label: 'Stock', value: 'Real-time Tracking' },
                            { label: 'Production', value: 'Batch Management' },
                            { label: 'Sales', value: 'Order to Invoice' },
                            { label: 'Analytics', value: 'AI Insights' },
                        ].map((item) => (
                            <div key={item.label} className="glass-card p-4 text-left">
                                <p className="text-brand-400 font-semibold text-sm">{item.label}</p>
                                <p className="text-dark-500 text-xs mt-1">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center space-y-4">
                        <FalconLogo size={100} />
                        <h1 className="text-3xl font-bold">
                            <span className="text-brand-400">FALCON</span>
                            <span className="text-white"> ERP</span>
                        </h1>
                        <p className="text-sm text-dark-600">Since 1989</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-white">Welcome back</h2>
                        <p className="text-dark-500">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-dark-500">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field w-full"
                                placeholder="you@company.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-dark-500">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field w-full pr-10"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Demo Users */}
                    <div className="space-y-3">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dark-300" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-dark px-4 text-dark-500">Quick Demo Access</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {DEMO_USERS.map((demo) => (
                                <button
                                    key={demo.role}
                                    onClick={() => handleDemoLogin(demo.email, demo.password)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-dark-100 border border-dark-300 hover:border-brand-500/50 hover:bg-dark-200 transition-all text-sm disabled:opacity-50"
                                >
                                    <demo.icon size={16} className={demo.color} />
                                    <span className="text-white font-medium">{demo.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-center text-xs text-dark-600">
                        FALCON ERP v2.0 • falconherbs.com
                    </p>
                </div>
            </div>
        </div>
    )
}
