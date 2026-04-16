'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    FileText, Image, Film, Download, Trash2, ExternalLink,
    Plus, ChevronLeft, ChevronRight, Search, X
} from 'lucide-react'
import { clsx } from 'clsx'
import FileDropzone from '@/components/ui/FileDropzone'
import Button from '@/components/ui/Button'
import type { DBFile, PaginatedResult, UserRole } from '@/types'

type FileRow = DBFile & { uploader_name: string | null }

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(type: string): boolean {
    return type.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)
}

function FileTypeIcon({ type, className }: { type: string; className?: string }) {
    // eslint-disable-next-line jsx-a11y/alt-text
    if (isImage(type)) return <Image className={clsx('text-blue-500', className)} />
    if (type.startsWith('video')) return <Film className={clsx('text-violet-500', className)} />
    return <FileText className={clsx('text-slate-400', className)} />
}

// ─────────────────────────────────────────────
// File card
// ─────────────────────────────────────────────
function FileCard({
    file, canDelete, onDelete, onPreview,
}: {
    file: FileRow
    canDelete: boolean
    onDelete: (id: string) => void
    onPreview: (file: FileRow) => void
}) {
    const [deleting, setDeleting] = useState(false)

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation()
        if (!confirm(`Delete "${file.original_name}"? This cannot be undone.`)) return

        setDeleting(true)
        try {
            await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
            onDelete(file.id)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div
            onClick={() => onPreview(file)}
            className="group card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
        >
            {/* Preview area */}
            <div className="flex items-center justify-center w-full h-32 mb-3 overflow-hidden border rounded-lg bg-slate-50 border-slate-100">
                {isImage(file.file_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={file.cloudinary_url}
                        alt={file.original_name}
                        className="object-cover w-full h-full"
                    />
                ) : (
                    <FileTypeIcon type={file.file_type} className="w-10 h-10 opacity-40" />
                )}
            </div>

            {/* Info */}
            <p className="text-sm font-medium truncate text-slate-800">{file.original_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
                {formatBytes(file.file_size)} · {file.file_type.split('/').pop()?.toUpperCase()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
                {new Date(file.created_at).toLocaleDateString()}
                {file.uploader_name && ` · ${file.uploader_name}`}
            </p>

            {/* Actions (appear on hover) */}
            <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={file.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="justify-center flex-1 btn-secondary btn-sm"
                >
                    <Download className="w-3.5 h-3.5" />
                </a>
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-2 btn-danger btn-sm"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Preview modal
// ─────────────────────────────────────────────
function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <p className="font-medium truncate text-slate-900">{file.original_name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.file_size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={file.cloudinary_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary btn-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                        </a>
                        <button onClick={onClose} className="px-2 btn-ghost btn-sm">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-auto max-h-[70vh] p-6 flex items-center justify-center bg-slate-50">
                    {isImage(file.file_type) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={file.cloudinary_url}
                            alt={file.original_name}
                            className="object-contain max-w-full max-h-full rounded-lg"
                        />
                    ) : file.file_type === 'pdf' || file.file_type === 'application/pdf' ? (
                        <iframe
                            src={file.cloudinary_url}
                            className="w-full rounded h-96"
                            title={file.original_name}
                        />
                    ) : (
                        <div className="py-12 text-center">
                            <FileTypeIcon type={file.file_type} className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-sm text-slate-500">Preview not available for this file type.</p>
                            <a
                                href={file.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex mt-4 btn-primary btn-sm"
                            >
                                <Download className="w-3.5 h-3.5" /> Download to view
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
interface Props {
    result: PaginatedResult<FileRow>
    userRole: UserRole
    userId: string
}

export default function FilesManager({ result, userRole, userId }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [files, setFiles] = useState<FileRow[]>(result.data)
    const [preview, setPreview] = useState<FileRow | null>(null)
    const [showUpload, setShowUpload] = useState(false)
    const [search, setSearch] = useState('')

    const isAdmin = userRole === 'admin'

    function handleUploaded() {
        startTransition(() => router.refresh())
        setShowUpload(false)
    }

    function handleDelete(id: string) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
    }

    const filtered = search
        ? files.filter((f) =>
            f.original_name.toLowerCase().includes(search.toLowerCase()) ||
            f.file_type.toLowerCase().includes(search.toLowerCase())
        )
        : files

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search files…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-9"
                    />
                </div>
                <Button onClick={() => setShowUpload((s) => !s)}>
                    <Plus className="w-4 h-4" />
                    Upload Files
                </Button>
            </div>

            {/* Upload panel */}
            {showUpload && (
                <div className="p-6 card animate-slide-down">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold font-display text-slate-900">Upload Files</h3>
                        <button onClick={() => setShowUpload(false)} className="px-2 btn-ghost btn-sm">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <FileDropzone onUploaded={handleUploaded} maxFiles={10} />
                </div>
            )}

            {/* File grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center card">
                    <div className="flex items-center justify-center mb-4 rounded-full w-14 h-14 bg-slate-100">
                        <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                        {search ? 'No files match your search' : 'No files yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {search ? 'Try a different search term' : 'Upload your first file to get started'}
                    </p>
                    {!search && (
                        <Button className="mt-4" size="sm" onClick={() => setShowUpload(true)}>
                            <Plus className="w-4 h-4" /> Upload Files
                        </Button>
                    )}
                </div>
            ) : (
                <div className={clsx(
                    'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 transition-opacity',
                    pending && 'opacity-60'
                )}>
                    {filtered.map((file) => (
                        <FileCard
                            key={file.id}
                            file={file}
                            canDelete={isAdmin || file.uploaded_by === userId}
                            onDelete={handleDelete}
                            onPreview={setPreview}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {result.total_pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {result.total} files total
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => startTransition(() => router.push(`/files?page=${result.page - 1}`))}
                            disabled={result.page <= 1}
                            className="btn-secondary btn-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 text-sm text-slate-600">
                            {result.page} / {result.total_pages}
                        </span>
                        <button
                            onClick={() => startTransition(() => router.push(`/files?page=${result.page + 1}`))}
                            disabled={result.page >= result.total_pages}
                            className="btn-secondary btn-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Preview modal */}
            {preview && (
                <PreviewModal file={preview} onClose={() => setPreview(null)} />
            )}
        </div>
    )
}