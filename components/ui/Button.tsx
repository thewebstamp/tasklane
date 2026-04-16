'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    fullWidth?: boolean
}

const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
}

const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            fullWidth = false,
            disabled,
            className,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={clsx(
                    variantClasses[variant],
                    sizeClasses[size],
                    fullWidth && 'w-full',
                    className
                )}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'

export default Button