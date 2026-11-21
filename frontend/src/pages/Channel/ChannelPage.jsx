import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangleIcon, HashIcon, Loader } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChatInput } from '@/components/molecules/Message/ChatInput';
import { ImageViewerModal } from '@/components/molecules/Message/ImageViewerModal';
import { SyncButton } from '@/components/molecules/Sync/SyncButton';
import { SyncSessionBar } from '@/components/molecules/Sync/SyncSessionBar';
import { MessageList } from '@/components/organisms/Messages/MessageList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    MESSAGE_DELETED_EVENT,
    MESSAGE_UPDATED_EVENT,
    NEW_MESSAGE_EVENT
} from '@/context/SocketContext';
import { useGetChannelById } from '@/hooks/apis/channels/useGetChannelById';
import { useCreateMessage } from '@/hooks/apis/messages/useCreateMessage';
import { useDeleteMessage } from '@/hooks/apis/messages/useDeleteMessage';
import { useGetChannelMessages } from '@/hooks/apis/messages/useGetChannelMessages';
import { useToggleReaction } from '@/hooks/apis/messages/useToggleReaction';
import { useUpdateMessage } from '@/hooks/apis/messages/useUpdateMessage';
import { useEndSync } from '@/hooks/apis/sync/useEndSync';
import { useGetActiveSync } from '@/hooks/apis/sync/useGetActiveSync';
import { useJoinSync } from '@/hooks/apis/sync/useJoinSync';
import { useLeaveSync } from '@/hooks/apis/sync/useLeaveSync';
import { useStartSync } from '@/hooks/apis/sync/useStartSync';
import { useAuth } from '@/hooks/context/useAuth';
import { useSocket } from '@/hooks/context/useSocket';
import { useSyncMedia } from '@/hooks/sync/useSyncMedia';
import { useToast } from '@/hooks/use-toast';
import { getDmPartner, getMemberName } from '@/lib/dms';
import { detectKind } from '@/lib/files';
import { leaveSyncRequest } from '@/apis/sync';

