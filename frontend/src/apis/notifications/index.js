import axios from '@/config/axiosConfig';

export const getNotificationsRequest = async ({ filter = 'all', token }) => {
    try {
        const response = await axios.get('/notifications', {
            params: { filter },
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in get notifications request', error);
        throw error?.response?.data ?? error;
    }
};

export const getUnreadNotificationCountRequest = async ({ token }) => {
    try {
        const response = await axios.get('/notifications/unread-count', {
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data?.count ?? 0;
    } catch (error) {
        console.log('Error in get unread notification count request', error);
        throw error?.response?.data ?? error;
    }
};

export const markNotificationReadRequest = async ({ notificationId, token }) => {
    try {
        const response = await axios.put(
            `/notifications/${notificationId}/read`,
            {},
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in mark notification read request', error);
        throw error?.response?.data ?? error;
    }
};

export const markAllNotificationsReadRequest = async ({ token }) => {
    try {
        const response = await axios.put(
            '/notifications/read-all',
            {},
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in mark all notifications read request', error);
        throw error?.response?.data ?? error;
    }
};
