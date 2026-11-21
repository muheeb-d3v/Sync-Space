import { Loader, MessageSquareIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/context/useAuth';
import { getDmPartner, getMemberName } from '@/lib/dms';

/**
 * Sidebar panel shown on every DMs route. It is a conversation list only —
 * no channels, members or workspace header — so the DM experience reads like
 * a chat app rather than the workspace browser.
 */
export const DmsPanel = ({ dms = [], isFetching, activeDmId, onNavigate }) => {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const { auth } = useAuth();
    const [search, setSearch] = useState('');

    const currentUserId = auth?.user?._id ?? auth?.user?.id;
    const term = search.trim().toLowerCase();

    const conversations = dms
        .map((dm) => {
            const partner = getDmPartner(dm, currentUserId);
            return { dm, partner, name: getMemberName(partner) };
        })
        .filter(({ name }) => name.toLowerCase().includes(term));

    function openDirectory() {
        navigate(`/workspaces/${workspaceId}/dms`);
        onNavigate?.();
    }

    return (
        <div
            data-dms-panel="true"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs"
        >
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <MessageSquareIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                        Direct messages
                    </p>
                    <p className="text-[11px] text-gray-400">Recent chats</p>
                </div>
                <button
                    type="button"
                    onClick={openDirectory}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-dash-violet-600"
                    aria-label="New direct message"
                    title="New direct message"
                >
                    <PlusIcon className="size-4" />
                </button>
            </div>

            <div className="shrink-0 px-2.5 pt-2.5">
                <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search conversations"
                        className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-2.5 text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-dash-violet-300 focus:bg-white focus:ring-2 focus:ring-dash-violet-500/10"
                    />
                </div>
            </div>

            <div className="ws-scroll mt-1 flex-1 overflow-y-auto px-2 pb-3">
                {isFetching && dms.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader className="size-4 animate-spin text-dash-violet-500" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 pb-6 text-center">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-dash-violet-500/10 text-dash-violet-600">
                            <MessageSquareIcon className="size-5" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-700">
                            {term ? 'No matches' : 'No conversations yet'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {term
                                ? 'Try a different name.'
                                : 'Start a new message to a teammate.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {conversations.map(({ dm, partner, name }) => {
                            const isActive = dm._id === activeDmId;

                            return (
                                <button
                                    type="button"
                                    key={dm._id}
                                    onClick={() => {
                                        navigate(
                                            `/workspaces/${workspaceId}/dms/${dm._id}`
                                        );
                                        onNavigate?.();
                                    }}
                                    className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                                        isActive
                                            ? 'bg-dash-violet-500/10'
                                            : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <Avatar className="size-8 shrink-0">
                                        <AvatarImage src={partner?.avatar} alt={name} />
                                        <AvatarFallback className="bg-dash-violet-500/10 text-[11px] font-semibold text-dash-violet-600">
                                            {name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate text-[13px] ${
                                                isActive
                                                    ? 'font-semibold text-dash-violet-700'
                                                    : 'font-medium text-gray-800'
                                            }`}
                                        >
                                            {name}
                                        </p>
                                        <p className="truncate text-[11px] text-gray-400">
                                            Direct message
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-gray-200 p-2">
                <button
                    type="button"
                    onClick={openDirectory}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-dash-violet-500/10 px-2 py-2 text-xs font-medium text-dash-violet-700 transition-colors hover:bg-dash-violet-500 hover:text-white"
                >
                    <PlusIcon className="size-3.5" />
                    New message
                </button>
            </div>
        </div>
    );
};
