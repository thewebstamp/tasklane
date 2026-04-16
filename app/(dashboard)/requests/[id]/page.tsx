import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getRequest, getComments } from '@/services/requests.service'
import { getRequestFiles } from '@/services/files.service'
import { query } from '@/lib/db'
import Link from 'next/link'
import { ChevronLeft, Calendar, User, Clock } from 'lucide-react'
import RequestActions from '@/components/dashboard/RequestActions'
import CommentsPanel from '@/components/dashboard/CommentsPanel'
import RequestFilesPanel from '@/components/dashboard/RequestFilesPanel'
import type { SafeUser } from '@/types'

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  // ✅ unwrap params
  const { id } = await params

  const [request, comments, requestFiles, staffUsers] = await Promise.all([
    getRequest(id, session.sub, session.role),
    getComments(id),
    getRequestFiles(id),
    session.role === 'admin' || session.role === 'staff'
      ? query<SafeUser>(`
        SELECT id, name, email, role 
        FROM users 
        WHERE is_active = true 
        AND role IN ('admin','staff') 
        ORDER BY name
      `)
      : Promise.resolve([]),
  ])

  if (!request) notFound()

  const isStaff = session.role === 'admin' || session.role === 'staff'

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    rejected: 'Rejected',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    low: 'badge-low',
    medium: 'badge-medium',
    high: 'badge-high',
    urgent: 'badge-urgent',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> All Requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="truncate page-title">{request.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge badge-${request.status}`}>
              {STATUS_LABELS[request.status]}
            </span>
            <span className={`badge ${PRIORITY_COLORS[request.priority]}`}>
              {request.priority} priority
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <div className="p-6 card">
            <h2 className="mb-3 font-semibold font-display text-slate-900">
              Description
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
              {request.description ?? 'No description provided.'}
            </p>
          </div>

          {/* Form data */}
          {request.form_data &&
            Object.keys(request.form_data).length > 0 && (
              <div className="p-6 card">
                <h2 className="mb-4 font-semibold font-display text-slate-900">
                  Additional Details
                </h2>
                <dl className="space-y-3">
                  {Object.entries(request.form_data).map(([key, val]) =>
                    val ? (
                      <div key={key} className="flex gap-4">
                        <dt className="text-sm capitalize text-slate-400 w-28 shrink-0">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="text-sm font-medium text-slate-700">
                          {String(val)}
                        </dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>
            )}

          {/* Files */}
          <RequestFilesPanel
            requestId={request.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialFiles={requestFiles as any}
            canUpload={true}
            canDelete={isStaff}
            userId={session.sub}
          />

          {/* Comments */}
          <CommentsPanel
            requestId={request.id}
            comments={comments}
            currentUserId={session.sub}
            currentUserName={session.name}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="p-5 space-y-4 card">
            <h3 className="text-sm font-semibold text-slate-700">Details</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Submitted by</p>
                  <p className="font-medium text-slate-800">
                    {request.submitter_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {request.submitter_email}
                  </p>
                </div>
              </div>

              {request.assignee_name && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Assigned to</p>
                    <p className="font-medium text-slate-800">
                      {request.assignee_name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Submitted</p>
                  <p className="font-medium text-slate-800">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.due_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Due date</p>
                    <p className="font-medium text-slate-800">
                      {new Date(request.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {isStaff && (
            <RequestActions
              request={request}
              staffUsers={staffUsers}
            />
          )}
        </div>
      </div>
    </div>
  )
}