import { useRef, useState } from 'react';

import { AttachmentMenu } from '@/components/molecules/Message/AttachmentMenu';
import { EmojiPicker } from '@/components/molecules/Message/EmojiPicker';
import { UploadPreviewModal } from '@/components/molecules/Message/UploadPreviewModal';
import { useToast } from '@/hooks/use-toast';
import { validateFiles } from '@/lib/files';

export const ChatInput = ({
    onSubmit,
    onMessageSent,
    channelId,
    disabled,
    placeholder,
}) => {
    const [body, setBody] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [stagedFiles, setStagedFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const dragCounterRef = useRef(0);
    const textareaRef = useRef(null);
    const caretRef = useRef({ start: 0, end: 0 });
    const { toast } = useToast();

    function stageFiles(picked, { openPreview = true } = {}) {
        const { valid, errors } = validateFiles(picked, stagedFiles);

        if (errors.length > 0) {
            toast({
                title: errors[0],
                description:
                    errors.length > 1
                        ? `${errors.length - 1} more file${errors.length > 2 ? 's' : ''} rejected.`
                        : undefined,
                variant: 'destructive',
            });
        }
        if (valid.length === 0) return;

        setStagedFiles((prev) => {
            const merged = [...prev, ...valid];
            if (openPreview) setPreviewOpen(true);
            return merged;
        });
    }

    function handleDrop(e) {
        e.preventDefault();
        dragCounterRef.current = 0;
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) stageFiles(files);
    }

    function handleDragEnter(e) {
        e.preventDefault();
        dragCounterRef.current += 1;
        setDragActive(true);
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setDragActive(false);
        }
    }

    /** Text-only send path (files go through the preview modal instead). */
    async function handleTextSubmit(e) {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed || disabled) return;

        setBody('');
        try {
            await onSubmit({ body: trimmed, files: [] });
        } catch (error) {
            console.log('Failed to send message', error);
            setBody(trimmed);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSubmit(e);
        }
    }

    /** Remember the caret so emoji picked while the textarea is blurred are
     *  inserted where the user left off (WhatsApp behaviour). */
    function rememberCaret() {
        const textarea = textareaRef.current;
        if (!textarea) return;
        caretRef.current = {
            start: textarea.selectionStart ?? 0,
            end: textarea.selectionEnd ?? 0,
        };
    }

    function insertEmoji(emoji) {
        const textarea = textareaRef.current;
        if (!textarea) {
            setBody((prev) => `${prev}${emoji}`);
            return;
        }

        const focused = document.activeElement === textarea;
        const start = Math.min(
            (focused ? textarea.selectionStart : caretRef.current.start) ?? body.length,
            body.length
        );
        const end = Math.min(
            (focused ? textarea.selectionEnd : caretRef.current.end) ?? start,
            body.length
        );

        setBody((prev) => `${prev.slice(0, start)}${emoji}${prev.slice(end)}`);
        caretRef.current = { start: start + emoji.length, end: start + emoji.length };

        // Keep typing without closing the picker.
        requestAnimationFrame(() => {
            textarea.focus();
            const caret = start + emoji.length;
            textarea.setSelectionRange(caret, caret);
        });
    }

    /** Send the freshly-picked files with an optional caption — only clear the
     *  composer when the backend confirms (the modal triggers success itself). */
    function handleMessageSent(savedMessage) {
        setStagedFiles([]);
        onMessageSent?.(savedMessage);
    }

    const hasText = body.trim().length > 0;

    return (
        <div
            className="ws-composer relative shrink-0 px-3 pt-1 pb-3 lg:px-4 lg:pb-4"
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
        >
            {dragActive && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-dash-violet-400 bg-dash-violet-500/10">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-dash-violet-700 shadow">
                        Drop files to attach
                    </span>
                </div>
            )}

            <form
                onSubmit={handleTextSubmit}
                className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition-all focus-within:border-dash-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-dash-violet-500/10"
            >
                <AttachmentMenu
                    onSelectFiles={(files) => stageFiles(files)}
                    disabled={disabled}
                />

                {stagedFiles.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="h-9 max-w-[46%] shrink truncate rounded-lg border border-dash-violet-200 bg-dash-violet-500/5 px-2.5 text-xs font-medium text-dash-violet-700 transition hover:bg-dash-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40 sm:max-w-[220px]"
                        title="Review attachments"
                    >
                        📎 {stagedFiles.length} file{stagedFiles.length === 1 ? '' : 's'} · review
                    </button>
                )}

                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={body}
                    disabled={disabled}
                    onChange={(e) => {
                        setBody(e.target.value);
                        rememberCaret();
                    }}
                    onSelect={rememberCaret}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || 'Type a message'}
                    className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-1.5 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                />

                <EmojiPicker onSelect={insertEmoji} disabled={disabled} />

                <button
                    type="submit"
                    disabled={disabled || !hasText}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500 text-white shadow-xs transition-colors hover:bg-dash-violet-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                    aria-label="Send message"
                >
                    <PaperclipSendIcon />
                </button>
            </form>

            <p className="mt-1.5 hidden px-1 text-[11px] text-gray-400 sm:block">
                Press <span className="font-medium text-gray-500">Enter</span> to send
                <span className="mx-1.5 text-gray-300">•</span>
                <span className="font-medium text-gray-500">Shift + Enter</span> for a new line
            </p>

            <UploadPreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                files={stagedFiles}
                channelId={channelId}
                onChangeFiles={setStagedFiles}
                onMessageSent={handleMessageSent}
                onSendText={(text) => {
                    // Caption-only fallback: send as a normal text message.
                    if (text) onSubmit({ body: text, files: [] }).catch(() => {});
                }}
            />
        </div>
    );
};

function PaperclipSendIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
        >
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
        </svg>
    );
}
