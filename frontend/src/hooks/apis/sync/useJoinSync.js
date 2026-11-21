import { useMutation } from '@tanstack/react-query';

import { joinSyncRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

export const useJoinSync = (sessionId) => {
    const { auth } = useAuth();

    const { isPending, mutateAsync: joinSyncMutation } = useMutation({
        mutationFn: () => joinSyncRequest({ sessionId, token: auth?.token })
    });

    return {
        isPending,
        joinSyncMutation
    };
};
