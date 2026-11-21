import { useMutation } from '@tanstack/react-query';

import { uploadAvatarRequest } from '@/apis/users';
import { useAuth } from '@/hooks/context/useAuth';

export const useUploadAvatar = () => {
    const { auth } = useAuth();

    const { mutateAsync: uploadAvatarMutation, isPending, error } = useMutation({
        mutationFn: ({ file }) =>
            uploadAvatarRequest({ file, token: auth?.token })
    });

    return { uploadAvatarMutation, isPending, error };
};
