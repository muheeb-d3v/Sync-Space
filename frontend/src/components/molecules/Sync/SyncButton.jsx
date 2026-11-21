import {
    AudioLinesIcon,
    CircleAlertIcon,
    Loader,
    LogOutIcon,
    UsersIcon
} from 'lucide-react';

import { SyncDuration } from '@/components/molecules/Sync/SyncDuration';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function participantName(p) {
    return p?.userId?.username || p?.userId?.email || 'Member';
}

/**
 * Channel-header Sync toggle.
 *  - No active session  → "Start Sync".
 *  - Active, not joined → live green pill ("Sync · N") opening a details
 *    popover with participants and a Join button.
 *  - Active, joined     → violet live pill ("In Sync") with a leave action.
 */
export const SyncButton = ({
    session,
    currentUserId,
    isStarting,
    isJoining,
    isLeaving,
    onStart,
    onJoin,
    onLeave
}) => {
    const count = session?.participants?.length ?? 0;
    const isJoined =
        session?.participants?.some(
            (p) => String(p.userId?._id) === String(currentUserId)
        ) ?? false;

    if (!session || session.status !== 'active') {
        return (
            <Button
                type="button"
                size="sm"
                disabled={isStarting}
                onClick={onStart}
                className="h-8 gap-1.5 rounded-full bg-dash-violet-500 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-dash-violet-600 disabled:opacity-60"
                aria-label="Start a Sync session in this channel"
            >
                {isStarting ? (
                    <Loader className="size-3.5 animate-spin" />
                ) : (
                    <AudioLinesIcon className="size-3.5" />
                )}
                Start Sync
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40 ${
                        isJoined
                            ? 'bg-dash-violet-500 text-white hover:bg-dash-violet-600'
                            : 'bg-dash-green-500/10 text-dash-green-700 hover:bg-dash-green-500/20'
                    }`}
                    aria-label={
                        isJoined
                            ? 'Sync session controls'
                            : `A Sync is active with ${count} participant${count === 1 ? '' : 's'}. View details`
                    }
                >
                    {isJoined ? (
                        <AudioLinesIcon className="size-3.5" />
                    ) : (
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-dash-green-500 opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-dash-green-500" />
                        </span>
                    )}
                    {isJoined ? 'In Sync' : `Sync · ${count}`}
                    <span className="tabular-nums opacity-80">
                        <SyncDuration startedAt={session.startedAt} />
                    </span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-2">
                <div className="flex items-center justify-between px-1 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-dash-green-500 opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-dash-green-500" />
                        </span>
                        <span className="text-xs font-semibold text-gray-900">
                            Live Sync
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 tabular-nums">
                        <SyncDuration startedAt={session.startedAt} />
                    </span>
                </div>

                <div className="max-h-44 overflow-y-auto px-1" role="list">
                    {count === 0 && (
                        <p className="py-1.5 text-xs text-gray-500">
                            Nobody is in the session yet.
                        </p>
                    )}
                    {session.participants.map((p) => (
                        <div
                            key={String(p.userId?._id)}
                            role="listitem"
                            className="flex items-center gap-2 rounded-lg px-1 py-1"
                        >
                            <Avatar className="size-6">
                                <AvatarImage src={p.userId?.avatar} alt={participantName(p)} />
                                <AvatarFallback className="bg-dash-violet-500/10 text-[10px] font-semibold text-dash-violet-600">
                                    {participantName(p).charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                                {participantName(p)}
                            </span>
                            {String(p.userId?._id) === String(session.creatorId) && (
                                <span className="shrink-0 rounded-full bg-dash-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-dash-violet-700">
                                    Host
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-1.5 border-t border-gray-100 pt-1.5">
                    {isJoined ? (
                        <button
                            type="button"
                            onClick={onLeave}
                            disabled={isLeaving}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-dash-red-600 transition-colors hover:bg-dash-red-500/10 disabled:opacity-50"
                            aria-label="Leave the Sync session"
                        >
                            {isLeaving ? (
                                <Loader className="size-3.5 animate-spin" />
                            ) : (
                                <LogOutIcon className="size-3.5" />
                            )}
                            Leave Sync
                        </button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            disabled={isJoining}
                            onClick={onJoin}
                            className="w-full rounded-lg bg-dash-green-600 text-xs font-semibold text-white hover:bg-dash-green-700 disabled:opacity-60"
                            aria-label={`Join the Sync session with ${count} participant${count === 1 ? '' : 's'}`}
                        >
                            {isJoining ? (
                                <>
                                    <Loader className="mr-1 size-3.5 animate-spin" />
                                    Joining…
                                </>
                            ) : (
                                <>
                                    <UsersIcon className="mr-1 size-3.5" />
                                    Join Sync
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Loading is rare but visible if the session vanished mid-click. */}
                {!isJoined && isStarting && (
                    <div className="mt-1 flex items-center gap-1.5 px-2 pb-1 text-[11px] text-gray-500">
                        <CircleAlertIcon className="size-3" />
                        Session state is changing…
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
