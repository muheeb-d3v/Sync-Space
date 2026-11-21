import { AlertTriangleIcon, HashIcon, Loader, MessageSquareIcon, PlusIcon } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { CreateChannelModal } from '@/components/molecules/Channel/CreateChannelModal';
import { InviteMemberModal } from '@/components/molecules/Workspace/InviteMemberModal';
import { WorkspacePanelHeader } from '@/components/molecules/Workspace/WorkspacePanelHeader';
import { WorkspacePreferenceModal } from '@/components/molecules/Workspace/WorkspacePreferenceModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGetDms } from '@/hooks/apis/dms/useGetDms';
import { useGetActiveSyncs } from '@/hooks/apis/sync/useGetActiveSyncs';
import { useGetWorkspaceById } from '@/hooks/apis/workspaces/useGetWorkspaceById';
import { useAuth } from '@/hooks/context/useAuth';
import { useCreateChannelModal } from '@/hooks/context/useCreateChannelModal';
import { getDmPartner, getMemberName } from '@/lib/dms';

import { DmsPanel } from './DmsPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { SettingsPanel } from './SettingsPanel';

export const WorkspacePanel = ({ onNavigate }) => {
    const { workspaceId, channelId } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { auth } = useAuth();
    const { setOpenCreateChannelModal } = useCreateChannelModal();
    const { isFetching, workspace, isSuccess } = useGetWorkspaceById(workspaceId);
    const { dms, isFetching: areDmsFetching } = useGetDms(workspaceId);

    // Active Sync sessions → live badges on the channel list.
    const { sessions: activeSyncs } = useGetActiveSyncs(workspaceId);
    const syncsByChannelId = new Map(
        (activeSyncs ?? []).map((s) => [String(s.channelId), s])
    );
    const isDmsRoute = pathname.includes('/dms');
    const isNotificationsRoute = pathname.includes('/notifications');
    const isSettingsRoute = pathname.includes('/settings');

    // DMs get their own conversation-list panel — no workspace header,
    // channels or member directory.
    if (isDmsRoute) {
        return (
            <DmsPanel
                dms={dms}
                isFetching={areDmsFetching}
                activeDmId={channelId}
                onNavigate={onNavigate}
            />
        );
    }

    // Notifications get a filter panel instead of the workspace browser.
    if (isNotificationsRoute) {
        return <NotificationsPanel onNavigate={onNavigate} />;
    }

    // Settings get their own section navigation panel.
    if (isSettingsRoute) {
        return <SettingsPanel onNavigate={onNavigate} />;
    }

    if (isFetching) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-xs">
                <Loader className="size-5 animate-spin text-dash-violet-500" />
            </div>
        );
    }

    if (!isSuccess) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-y-2 rounded-xl border border-gray-200 bg-white px-4 text-center shadow-xs">
                <AlertTriangleIcon className="size-6 text-dash-red-500" />
                <span className="text-xs text-gray-500">
                    An error occurred while fetching the workspace. Please try again later.
                </span>
            </div>
        );
    }

    const isAdmin = workspace?.members?.some((member) => {
        const memberIdStr = String(member?.memberId?._id ?? member?.memberId);
        return memberIdStr === auth?.user?._id && member.role === 'Admin';
    });

    const channels = workspace?.channels ?? [];

    return (
        <div
            data-workspace-panel="true"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs"
        >
            <WorkspacePanelHeader workspace={workspace} />

            <div className="ws-scroll flex-1 overflow-y-auto px-2 pt-3 pb-4">
                {/* Channels */}
                <div className="flex items-center justify-between px-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Channels
                    </h3>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setOpenCreateChannelModal(true)}
                            className="inline-flex size-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-dash-violet-600"
                            aria-label="Create channel"
                            title="Create channel"
                        >
                            <PlusIcon className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="mt-1 space-y-0.5">
                    {channels.length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-gray-400">
                            No channels yet.
                        </p>
                    )}
                    {channels.map((channel) => {
                        const isActive = channel._id === channelId;
                        return (
                            <button
                                type="button"
                                key={channel._id}
                                onClick={() => {
                                    navigate(
                                        `/workspaces/${workspaceId}/channels/${channel._id}`
                                    );
                                    onNavigate?.();
                                }}
                                className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                                    isActive
                                        ? 'bg-dash-violet-500/10 font-medium text-dash-violet-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <HashIcon
                                    className={`size-4 shrink-0 ${
                                        isActive
                                            ? 'text-dash-violet-600'
                                            : 'text-gray-400 group-hover:text-gray-500'
                                    }`}
                                />
                                <span className="truncate">{channel.name}</span>
                                {syncsByChannelId.has(String(channel._id)) && (
                                    <span
                                        className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-dash-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-dash-green-700"
                                        title="A Sync is live in this channel right now"
                                    >
                                        <span className="relative flex size-1.5">
                                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-dash-green-500 opacity-60" />
                                            <span className="relative inline-flex size-1.5 rounded-full bg-dash-green-500" />
                                        </span>
                                        {
                                            syncsByChannelId.get(String(channel._id))
                                                .participants?.length
                                        }
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Direct messages */}
                <div className="mt-6 flex items-center justify-between px-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Direct messages
                    </h3>
                    <button
                        type="button"
                        onClick={() => {
                            navigate(`/workspaces/${workspaceId}/dms`);
                            onNavigate?.();
                        }}
                        className="inline-flex size-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-dash-violet-600"
                        aria-label="New direct message"
                        title="New direct message"
                    >
                        <PlusIcon className="size-3.5" />
                    </button>
                </div>

                <div className="mt-1 space-y-0.5">
                    {areDmsFetching && dms.length === 0 && (
                        <div className="px-2 py-1.5">
                            <Loader className="size-3.5 animate-spin text-dash-violet-500" />
                        </div>
                    )}

                    {dms.map((dm) => {
                        const partner = getDmPartner(
                            dm,
                            auth?.user?._id ?? auth?.user?.id
                        );
                        const name = getMemberName(partner);
                        const isActive = isDmsRoute && dm._id === channelId;

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
                                className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                                    isActive
                                        ? 'bg-dash-violet-500/10 font-medium text-dash-violet-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <Avatar className="size-6 shrink-0">
                                    <AvatarImage src={partner?.avatar} alt={name} />
                                    <AvatarFallback className="bg-dash-violet-500/10 text-[10px] font-semibold text-dash-violet-600">
                                        {name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{name}</span>
                            </button>
                        );
                    })}

                    {!areDmsFetching && dms.length === 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                navigate(`/workspaces/${workspaceId}/dms`);
                                onNavigate?.();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                            <MessageSquareIcon className="size-4 shrink-0 text-gray-400" />
                            Start a conversation
                        </button>
                    )}
                </div>

                {/* Members */}
                <div className="mt-6 flex items-center justify-between px-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Members ({workspace?.members?.length ?? 0})
                    </h3>
                </div>

                <div className="mt-1 space-y-0.5">
                    {(workspace?.members ?? []).map((member, idx) => {
                        // members.memberId may be an id string OR a populated user object,
                        // depending on the endpoint. Handle both shapes.
                        const userObj = member?.memberId;
                        const hasUserDetails =
                            userObj &&
                            typeof userObj === 'object' &&
                            (userObj.username || userObj.email);
                        const displayName = hasUserDetails
                            ? userObj.username || userObj.email
                            : typeof userObj === 'string'
                              ? `User (${userObj.slice(-4)})`
                              : `Member ${idx + 1}`;
                        const memberKey =
                            userObj?._id || (typeof userObj === 'string' ? userObj : idx);

                        return (
                            <div
                                key={memberKey}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
                            >
                                <Avatar className="size-6 shrink-0">
                                    <AvatarImage
                                        src={hasUserDetails ? userObj.avatar : undefined}
                                        alt={displayName}
                                    />
                                    <AvatarFallback className="bg-dash-violet-500/10 text-[10px] font-semibold text-dash-violet-600">
                                        {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 flex-1 truncate text-[13px] text-gray-600">
                                    {displayName}
                                </span>
                                {member?.role === 'Admin' && (
                                    <span className="shrink-0 rounded-full bg-dash-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-dash-violet-700">
                                        Admin
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <CreateChannelModal />
            <WorkspacePreferenceModal />
            <InviteMemberModal />
        </div>
    );
};
