import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/context/useAuth';
import { attachmentSrc, detectKind, getFileExtension } from '@/lib/files';

/**
 * Clickable image preview rendered inline in a chat message.
 * Handles the authenticated src, loading spinner and error fallback.
 */
export const ImageThumbnail = ({ attachment, onOpen, className, alt }) => {
    const { auth } = useAuth();
    const [status, setStatus] = useState('loading'); // loading | loaded | error

    const src = attachmentSrc(
        import.meta.env.VITE_BACKEND_API_URL || '',
        attachment?.url,
        auth?.token
    );
    const name = attachment?.originalName || alt || 'image';
    const ext = getFileExtension(name) || 'IMG';

    return (
        <button
            type="button"
            onClick={() => status === 'loaded' && onOpen?.(attachment)}
            className={cn(
                'relative block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40',
                className
            )}
            aria-label={`${status === 'loaded' ? 'Open' : 'Attachment image'}: ${name}`}
            title={name}
        >
            {status !== 'error' && (
                <img
                    src={src}
                    alt={name}
                    loading="lazy"
                    onLoad={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
                    className={cn(
                        'block max-h-72 max-w-[260px] object-contain transition-opacity duration-200',
                        status === 'loading' ? 'opacity-0' : 'opacity-100'
                    )}
                />
            )}

            {status === 'loading' && (
                <span className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="size-5 animate-spin rounded-full border-2 border-dash-violet-200 border-t-dash-violet-500" />
                </span>
            )}

            {status === 'error' && (
                <span className="flex h-28 w-40 flex-col items-center justify-center gap-1 bg-gray-100 text-center">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-gray-200 text-[10px] font-bold text-gray-500">
                        {ext.slice(0, 4)}
                    </span>
                    <span className="max-w-[130px] truncate px-2 text-[10px] text-gray-400">
                        Preview unavailable
                    </span>
                </span>
            )}
        </button>
    );
};
