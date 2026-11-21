import axios from '@/config/axiosConfig';

export const startSyncRequest = async ({ channelId, token }) => {
    try {
        const response = await axios.post(
            '/sync/start',
            { channelId },
            { headers: { 'x-access-token': token } }
        );
        return response?.data?.data; // session
    } catch (error) {
        console.log('Error in start sync request', error);
        throw error?.response?.data ?? error;
    }
};

export const getActiveSyncRequest = async ({ channelId, token }) => {
    try {
        const response = await axios.get(`/sync/active/${channelId}`, {
            headers: { 'x-access-token': token }
        });
        return response?.data?.data; // session or null
    } catch (error) {
        console.log('Error in get active sync request', error);
        throw error?.response?.data ?? error;
    }
};

export const getActiveSyncsForWorkspaceRequest = async ({ workspaceId, token }) => {
    try {
        const response = await axios.get(`/sync/workspace/${workspaceId}`, {
            headers: { 'x-access-token': token }
        });
        return response?.data?.data; // [ { _id, channelId, participants } ]
    } catch (error) {
        console.log('Error in get workspace syncs request', error);
        throw error?.response?.data ?? error;
    }
};

export const joinSyncRequest = async ({ sessionId, token }) => {
    try {
        const response = await axios.post(
            `/sync/${sessionId}/join`,
            {},
            { headers: { 'x-access-token': token } }
        );
        return response?.data?.data; // { session, ended }
    } catch (error) {
        console.log('Error in join sync request', error);
        throw error?.response?.data ?? error;
    }
};

export const leaveSyncRequest = async ({ sessionId, token }) => {
    try {
        const response = await axios.post(
            `/sync/${sessionId}/leave`,
            {},
            { headers: { 'x-access-token': token } }
        );
        return response?.data?.data; // { session, ended }
    } catch (error) {
        console.log('Error in leave sync request', error);
        throw error?.response?.data ?? error;
    }
};

export const endSyncRequest = async ({ sessionId, token }) => {
    try {
        const response = await axios.post(
            `/sync/${sessionId}/end`,
            {},
            { headers: { 'x-access-token': token } }
        );
        return response?.data?.data;
    } catch (error) {
        console.log('Error in end sync request', error);
        throw error?.response?.data ?? error;
    }
};
