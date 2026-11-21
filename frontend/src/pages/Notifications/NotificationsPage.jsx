import {
    AtSignIcon,
    BellIcon,
    CheckCheckIcon,
    InfoIcon,
    Loader,
    MessageSquareIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useGetNotifications } from '@/hooks/apis/notifications/useGetNotifications';
import { useGetUnreadNotificationsCount } from '@/hooks/apis/notifications/useGetUnreadNotificationsCount';
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead
} from '@/hooks/apis/notifications/useMarkNotifications';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'dm', label: 'DMs' },
    { key: 'mention', label: 'Mentions' },
    { key: 'system', label: 'System' }
];

const TYPE_STYLES = {
    dm: {
        Icon: MessageSquareIcon,
        className: 'bg-dash-violet-500/10 text-dash-violet-600'
    },
    mention: {
        Icon: AtSignIcon,
        className: 'bg-dash-sky-500/10 text-dash-sky-700'
    },
    system: {
        Icon: InfoIcon,
        className: 'bg-gray-100 text-gray-500'
    }
};

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

export const NotificationsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const filterParam = searchParams.get('filter') || 'all';
    const filter = FILTERS.some((item) => item.key === filterParam)
        ? filterParam
        : 'all';

    const { notifications, isLoading, isFetching, error } = useGetNotifications(filter);
    const { unreadCount } = useGetUnreadNotificationsCount();
    const { markNotificationRead } = useMarkNotificationRead();
    const { markAllNotificationsRead, isPending: isMarkingAll } =
        useMarkAllNotificationsRead();

    const unread = notifications.filter((notification) => !notification.isRead);
    const earlier = notifications.filter((notification) => notification.isRead);

    function selectFilter(nextFilter) {
        if (nextFilter === 'all') {
            setSearchParams({});
        } else {
            setSearchParams({ filter: nextFilter });
        }
    }

    async function handleMarkAllRead() {
        if (unreadCount === 0 || isMarkingAll) return;
        try {
            await markAllNotificationsRead();
        } catch (markError) {
            console.log('Could not mark all notifications as read', markError);
        }
    }

    function handleOpen(notification) {
        if (!notification.isRead) {
            markNotificationRead({ notificationId: notification._id }).catch((markError) => {
                console.log('Could not mark notification as read', markError);
            });
        }

        if (notification.link) {
            navigate(notification.link);
        }
    }

    function renderNotification(notification) {
        const { Icon, className } = TYPE_STYLES[notification.type] || TYPE_STYLES.system;
        const isUnread = !notification.isRead;

        return (
            <button
                type="button"
                key={notification._id}
                data-notification-id={notification._id}
                data-notification-type={notification.type}
                onClick={() => handleOpen(notification)}
                className={`group flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 ${
                    isUnread ? 'bg-white' : 'bg-gray-50/60'
                }`}
            >
                <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${className}`}
                >
                    <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p
                            className={`min-w-0 truncate text-sm ${
                                isUnread
                                    ? 'font-semibold text-gray-900'
                                    : 'font-medium text-gray-700'
                            }`}
                        >
                            {notification.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-400">
                            {formatRelativeTime(notification.createdAt)}
                        </span>
                    </div>
                    {notification.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-500">
                            {notification.body}
                        </p>
                    )}
                </div>

                {isUnread && (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-dash-violet-500" />
                )}
            </button>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4 lg:px-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <BellIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-gray-900">
                        Notifications
                    </h2>
                    <p className="truncate text-[11px] text-gray-400">
                        {unreadCount > 0
                            ? `${unreadCount} unread · mentions, DMs and workspace updates`
                            : 'Mentions, DMs and workspace updates'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0 || isMarkingAll}
                    aria-label="Mark all notifications as read"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-dash-violet-300 hover:bg-dash-violet-500/10 hover:text-dash-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <CheckCheckIcon className="size-3.5" />
                    <span className="hidden sm:inline">Mark all as read</span>
                </button>
            </header>

            {/* On phones the filter panel lives in the drawer, so expose filters here. */}
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-gray-200 px-3 py-2 md:hidden">
                {FILTERS.map(({ key, label }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => selectFilter(key)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            filter === key
                                ? 'bg-dash-violet-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="ws-scroll flex-1 overflow-y-auto px-4 py-5 lg:px-6">
                <div className="mx-auto max-w-3xl">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader className="size-5 animate-spin text-dash-violet-500" />
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                            Could not load notifications. Please try again.
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-dash-violet-500/10 text-dash-violet-600">
                                <BellIcon className="size-6" />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-gray-900">
                                {filter === 'unread'
                                    ? "You're all caught up"
                                    : 'No notifications yet'}
                            </p>
                            <p className="mt-1 max-w-sm text-xs text-gray-400">
                                {filter === 'unread'
                                    ? 'New mentions and direct messages will appear here.'
                                    : 'When someone messages you, mentions you, or adds you to a workspace, it will show up here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {unread.length > 0 && (
                                <section>
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                            Unread
                                        </h3>
                                        {isFetching && (
                                            <Loader className="size-3.5 animate-spin text-dash-violet-500" />
                                        )}
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                                        {unread.map(renderNotification)}
                                    </div>
                                </section>
                            )}

                            {earlier.length > 0 && (
                                <section>
                                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        Earlier
                                    </h3>
                                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                                        {earlier.map(renderNotification)}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
