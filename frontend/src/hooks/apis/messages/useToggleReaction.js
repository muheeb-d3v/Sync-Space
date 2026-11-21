import { useMutation } from '@tanstack/react-query';

import { toggleReactionRequest } from '@/apis/messages';
import { useAuth } from '@/hooks/context/useAuth';

export const useToggleReaction = () => {
    const { auth } = useAuth();

    const { isPending, error, mutateAsync: toggleReactionMutation } = useMutation({
        mutationFn: (data) => toggleReactionRequest({ ...data, token: auth?.token })
    });

    return {
        isPending,
        error,
        toggleReactionMutation
    };
};
