'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { RequestWithUsers, SafeUser, RequestStatus } from '@/types'

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'In Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
]

interface Props {
    request: RequestWithUsers
    staffUsers: SafeUser[]
}

export default function RequestActions({ request, staffUsers }: Props) {
    const router = useRouter()

    const [status, setStatus] = useState<RequestStatus>(request.status)
    const [assignedTo, setAssignedTo] = useState<string>(request.assigned_to ?? '')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleSave() {
        setLoading(true)
        setMessage(null)

        try {
            const res = await fetch(`/api/requests/${request.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    assigned_to: assignedTo || null,
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                setMessage({ type: 'error', text: json.error ?? 'Update failed' })
                return
            }

            setMessage({ type: 'success', text: 'Request updated successfully' })
            router.refresh()
        } catch {
            setMessage({ type: 'error', text: 'Network error. Try again.' })
        } finally {
            setLoading(false)
        }
    }

    const dirty = status !== request.status || assignedTo !== (request.assigned_to ?? '')

    return (
        <div className="p-5 space-y-4 card">
            <h3 className="text-sm font-semibold text-slate-700">Update Request</h3>

            {/* Status */}
            <div className="space-y-1.5">
                <label className="text-xs label">Status</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RequestStatus)}
                    className="input"
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
                <label className="text-xs label">Assigned to</label>
                <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="input"
                >
                    <option value="">Unassigned</option>
                    {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
            </div>

            {/* Feedback */}
            {message && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg
          ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                    {message.type === 'success'
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    }
                    {message.text}
                </div>
            )}

            <Button
                onClick={handleSave}
                loading={loading}
                disabled={!dirty}
                fullWidth
            >
                {loading ? 'Saving…' : 'Save Changes'}
            </Button>
        </div>
    )
}