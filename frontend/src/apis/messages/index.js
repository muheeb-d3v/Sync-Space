import axios from '@/config/axiosConfig';

export const getMessagesRequest = async ({ channelId, token, page = 1, limit = 50 }) => {
    try {
        const response = await axios.get(`/messages/${channelId}`, {
            params: { page, limit },
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in get messages request', error);
        throw error?.response?.data ?? error;
    }
};

export const createMessageRequest = async ({ channelId, body, files, token }) => {
    try {
        const formData = new FormData();
        if (body !== undefined && body !== null) {
            formData.append('body', body);
        }
        if (files && Array.isArray(files)) {
            for (const file of files) {
                formData.append('attachments', file);
            }
        }

        const response = await axios.post(
            `/messages/${channelId}`,
            formData,
            {
                headers: {
                    'x-access-token': token,
                    'Content-Type': 'multipart/form-data',
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in create message request', error);
        throw error?.response?.data ?? error;
    }
};

export const updateMessageRequest = async ({ messageId, body, token }) => {
    try {
        const response = await axios.put(
            `/messages/${messageId}`,
            { body },
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in update message request', error);
        throw error?.response?.data ?? error;
    }
};

export const deleteMessageRequest = async ({ messageId, token }) => {
    try {
        const response = await axios.delete(`/messages/${messageId}`, {
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in delete message request', error);
        throw error?.response?.data ?? error;
    }
};

export const toggleReactionRequest = async ({ messageId, emoji, token }) => {
    try {
        const response = await axios.post(
            `/messages/${messageId}/reactions`,
            { emoji },
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in toggle reaction request', error);
        throw error?.response?.data ?? error;
    }
};
