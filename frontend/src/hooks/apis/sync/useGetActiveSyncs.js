import { useQuery } from '@tanstack/react-query';

import { getActiveSyncsForWorkspaceRequest } from '@/apis/sync';
import { useAuth } from '@/hooks/context/useAuth';

/**
 * Active syncs for every channel in the workspace — drives the live
 * indicators in the channel list. Polls slowly as a safety net; socket events
 * trigger immediate refetches when the user is in an affected channel.
 */
export const useGetActiveSyncs = (workspaceId) => {
    const { auth } = useAuth();

    const { isLoading, data: sessions } = useQuery({
        queryFn: () =>
            getActiveSyncsForWorkspaceRequest({ workspaceId, token: auth?.token }),
        queryKey: [`fetchActiveSyncs-${workspaceId}`],
        enabled: !!workspaceId && !!auth?.token,
        refetchInterval: 20 * 1000,
        staleTime: 15 * 1000
    });

    return {
        isLoading,
        sessions: sessions ?? []
    };
};
