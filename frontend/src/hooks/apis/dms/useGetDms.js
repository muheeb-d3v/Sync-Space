import { useQuery } from '@tanstack/react-query';

import { getDmsRequest } from '@/apis/dms';
import { useAuth } from '@/hooks/context/useAuth';

export const useGetDms = (workspaceId) => {
    const { auth } = useAuth();

    const {
        data: dms = [],
        isFetching,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryFn: () => getDmsRequest({ workspaceId, token: auth?.token }),
        queryKey: ['dms', workspaceId],
        enabled: !!workspaceId && !!auth?.token,
        staleTime: 10000
    });

    return { dms, isFetching, isLoading, error, refetch };
};
