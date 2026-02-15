import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, icon, children, disabled, ...props }, ref) => {
        const variants = {
            primary: 'bg-brand-500 hover:bg-brand-600 text-black font-semibold',
            secondary: 'bg-dark-200 hover:bg-dark-300 text-white border border-dark-300',
            ghost: 'hover:bg-dark-200 text-dark-500 hover:text-white',
            danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
            success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        }

        const sizes = {
            sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
            md: 'px-4 py-2 text-sm rounded-lg gap-2',
            lg: 'px-6 py-3 text-base rounded-xl gap-2',
        }

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
                {children}
            </button>
        )
    }
)
Button.displayName = 'Button'