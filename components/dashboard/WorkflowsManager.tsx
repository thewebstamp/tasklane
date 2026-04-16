/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import {
    Plus, Trash2, Edit2, X, Check, Power,
    GitBranch, ChevronRight, Zap
} from 'lucide-react'
import { clsx } from 'clsx'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type {
    DBWorkflowRule, DBEmailTemplate, SafeUser,
    WorkflowTrigger, WorkflowActionDef, WorkflowConditions,
    RequestStatus, RequestPriority
} from '@/types'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TRIGGERS: { value: WorkflowTrigger; label: string; desc: string }[] = [
    { value: 'on_create', label: 'Request Created', desc: 'Fires when a new request is submitted' },
    { value: 'on_status_change', label: 'Status Changed', desc: 'Fires when a request status is updated' },
    { value: 'on_assign', label: 'Request Assigned', desc: 'Fires when a request is assigned to someone' },
    { value: 'on_due_date', label: 'Due Date Approaching', desc: 'Fires when a request nears its due date' },
]

const STATUSES: RequestStatus[] = ['pending', 'in_progress', 'review', 'completed', 'rejected']
const PRIORITIES: RequestPriority[] = ['low', 'medium', 'high', 'urgent']

const ACTION_TYPES = [
    { value: 'set_status', label: 'Set Status' },
    { value: 'assign_user', label: 'Assign User' },
    { value: 'send_email', label: 'Send Email' },
    { value: 'add_comment', label: 'Add Comment' },
]

