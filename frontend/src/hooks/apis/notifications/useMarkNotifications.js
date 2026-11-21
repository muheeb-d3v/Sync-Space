import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markAllNotificationsReadRequest, markNotificationReadRequest } from '@/apis/notifications';
import { useAuth } from '@/hooks/context/useAuth';

export const useMarkNotificationRead = () => {
    const { auth } = useAuth();
    const queryClient = useQueryClient();

    const { mutateAsync: markNotificationRead, isPending } = useMutation({
        mutationFn: ({ notificationId }) =>
            markNotificationReadRequest({
                notificationId,
                token: auth?.token
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    return { markNotificationRead, isPending };
};

export const useMarkAllNotificationsRead = () => {
    const { auth } = useAuth();
    const queryClient = useQueryClient();

    const { mutateAsync: markAllNotificationsRead, isPending } = useMutation({
        mutationFn: () =>
            markAllNotificationsReadRequest({ token: auth?.token }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    return { markAllNotificationsRead, isPending };
};
