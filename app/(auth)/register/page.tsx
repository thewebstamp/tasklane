'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import AuthCard from '@/components/ui/AuthCard'

interface FormState {
    name: string
    email: string
    password: string
}

interface FormErrors {
    name?: string
    email?: string
    password?: string
    form?: string
}

// Password strength rules
const rules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
]

function StrengthIndicator({ password }: { password: string }) {
    if (!password) return null
    return (
        <div className="space-y-1.5 mt-2">
            {rules.map((rule) => {
                const ok = rule.test(password)
                return (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                        {ok
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-slate-600   shrink-0" />
                        }
                        <span className={ok ? 'text-emerald-400' : 'text-slate-500'}>
                            {rule.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default function RegisterPage() {
    const router = useRouter()

    const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' })
    const [errors, setErrors] = useState<FormErrors>({})
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    function validate(): boolean {
        const errs: FormErrors = {}

        if (!form.name.trim()) errs.name = 'Name is required'
        else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters'

        if (!form.email) errs.email = 'Email is required'
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'

        if (!form.password) errs.password = 'Password is required'
        else if (!rules.every((r) => r.test(form.password))) {
            errs.password = 'Password does not meet requirements'
        }

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        setErrors({})

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                setErrors({ form: json.error ?? 'Registration failed. Please try again.' })
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

    const inputClass = (hasError?: string) => `
    w-full pl-10 pr-4 py-2.5 rounded-lg text-sm
    bg-white/5 border text-white placeholder:text-slate-500
    focus:outline-none focus:ring-2 transition-colors
    ${hasError
            ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50'
            : 'border-white/10 focus:ring-brand-500/30 focus:border-brand-500/50'
        }
  `

    return (
        <AuthCard
            title="Create your account"
            description="Start managing requests and workflows today"
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

                {/* Name */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                        Full name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            autoComplete="name"
                            placeholder="Jane Smith"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className={inputClass(errors.name)}
                        />
                    </div>
                    {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                        Email address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Mail className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            className={inputClass(errors.email)}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                        Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                            type={showPass ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Create a strong password"
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            className={`${inputClass(errors.password)} pr-10`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass((s) => !s)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 transition-colors text-slate-500 hover:text-slate-300"
                            tabIndex={-1}
                        >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                    <StrengthIndicator password={form.password} />
                </div>

                {/* Terms */}
                <p className="text-xs text-slate-500">
                    By creating an account you agree to our{' '}
                    <span className="cursor-pointer text-brand-400 hover:text-brand-300">Terms of Service</span>
                    {' '}and{' '}
                    <span className="cursor-pointer text-brand-400 hover:text-brand-300">Privacy Policy</span>.
                </p>

                {/* Submit */}
                <Button
                    type="submit"
                    loading={loading}
                    fullWidth
                    className="mt-1 text-white border-0 bg-brand-600 hover:bg-brand-500 shadow-glow"
                >
                    {loading ? 'Creating account…' : 'Create account'}
                </Button>
            </form>

            {/* Login link */}
            <p className="mt-6 text-sm text-center text-slate-400">
                Already have an account?{' '}
                <Link
                    href="/login"
                    className="font-medium transition-colors text-brand-400 hover:text-brand-300"
                >
                    Sign in
                </Link>
            </p>
        </AuthCard>
    )
}