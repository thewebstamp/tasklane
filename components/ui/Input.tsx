'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
    leading?: React.ReactNode
    trailing?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leading, trailing, className, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                        {props.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                )}

                <div className="relative">
                    {leading && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            {leading}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        className={clsx(
                            'input',
                            leading && 'pl-10',
                            trailing && 'pr-10',
                            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
                            className
                        )}
                        {...props}
                    />

                    {trailing && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {trailing}
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}
                {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input