import { useQuery } from '@tanstack/react-query';

import { getNotificationsRequest } from '@/apis/notifications';
import { useAuth } from '@/hooks/context/useAuth';

export const useGetNotifications = (filter = 'all') => {
    const { auth } = useAuth();

    const {
        data: notifications = [],
        isFetching,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryFn: () => getNotificationsRequest({ filter, token: auth?.token }),
        queryKey: ['notifications', filter],
        enabled: !!auth?.token,
        staleTime: 5000
    });

    return { notifications, isFetching, isLoading, error, refetch };
};
