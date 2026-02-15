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
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-ayurvedic-neem/10 rounded-full blur-3xl" />

                <div className="relative z-10 text-center space-y-8 px-12">
                    <div className="text-8xl">🦅</div>
                    <h1 className="text-5xl font-bold">
                        <span className="text-brand-400">Falcon</span>
                        <span className="text-white"> Super Gold</span>
                    </h1>
                    <p className="text-xl text-dark-500">Enterprise Resource Planning</p>

                    <div className="grid grid-cols-2 gap-4 mt-12 max-w-md mx-auto">
                        {[
                            { label: 'Inventory', value: 'Real-time Tracking' },
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
                    <div className="lg:hidden text-center space-y-2">
                        <div className="text-5xl">🦅</div>
                        <h1 className="text-2xl font-bold text-brand-400">Falcon Super Gold</h1>
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
                        Falcon Super Gold ERP v1.0 • Powered by Falcon Herbs
                    </p>
                </div>
            </div>
        </div>
    )
}