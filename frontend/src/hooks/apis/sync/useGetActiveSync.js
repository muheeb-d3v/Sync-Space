import { useQuery } from '@tanstack/react-query';

import { getActiveSyncRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

/** The live session of one channel (or null). Refreshed by socket events. */
export const useGetActiveSync = (channelId) => {
    const { auth } = useAuth();

    const { isLoading, isFetching, data: session } = useQuery({
        queryFn: () => getActiveSyncRequest({ channelId, token: auth?.token }),
        queryKey: [`fetchActiveSync-${channelId}`],
        enabled: !!channelId && !!auth?.token,
        refetchOnWindowFocus: true,
        staleTime: 10 * 1000
    });

    return {
        isLoading,
        isFetching,
        session: session ?? null
    };
};
