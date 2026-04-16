'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, FileText, Settings2, User2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { RequestPriority } from '@/types'

// ─────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Details', icon: FileText },
    { id: 2, label: 'Options', icon: Settings2 },
    { id: 3, label: 'Review', icon: User2 },
]

interface FormData {
    title: string
    description: string
    priority: RequestPriority
    due_date: string
    category: string
    department: string
    notes: string
}

const PRIORITIES: { value: RequestPriority; label: string; color: string; desc: string }[] = [
    { value: 'low', label: 'Low', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', desc: 'No rush, handle when available' },
    { value: 'medium', label: 'Medium', color: 'border-amber-200   bg-amber-50   text-amber-700', desc: 'Standard turnaround' },
    { value: 'high', label: 'High', color: 'border-orange-200  bg-orange-50  text-orange-700', desc: 'Needs attention soon' },
    { value: 'urgent', label: 'Urgent', color: 'border-red-200     bg-red-50     text-red-700', desc: 'Critical — act immediately' },
]

const CATEGORIES = [
    'IT Support', 'HR Request', 'Finance', 'Operations',
    'Legal', 'Marketing', 'Procurement', 'Other',
]

// ─────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((step, i) => {
                const done = current > step.id
                const active = current === step.id

                return (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                transition-all duration-300
                ${done ? 'bg-brand-600 text-white' :
                                    active ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                                        'bg-slate-100 text-slate-400'}
              `}>
                                {done ? <Check className="w-4 h-4" /> : step.id}
                            </div>
                            <span className={`text-xs mt-1.5 font-medium ${active ? 'text-brand-700' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-16 h-0.5 mx-2 mb-5 transition-colors duration-300 ${done ? 'bg-brand-600' : 'bg-slate-200'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function NewRequestPage() {
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState<FormData>({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: '',
        department: '',
        notes: '',
    })

    const [stepErrors, setStepErrors] = useState<Partial<Record<keyof FormData, string>>>({})

    function update<K extends keyof FormData>(key: K, value: FormData[K]) {
        setForm((f) => ({ ...f, [key]: value }))
        setStepErrors((e) => ({ ...e, [key]: undefined }))
    }

    // ── Step 1 validation
    function validateStep1(): boolean {
        const errs: Partial<Record<keyof FormData, string>> = {}
        if (!form.title.trim()) errs.title = 'Title is required'
        else if (form.title.length < 3) errs.title = 'Title must be at least 3 characters'
        if (!form.description.trim()) errs.description = 'Description is required'
        setStepErrors(errs)
        return Object.keys(errs).length === 0
    }

    // ── Step 2 validation
    function validateStep2(): boolean {
        const errs: Partial<Record<keyof FormData, string>> = {}
        if (!form.category) errs.category = 'Please select a category'
        setStepErrors(errs)
        return Object.keys(errs).length === 0
    }

    function nextStep() {
        if (step === 1 && !validateStep1()) return
        if (step === 2 && !validateStep2()) return
        setStep((s) => Math.min(s + 1, STEPS.length))
    }

    function prevStep() {
        setStep((s) => Math.max(s - 1, 1))
        setError('')
    }

    async function handleSubmit() {
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    priority: form.priority,
                    due_date: form.due_date || undefined,
                    form_data: {
                        category: form.category,
                        department: form.department,
                        notes: form.notes,
                    },
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                setError(json.error ?? 'Failed to submit request')
                return
            }

            router.push(`/requests/${json.data.id}`)
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="page-title">Submit a Request</h1>
                <p className="page-subtitle">Fill in the details below and we&apos;ll get right on it.</p>
            </div>

            {/* Card */}
            <div className="p-8 card">
                <StepIndicator current={step} />

                {/* ── Step 1: Basic Details */}
                {step === 1 && (
                    <div className="space-y-5 animate-fade-in">
                        <Input
                            label="Request title"
                            required
                            placeholder="e.g. Laptop replacement for new hire"
                            value={form.title}
                            onChange={(e) => update('title', e.target.value)}
                            error={stepErrors.title}
                        />

                        <div className="space-y-1.5">
                            <label className="label">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={5}
                                placeholder="Describe your request in detail — include context, urgency, and any relevant info…"
                                value={form.description}
                                onChange={(e) => update('description', e.target.value)}
                                className={`input resize-none ${stepErrors.description ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                            />
                            {stepErrors.description && (
                                <p className="text-xs text-red-500">{stepErrors.description}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Options */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="label">Priority</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRIORITIES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => update('priority', p.value)}
                                        className={`
                      flex flex-col gap-0.5 text-left px-4 py-3 rounded-lg border-2 transition-all duration-150
                      ${form.priority === p.value
                                                ? p.color + ' ring-2 ring-offset-1 ring-current'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }
                    `}
                                    >
                                        <span className="text-sm font-semibold">{p.label}</span>
                                        <span className="text-xs opacity-75">{p.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="label">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) => update('category', e.target.value)}
                                className={`input ${stepErrors.category ? 'border-red-400' : ''}`}
                            >
                                <option value="">Select a category…</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {stepErrors.category && (
                                <p className="text-xs text-red-500">{stepErrors.category}</p>
                            )}
                        </div>

                        {/* Department + due date */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Department"
                                placeholder="e.g. Engineering"
                                value={form.department}
                                onChange={(e) => update('department', e.target.value)}
                            />
                            <Input
                                label="Due date"
                                type="date"
                                value={form.due_date}
                                onChange={(e) => update('due_date', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="label">Additional notes</label>
                            <textarea
                                rows={3}
                                placeholder="Any other context or special instructions…"
                                value={form.notes}
                                onChange={(e) => update('notes', e.target.value)}
                                className="resize-none input"
                            />
                        </div>
                    </div>
                )}

                {/* ── Step 3: Review */}
                {step === 3 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="border divide-y bg-slate-50 rounded-xl divide-slate-200 border-slate-200">
                            {[
                                { label: 'Title', value: form.title },
                                { label: 'Category', value: form.category },
                                { label: 'Priority', value: PRIORITIES.find((p) => p.value === form.priority)?.label },
                                { label: 'Department', value: form.department || '—' },
                                { label: 'Due date', value: form.due_date ? new Date(form.due_date).toLocaleDateString() : '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center justify-between px-5 py-3">
                                    <span className="text-sm text-slate-500">{label}</span>
                                    <span className="text-sm font-medium text-slate-900">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 border bg-slate-50 rounded-xl border-slate-200">
                            <p className="text-sm text-slate-500 mb-1.5">Description</p>
                            <p className="text-sm whitespace-pre-wrap text-slate-800">{form.description}</p>
                        </div>

                        {form.notes && (
                            <div className="p-5 border bg-slate-50 rounded-xl border-slate-200">
                                <p className="text-sm text-slate-500 mb-1.5">Notes</p>
                                <p className="text-sm text-slate-800">{form.notes}</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-100">
                    <Button
                        variant="secondary"
                        onClick={prevStep}
                        disabled={step === 1}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </Button>

                    {step < STEPS.length ? (
                        <Button onClick={nextStep}>
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} loading={loading}>
                            <Check className="w-4 h-4" />
                            {loading ? 'Submitting…' : 'Submit Request'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}