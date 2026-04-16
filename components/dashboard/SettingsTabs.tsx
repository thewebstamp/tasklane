'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    User, Mail, FileText, Trash2, Plus, Eye, X,
    CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import { clsx } from 'clsx'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { DBEmailTemplate, DBEmailLog, UserRole } from '@/types'

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────
const TABS = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'templates', label: 'Email Templates', icon: Mail, staffOnly: true },
    { id: 'log', label: 'Email Log', icon: FileText, staffOnly: true },
]

// ─────────────────────────────────────────────
// Account tab
// ─────────────────────────────────────────────
function AccountTab({ user }: { user: { id: string; name: string; email: string; role: UserRole } }) {
    const router = useRouter()
    const [name, setName] = useState(user.name)
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
    const [pwLoading, setPwLoading] = useState(false)
    const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true); setMsg(null)
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            const json = await res.json()
            setMsg(json.success
                ? { type: 'success', text: 'Profile updated.' }
                : { type: 'error', text: json.error ?? 'Update failed.' }
            )
            if (json.success) router.refresh()
        } catch { setMsg({ type: 'error', text: 'Network error.' }) }
        finally { setLoading(false) }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        setPwLoading(true); setPwMsg(null)
        try {
            const res = await fetch(`/api/users/${user.id}/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pwForm),
            })
            const json = await res.json()
            setPwMsg(json.success
                ? { type: 'success', text: 'Password changed successfully.' }
                : { type: 'error', text: json.error ?? 'Password change failed.' }
            )
            if (json.success) setPwForm({ current_password: '', new_password: '' })
        } catch { setPwMsg({ type: 'error', text: 'Network error.' }) }
        finally { setPwLoading(false) }
    }

    return (
        <div className="space-y-6">
            {/* Profile */}
            <div className="p-6 card">
                <h3 className="mb-5 font-semibold font-display text-slate-900">Profile Information</h3>
                <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
                    <Input
                        label="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input label="Email address" value={user.email} disabled hint="Contact an admin to change your email." />
                    <Input label="Role" value={user.role} disabled />
                    {msg && (
                        <Feedback type={msg.type} text={msg.text} />
                    )}
                    <Button type="submit" loading={loading} disabled={name === user.name}>
                        Save Changes
                    </Button>
                </form>
            </div>

            {/* Password */}
            <div className="p-6 card">
                <h3 className="mb-5 font-semibold font-display text-slate-900">Change Password</h3>
                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    <Input
                        label="Current password"
                        type="password"
                        value={pwForm.current_password}
                        onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                        required
                    />
                    <Input
                        label="New password"
                        type="password"
                        value={pwForm.new_password}
                        onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                        hint="Min 8 chars, one uppercase, one number."
                        required
                    />
                    {pwMsg && <Feedback type={pwMsg.type} text={pwMsg.text} />}
                    <Button type="submit" loading={pwLoading}>
                        Change Password
                    </Button>
                </form>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Templates tab
// ─────────────────────────────────────────────
function TemplatesTab({
    initial,
    isAdmin,
}: {
    initial: DBEmailTemplate[]
    isAdmin: boolean
}) {
    const router = useRouter()
    const [templates, setTemplates] = useState(initial)
    const [selected, setSelected] = useState<DBEmailTemplate | null>(null)
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    // New template form state
    const blank = { name: '', subject: '', body_html: '', body_text: '', variables: '' }
    const [form, setForm] = useState(blank)
    const [saving, setSaving] = useState(false)
    const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault(); setSaving(true); setFormMsg(null)
        try {
            const res = await fetch('/api/email/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    variables: form.variables.split(',').map((v) => v.trim()).filter(Boolean),
                }),
            })
            const json = await res.json()
            if (json.success) {
                setTemplates((t) => [...t, json.data])
                setForm(blank); setCreating(false)
                setFormMsg({ type: 'success', text: 'Template created.' })
            } else {
                setFormMsg({ type: 'error', text: json.error ?? 'Failed.' })
            }
        } catch { setFormMsg({ type: 'error', text: 'Network error.' }) }
        finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this template? This cannot be undone.')) return
        setDeleting(id)
        try {
            await fetch(`/api/email/templates/${id}`, { method: 'DELETE' })
            setTemplates((t) => t.filter((tpl) => tpl.id !== id))
            if (selected?.id === id) setSelected(null)
        } finally { setDeleting(null) }
    }

    async function seedDefaults() {
        await fetch('/api/email/seed', { method: 'POST' })
        router.refresh()
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                {isAdmin && (
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={seedDefaults}>Seed Defaults</Button>
                        <Button size="sm" onClick={() => { setCreating(true); setSelected(null) }}>
                            <Plus className="w-3.5 h-3.5" /> New Template
                        </Button>
                    </div>
                )}
            </div>

            {/* Create form */}
            {creating && (
                <div className="p-6 card animate-slide-down">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">New Template</h3>
                        <button onClick={() => setCreating(false)} className="px-2 btn-ghost btn-sm">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Template name" placeholder="request_received" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                            <Input label="Subject" placeholder="Your request — {{title}}" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="label">HTML Body</label>
                            <textarea rows={8} className="font-mono text-xs resize-y input" value={form.body_html} onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="label">Plain Text Body</label>
                            <textarea rows={3} className="text-sm resize-none input" value={form.body_text} onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))} required />
                        </div>
                        <Input label="Variables (comma-separated)" placeholder="name, title, status" value={form.variables} onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))} hint="e.g. submitter_name, title, priority" />
                        {formMsg && <Feedback type={formMsg.type} text={formMsg.text} />}
                        <div className="flex gap-2">
                            <Button type="submit" loading={saving}>Save Template</Button>
                            <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Cancel</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Template list */}
            <div className="table-wrapper">
                <table className="table">
                    <thead><tr>
                        <th>Name</th><th>Subject</th><th>Variables</th><th>Created</th><th></th>
                    </tr></thead>
                    <tbody>
                        {templates.length === 0 ? (
                            <tr><td colSpan={5} className="py-12 text-sm text-center text-slate-400">
                                No templates yet. Click &quot;Seed Defaults&quot; to add the built-in set.
                            </td></tr>
                        ) : templates.map((tpl) => (
                            <tr key={tpl.id}>
                                <td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{tpl.name}</code></td>
                                <td className="max-w-xs text-sm truncate">{tpl.subject}</td>
                                <td>
                                    <div className="flex flex-wrap gap-1">
                                        {(tpl.variables as string[]).slice(0, 3).map((v) => (
                                            <span key={v} className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-100">{`{{${v}}}`}</span>
                                        ))}
                                        {(tpl.variables as string[]).length > 3 && (
                                            <span className="text-xs text-slate-400">+{(tpl.variables as string[]).length - 3}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="text-xs text-slate-400">{new Date(tpl.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setSelected(tpl); setCreating(false) }} className="px-2 btn-ghost btn-sm"><Eye className="w-3.5 h-3.5" /></button>
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(tpl.id)} disabled={deleting === tpl.id} className="px-2 text-red-400 btn-ghost btn-sm hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Preview modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <p className="font-semibold text-slate-900">{selected.name}</p>
                                <p className="text-sm text-slate-400">{selected.subject}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="px-2 btn-ghost btn-sm"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[70vh]">
                            <div className="overflow-hidden bg-white border rounded-lg border-slate-200">
                                <iframe srcDoc={selected.body_html} className="w-full h-72" title="Email preview" />
                            </div>
                            <div className="p-4 mt-4 rounded-lg bg-slate-50">
                                <p className="mb-1 text-xs font-medium text-slate-500">Plain text fallback:</p>
                                <p className="text-sm whitespace-pre-wrap text-slate-600">{selected.body_text}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Email log tab
// ─────────────────────────────────────────────
function EmailLogTab({ log, total }: { log: DBEmailLog[]; total: number }) {
    const STATUS_ICON: Record<string, React.ReactNode> = {
        sent: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        failed: <AlertCircle className="w-4 h-4 text-red-500" />,
        queued: <Clock className="w-4 h-4 text-amber-500" />,
        bounced: <AlertCircle className="w-4 h-4 text-orange-500" />,
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500">{total} email{total !== 1 ? 's' : ''} in log</p>
            <div className="table-wrapper">
                <table className="table">
                    <thead><tr>
                        <th>Status</th><th>To</th><th>Subject</th><th>Sent</th>
                    </tr></thead>
                    <tbody>
                        {log.length === 0 ? (
                            <tr><td colSpan={4} className="py-12 text-sm text-center text-slate-400">No emails logged yet.</td></tr>
                        ) : log.map((entry) => (
                            <tr key={entry.id}>
                                <td>
                                    <div className="flex items-center gap-1.5">
                                        {STATUS_ICON[entry.status] ?? null}
                                        <span className="text-xs capitalize">{entry.status}</span>
                                    </div>
                                </td>
                                <td className="text-sm">{entry.to_address}</td>
                                <td className="max-w-xs text-sm truncate">{entry.subject}</td>
                                <td className="text-xs text-slate-400 whitespace-nowrap">
                                    {entry.sent_at ? new Date(entry.sent_at).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Shared feedback widget
// ─────────────────────────────────────────────
function Feedback({ type, text }: { type: 'success' | 'error'; text: string }) {
    return (
        <div className={clsx(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border',
            type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
        )}>
            {type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {text}
        </div>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
interface Props {
    user: { id: string; name: string; email: string; role: UserRole }
    templates: DBEmailTemplate[]
    emailLog: DBEmailLog[]
    emailLogTotal: number
    isAdmin: boolean
    isStaff: boolean
}

export default function SettingsTabs({ user, templates, emailLog, emailLogTotal, isAdmin, isStaff }: Props) {
    const visibleTabs = TABS.filter((t) => !t.staffOnly || isStaff)
    const [activeTab, setActiveTab] = useState(visibleTabs[0].id)

    return (
        <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-slate-200">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                            activeTab === tab.id
                                ? 'border-brand-600 text-brand-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'account' && <AccountTab user={user} />}
            {activeTab === 'templates' && <TemplatesTab initial={templates} isAdmin={isAdmin} />}
            {activeTab === 'log' && <EmailLogTab log={emailLog} total={emailLogTotal} />}
        </div>
    )
}