'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip, Download, Trash2, Plus, X, FileText, Image, Film } from 'lucide-react'
import { clsx } from 'clsx'
import FileDropzone from '@/components/ui/FileDropzone'
import type { DBFile } from '@/types'

type FileRow = DBFile & { uploader_name: string | null }

function isImage(type: string) {
    return type.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileTypeIcon({ type }: { type: string }) {
    // eslint-disable-next-line jsx-a11y/alt-text
    if (isImage(type)) return <Image className="w-4 h-4 text-blue-400" />
    if (type.startsWith('video')) return <Film className="w-4 h-4 text-violet-400" />
    return <FileText className="w-4 h-4 text-slate-400" />
}

interface Props {
    requestId: string
    initialFiles: FileRow[]
    canUpload: boolean
    canDelete: boolean
    userId: string
}

export default function RequestFilesPanel({
    requestId,
    initialFiles,
    canUpload,
    canDelete,
    userId,
}: Props) {
    const router = useRouter()
    const [files, setFiles] = useState<FileRow[]>(initialFiles)
    const [showUpload, setShowUpload] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    function handleUploaded(uploaded: FileRow) {
        setFiles((prev) => [uploaded as FileRow, ...prev])
        setShowUpload(false)
        router.refresh()
    }

    async function handleDelete(file: FileRow) {
        if (!confirm(`Remove "${file.original_name}"?`)) return
        setDeleting(file.id)
        try {
            await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
            setFiles((prev) => prev.filter((f) => f.id !== file.id))
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <h2 className="font-semibold font-display text-slate-900">Attachments</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {files.length}
                    </span>
                </div>

                {canUpload && (
                    <button
                        onClick={() => setShowUpload((s) => !s)}
                        className="btn-ghost btn-sm"
                    >
                        {showUpload
                            ? <><X className="w-3.5 h-3.5" /> Cancel</>
                            : <><Plus className="w-3.5 h-3.5" /> Add files</>
                        }
                    </button>
                )}
            </div>

            {/* Upload zone */}
            {showUpload && (
                <div className="px-6 py-4 border-b border-slate-100 animate-slide-down">
                    <FileDropzone
                        requestId={requestId}
                        onUploaded={(f) => handleUploaded(f as FileRow)}
                        maxFiles={5}
                    />
                </div>
            )}

            {/* File list */}
            {files.length === 0 ? (
                <div className="py-10 text-center">
                    <p className="text-sm text-slate-400">No files attached to this request.</p>
                    {canUpload && (
                        <button
                            onClick={() => setShowUpload(true)}
                            className="mt-3 btn-secondary btn-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Attach a file
                        </button>
                    )}
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-slate-50/50"
                        >
                            {/* Thumbnail or icon */}
                            <div className="flex items-center justify-center overflow-hidden rounded-lg w-9 h-9 bg-slate-100 shrink-0">
                                {isImage(file.file_type) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={file.cloudinary_url}
                                        alt={file.original_name}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <FileTypeIcon type={file.file_type} />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-slate-800">{file.original_name}</p>
                                <p className="text-xs text-slate-400">
                                    {formatBytes(file.file_size)}
                                    {file.uploader_name && ` · ${file.uploader_name}`}
                                    {' · '}{new Date(file.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                    href={file.cloudinary_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 btn-ghost btn-sm"
                                    title="Download"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </a>

                                {canDelete && (file.uploaded_by === userId || canDelete) && (
                                    <button
                                        onClick={() => handleDelete(file)}
                                        disabled={deleting === file.id}
                                        className={clsx('btn-ghost btn-sm px-2 text-red-400 hover:text-red-600 hover:bg-red-50', deleting === file.id && 'opacity-50')}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}