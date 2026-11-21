import { useState } from 'react';
import { PencilIcon, SmilePlusIcon, Trash2Icon, XIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/molecules/Message/EmojiPicker';
import { ImageThumbnail } from '@/components/molecules/Message/ImageThumbnail';
import { FileAttachmentCard } from '@/components/molecules/Message/FileAttachmentCard';
import { AttachmentPreviewModal } from '@/components/molecules/Message/AttachmentPreviewModal';
import { useAuth } from '@/hooks/context/useAuth';
import { getEmojiOnlyCount } from '@/lib/emojis';
import { detectKind } from '@/lib/files';

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function basename(url = '') {
    try {
        return decodeURIComponent(new URL(url, 'http://x').pathname.split('/').pop()) || 'file';
    } catch {
        return 'file';
    }
}

export const Message = ({ message, onEdit, onDelete, onOpenViewer, onToggleReaction }) => {
    const { auth } = useAuth();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(message?.body ?? '');
    const [previewAttachment, setPreviewAttachment] = useState(null); // for non-image previews

    const sender = message?.senderId;
    const senderId =
        (typeof sender === 'object' ? sender?._id : sender) ?? '';
    const isMine = String(senderId) === String(auth?.user?.id ?? auth?.user?._id ?? '');

    const senderName =
        (typeof sender === 'object' && (sender?.username || sender?.email)) ||
        'Unknown user';
    const senderAvatar = typeof sender === 'object' ? sender?.avatar : undefined;
    const initial = senderName.charAt(0).toUpperCase();

    // Current attachments, with graceful support for the legacy single-image
    // field that existed before the attachments array was introduced.
    let attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    if (attachments.length === 0 && message?.image) {
        const legacyUrl = message.image;
        const ext = legacyUrl.split('.').pop()?.toLowerCase() ?? '';
        attachments = [
            {
                filename: basename(legacyUrl),
                originalName: basename(legacyUrl),
                mimetype:
                    ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
                        ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
                        : 'image/png',
                size: 0,
                url: legacyUrl,
            },
        ];
    }

    const images = attachments.filter(
        (a) => detectKind(a?.mimetype, a?.originalName) === 'image'
    );
    const others = attachments.filter(
        (a) => detectKind(a?.mimetype, a?.originalName) !== 'image'
    );

    async function handleSaveEdit(e) {
        e.preventDefault();
        const trimmed = draft.trim();
        if (!trimmed || trimmed === message?.body) {
            setEditing(false);
            return;
        }
        try {
            await onEdit?.(message._id, trimmed);
            setEditing(false);
        } catch (error) {
            console.log('Failed to edit message', error);
        }
    }

    const hasBody = !!message?.body;
    // WhatsApp-style: messages made of a few emoji render larger.
    const emojiOnlyCount = hasBody ? getEmojiOnlyCount(message.body) : 0;
    const emojiOnlyClass =
        emojiOnlyCount === 1
            ? 'text-5xl leading-tight'
            : emojiOnlyCount === 2
              ? 'text-4xl leading-tight'
              : emojiOnlyCount === 3
                ? 'text-3xl leading-tight'
                : '';

    const myUserId = String(auth?.user?.id ?? auth?.user?._id ?? '');
    const reactionPills = (message?.reactions ?? [])
        .filter((reaction) => Array.isArray(reaction?.users) && reaction.users.length > 0)
        .map((reaction) => {
            const userIds = reaction.users.map((user) => String(user?._id ?? user));
            return {
                emoji: reaction.emoji,
                count: userIds.length,
                mine: userIds.includes(myUserId),
            };
        });

    return (
        <div
            className="group relative flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50"
            data-message-id={message?._id}
        >
            <Avatar className="mt-0.5 size-9 shrink-0 rounded-full">
                <AvatarImage src={senderAvatar} alt={senderName} />
                <AvatarFallback className="rounded-full bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-xs font-semibold text-white">
                    {initial}
                </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                        {senderName}
                    </span>
                    <span className="text-[11px] text-gray-400">
                        {formatTime(message?.createdAt)}
                        {message?.updatedAt &&
                            message?.updatedAt !== message?.createdAt && (
                                <span className="ml-1 italic">(edited)</span>
                            )}
                    </span>
                </div>

                {editing ? (
                    <form onSubmit={handleSaveEdit} className="mt-1.5 flex flex-col gap-2">
                        <textarea
                            autoFocus
                            rows={2}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 outline-none transition-colors focus:border-dash-violet-400 focus:ring-2 focus:ring-dash-violet-500/10"
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => {
                                    setEditing(false);
                                    setDraft(message?.body ?? '');
                                }}
                            >
                                <XIcon className="mr-1 size-3" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="rounded-lg bg-dash-violet-500 text-white hover:bg-dash-violet-600"
                                disabled={draft.trim().length === 0}
                            >
                                Save
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-0.5 flex flex-col gap-2">
                        {hasBody && (
                            <p
                                className={
                                    emojiOnlyClass
                                        ? `whitespace-pre-wrap break-words ${emojiOnlyClass}`
                                        : 'whitespace-pre-wrap break-words text-sm leading-6 text-gray-600'
                                }
                            >
                                {message?.body}
                            </p>
                        )}

                        {/* Images: real rendered previews (WhatsApp style) */}
                        {images.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {images.map((attachment) => (
                                    <ImageThumbnail
                                        key={`${attachment.filename}-${attachment.uploadedAt ?? ''}`}
                                        attachment={attachment}
                                        onOpen={(a) => onOpenViewer?.(message, a)}
                                        className="cursor-zoom-in"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Non-image files: cards with download actions */}
                        {others.length > 0 && (
                            <div className="flex max-w-full flex-col gap-2">
                                {others.map((attachment, idx) => (
                                    <FileAttachmentCard
                                        key={`${attachment.filename}-${attachment.uploadedAt ?? idx}`}
                                        attachment={attachment}
                                        attachmentIndex={idx}
                                        onOpen={
                                            ['pdf', 'video'].includes(
                                                detectKind(attachment.mimetype, attachment.originalName)
                                            )
                                                ? () => setPreviewAttachment(attachment)
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {reactionPills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {reactionPills.map(({ emoji, count, mine }) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onToggleReaction?.(message._id, emoji)}
                                aria-pressed={mine}
                                title={`${count} reaction${count === 1 ? '' : 's'} — click to ${
                                    mine ? 'remove yours' : 'react'
                                }`}
                                className={`inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-colors ${
                                    mine
                                        ? 'border-dash-violet-300 bg-dash-violet-500/10 text-dash-violet-700'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-sm leading-none" aria-hidden="true">
                                    {emoji}
                                </span>
                                <span className="tabular-nums">{count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!editing && (
                <div className="absolute top-1.5 right-3 hidden items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-sm group-hover:flex">
                    <EmojiPicker
                        onSelect={(emoji) => onToggleReaction?.(message._id, emoji)}
                        closeOnSelect
                        trigger={
                            <button
                                type="button"
                                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Add reaction"
                                title="Add reaction"
                            >
                                <SmilePlusIcon className="size-4" />
                            </button>
                        }
                    />

                    {isMine && (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraft(message?.body ?? '');
                                    setEditing(true);
                                }}
                                disabled={!message?.body}
                                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-30"
                                aria-label="Edit message"
                                title={message?.body ? 'Edit message' : 'Attachments cannot be edited'}
                            >
                                <PencilIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete?.(message._id)}
                                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-dash-red-500/10 hover:text-dash-red-600"
                                aria-label="Delete message"
                                title="Delete message"
                            >
                                <Trash2Icon className="size-4" />
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* PDF preview / video player for non-image attachments */}
            <AttachmentPreviewModal
                open={!!previewAttachment}
                onClose={() => setPreviewAttachment(null)}
                attachment={previewAttachment}
                senderName={senderName}
            />
        </div>
    );
};
