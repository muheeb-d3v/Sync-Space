import axios from '@/config/axiosConfig';

export const getDmsRequest = async ({ workspaceId, token }) => {
    try {
        const response = await axios.get(`/workspaces/${workspaceId}/dms`, {
            headers: {
                'x-access-token': token
            }
        });
        return response?.data?.data;
    } catch (error) {
        console.log('Error in get DMs request', error);
        throw error?.response?.data ?? error;
    }
};

export const createDmRequest = async ({ workspaceId, memberId, token }) => {
    try {
        const response = await axios.post(
            `/workspaces/${workspaceId}/dms`,
            { memberId },
            {
                headers: {
                    'x-access-token': token
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in create DM request', error);
        throw error?.response?.data ?? error;
    }
};
