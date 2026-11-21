import { useEffect, useRef } from 'react';
import { DownloadIcon, ExternalLinkIcon, XIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
    attachmentSrc,
    downloadAttachment,
    detectKind,
    formatFileSize,
} from '@/lib/files';

/**
 * Full-screen modal for non-image attachments.
 * Videos get an HTML5 player; PDFs get an iframe preview; anything else falls
 * back to an open/download action. Same dark translucent style as the image
 * viewer.
 */
export const AttachmentPreviewModal = ({ open, onClose, attachment, senderName }) => {
    const { auth } = useAuth();
    const { toast } = useToast();
    const closeRef = useRef(null);

    const kind = detectKind(attachment?.mimetype, attachment?.originalName);
    const baseURL = import.meta.env.VITE_BACKEND_API_URL || '';
    const src = attachmentSrc(baseURL, attachment?.url, auth?.token);

    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        closeRef.current?.focus();
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !attachment) return null;

    async function handleDownload() {
        try {
            await downloadAttachment(attachment, auth?.token);
        } catch (error) {
            toast({
                title: error?.message || 'Download failed',
                variant: 'destructive',
            });
        }
    }

    function openInNewTab() {
        window.open(src, '_blank', 'noopener,noreferrer');
    }

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/90 transition-opacity duration-200 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${attachment?.originalName}`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <Avatar className="size-8 shrink-0 rounded-full">
                    <AvatarFallback className="rounded-full bg-white/20 text-xs font-semibold text-white">
                        {(senderName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{senderName}</p>
                    <p className="truncate text-[11px] text-white/60">
                        {attachment?.originalName} • {formatFileSize(attachment?.size)}
                    </p>
                </div>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Close preview"
                >
                    <XIcon className="size-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 items-center justify-center overflow-auto px-4 pb-6">
                {kind === 'video' ? (
                    <video
                        src={src}
                        controls
                        autoPlay
                        playsInline
                        className="max-h-full max-w-full rounded-lg bg-black shadow-2xl"
                    />
                ) : kind === 'pdf' ? (
                    <div className="flex h-full w-full max-w-4xl flex-col gap-3">
                        <iframe
                            src={src}
                            title={attachment?.originalName}
                            className="h-full w-full flex-1 rounded-lg bg-white"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-10 py-12 text-center">
                        <p className="text-sm text-white/70">
                            No inline preview available
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={openInNewTab}
                                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                            >
                                <ExternalLinkIcon className="size-4" />
                                Open in browser
                            </button>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-200"
                            >
                                <DownloadIcon className="size-4" />
                                Download
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            {kind === 'pdf' && (
                <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
                    <button
                        type="button"
                        onClick={openInNewTab}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
                    >
                        <ExternalLinkIcon className="size-3.5" />
                        Open in browser
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-200"
                    >
                        <DownloadIcon className="size-3.5" />
                        Download
                    </button>
                </div>
            )}
        </div>
    );
};
