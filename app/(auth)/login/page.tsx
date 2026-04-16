'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import AuthCard from '@/components/ui/AuthCard'

interface FormState {
    email: string
    password: string
}

interface FormErrors {
    email?: string
    password?: string
    form?: string
}

export default function LoginPage() {
    const router = useRouter()

    const [form, setForm] = useState<FormState>({ email: '', password: '' })
    const [errors, setErrors] = useState<FormErrors>({})
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    function validate(): boolean {
        const errs: FormErrors = {}
        if (!form.email) errs.email = 'Email is required'
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
        if (!form.password) errs.password = 'Password is required'
        else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        setErrors({})

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                setErrors({ form: json.error ?? 'Login failed. Please try again.' })
                return
            }

            router.push('/dashboard')
            router.refresh()
        } catch {
            setErrors({ form: 'Network error. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCard
            title="Welcome back"
            description="Sign in to your FlowDesk account"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Global error */}
                {errors.form && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.form}
                    </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                        Email address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            className={`
                w-full pl-10 pr-4 py-2.5 rounded-lg text-sm
                bg-white/5 border text-white placeholder:text-slate-500
                focus:outline-none focus:ring-2 transition-colors
                ${errors.email
                                    ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50'
                                    : 'border-white/10 focus:ring-brand-500/30 focus:border-brand-500/50'
                                }
              `}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <button
                            type="button"
                            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                            type={showPass ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            className={`
                w-full pl-10 pr-10 py-2.5 rounded-lg text-sm
                bg-white/5 border text-white placeholder:text-slate-500
                focus:outline-none focus:ring-2 transition-colors
                ${errors.password
                                    ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50'
                                    : 'border-white/10 focus:ring-brand-500/30 focus:border-brand-500/50'
                                }
              `}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass((s) => !s)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                        >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    loading={loading}
                    fullWidth
                    className="mt-2 bg-brand-600 hover:bg-brand-500 text-white border-0 shadow-glow"
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </Button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-slate-400 mt-6">
                Don&apos;t have an account?{' '}
                <Link
                    href="/register"
                    className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                    Create one
                </Link>
            </p>
        </AuthCard>
    )
}