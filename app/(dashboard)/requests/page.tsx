import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listRequests } from '@/services/requests.service'
import RequestsTable from '@/components/dashboard/RequestsTable'
import type { PaginationParams } from '@/types'

interface SearchParams {
  page?: string
  search?: string
  status?: string
  priority?: string
  sort_by?: string
  sort_dir?: string
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  // ✅ IMPORTANT: unwrap searchParams
  const sp = await searchParams

  const params: PaginationParams = {
    page: parseInt(sp.page ?? '1'),
    per_page: 20,
    search: sp.search,
    status: sp.status as PaginationParams['status'],
    priority: sp.priority as PaginationParams['priority'],
    sort_by: sp.sort_by ?? 'created_at',
    sort_dir: (sp.sort_dir ?? 'desc') as 'asc' | 'desc',
  }

  const result = await listRequests(params, session.sub, session.role)

  return (
    <div className="mx-auto space-y-6 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requests</h1>
          <p className="page-subtitle">
            {result.total} request{result.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/requests/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      <RequestsTable
        result={result}
        currentParams={params}
        userRole={session.role}
      />
    </div>
  )
}