// ─────────────────────────────────────────────
// Rule card
// ─────────────────────────────────────────────
function RuleCard({
    rule,
    onToggle,
    onEdit,
    onDelete,
}: {
    rule: DBWorkflowRule & { creator_name?: string | null }
    onToggle: (id: string, active: boolean) => void
    onEdit: (rule: DBWorkflowRule) => void
    onDelete: (id: string) => void
}) {
    const [toggling, setToggling] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const actions = Array.isArray(rule.actions) ? rule.actions as WorkflowActionDef[] : []
    const trigger = TRIGGERS.find((t) => t.value === rule.trigger_event)

    async function handleToggle() {
        setToggling(true)
        try {
            await fetch(`/api/workflows/${rule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !rule.is_active }),
            })
            onToggle(rule.id, !rule.is_active)
        } finally { setToggling(false) }
    }

    async function handleDelete() {
        if (!confirm(`Delete rule "${rule.name}"?`)) return
        setDeleting(true)
        try {
            await fetch(`/api/workflows/${rule.id}`, { method: 'DELETE' })
            onDelete(rule.id)
        } finally { setDeleting(false) }
    }

    return (
        <div className={clsx(
            'card p-5 transition-all duration-200',
            !rule.is_active && 'opacity-60'
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start flex-1 min-w-0 gap-3">
                    <div className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        rule.is_active ? 'bg-brand-100' : 'bg-slate-100'
                    )}>
                        <GitBranch className={clsx('w-4 h-4', rule.is_active ? 'text-brand-600' : 'text-slate-400')} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold truncate text-slate-900">{rule.name}</p>
                            <span className={clsx(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                rule.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                            )}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {rule.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{rule.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={handleToggle} disabled={toggling} className="px-2 btn-ghost btn-sm" title={rule.is_active ? 'Deactivate' : 'Activate'}>
                        <Power className={clsx('w-4 h-4', rule.is_active ? 'text-emerald-500' : 'text-slate-400')} />
                    </button>
                    <button onClick={() => onEdit(rule)} className="px-2 btn-ghost btn-sm">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="px-2 text-red-400 btn-ghost btn-sm hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Trigger → Actions pipeline */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
                {/* Trigger pill */}
                <span className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-full font-medium">
                    <Zap className="w-3 h-3" />
                    {trigger?.label ?? rule.trigger_event}
                </span>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                    {actions.map((action, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                            {ACTION_TYPES.find((a) => a.value === action.type)?.label ?? action.type}
                        </span>
                    ))}
                </div>
            </div>

            {/* Conditions summary */}
            {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Conditions:{' '}
                        {Object.entries(rule.conditions as WorkflowConditions)
                            .filter(([, v]) => v !== undefined && v !== null)
                            .map(([k, v]) => `${k} = ${v}`)
                            .join(', ')}
                    </p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Action editor — one action row
// ─────────────────────────────────────────────
function ActionRow({
    action,
    index,
    staffUsers,
    templates,
    onChange,
    onRemove,
}: {
    action: WorkflowActionDef
    index: number
    staffUsers: SafeUser[]
    templates: DBEmailTemplate[]
    onChange: (i: number, a: WorkflowActionDef) => void
    onRemove: (i: number) => void
}) {
    function setType(type: string) {
        onChange(index, { type: type as WorkflowActionDef['type'], payload: {} as any })
    }

    function setPayload(patch: Record<string, unknown>) {
        onChange(index, { ...action, payload: { ...action.payload, ...patch } as any })
    }

    const payload = action.payload as Record<string, unknown>

    return (
        <div className="flex items-start gap-2 p-3 border rounded-lg bg-slate-50 border-slate-200">
            <span className="text-xs text-slate-400 font-mono mt-2.5 w-5 text-right shrink-0">{index + 1}</span>

            {/* Action type */}
            <select
                value={action.type}
                onChange={(e) => setType(e.target.value)}
                className="w-40 input shrink-0"
            >
                {ACTION_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                ))}
            </select>

            {/* Payload fields */}
            <div className="flex flex-wrap flex-1 gap-2">
                {action.type === 'set_status' && (
                    <select
                        value={(payload.status as string) ?? ''}
                        onChange={(e) => setPayload({ status: e.target.value })}
                        className="flex-1 input min-w-32"
                    >
                        <option value="">Select status…</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                )}

                {action.type === 'assign_user' && (
                    <select
                        value={(payload.user_id as string) ?? ''}
                        onChange={(e) => setPayload({ user_id: e.target.value })}
                        className="flex-1 input min-w-40"
                    >
                        <option value="">Select user…</option>
                        {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                )}

                {action.type === 'send_email' && (
                    <>
                        <select
                            value={(payload.template_id as string) ?? ''}
                            onChange={(e) => setPayload({ template_id: e.target.value })}
                            className="flex-1 input min-w-40"
                        >
                            <option value="">Select template…</option>
                            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select
                            value={(payload.to as string) ?? 'submitter'}
                            onChange={(e) => setPayload({ to: e.target.value })}
                            className="input w-36 shrink-0"
                        >
                            <option value="submitter">To submitter</option>
                            <option value="assignee">To assignee</option>
                        </select>
                    </>
                )}

                {action.type === 'add_comment' && (
                    <input
                        type="text"
                        value={(payload.content as string) ?? ''}
                        onChange={(e) => setPayload({ content: e.target.value })}
                        placeholder="Comment text…"
                        className="flex-1 input"
                    />
                )}
            </div>

            <button
                type="button"
                onClick={() => onRemove(index)}
                className="btn-ghost btn-sm px-2 text-red-400 hover:text-red-600 hover:bg-red-50 mt-0.5 shrink-0"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────
// Rule form (create + edit)
// ─────────────────────────────────────────────
function RuleForm({
    initial,
    staffUsers,
    templates,
    onSave,
    onCancel,
}: {
    initial?: DBWorkflowRule
    staffUsers: SafeUser[]
    templates: DBEmailTemplate[]
    onSave: (rule: DBWorkflowRule) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')
    const [trigger, setTrigger] = useState<WorkflowTrigger>(initial?.trigger_event ?? 'on_create')
    const [isActive, setIsActive] = useState(initial?.is_active ?? true)
    const [conditions, setConditions] = useState<WorkflowConditions>(
        (initial?.conditions as WorkflowConditions) ?? {}
    )
    const [actions, setActions] = useState<WorkflowActionDef[]>(
        (initial?.actions as WorkflowActionDef[]) ?? [{ type: 'set_status', payload: { status: 'in_progress' } as any }]
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    function addAction() {
        setActions((prev) => [...prev, { type: 'set_status', payload: { status: 'in_progress' } as any }])
    }

    function updateAction(i: number, a: WorkflowActionDef) {
        setActions((prev) => prev.map((x, idx) => idx === i ? a : x))
    }

    function removeAction(i: number) {
        setActions((prev) => prev.filter((_, idx) => idx !== i))
    }

    async function handleSave() {
        if (!name.trim()) { setError('Name is required'); return }
        if (actions.length < 1) { setError('At least one action is required'); return }

        setSaving(true); setError('')

        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
            trigger_event: trigger,
            conditions,
            actions,
            is_active: isActive,
        }

        try {
            const url = initial ? `/api/workflows/${initial.id}` : '/api/workflows'
            const method = initial ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()

            if (!res.ok || !json.success) {
                setError(json.error ?? 'Save failed')
                return
            }

            onSave(json.data)
        } catch {
            setError('Network error. Try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 space-y-6 card animate-slide-down">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold font-display text-slate-900">
                    {initial ? 'Edit Rule' : 'New Workflow Rule'}
                </h3>
                <button onClick={onCancel} className="px-2 btn-ghost btn-sm">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Name + description */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                    label="Rule name"
                    required
                    placeholder="Auto-assign urgent requests"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Input
                    label="Description"
                    placeholder="Assigns urgent requests to the on-call team"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* Trigger */}
            <div className="space-y-2">
                <label className="label">Trigger event</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TRIGGERS.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTrigger(t.value)}
                            className={clsx(
                                'text-left px-4 py-3 rounded-lg border-2 transition-all duration-150',
                                trigger === t.value
                                    ? 'border-brand-500 bg-brand-50 text-brand-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            )}
                        >
                            <p className="text-sm font-semibold">{t.label}</p>
                            <p className="text-xs opacity-70 mt-0.5">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="label">Conditions <span className="font-normal text-slate-400">(optional — leave blank to match all)</span></label>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 border rounded-lg sm:grid-cols-2 bg-slate-50 border-slate-200">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">When status is</label>
                        <select
                            value={(conditions.status as string) ?? ''}
                            onChange={(e) => setConditions((c) => ({ ...c, status: e.target.value as RequestStatus || undefined }))}
                            className="input"
                        >
                            <option value="">Any status</option>
                            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">When priority is</label>
                        <select
                            value={(conditions.priority as string) ?? ''}
                            onChange={(e) => setConditions((c) => ({ ...c, priority: e.target.value as RequestPriority || undefined }))}
                            className="input"
                        >
                            <option value="">Any priority</option>
                            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <label className="label">Actions <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                    {actions.map((action, i) => (
                        <ActionRow
                            key={i}
                            action={action}
                            index={i}
                            staffUsers={staffUsers}
                            templates={templates}
                            onChange={updateAction}
                            onRemove={removeAction}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addAction}
                    className="btn-secondary btn-sm"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Action
                </button>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setIsActive((a) => !a)}
                    className={clsx(
                        'relative w-10 h-5 rounded-full transition-colors duration-200',
                        isActive ? 'bg-brand-600' : 'bg-slate-200'
                    )}
                >
                    <span className={clsx(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                        isActive ? 'translate-x-5' : 'translate-x-0'
                    )} />
                </button>
                <span className="text-sm text-slate-600">
                    {isActive ? 'Rule is active' : 'Rule is inactive'}
                </span>
            </div>

            {/* Error */}
            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                    {error}
                </p>
            )}

            {/* Submit */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button onClick={handleSave} loading={saving}>
                    <Check className="w-4 h-4" />
                    {initial ? 'Update Rule' : 'Create Rule'}
                </Button>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
interface Props {
    initialRules: (DBWorkflowRule & { creator_name?: string | null })[]
    templates: DBEmailTemplate[]
    staffUsers: SafeUser[]
}

export default function WorkflowsManager({ initialRules, templates, staffUsers }: Props) {
    const [rules, setRules] = useState(initialRules)
    const [editing, setEditing] = useState<DBWorkflowRule | null>(null)
    const [creating, setCreating] = useState(false)

    const activeCount = rules.filter((r) => r.is_active).length
    const inactiveCount = rules.length - activeCount

    function handleSaved(rule: DBWorkflowRule) {
        setRules((prev) => {
            const exists = prev.find((r) => r.id === rule.id)
            return exists
                ? prev.map((r) => r.id === rule.id ? { ...r, ...rule } : r)
                : [rule, ...prev]
        })
        setCreating(false)
        setEditing(null)
    }

    function handleToggle(id: string, active: boolean) {
        setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: active } : r))
    }

    function handleDelete(id: string) {
        setRules((prev) => prev.filter((r) => r.id !== id))
        if (editing?.id === id) setEditing(null)
    }

    return (
        <div className="space-y-5">
            {/* Stats bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
                    {activeCount > 0 && <span className="font-medium text-emerald-600">{activeCount} active</span>}
                    {inactiveCount > 0 && <span className="text-slate-400">{inactiveCount} inactive</span>}
                </div>
                <Button
                    onClick={() => { setCreating(true); setEditing(null) }}
                    disabled={creating}
                >
                    <Plus className="w-4 h-4" /> New Rule
                </Button>
            </div>

            {/* Create form */}
            {creating && (
                <RuleForm
                    staffUsers={staffUsers}
                    templates={templates}
                    onSave={handleSaved}
                    onCancel={() => setCreating(false)}
                />
            )}

            {/* Edit form */}
            {editing && !creating && (
                <RuleForm
                    initial={editing}
                    staffUsers={staffUsers}
                    templates={templates}
                    onSave={handleSaved}
                    onCancel={() => setEditing(null)}
                />
            )}

            {/* Rules list */}
            {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center card">
                    <div className="flex items-center justify-center mb-4 rounded-full w-14 h-14 bg-slate-100">
                        <GitBranch className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No workflow rules yet</p>
                    <p className="max-w-xs mt-1 text-xs text-slate-400">
                        Create a rule to automatically assign, notify, or update requests when conditions are met.
                    </p>
                    <Button className="mt-4" size="sm" onClick={() => setCreating(true)}>
                        <Plus className="w-4 h-4" /> Create First Rule
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <RuleCard
                            key={rule.id}
                            rule={rule}
                            onToggle={handleToggle}
                            onEdit={setEditing}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}