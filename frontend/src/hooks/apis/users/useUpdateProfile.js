import { useMutation } from '@tanstack/react-query';

import { updateProfileRequest } from '@/apis/users';
import { useAuth } from '@/hooks/context/useAuth';

export const useUpdateProfile = () => {
    const { auth } = useAuth();

    const {
        mutateAsync: updateProfileMutation,
        isPending,
        error
    } = useMutation({
        mutationFn: ({ username, email }) =>
            updateProfileRequest({ username, email, token: auth?.token })
    });

    return { updateProfileMutation, isPending, error };
};
