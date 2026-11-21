import { useMutation } from '@tanstack/react-query';

import { leaveSyncRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

export const useLeaveSync = (sessionId) => {
    const { auth } = useAuth();

    const { isPending, mutateAsync: leaveSyncMutation } = useMutation({
        mutationFn: () => leaveSyncRequest({ sessionId, token: auth?.token })
    });

    return {
        isPending,
        leaveSyncMutation
    };
};
