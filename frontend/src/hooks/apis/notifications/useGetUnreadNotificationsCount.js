import { useQuery } from '@tanstack/react-query';

import { getUnreadNotificationCountRequest } from '@/apis/notifications';
import { useAuth } from '@/hooks/context/useAuth';

export const useGetUnreadNotificationsCount = () => {
    const { auth } = useAuth();

    const { data: unreadCount = 0, isFetching } = useQuery({
        queryFn: () => getUnreadNotificationCountRequest({ token: auth?.token }),
        queryKey: ['notifications', 'unread-count'],
        enabled: !!auth?.token,
        refetchInterval: 15000
    });

    return { unreadCount, isFetching };
};
