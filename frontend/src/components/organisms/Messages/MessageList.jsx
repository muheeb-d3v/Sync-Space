import { Loader, MessageCircleIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Message } from '@/components/molecules/Message/Message';

export const MessageList = ({
    messages = [],
    isLoading,
    onEdit,
    onDelete,
    onOpenViewer,
    onToggleReaction,
}) => {
    const bottomRef = useRef(null);

    // Backend returns newest-first; display oldest-first (chat order).
    const ordered = [...messages].reverse();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader className="size-5 animate-spin text-dash-violet-500" />
            </div>
        );
    }

    return (
        <div className="ws-scroll flex flex-1 min-h-0 flex-col overflow-y-auto">
            {ordered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-dash-violet-500/10 text-dash-violet-600">
                        <MessageCircleIcon className="size-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            No messages yet
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Start the conversation — say hello! 👋
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-auto flex shrink-0 flex-col px-2 py-4 lg:px-4">
                    {ordered.map((message) => (
                        <Message
                            key={message._id}
                            message={message}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onOpenViewer={onOpenViewer}
                            onToggleReaction={onToggleReaction}
                        />
                    ))}
                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
};
