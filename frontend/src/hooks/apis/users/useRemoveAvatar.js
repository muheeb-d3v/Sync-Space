import { useMutation } from '@tanstack/react-query';

import { removeAvatarRequest } from '@/apis/users';
import { useAuth } from '@/hooks/context/useAuth';

export const useRemoveAvatar = () => {
    const { auth } = useAuth();

    const { mutateAsync: removeAvatarMutation, isPending, error } = useMutation({
        mutationFn: () => removeAvatarRequest({ token: auth?.token })
    });

    return { removeAvatarMutation, isPending, error };
};
