'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileText, Image, Film } from 'lucide-react'
import { clsx } from 'clsx'

interface UploadedFile {
    id: string
    original_name: string
    cloudinary_url: string
    file_type: string
    file_size: number
}

interface PendingFile {
    id: string
    file: File
    status: 'pending' | 'uploading' | 'done' | 'error'
    progress: number
    result?: UploadedFile
    error?: string
}

interface FileDropzoneProps {
    requestId?: string
    onUploaded?: (file: UploadedFile) => void
    maxFiles?: number
    className?: string
}

function FileIcon({ type }: { type: string }) {
    // eslint-disable-next-line jsx-a11y/alt-text
    if (type.startsWith('image')) return <Image className="w-5 h-5 text-blue-500" />
    if (type.startsWith('video')) return <Film className="w-5 h-5 text-violet-500" />
    return <FileText className="w-5 h-5 text-slate-400" />
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function generateId(): string {
    return Math.random().toString(36).slice(2, 11)
}

export default function FileDropzone({
    requestId,
    onUploaded,
    maxFiles = 10,
    className,
}: FileDropzoneProps) {
    const [files, setFiles] = useState<PendingFile[]>([])
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const updateFile = useCallback((id: string, patch: Partial<PendingFile>) => {
        setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f))
    }, [])

    async function uploadOne(pending: PendingFile) {
        updateFile(pending.id, { status: 'uploading', progress: 10 })

        const form = new FormData()
        form.append('file', pending.file)
        if (requestId) form.append('request_id', requestId)

        try {
            updateFile(pending.id, { progress: 40 })

            const res = await fetch('/api/files/upload', {
                method: 'POST',
                body: form,
            })

            updateFile(pending.id, { progress: 80 })

            const json = await res.json()

            if (!res.ok || !json.success) {
                updateFile(pending.id, { status: 'error', error: json.error ?? 'Upload failed' })
                return
            }

            updateFile(pending.id, { status: 'done', progress: 100, result: json.data })
            onUploaded?.(json.data)
        } catch {
            updateFile(pending.id, { status: 'error', error: 'Network error. Please retry.' })
        }
    }

    function addFiles(incoming: File[]) {
        const remaining = maxFiles - files.length
        const toAdd = incoming.slice(0, remaining)

        const pending: PendingFile[] = toAdd.map((file) => ({
            id: generateId(),
            file,
            status: 'pending',
            progress: 0,
        }))

        setFiles((prev) => [...prev, ...pending])

        // Upload each immediately
        pending.forEach(uploadOne)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragging(false)
        const dropped = Array.from(e.dataTransfer.files)
        addFiles(dropped)
    }

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? [])
        addFiles(selected)
        e.target.value = '' // allow re-selecting same file
    }

    function removeFile(id: string) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
    }

    const canAdd = files.length < maxFiles

    return (
        <div className={clsx('space-y-3', className)}>
            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => canAdd && inputRef.current?.click()}
                className={clsx(
                    'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                    canAdd ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                    dragging
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/30'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleInput}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,video/*,audio/*"
                />

                <div className="flex flex-col items-center gap-2">
                    <div className={clsx(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                        dragging ? 'bg-brand-100' : 'bg-slate-100'
                    )}>
                        <Upload className={clsx('w-5 h-5', dragging ? 'text-brand-600' : 'text-slate-400')} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700">
                            {dragging ? 'Drop files here' : 'Drop files or click to browse'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Images, PDF, Word, Excel, video — up to 25 MB each
                        </p>
                    </div>
                    {files.length > 0 && (
                        <p className="text-xs text-slate-400">
                            {files.length}/{maxFiles} files
                        </p>
                    )}
                </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3 bg-white border rounded-lg border-slate-200">
                            <FileIcon type={f.file.type} />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-slate-800">{f.file.name}</p>
                                <p className="text-xs text-slate-400">{formatBytes(f.file.size)}</p>

                                {/* Progress bar */}
                                {f.status === 'uploading' && (
                                    <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-300 rounded-full bg-brand-500"
                                            style={{ width: `${f.progress}%` }}
                                        />
                                    </div>
                                )}

                                {f.status === 'error' && (
                                    <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
                                )}
                            </div>

                            {/* Status icon */}
                            <div className="shrink-0">
                                {f.status === 'uploading' && (
                                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                                )}
                                {f.status === 'done' && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                )}
                                {f.status === 'error' && (
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                )}
                                {f.status === 'pending' && (
                                    <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                                )}
                            </div>

                            {/* Remove */}
                            {(f.status === 'done' || f.status === 'error') && (
                                <button
                                    onClick={() => removeFile(f.id)}
                                    className="p-1 transition-colors rounded shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}