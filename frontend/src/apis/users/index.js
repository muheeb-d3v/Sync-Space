import axios from '@/config/axiosConfig';

export const updateProfileRequest = async ({ username, email, token }) => {
    try {
        const response = await axios.put(
            '/users/profile',
            { username, email },
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in update profile request', error);
        throw error?.response?.data ?? error;
    }
};

export const uploadAvatarRequest = async ({ file, token }) => {
    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await axios.post('/users/avatar', formData, {
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in upload avatar request', error);
        throw error?.response?.data ?? error;
    }
};

export const removeAvatarRequest = async ({ token }) => {
    try {
        const response = await axios.delete('/users/avatar', {
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in remove avatar request', error);
        throw error?.response?.data ?? error;
    }
};
