import { DownloadIcon, FileArchiveIcon, FileSlidersIcon, FilesIcon, FileSpreadsheetIcon, FileTextIcon, FileTypeIcon, PresentationIcon } from 'lucide-react';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
    detectKind,
    downloadAttachment,
    formatFileSize,
    getFileExtension,
} from '@/lib/files';

const KIND_META = {
    image: { tint: 'bg-dash-green-500/10 text-dash-green-700', icon: FilesIcon },
    video: { tint: 'bg-dash-violet-500/10 text-dash-violet-600', icon: FileSlidersIcon },
    pdf: { tint: 'bg-dash-red-500/10 text-dash-red-600', icon: FileTextIcon },
    word: { tint: 'bg-dash-sky-500/10 text-dash-sky-700', icon: FileTypeIcon },
    excel: { tint: 'bg-dash-green-500/10 text-dash-green-700', icon: FileSpreadsheetIcon },
    powerpoint: { tint: 'bg-dash-yellow-400/20 text-dash-yellow-800', icon: PresentationIcon },
    archive: { tint: 'bg-gray-100 text-gray-600', icon: FileArchiveIcon },
    text: { tint: 'bg-gray-100 text-gray-600', icon: FileTextIcon },
    file: { tint: 'bg-gray-100 text-gray-600', icon: FileTypeIcon },
};

const PREVIEWABLE_CATEGORIES = new Set(['pdf', 'image', 'video']);

/**
 * Used by chat messages, the upload preview modal and file viewer lists to pick
 * a per-kind fallback icon/tint.
 */
export const AttachmentKindIcon = ({ kind, className }) => {
    const meta = KIND_META[kind] ?? KIND_META.file;
    const Icon = meta.icon;
    return (
        <span
            className={`flex items-center justify-center rounded-lg ${meta.tint} ${className}`}
        >
            <Icon className="size-4" />
        </span>
    );
};

export const FileAttachmentCard = ({ attachment, attachmentIndex, onOpen }) => {
    const { auth } = useAuth();
    const { toast } = useToast();

    const kind = detectKind(attachment?.mimetype, attachment?.originalName);
    const ext = getFileExtension(attachment?.originalName);
    const canPreview = PREVIEWABLE_CATEGORIES.has(kind);

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
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50">
            <button
                type="button"
                disabled={!onOpen}
                onClick={() => onOpen?.(attachmentIndex)}
                className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40 rounded-lg disabled:cursor-default"
            >
                <AttachmentKindIcon kind={kind} className="size-10" />
            </button>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                    {attachment?.originalName}
                </p>
                <p className="text-[11px] text-gray-400">
                    {ext ? `${ext} • ` : ''}
                    {formatFileSize(attachment?.size)}
                </p>
            </div>
            <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-dash-violet-500/10 px-2.5 text-xs font-medium text-dash-violet-700 transition-colors hover:bg-dash-violet-500 hover:text-white"
                aria-label={`Download ${attachment?.originalName}`}
            >
                <DownloadIcon className="size-3.5" />
                Download
            </button>
        </div>
    );
};
