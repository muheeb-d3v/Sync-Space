import { useMutation } from '@tanstack/react-query';

import { endSyncRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

export const useEndSync = (sessionId) => {
    const { auth } = useAuth();

    const { isPending, mutateAsync: endSyncMutation } = useMutation({
        mutationFn: () => endSyncRequest({ sessionId, token: auth?.token })
    });

    return {
        isPending,
        endSyncMutation
    };
};
