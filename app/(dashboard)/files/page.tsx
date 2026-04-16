import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listFiles } from '@/services/files.service'
import FilesManager from '@/components/dashboard/FilesManager'

interface SearchParams {
    page?: string
}

export default async function FilesPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const result = await listFiles({
        page,
        per_page: 24,
        viewerId: session.sub,
        viewerRole: session.role,
    })

    return (
        <div className="mx-auto space-y-6 max-w-7xl">
            <div className="page-header">
                <div>
                    <h1 className="page-title">File Manager</h1>
                    <p className="page-subtitle">{result.total} file{result.total !== 1 ? 's' : ''} stored</p>
                </div>
            </div>

            <FilesManager result={result} userRole={session.role} userId={session.sub} />
        </div>
    )
}