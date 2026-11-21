import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createDmRequest } from '@/apis/dms';
import { useAuth } from '@/hooks/context/useAuth';

export const useCreateDm = (workspaceId) => {
    const { auth } = useAuth();
    const queryClient = useQueryClient();

    const {
        mutateAsync: createDmMutation,
        isPending,
        error
    } = useMutation({
        mutationFn: ({ memberId }) =>
            createDmRequest({ workspaceId, memberId, token: auth?.token }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dms', workspaceId] });
        }
    });

    return { createDmMutation, isPending, error };
};
