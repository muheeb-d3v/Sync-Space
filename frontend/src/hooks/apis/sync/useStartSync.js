import { useMutation } from '@tanstack/react-query';

import { startSyncRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

export const useStartSync = () => {
    const { auth } = useAuth();

    const { isPending, mutateAsync: startSyncMutation } = useMutation({
        mutationFn: ({ channelId }) =>
            startSyncRequest({ channelId, token: auth?.token })
    });

    return {
        isPending,
        startSyncMutation
    };
};
