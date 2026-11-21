import jwt from 'jsonwebtoken';

import Channel from '../schema/channel.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import syncRepository from '../repositories/syncRepository.js';
import { leaveSyncService } from '../services/syncService.js';
import { JOIN_CHANNEL_EVENT } from '../utils/common/eventConstants.js';

/**
 * Realtime layer for Sync sessions:
 *  - `syncSocketJoin`  — attach a socket to a session (room + presence map)
 *  - `syncHeartbeat`   — refresh lastSeenAt (stale sweeper safety net)
 *  - `syncSignal`      — WebRTC signaling relay between two session members
 *  - disconnect        — implicit leave when a client drops off
 *
 * Presence map (in-memory): sessionId → userId → Set<socketId>. A user with
 * several tabs owns several sockets; the seat disappears only when the last
 * one leaves.
 */
const syncRooms = new Map();

function leaveRoom(sessionId, userId, socketId) {
    const users = syncRooms.get(sessionId);
    if (!users) return;
    const sockets = users.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
        users.delete(userId);
        if (users.size === 0) syncRooms.delete(sessionId);
    }
}

async function getUserFromHandshake(socket) {
    const token = socket.handshake?.auth?.token;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id ?? null;
    } catch {
        return null;
    }
}

/** Authorize a workspace/member against a (channel or DM) conversation. */
async function assertChannelAccessForSocket(channelId, userId) {
    const channel = await Channel.findById(channelId);
    if (!channel) return null;

    const workspace = await workspaceRepository.getById(channel.workspaceId);
    const isWorkspaceMember = (workspace?.members ?? []).some(
        (member) => String(member.memberId) === String(userId)
    );
    if (!isWorkspaceMember) return null;

    if (channel.type === 'dm') {
        const isParticipant = (channel.members ?? []).some(
            (member) => String(member) === String(userId)
        );
        if (!isParticipant) return null;
    }
    return channel;
}

export default function syncSocketHandler(io, socket) {
    socket.on('syncSocketJoin', async (data, cb) => {
        const respond = typeof cb === 'function' ? cb : () => {};
        try {
            const userId = await getUserFromHandshake(socket);
            if (!userId) {
                return respond({ success: false, message: 'Authentication required' });
            }

            const sessionId = data?.sessionId;
            if (!sessionId) {
                return respond({ success: false, message: 'sessionId is required' });
            }

            // The user must currently hold a live participant seat.
            const seat = await syncRepository.participants.getActiveForUser(
                sessionId,
                userId
            );
            if (!seat) {
                return respond({
                    success: false,
                    message: 'You are not part of this Sync session'
                });
            }

            await syncRepository.participants.touch(sessionId, userId).catch(() => {});

            const session = await syncRepository.sessions.getById(sessionId);
            if (!session || session.status !== 'active') {
                return respond({ success: false, message: 'This Sync is not active' });
            }
            const channel = await assertChannelAccessForSocket(
                session.channelId,
                userId
            );
            if (!channel) {
                return respond({
                    success: false,
                    message: 'You are not a member of this channel'
                });
            }

            socket.join(`sync:${sessionId}`);
            socket.data.userId = userId;

            if (!syncRooms.has(sessionId)) syncRooms.set(sessionId, new Map());
            const users = syncRooms.get(sessionId);
            if (!users.has(userId)) users.set(userId, new Set());
            users.get(userId).add(socket.id);

            return respond({
                success: true,
                message: `Joined Sync room ${sessionId}`,
                data: { sessionId }
            });
        } catch (error) {
            console.error('[ERROR] syncSocketJoin:', error?.message || error);
            return respond({ success: false, message: 'Could not join Sync room' });
        }
    });

    socket.on('syncHeartbeat', async (data) => {
        try {
            const sessionId = data?.sessionId;
            const userId = socket.data?.userId;
            if (sessionId && userId) {
                await syncRepository.participants.touch(sessionId, userId);
            }
        } catch {
            /* heartbeat is best-effort */
        }
    });

    socket.on('syncSignal', async (data) => {
        try {
            const { sessionId, to, payload } = data ?? {};
            const from = socket.data?.userId;
            if (!sessionId || !to || !from || !payload) return;

            const users = syncRooms.get(sessionId);
            const targets = users?.get(String(to));
            if (!targets) return; // Not connected — nothing to relay to.

            for (const socketId of targets) {
                io.to(socketId).emit('syncSignal', { from: String(from), payload });
            }
        } catch (error) {
            console.error('[ERROR] syncSignal relay:', error?.message || error);
        }
    });

    socket.on('syncSocketLeave', (data) => {
        const sessionId = data?.sessionId;
        const userId = socket.data?.userId;
        if (sessionId && userId) {
            leaveRoom(sessionId, userId, socket.id);
        }
    });

    // Implicit leave: the last socket of a user vanishing = presence gone.
    socket.on('disconnecting', async () => {
        const userId = socket.data?.userId;
        if (!userId) return;

        const sessionIds = Array.from(socket.rooms)
            .filter((room) => room.startsWith('sync:'))
            .map((room) => room.slice('sync:'.length));

        for (const sessionId of sessionIds) {
            leaveRoom(sessionId, userId, socket.id);

            // Multi-tab users keep their seat while another tab stays open.
            if (syncRooms.get(sessionId)?.get(userId)?.size > 0) continue;

            try {
                const { ended, session } = await leaveSyncService(sessionId, userId);
                if (ended) {
                    io.to(String(session.channelId)).emit('syncEnded', {
                        sessionId,
                        channelId: session.channelId
                    });
                } else {
                    io.to(String(session.channelId)).emit('syncUpdated', {
                        session
                    });
                }
            } catch (error) {
                console.error('[ERROR] implicit sync leave:', error?.message || error);
            }
        }
    });
}
