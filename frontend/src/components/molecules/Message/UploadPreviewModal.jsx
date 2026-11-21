import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PlusIcon, SendHorizontalIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { AttachmentPreviewModal } from '@/components/molecules/Message/AttachmentPreviewModal';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/apis/messages/useFileUpload';
import { cn } from '@/lib/utils';
import {
    detectKind,
    formatFileSize,
    getFileExtension,
} from '@/lib/files';

/**
 * WhatsApp-style modal shown after the user picks files:
 * large media preview of the selected file, thumbnail strip for every file
 * (tap a thumbnail to preview it), caption input, add-more, remove, progress,
 * error banner with retry, and cancel-with-confirmation while uploading.
 */
export const UploadPreviewModal = ({ open, onClose, files = [], channelId, onChangeFiles, onMessageSent, onSendText }) => {
    // Object URLs created once per file (keyed by File reference index) and
    // revoked when the modal closes / file list changes.
    const urlMapRef = useRef(new Map());

    const [selected, setSelected] = useState(0);
    const [caption, setCaption] = useState('');
    const [error, setError] = useState(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [videoPreview, setVideoPreview] = useState(null); // attachment-like
    const sendingRef = useRef(false);
    const sendInputRef = useRef(null);

    const { uploads, isUploading, uploadFiles } = useFileUpload(channelId);

    // Keep object URLs in sync with the staged file list: create for new
    // files, revoke for removed ones. Everything is revoked on close/unmount.
    const fileKey = files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');
    useEffect(() => {
        if (!open) return;
        const map = urlMapRef.current;
        const keys = new Set(
            files.map((f) => `${f.name}:${f.size}:${f.lastModified}`)
        );
        // Create missing URLs.
        for (const file of files) {
            const key = `${file.name}:${file.size}:${file.lastModified}`;
            if (!map.has(key)) map.set(key, URL.createObjectURL(file));
        }
        // Revoke URLs for files no longer staged.
        for (const key of Array.from(map.keys())) {
            if (!keys.has(key)) {
                URL.revokeObjectURL(map.get(key));
                map.delete(key);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileKey, open]);

    // Modal closed — revoke URLs and reset transient state.
    useEffect(() => {
        if (open) return;
        for (const [, url] of urlMapRef.current) {
            URL.revokeObjectURL(url);
        }
        urlMapRef.current = new Map();
        setSelected(0);
        setCaption('');
        setError(null);
        setConfirmCancel(false);
        setVideoPreview(null);
        sendingRef.current = false;
    }, [open]);

    // Clamp selection if files were removed.
    useEffect(() => {
        if (selected >= files.length) setSelected(Math.max(0, files.length - 1));
    }, [files.length, selected]);

    // Global object-URL cleanup on unmount.
    useEffect(() => {
        const map = urlMapRef.current;
        return () => {
            for (const [, url] of map) {
                URL.revokeObjectURL(url);
            }
            map.clear();
        };
    }, []);

    function objectUrlFor(file) {
        return urlMapRef.current.get(`${file.name}:${file.size}:${file.lastModified}`);
    }

    function removeFile(index) {
        const next = files.filter((_, i) => i !== index);
        onChangeFiles?.(next);
    }

    function handleClose() {
        if (isUploading) {
            setConfirmCancel(true);
            return;
        }
        onClose?.();
    }

    function handleBackdropMouseDown(e) {
        if (e.target === e.currentTarget) handleClose();
    }

    async function handleSend() {
        if (sendingRef.current) return;

        // Caption only, no files left staged → send as a normal text message.
        if (files.length === 0) {
            const text = caption.trim();
            onSendText?.(text);
            onClose?.();
            return;
        }

        sendingRef.current = true;
        setError(null);

        try {
            const savedMessage = await uploadFiles(files, caption);
            sendingRef.current = false;
            if (!savedMessage) {
                setError('Upload failed. Please try again.');
                return;
            }
            onMessageSent?.(savedMessage);
            onClose?.();
        } catch (err) {
            sendingRef.current = false;
            setError(err?.message || 'Upload failed. Please try again.');
        }
    }

    const progress = uploads.length
        ? Math.round(
              uploads.reduce((sum, u) => sum + (u.status === 'completed' ? 100 : u.progress || 0), 0) /
                  uploads.length
          )
        : 0;

    const selectedFile = files[selected];
    const selectedKind = selectedFile ? detectKind(selectedFile?.type, selectedFile?.name) : 'file';
    const selectedUrl = selectedFile ? objectUrlFor(selectedFile) : undefined;

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 animate-in fade-in duration-150"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Review attachments before sending"
                    onMouseDown={handleBackdropMouseDown}
                >
                    <div
                        className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-2xl sm:max-w-3xl animate-in zoom-in-95 duration-150"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-white">Send files</h2>
                                <p className="text-[11px] text-white/50">
                                    {files.length} file{files.length === 1 ? '' : 's'} selected
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                aria-label="Close preview"
                            >
                                <XIcon className="size-5" />
                            </button>
                        </div>

                        {/* Preview stage */}
                        <div className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden bg-[#0b0f14] px-4 py-6">
                            {files.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <p className="text-sm text-white/60">No files staged.</p>
                                    <button
                                        type="button"
                                        onClick={() => sendInputRef.current?.click()}
                                        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
                                    >
                                        <PlusIcon className="size-4" />
                                        Add files
                                    </button>
                                </div>
                            ) : selectedKind === 'image' ? (
                                <img
                                    src={selectedUrl}
                                    alt={selectedFile?.name}
                                    className="max-h-[46vh] max-w-full rounded-lg object-contain shadow-lg"
                                />
                            ) : selectedKind === 'video' ? (
                                <video
                                    src={selectedUrl}
                                    className="max-h-[46vh] max-w-full rounded-lg"
                                    controls
                                    muted={false}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white/80">
                                        {getFileExtension(selectedFile?.name).slice(0, 5) || 'FILE'}
                                    </span>
                                    <p className="max-w-[280px] truncate text-sm text-white/80">
                                        {selectedFile?.name}
                                    </p>
                                    <p className="text-[11px] text-white/50">
                                        {formatFileSize(selectedFile?.size)}
                                    </p>
                                </div>
                            )}

                            {/* Progress overlay */}
                            {isUploading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                                    <Loader2Icon className="size-6 animate-spin text-white/80" />
                                    <p className="text-xs font-medium text-white/80">
                                        Uploading… {progress}%
                                    </p>
                                    <div className="h-1.5 w-52 overflow-hidden rounded-full bg-white/15">
                                        <div
                                            className="h-full rounded-full bg-dash-violet-500 transition-[width] duration-200"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {files.length > 0 && (
                            <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-2 pt-1">
                                {files.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(Math.max(0, selected - 1))}
                                            disabled={selected === 0}
                                            className="rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30"
                                            aria-label="Previous file"
                                        >
                                            <ChevronLeftIcon className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(Math.min(files.length - 1, selected + 1))}
                                            disabled={selected === files.length - 1}
                                            className="rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30"
                                            aria-label="Next file"
                                        >
                                            <ChevronRightIcon className="size-4" />
                                        </button>
                                    </>
                                )}

                                {files.map((file, i) => {
                                    const kind = detectKind(file.type, file.name);
                                    const url = objectUrlFor(file);
                                    return (
                                        <div key={`${file.name}:${file.size}:${file.lastModified}`} className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(i)}
                                                className={cn(
                                                    'block size-14 overflow-hidden rounded-lg border-2 transition',
                                                    i === selected
                                                        ? 'border-dash-violet-400 ring-2 ring-dash-violet-500/40'
                                                        : 'border-white/10 hover:border-white/30'
                                                )}
                                                aria-label={`Select ${file.name}`}
                                                aria-current={i === selected}
                                            >
                                                {kind === 'image' ? (
                                                    <img src={url} alt={file.name} className="size-full object-cover" />
                                                ) : kind === 'video' ? (
                                                    <video src={url} muted className="size-full object-cover" />
                                                ) : (
                                                    <span className="flex size-full items-center justify-center bg-white/10 text-[10px] font-bold text-white/70">
                                                        {getFileExtension(file.name).slice(0, 4) || 'FILE'}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-800 p-0.5 text-white shadow ring-1 ring-white/20 transition hover:bg-dash-red-500"
                                                aria-label={`Remove ${file.name}`}
                                            >
                                                <XIcon className="size-3" />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Add more */}
                                <button
                                    type="button"
                                    onClick={() => sendInputRef.current?.click()}
                                    disabled={files.length >= 10}
                                    className="flex size-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-white/60 transition hover:border-white/40 hover:text-white disabled:opacity-30"
                                    aria-label="Add more files"
                                >
                                    <PlusIcon className="size-5" />
                                </button>
                                <input
                                    ref={sendInputRef}
                                    type="file"
                                    multiple
                                    hidden
                                    onChange={(e) => {
                                        const picked = Array.from(e.target.files || []);
                                        if (picked.length) onChangeFiles?.([...files, ...picked]);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        )}

                        {/* Error banner */}
                        {error && (
                            <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-dash-red-500/30 bg-dash-red-500/10 px-3 py-2">
                                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-dash-red-400" />
                                <p className="flex-1 text-xs text-dash-red-200">{error}</p>
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={isUploading}
                                    className="shrink-0 text-xs font-semibold text-white underline underline-offset-2 disabled:opacity-40"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Cancel/upload confirmation */}
                        {confirmCancel && isUploading && (
                            <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                                <p className="flex-1 text-xs text-white/90">
                                    An upload is in progress. Cancel it?
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onClose?.()}
                                    className="shrink-0 rounded-lg bg-dash-red-500 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                    Discard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmCancel(false)}
                                    className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                    Keep uploading
                                </button>
                            </div>
                        )}

                        {/* Caption + send */}
                        <div className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-gray-900 px-3 py-3">
                            <textarea
                                rows={1}
                                value={caption}
                                disabled={isUploading}
                                onChange={(e) => setCaption(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Add a caption…"
                                className="max-h-24 min-h-[38px] flex-1 resize-none rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/40 focus:ring-dash-violet-400/60 disabled:opacity-50"
                            />
                            <Button
                                type="button"
                                onClick={handleSend}
                                disabled={isUploading || (files.length === 0 && !caption.trim())}
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500 p-0 hover:bg-dash-violet-600 disabled:bg-white/10 disabled:text-white/30"
                                aria-label="Send with attachments"
                            >
                                {isUploading ? (
                                    <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                    <SendHorizontalIcon className="size-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video-in-modal tap-through preview (fullscreen-ish) */}
            <AttachmentPreviewModal
                open={!!videoPreview}
                onClose={() => setVideoPreview(null)}
                attachment={videoPreview}
            />
        </>
    );
};
