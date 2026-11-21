import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, XIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';
import { attachmentSrc, downloadAttachment } from '@/lib/files';

function formatViewerTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * WhatsApp-style full-screen image viewer.
 * - Dark translucent backdrop (click closes) with the image centered.
 * - Previous/Next navigation across every image in the conversation.
 * - Escape / ArrowLeft / ArrowRight keyboard support.
 * - Download with the original filename + loading/error states.
 */
export const ImageViewerModal = ({
    open,
    onClose,
    images = [], // [{ attachment, senderName, senderAvatar, createdAt }]
    index = 0,
    onNavigate,
}) => {
    const { auth } = useAuth();
    const { toast } = useToast();
    const [status, setStatus] = useState('loading');
    const closeRef = useRef(null);

    const entry = images[index];
    const attachment = entry?.attachment;
    const baseURL = import.meta.env.VITE_BACKEND_API_URL || '';
    const src = attachment
        ? attachmentSrc(baseURL, attachment.url, auth?.token)
        : '';
    const canPrev = index > 0;
    const canNext = index < images.length - 1;

    const goPrev = useCallback(
        () => canPrev && onNavigate?.(index - 1),
        [canPrev, index, onNavigate]
    );
    const goNext = useCallback(
        () => canNext && onNavigate?.(index + 1),
        [canNext, index, onNavigate]
    );

    // Reset load state when the displayed image changes.
    useEffect(() => {
        setStatus('loading');
    }, [src]);

    const handleKey = useCallback(
        (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goNext();
            }
        },
        [goPrev, goNext, onClose]
    );

    useEffect(() => {
        if (!open) return;
        window.addEventListener('keydown', handleKey);
        closeRef.current?.focus();
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, handleKey]);

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

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={`Image viewer: ${attachment?.originalName}`}
            onMouseDown={(e) => {
                // Clicking the dark background closes; clicks on children (the
                // image, buttons) do not bubble here from the img itself.
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* Header with sender info + actions */}
            <div className="flex shrink-0 items-center gap-3 px-4 py-3">
                <Avatar className="size-8 shrink-0 rounded-full">
                    <AvatarImage src={entry?.senderAvatar} alt={entry?.senderName} />
                    <AvatarFallback className="rounded-full bg-white/20 text-xs font-semibold text-white">
                        {(entry?.senderName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                        {entry?.senderName}
                    </p>
                    <p className="text-[11px] text-white/60">
                        {formatViewerTime(entry?.createdAt)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Download image"
                >
                    <DownloadIcon className="size-5" />
                </button>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Close image viewer"
                >
                    <XIcon className="size-5" />
                </button>
            </div>

            {/* Center stage */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6">
                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={!canPrev}
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        aria-label="Previous image"
                    >
                        <ChevronLeftIcon className="size-6" />
                    </button>
                )}

                {status === 'loading' && (
                    <span className="absolute flex items-center justify-center">
                        <span className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    </span>
                )}

                {status === 'error' ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-sm text-white/70">
                            This image is no longer available.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="text-xs font-medium text-white/80 underline underline-offset-2 hover:text-white"
                        >
                            Reload the page
                        </button>
                    </div>
                ) : (
                    <img
                        key={attachment.filename}
                        src={src}
                        alt={attachment.originalName}
                        draggable={false}
                        onLoad={() => setStatus('loaded')}
                        onError={() => setStatus('error')}
                        className={`max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-opacity duration-200 ${
                            status === 'loading' ? 'opacity-0' : 'opacity-100'
                        }`}
                    />
                )}

                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={!canNext}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        aria-label="Next image"
                    >
                        <ChevronRightIcon className="size-6" />
                    </button>
                )}

                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">
                    {index + 1} / {images.length}
                </span>
            </div>
        </div>
    );
};