export const ChannelPage = ({ variant = 'channel' }) => {
    const { channelId, workspaceId } = useParams();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { auth } = useAuth();
    const isDirectMessage = variant === 'dm';

    const { channel, isFetching: isChannelFetching, isSuccess } = useGetChannelById(channelId);
    const { messages, isLoading: areMessagesLoading } = useGetChannelMessages(channelId);
    const { createMessageMutation } = useCreateMessage(channelId);
    const { updateMessageMutation } = useUpdateMessage();
    const { deleteMessageMutation } = useDeleteMessage();
    const { toggleReactionMutation } = useToggleReaction();
    const { socket, joinChannel } = useSocket();

    const messagesQueryKey = `fetchMessages-${channelId}`;

    // ---- WhatsApp-style image viewer state --------------------------------------
    // `images` is every viewable image in the conversation (oldest-first to
    // match render order); `viewerIndex` points into that list.
    const [viewerIndex, setViewerIndex] = useState(-1);
    const viewerImages = useMemo(
        () =>
            (messages ?? [])
                .slice()
                .reverse() // display order (oldest first)
                .flatMap((m) =>
                    (Array.isArray(m?.attachments) ? m.attachments : [])
                        .filter((a) => detectKind(a?.mimetype, a?.originalName) === 'image')
                        .map((a) => ({
                            attachment: a,
                            messageId: m._id,
                            senderName:
                                (typeof m?.senderId === 'object' &&
                                    (m.senderId?.username || m.senderId?.email)) ||
                                'Unknown user',
                            senderAvatar:
                                typeof m?.senderId === 'object' ? m.senderId?.avatar : undefined,
                            createdAt: m?.createdAt,
                        }))
                ),
        [messages]
    );

    const handleOpenViewer = useCallback(
        (message, attachment) => {
            const idx = viewerImages.findIndex(
                (entry) => entry.messageId === message._id && entry.attachment.filename === attachment.filename
            );
            setViewerIndex(idx >= 0 ? idx : 0);
        },
        [viewerImages]
    );
    // ------------------------------------------------------------------------------

    // ---- Sync (live team session) -------------------------------------------------
    const { session: activeSync } = useGetActiveSync(channelId);

    const { startSyncMutation, isPending: isStarting } = useStartSync();
    const { joinSyncMutation, isPending: isJoining } = useJoinSync(activeSync?._id);
    const { leaveSyncMutation, isPending: isLeaving } = useLeaveSync(activeSync?._id);
    const { endSyncMutation, isPending: isEnding } = useEndSync(activeSync?._id);

    const currentUserId = String(auth?.user?._id ?? auth?.user?.id ?? '');
    const amJoined =
        activeSync?.participants?.some(
            (p) => String(p.userId?._id) === String(currentUserId)
        ) ?? false;

    // WebRTC audio mesh — mounts real media only while joined.
    const media = useSyncMedia({
        socket,
        session: activeSync,
        currentUserId,
        active: amJoined
    });

    const joinedRef = useRef(false);
    joinedRef.current = amJoined;
    const amJoinedRef = useRef(false);
    amJoinedRef.current = amJoined;
    const activeSyncIdRef = useRef(null);
    activeSyncIdRef.current = activeSync?._id ?? null;

    function applySyncSession(session) {
        if (session?.channelId) {
            queryClient.setQueryData([`fetchActiveSync-${session.channelId}`], session);
            // The channel list of this workspace shows live badges too.
            queryClient.invalidateQueries({
                queryKey: [`fetchActiveSyncs-${session.workspaceId}`]
            });
        } else {
            // Session finished → clear this channel's state + sidebar badges.
            queryClient.setQueryData([`fetchActiveSync-${channelId}`], null);
            queryClient.invalidateQueries({
                queryKey: [`fetchActiveSyncs-${workspaceId}`]
            });
        }
    }

    async function handleStartSync() {
        try {
            const session = await startSyncMutation({ channelId });
            if (session) applySyncSession(session);
        } catch (error) {
            toast({
                title: error?.message || 'Could not start Sync',
                variant: 'destructive'
            });
        }
    }

    async function handleJoinSync() {
        try {
            const response = await joinSyncMutation();
            if (response?.session) applySyncSession(response.session);
        } catch (error) {
            toast({
                title: error?.message || 'Could not join Sync',
                variant: 'destructive'
            });
        }
    }

    async function handleLeaveSync() {
        try {
            const response = await leaveSyncMutation();
            if (response?.session) applySyncSession(response.session);
        } catch (error) {
            toast({
                title: error?.message || 'Could not leave Sync',
                variant: 'destructive'
            });
        }
    }

    async function handleEndSync() {
        try {
            await endSyncMutation();
            applySyncSession(null);
        } catch (error) {
            toast({
                title: error?.message || 'Could not end Sync',
                variant: 'destructive'
            });
        }
    }
    // ------------------------------------------------------------------------------

    // Insert a message into the cache, keeping newest-first order and skipping
    // duplicates (the sender receives their own message back over the socket).
    const upsertMessage = useCallback(
        (message) => {
            queryClient.setQueryData([messagesQueryKey], (old) => {
                const list = Array.isArray(old) ? old : [];
                const idx = list.findIndex((m) => m._id === message._id);
                if (idx >= 0) {
                    const next = list.slice();
                    next[idx] = message;
                    return next;
                }
                return [message, ...list];
            });
        },
        [queryClient, messagesQueryKey]
    );

    const removeMessage = useCallback(
        (messageId) => {
            queryClient.setQueryData([messagesQueryKey], (old) => {
                const list = Array.isArray(old) ? old : [];
                return list.filter((m) => m._id !== messageId);
            });
        },
        [queryClient, messagesQueryKey]
    );

    // Join the channel room and subscribe to realtime events.
    useEffect(() => {
        if (!socket || !channelId) return;
        joinChannel(channelId);

        const newHandler = (message) => upsertMessage(message);
        const updHandler = (message) => upsertMessage(message);
        const delHandler = ({ messageId }) => removeMessage(messageId);

        // Sync session realtime updates.
        const apply = (session) => {
            if (!session) return null;
            applySyncSession(session);
            return session;
        };
        const syncStartedHandler = ({ session } = {}) => {
            if (String(session?.channelId) !== String(channelId)) return;
            apply(session);
            if (session && String(session.creatorId) !== String(currentUserId)) {
                toast({
                    title: 'Sync started',
                    description: 'Join the live session from the channel header.',
                    duration: 6000
                });
            }
        };
        const syncUpdatedHandler = ({ session } = {}) => {
            if (String(session?.channelId) !== String(channelId)) return;
            const previous = queryClient.getQueryData([`fetchActiveSync-${channelId}`]);
            const previousIds = new Set(
                (previous?.participants ?? []).map((p) => String(p.userId?._id))
            );
            const currentIds = new Set(
                (session?.participants ?? []).map((p) => String(p.userId?._id))
            );

            apply(session);

            // Presence toasts for members I'm synced with.
            if (amJoinedRef.current) {
                for (const p of session?.participants ?? []) {
                    const id = String(p.userId?._id);
                    if (!previousIds.has(id)) {
                        toast({
                            title: `${p.userId?.username || 'A member'} joined the Sync`,
                            duration: 3000
                        });
                    }
                }
                for (const id of previousIds) {
                    if (!currentIds.has(id) && id !== String(currentUserId)) {
                        toast({
                            title: 'A member left the Sync',
                            duration: 3000
                        });
                    }
                }
            }
        };
        const syncEndedHandler = ({ channelId: endedChannelId } = {}) => {
            if (String(endedChannelId) !== String(channelId)) return;
            queryClient.setQueryData([`fetchActiveSync-${channelId}`], null);
            queryClient.invalidateQueries({ queryKey: [`fetchActiveSyncs-${workspaceId}`] });
            toast({ title: 'The Sync has ended', duration: 4000 });
        };

        socket.on(NEW_MESSAGE_EVENT, newHandler);
        socket.on(MESSAGE_UPDATED_EVENT, updHandler);
        socket.on(MESSAGE_DELETED_EVENT, delHandler);
        socket.on('syncStarted', syncStartedHandler);
        socket.on('syncUpdated', syncUpdatedHandler);
        socket.on('syncEnded', syncEndedHandler);
        return () => {
            socket.off(NEW_MESSAGE_EVENT, newHandler);
            socket.off(MESSAGE_UPDATED_EVENT, updHandler);
            socket.off(MESSAGE_DELETED_EVENT, delHandler);
            socket.off('syncStarted', syncStartedHandler);
            socket.off('syncUpdated', syncUpdatedHandler);
            socket.off('syncEnded', syncEndedHandler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, channelId]);

    // Leaving the page (switching channels, closing the app) implicitly leaves
    // the Sync session so no stale seats linger.
    useEffect(() => {
        return () => {
            const sessionId = activeSyncIdRef.current;
            const token = auth?.token;
            if (joinedRef.current && sessionId && token) {
                leaveSyncRequest({ sessionId, token }).catch(() => {});
            }
        };
    }, [channelId]);

    async function handleSend({ body, files }) {
        const saved = await createMessageMutation({ body, files });
        // Reflect immediately in case the socket echo is delayed; dedup handles overlap.
        if (saved?._id) upsertMessage(saved);
    }

    async function handleEdit(messageId, body) {
        try {
            const updated = await updateMessageMutation({ messageId, body });
            if (updated?._id) upsertMessage(updated);
        } catch (error) {
            toast({
                title: error?.message || 'Could not edit message',
                variant: 'destructive'
            });
            throw error;
        }
    }

    async function handleDelete(messageId) {
        try {
            await deleteMessageMutation({ messageId });
            removeMessage(messageId);
        } catch (error) {
            toast({
                title: error?.message || 'Could not delete message',
                variant: 'destructive'
            });
        }
    }

    async function handleToggleReaction(messageId, emoji) {
        try {
            const updated = await toggleReactionMutation({ messageId, emoji });
            if (updated?._id) upsertMessage(updated);
        } catch (error) {
            toast({
                title: error?.message || 'Could not update reaction',
                variant: 'destructive'
            });
        }
    }

    if (isChannelFetching) {
        return (
            <div className="flex h-full items-center justify-center bg-white">
                <Loader className="size-6 animate-spin text-dash-violet-500" />
            </div>
        );
    }

    if (!isSuccess || !channel) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-y-2 bg-white px-6 text-center">
                <AlertTriangleIcon className="size-6 text-dash-red-500" />
                <span className="text-sm text-gray-500">
                    {isDirectMessage
                        ? 'Conversation not found or you don\u2019t have access.'
                        : 'Channel not found or you don\u2019t have access.'}
                </span>
            </div>
        );
    }

    const dmPartner = isDirectMessage
        ? getDmPartner(channel, auth?.user?._id ?? auth?.user?.id)
        : null;
    const conversationTitle = isDirectMessage
        ? getMemberName(dmPartner)
        : channel.name;

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4 lg:px-6">
                {isDirectMessage ? (
                    <Avatar className="size-9 shrink-0">
                        <AvatarImage src={dmPartner?.avatar} alt={conversationTitle} />
                        <AvatarFallback className="bg-dash-violet-500/10 text-xs font-semibold text-dash-violet-600">
                            {conversationTitle.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                        <HashIcon className="size-4" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-gray-900">
                        {conversationTitle}
                    </h2>
                    <p className="text-[11px] text-gray-400">
                        {isDirectMessage ? 'Direct message' : 'Channel'}
                    </p>
                </div>

                <span
                    className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
                        socket?.connected
                            ? 'bg-dash-green-500/10 text-dash-green-700'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    <span
                        className={`size-1.5 rounded-full ${
                            socket?.connected ? 'bg-dash-green-500' : 'bg-gray-400'
                        }`}
                    />
                    {socket?.connected ? 'Live' : 'Connecting'}
                </span>

                {!isDirectMessage && (
                    <SyncButton
                        session={activeSync}
                        currentUserId={currentUserId}
                        isStarting={isStarting}
                        isJoining={isJoining}
                        isLeaving={isLeaving}
                        onStart={handleStartSync}
                        onJoin={handleJoinSync}
                        onLeave={handleLeaveSync}
                    />
                )}
            </header>

            <MessageList
                messages={messages ?? []}
                isLoading={areMessagesLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenViewer={handleOpenViewer}
                onToggleReaction={handleToggleReaction}
            />

            {/* Live Sync session bar — messaging above keeps working under it. */}
            {!isDirectMessage && amJoined && activeSync && (
                <SyncSessionBar
                    session={activeSync}
                    currentUserId={currentUserId}
                    media={media}
                    onLeave={handleLeaveSync}
                    isLeaving={isLeaving}
                    onEnd={handleEndSync}
                    isEnding={isEnding}
                />
            )}

            <ChatInput
                channelId={channelId}
                onSubmit={handleSend}
                onMessageSent={upsertMessage}
                placeholder={
                    isDirectMessage
                        ? `Message ${conversationTitle}`
                        : `Message #${channel.name}`
                }
            />

            {viewerIndex >= 0 && viewerImages[viewerIndex] && (
                <ImageViewerModal
                    open
                    onClose={() => setViewerIndex(-1)}
                    images={viewerImages}
                    index={viewerIndex}
                    onNavigate={setViewerIndex}
                />
            )}
        </div>
    );
};
