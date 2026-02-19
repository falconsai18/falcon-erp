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

// FAL Oval Logo Component — Faithful recreation of FAL letterhead (Since 1989)
function FalconLogo({ size = 160 }: { size?: number }) {
    const h = Math.round(size * (500 / 400))
    return (
        <svg width={size} height={h} viewBox="0 0 400 500" className="mx-auto" style={{overflow:'visible', pointerEvents:'none'}}>
            <defs>
                <linearGradient id="holo1Login" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#ff0080'}}/>
                    <stop offset="25%" style={{stopColor:'#00ffff'}}/>
                    <stop offset="50%" style={{stopColor:'#ffff00'}}/>
                    <stop offset="75%" style={{stopColor:'#ff00ff'}}/>
                    <stop offset="100%" style={{stopColor:'#00ff88'}}/>
                </linearGradient>
                <linearGradient id="chromeLogin" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#c0c0c0'}}/>
                    <stop offset="50%" style={{stopColor:'#ffffff'}}/>
                    <stop offset="100%" style={{stopColor:'#808080'}}/>
                </linearGradient>
                <linearGradient id="goldLeafLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#ffd700'}}/>
                    <stop offset="50%" style={{stopColor:'#ffec8b'}}/>
                    <stop offset="100%" style={{stopColor:'#daa520'}}/>
                </linearGradient>
                <filter id="glow2Login">
                    <feGaussianBlur stdDeviation="4"/>
                    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>

            {/* Sacred geometry background lines */}
            <g opacity="0.15" stroke="#ff00ff" strokeWidth="0.3" fill="none">
                <path d="M200 50 L100 150 L100 300 L200 400 L300 300 L300 150 Z" stroke="#00ffff"/>
                <path d="M200 80 L120 160 L120 290 L200 370 L280 290 L280 160 Z" stroke="#ff00ff"/>
                <path d="M200 110 L140 170 L140 280 L200 340 L260 280 L260 170 Z" stroke="#ffff00"/>
            </g>

            <g transform="translate(200, 220)">
                {/* Holographic hexagons */}
                <g stroke="url(#holo1Login)" strokeWidth="2" fill="none" filter="url(#glow2Login)">
                    <path d="M0 -110 L30 -95 L30 -65 L0 -50 L-30 -65 L-30 -95 Z"/>
                    <path d="M0 -85 L15 -75 L15 -55 L0 -45 L-15 -55 L-15 -75 Z"/>
                    <path d="M0 -60 L10 -55 L10 -40 L0 -35 L-10 -40 L-10 -55 Z"/>
                    <circle cx="0" cy="0" r="130" strokeDasharray="5,5" opacity="0.6"/>
                    <circle cx="0" cy="0" r="125" strokeDasharray="3,7" opacity="0.4"/>
                </g>

                {/* Gold leaf ornaments */}
                <g>
                    <ellipse cx="-70" cy="-30" rx="35" ry="50" fill="none" stroke="url(#goldLeafLogin)" strokeWidth="1.5" opacity="0.8"/>
                    <path d="M-70 -10 L-70 -70" stroke="url(#goldLeafLogin)" strokeWidth="1"/>
                    <path d="M-70 -30 L-90 -45 M-70 -40 L-50 -55" stroke="url(#goldLeafLogin)" strokeWidth="0.8" opacity="0.6"/>
                    <circle cx="-70" cy="-30" r="2" fill="#ffd700"/>

                    <ellipse cx="70" cy="-30" rx="35" ry="50" fill="none" stroke="url(#goldLeafLogin)" strokeWidth="1.5" opacity="0.8"/>
                    <path d="M70 -10 L70 -70" stroke="url(#goldLeafLogin)" strokeWidth="1"/>
                    <path d="M70 -30 L50 -45 M70 -40 L90 -55" stroke="url(#goldLeafLogin)" strokeWidth="0.8" opacity="0.6"/>
                    <circle cx="70" cy="-30" r="2" fill="#ffd700"/>

                    <ellipse cx="0" cy="-50" rx="40" ry="60" fill="none" stroke="url(#goldLeafLogin)" strokeWidth="2" opacity="0.9"/>
                    <path d="M0 -20 L0 -100" stroke="url(#goldLeafLogin)" strokeWidth="1.5"/>
                    <path d="M0 -50 L-20 -70 M0 -65 L20 -85" stroke="url(#goldLeafLogin)" strokeWidth="1" opacity="0.7"/>
                    <circle cx="0" cy="-50" r="3" fill="#ffd700"/>
                </g>

                {/* Chrome + holographic oval */}
                <ellipse cx="0" cy="20" rx="135" ry="95" fill="none" stroke="url(#chromeLogin)" strokeWidth="3"/>
                <ellipse cx="0" cy="20" rx="130" ry="90" fill="none" stroke="url(#holo1Login)" strokeWidth="1" strokeDasharray="10,5" opacity="0.7"/>

                {/* Accent dots */}
                <g opacity="0.6">
                    <circle cx="-100" cy="-40" r="2" fill="#00ffff"/>
                    <circle cx="100" cy="-40" r="2" fill="#ff00ff"/>
                    <circle cx="0" cy="-90" r="2" fill="#ffff00"/>
                    <circle cx="-90" cy="60" r="2" fill="#00ff88"/>
                    <circle cx="90" cy="60" r="2" fill="#ff0080"/>
                    <circle cx="-60" cy="80" r="1.5" fill="#00ffff"/>
                    <circle cx="60" cy="80" r="1.5" fill="#ff00ff"/>
                </g>

                {/* TAL text */}
                <text x="0" y="30" fontFamily="Arial Black, sans-serif" fontSize="44" fill="url(#chromeLogin)" textAnchor="middle" letterSpacing="6" filter="url(#glow2Login)">TAL</text>
                <line x1="-55" y1="42" x2="55" y2="42" stroke="url(#holo1Login)" strokeWidth="2"/>
                <text x="0" y="62" fontFamily="Courier New, monospace" fontSize="10" fill="#c0c0c0" textAnchor="middle" letterSpacing="4">EST. 1989</text>
            </g>

            {/* Tagline */}
            <text x="200" y="440" fontFamily="Arial, sans-serif" fontSize="11" fill="#606060" textAnchor="middle" letterSpacing="2">AYURVEDIC PRODUCTS MANAGEMENT</text>
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
