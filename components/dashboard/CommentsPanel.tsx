'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { RequestCommentWithUser } from '@/types'

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const TYPE_STYLES: Record<string, string> = {
    comment: 'text-slate-700',
    status_change: 'text-blue-700 italic',
    assignment: 'text-violet-700 italic',
    system: 'text-slate-400 italic',
}

interface Props {
    requestId: string
    comments: RequestCommentWithUser[]
    currentUserId: string
    currentUserName: string
}

export default function CommentsPanel({
    requestId,
    comments: initial,
    currentUserId,
    currentUserName,
}: Props) {
    const router = useRouter()
    const [comments, setComments] = useState(initial)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!text.trim()) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/requests/${requestId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text.trim() }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                setError(json.error ?? 'Failed to post comment')
                return
            }

            setComments((prev) => [...prev, json.data])
            setText('')
            router.refresh()
        } catch {
            setError('Network error. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold font-display text-slate-900">
                    Activity & Comments
                </h2>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {comments.length}
                </span>
            </div>

            {/* Comment list */}
            <div className="divide-y divide-slate-50">
                {comments.length === 0 ? (
                    <div className="py-10 text-sm text-center text-slate-400">
                        No comments yet. Be the first to add one.
                    </div>
                ) : (
                    comments.map((c) => (
                        <div key={c.id} className="flex gap-3 px-6 py-4">
                            {/* Avatar */}
                            <div className={`
                w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white
                ${c.type === 'system' ? 'bg-slate-300' :
                                    c.user_id === currentUserId ? 'bg-brand-600' : 'bg-slate-500'}
              `}>
                                {c.user_name ? getInitials(c.user_name) : '?'}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-slate-800">
                                        {c.user_name ?? 'System'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(c.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className={`text-sm mt-0.5 ${TYPE_STYLES[c.type] ?? 'text-slate-700'}`}>
                                    {c.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add comment */}
            <div className="px-6 py-4 border-t border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        rows={3}
                        placeholder="Add a comment…"
                        value={text}
                        onChange={(e) => { setText(e.target.value); setError('') }}
                        className="resize-none input"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end">
                        <Button type="submit" loading={loading} disabled={!text.trim()} size="sm">
                            <Send className="w-3.5 h-3.5" />
                            Post comment
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}