import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-dark-500">{label}</label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full bg-dark-100 border rounded-lg px-3 py-2 text-white text-sm',
                            'placeholder:text-dark-500',
                            'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
                            'transition-all duration-200',
                            icon && 'pl-10',
                            error ? 'border-red-500/50' : 'border-dark-300',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
        )
    }
)
Input.displayName = 'Input'

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && <label className="text-sm font-medium text-dark-500">{label}</label>}
                <textarea
                    ref={ref}
                    className={cn(
                        'w-full bg-dark-100 border rounded-lg px-3 py-2 text-white text-sm',
                        'placeholder:text-dark-500 resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
                        'transition-all duration-200',
                        error ? 'border-red-500/50' : 'border-dark-300',
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
        )
    }
)
Textarea.displayName = 'Textarea'

// Select variant
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
    placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, placeholder, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && <label className="text-sm font-medium text-dark-500">{label}</label>}
                <select
                    ref={ref}
                    className={cn(
                        'w-full bg-dark-100 border rounded-lg px-3 py-2 text-white text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
                        'transition-all duration-200 appearance-none cursor-pointer',
                        error ? 'border-red-500/50' : 'border-dark-300',
                        className
                    )}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
        )
    }
)
Select.displayName = 'Select'