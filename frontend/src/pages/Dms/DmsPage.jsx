import { Loader, MessageSquareIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCreateDm } from '@/hooks/apis/dms/useCreateDm';
import { useGetDms } from '@/hooks/apis/dms/useGetDms';
import { useGetWorkspaceById } from '@/hooks/apis/workspaces/useGetWorkspaceById';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getDmPartner, getMemberName } from '@/lib/dms';

export const DmsPage = () => {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const { auth } = useAuth();
    const { toast } = useToast();

    const { workspace, isFetching: isWorkspaceFetching } = useGetWorkspaceById(workspaceId);
    const { dms, isFetching: areDmsFetching } = useGetDms(workspaceId);
    const { createDmMutation, isPending } = useCreateDm(workspaceId);

    const [search, setSearch] = useState('');
    const [pendingMemberId, setPendingMemberId] = useState(null);

    const currentUserId = String(auth?.user?._id ?? auth?.user?.id ?? '');

    const members = useMemo(() => {
        return (workspace?.members ?? [])
            .map((member) => member?.memberId)
            .filter(
                (user) =>
                    user &&
                    typeof user === 'object' &&
                    user._id &&
                    String(user._id) !== currentUserId
            );
    }, [workspace, currentUserId]);

    const term = search.trim().toLowerCase();
    const filteredMembers = members.filter((member) =>
        `${member.username ?? ''} ${member.email ?? ''}`.toLowerCase().includes(term)
    );

    const filteredDms = dms.filter((dm) => {
        const partner = getDmPartner(dm, currentUserId);
        return getMemberName(partner).toLowerCase().includes(term);
    });

    async function handleStartConversation(member) {
        if (isPending) return;

        setPendingMemberId(String(member._id));
        try {
            const dm = await createDmMutation({ memberId: member._id });
            if (dm?._id) {
                navigate(`/workspaces/${workspaceId}/dms/${dm._id}`);
            }
        } catch (error) {
            toast({
                title: error?.message || 'Could not start a direct message',
                variant: 'destructive'
            });
        } finally {
            setPendingMemberId(null);
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4 lg:px-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <MessageSquareIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-gray-900">
                        Direct messages
                    </h2>
                    <p className="text-[11px] text-gray-400">
                        Private conversations with {workspace?.name || 'your workspace'} teammates
                    </p>
                </div>
            </header>

            <div className="ws-scroll flex-1 overflow-y-auto px-4 py-5 lg:px-6">
                <div className="mx-auto max-w-4xl">
                    <div className="relative w-full max-w-sm">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search teammates"
                            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-dash-violet-300 focus:ring-2 focus:ring-dash-violet-500/10"
                        />
                    </div>

                    {/* On phones the conversation panel is behind the drawer,
                        so keep a recents list here. From md up the sidebar
                        already shows the conversation list. */}
                    <section className="mt-6 md:hidden">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                Recent conversations
                            </h3>
                            {areDmsFetching && (
                                <Loader className="size-4 animate-spin text-dash-violet-500" />
                            )}
                        </div>

                        {dms.length === 0 && !areDmsFetching ? (
                            <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
                                <p className="text-sm font-medium text-gray-700">
                                    No conversations yet
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Pick a teammate below to start a private conversation.
                                </p>
                            </div>
                        ) : filteredDms.length === 0 ? (
                            <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-400">
                                No conversations match your search.
                            </p>
                        ) : (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {filteredDms.map((dm) => {
                                    const partner = getDmPartner(dm, currentUserId);
                                    const name = getMemberName(partner);

                                    return (
                                        <button
                                            type="button"
                                            key={dm._id}
                                            onClick={() =>
                                                navigate(
                                                    `/workspaces/${workspaceId}/dms/${dm._id}`
                                                )
                                            }
                                            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-dash-violet-300 hover:shadow-xs"
                                        >
                                            <Avatar className="size-9 shrink-0">
                                                <AvatarImage src={partner?.avatar} alt={name} />
                                                <AvatarFallback className="bg-dash-violet-500/10 text-xs font-semibold text-dash-violet-600">
                                                    {name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-900">
                                                    {name}
                                                </p>
                                                <p className="truncate text-[11px] text-gray-400">
                                                    Direct message
                                                </p>
                                            </div>
                                            <MessageSquareIcon className="size-4 shrink-0 text-gray-300 transition-colors group-hover:text-dash-violet-500" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="mt-8 pb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Workspace members
                        </h3>

                        {isWorkspaceFetching ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader className="size-5 animate-spin text-dash-violet-500" />
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-400">
                                No teammates match your search.
                            </p>
                        ) : (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredMembers.map((member) => {
                                    const name = getMemberName(member);
                                    const isStarting =
                                        pendingMemberId === String(member._id);

                                    return (
                                        <div
                                            key={member._id}
                                            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-dash-violet-300 hover:shadow-xs"
                                        >
                                            <Avatar className="size-10 shrink-0">
                                                <AvatarImage src={member.avatar} alt={name} />
                                                <AvatarFallback className="bg-dash-violet-500/10 text-xs font-semibold text-dash-violet-600">
                                                    {name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                    {name}
                                                </p>
                                                <p className="truncate text-[11px] text-gray-400">
                                                    {member.email}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => handleStartConversation(member)}
                                                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-dash-violet-500/10 px-2.5 text-xs font-medium text-dash-violet-700 transition-colors hover:bg-dash-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isStarting ? (
                                                    <Loader className="size-3.5 animate-spin" />
                                                ) : (
                                                    <MessageSquareIcon className="size-3.5" />
                                                )}
                                                <span className="hidden sm:inline">Message</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
