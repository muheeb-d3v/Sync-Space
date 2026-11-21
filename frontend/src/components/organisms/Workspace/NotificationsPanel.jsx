import {
    AtSignIcon,
    BellIcon,
    CheckCheckIcon,
    CircleIcon,
    InfoIcon,
    MessageSquareIcon
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useGetUnreadNotificationsCount } from '@/hooks/apis/notifications/useGetUnreadNotificationsCount';
import { useMarkAllNotificationsRead } from '@/hooks/apis/notifications/useMarkNotifications';

const FILTERS = [
    { key: 'all', label: 'All notifications', Icon: BellIcon },
    { key: 'unread', label: 'Unread', Icon: CircleIcon },
    { key: 'dm', label: 'Direct messages', Icon: MessageSquareIcon },
    { key: 'mention', label: 'Mentions', Icon: AtSignIcon },
    { key: 'system', label: 'System', Icon: InfoIcon }
];

export const NotificationsPanel = ({ onNavigate }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { unreadCount } = useGetUnreadNotificationsCount();
    const { markAllNotificationsRead, isPending } = useMarkAllNotificationsRead();

    const activeFilter = searchParams.get('filter') || 'all';

    function selectFilter(filter) {
        if (filter === 'all') {
            setSearchParams({});
        } else {
            setSearchParams({ filter });
        }
        onNavigate?.();
    }

    async function handleMarkAllRead() {
        if (unreadCount === 0 || isPending) return;
        try {
            await markAllNotificationsRead();
        } catch (error) {
            console.log('Could not mark all notifications as read', error);
        }
    }

    return (
        <div
            data-notifications-panel="true"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs"
        >
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <BellIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                        Notifications
                    </p>
                    <p className="text-[11px] text-gray-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <span className="rounded-full bg-dash-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            <div className="ws-scroll flex-1 overflow-y-auto px-2 py-2">
                <nav className="space-y-0.5">
                    {FILTERS.map(({ key, label, Icon }) => {
                        const isActive = activeFilter === key;

                        return (
                            <button
                                type="button"
                                key={key}
                                onClick={() => selectFilter(key)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition-colors ${
                                    isActive
                                        ? 'bg-dash-violet-500/10 font-medium text-dash-violet-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <Icon
                                    className={`size-4 shrink-0 ${
                                        isActive ? 'text-dash-violet-600' : 'text-gray-400'
                                    }`}
                                />
                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                {key === 'unread' && unreadCount > 0 && (
                                    <span className="shrink-0 rounded-full bg-dash-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-dash-violet-700">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="shrink-0 border-t border-gray-200 p-2">
                <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0 || isPending}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-dash-violet-500/10 px-2 py-2 text-xs font-medium text-dash-violet-700 transition-colors hover:bg-dash-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <CheckCheckIcon className="size-3.5" />
                    Mark all as read
                </button>
            </div>
        </div>
    );
};
