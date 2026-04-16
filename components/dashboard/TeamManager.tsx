'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    UserPlus, Search, Shield, User, Briefcase,
    MoreVertical, Power, Edit2, X, Check, ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { SafeUser, UserRole } from '@/types'

type UserRow = SafeUser & { request_count: string }

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
    admin: { label: 'Admin', color: 'bg-brand-100 text-brand-700 border-brand-200', icon: Shield },
    staff: { label: 'Staff', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: Briefcase },
    user: { label: 'User', color: 'bg-slate-100  text-slate-600  border-slate-200', icon: User },
}

const AVATAR_COLORS = [
    'bg-brand-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
]

function avatarColor(id: string): string {
    const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

// ─────────────────────────────────────────────
// User row
// ─────────────────────────────────────────────
function UserRow({
    user,
    isSelf,
    onUpdate,
}: {
    user: UserRow
    isSelf: boolean
    onUpdate: (id: string, patch: Partial<UserRow>) => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [editRole, setEditRole] = useState(false)
    const [role, setRole] = useState<UserRole>(user.role)
    const [saving, setSaving] = useState(false)
    const [toggling, setToggling] = useState(false)

    const roleConf = ROLE_CONFIG[user.role]

    async function handleRoleSave() {
        if (role === user.role) { setEditRole(false); return }
        setSaving(true)
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            const json = await res.json()
            if (json.success) {
                onUpdate(user.id, { role })
                setEditRole(false)
            }
        } finally { setSaving(false) }
    }

    async function handleToggleActive() {
        setToggling(true); setMenuOpen(false)
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !user.is_active }),
            })
            const json = await res.json()
            if (json.success) onUpdate(user.id, { is_active: !user.is_active })
        } finally { setToggling(false) }
    }

    return (
        <tr className={clsx(!user.is_active && 'opacity-50')}>
            {/* Avatar + name */}
            <td>
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0',
                        avatarColor(user.id)
                    )}>
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td>
                {editRole ? (
                    <div className="flex items-center gap-1.5">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="py-1 text-xs input w-28"
                        >
                            <option value="user">User</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onClick={handleRoleSave} disabled={saving} className="px-2 py-1 btn-primary btn-sm">
                            {saving ? '…' : <Check className="w-3 h-3" />}
                        </button>
                        <button onClick={() => { setEditRole(false); setRole(user.role) }} className="px-2 py-1 btn-ghost btn-sm">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => !isSelf && setEditRole(true)}
                        disabled={isSelf}
                        className={clsx(
                            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
                            roleConf.color,
                            !isSelf && 'hover:opacity-80 cursor-pointer',
                            isSelf && 'cursor-default'
                        )}
                    >
                        <roleConf.icon className="w-3 h-3" />
                        {roleConf.label}
                        {!isSelf && <ChevronDown className="w-2.5 h-2.5 opacity-60" />}
                    </button>
                )}
            </td>

            {/* Status */}
            <td>
                <span className={clsx(
                    'text-xs px-2.5 py-1 rounded-full border font-medium',
                    user.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                )}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>

            {/* Requests */}
            <td className="text-sm text-center text-slate-500">
                {parseInt(user.request_count).toLocaleString()}
            </td>

            {/* Joined */}
            <td className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(user.created_at).toLocaleDateString()}
            </td>

            {/* Actions */}
            <td>
                {!isSelf && (
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen((o) => !o)}
                            className="px-2 btn-ghost btn-sm"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 z-10 w-40 py-1 mt-1 bg-white border shadow-lg top-full rounded-xl border-slate-200 animate-scale-in">
                                <button
                                    onClick={() => { setEditRole(true); setMenuOpen(false) }}
                                    className="flex items-center w-full gap-2 px-3 py-2 text-sm transition-colors text-slate-600 hover:bg-slate-50"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Change Role
                                </button>
                                <button
                                    onClick={handleToggleActive}
                                    disabled={toggling}
                                    className="flex items-center w-full gap-2 px-3 py-2 text-sm transition-colors text-slate-600 hover:bg-slate-50"
                                >
                                    <Power className="w-3.5 h-3.5" />
                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </td>
        </tr>
    )
}

// ─────────────────────────────────────────────
// Invite form
// ─────────────────────────────────────────────
function InviteForm({ onCreated }: { onCreated: (user: UserRow) => void }) {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as UserRole })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setSaving(true); setMsg(null)
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const json = await res.json()
            if (json.success) {
                onCreated({ ...json.data, request_count: '0', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), avatar_url: null })
                setForm({ name: '', email: '', password: '', role: 'user' })
                setMsg({ type: 'success', text: `Account created for ${form.name}.` })
            } else {
                setMsg({ type: 'error', text: json.error ?? 'Failed to create account.' })
            }
        } catch { setMsg({ type: 'error', text: 'Network error.' }) }
        finally { setSaving(false) }
    }

    return (
        <div className="p-6 card animate-slide-down">
            <h3 className="mb-4 font-semibold font-display text-slate-900">Add Team Member</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Full name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                    <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
                    <Input label="Temporary password" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} hint="Min 8 chars, uppercase, number" />
                    <div className="space-y-1.5">
                        <label className="label">Role</label>
                        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))} className="input">
                            <option value="user">User — can submit requests</option>
                            <option value="staff">Staff — can manage requests</option>
                            <option value="admin">Admin — full access</option>
                        </select>
                    </div>
                </div>

                {msg && (
                    <div className={clsx(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border',
                        msg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                    )}>
                        {msg.text}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button type="submit" loading={saving}>
                        <UserPlus className="w-4 h-4" /> Create Account
                    </Button>
                </div>
            </form>
        </div>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
interface Props {
    initialUsers: UserRow[]
    currentUserId: string
}

export default function TeamManager({ initialUsers, currentUserId }: Props) {
    const [users, setUsers] = useState(initialUsers)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
    const [showInvite, setShowInvite] = useState(false)

    function handleUpdate(id: string, patch: Partial<UserRow>) {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    }

    function handleCreated(user: UserRow) {
        setUsers((prev) => [user, ...prev])
        setShowInvite(false)
    }

    const filtered = users.filter((u) => {
        const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = !roleFilter || u.role === roleFilter
        return matchSearch && matchRole
    })

    const counts = {
        admin: users.filter((u) => u.role === 'admin').length,
        staff: users.filter((u) => u.role === 'staff').length,
        user: users.filter((u) => u.role === 'user').length,
    }

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {(['admin', 'staff', 'user'] as UserRole[]).map((role) => {
                    const conf = ROLE_CONFIG[role]
                    return (
                        <div key={role} className="flex items-center gap-3 p-4 card">
                            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center border', conf.color)}>
                                <conf.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold font-display text-slate-900">{counts[role]}</p>
                                <p className="text-xs capitalize text-slate-500">{conf.label}{counts[role] !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                    <input type="search" placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | '')} className="w-auto input">
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="user">User</option>
                </select>
                <Button onClick={() => setShowInvite((s) => !s)}>
                    <UserPlus className="w-4 h-4" />
                    Add Member
                </Button>
            </div>

            {/* Invite form */}
            {showInvite && <InviteForm onCreated={handleCreated} />}

            {/* Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th className="text-center">Requests</th>
                            <th>Joined</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-sm text-center text-slate-400">
                                    No members match your search.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((user) => (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    isSelf={user.id === currentUserId}
                                    onUpdate={handleUpdate}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}