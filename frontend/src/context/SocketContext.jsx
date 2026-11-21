import { createContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from '@/hooks/context/useAuth';

const SocketContext = createContext();

// The socket.io server is mounted at the API host root, not under /api/v1,
// so strip the API path suffix to get the socket origin.
const SOCKET_URL =
    (import.meta.env.VITE_BACKEND_API_URL || '').replace(/\/api\/v1\/?$/, '') ||
    'http://localhost:3000';

export const JOIN_CHANNEL_EVENT = 'join_channel';
export const NEW_MESSAGE_EVENT = 'newMessage';
export const MESSAGE_UPDATED_EVENT = 'messageUpdated';
export const MESSAGE_DELETED_EVENT = 'messageDeleted';

export const SocketContextProvider = ({ children }) => {
    const [currentChannel, setCurrentChannel] = useState(null);
    const { auth } = useAuth();
    const token = auth?.token;

    // Only connect once we have a session, and pass the JWT so the server can
    // authorize room joins (important for private DM rooms).
    const socket = useMemo(
        () =>
            token
                ? io(SOCKET_URL, { autoConnect: true, auth: { token } })
                : null,
        [token]
    );

    useEffect(() => {
        return () => {
            socket?.disconnect();
        };
    }, [socket]);

    async function joinChannel(channelId) {
        if (!socket) return channelId;

        socket.emit(JOIN_CHANNEL_EVENT, { channelId }, (data) => {
            if (!data?.success) {
                console.warn('Could not join channel room', data);
            }
        });
        setCurrentChannel(channelId);
        return channelId;
    }

    return (
        <SocketContext.Provider
            value={{ socket, currentChannel, setCurrentChannel, joinChannel }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
