import { StatusCodes } from 'http-status-codes';

import syncRepository from '../repositories/syncRepository.js';
import Channel from '../schema/channel.js';
import messageRepository from '../repositories/messageRepository.js';
import workspaceRepository from '../repositories/workspaceRepository.js';
import { isMemberPartOfWorkspace } from './memberService.js';
import { customErrorResponse } from '../utils/common/responseObjects.js';
import { io } from '../index.js';

/**
 * Client-facing shape of a sync session. Presence is always derived server
 * side; clients never decide who is in a session.
 */
export function formatSyncSession(session, participants = []) {
    if (!session) return null;
    const live = participants.filter((p) => !p.leftAt);
    return {
        _id: String(session._id),
        channelId: String(session.channelId),
        workspaceId: String(session.workspaceId),
        creatorId: String(
            typeof session.creatorId === 'object' && session.creatorId !== null
                ? session.creatorId._id
                : session.creatorId
        ),
        status: session.status,
        startedAt: session.createdAt,
        endedAt: session.endedAt ?? null,
        participants: live.map((p) => ({
            _id: String(p._id),
            joinedAt: p.joinedAt,
            userId:
                typeof p.userId === 'object' && p.userId !== null
                    ? {
                          _id: String(p.userId._id),
                          username: p.userId.username,
                          email: p.userId.email,
                          avatar: p.userId.avatar
                      }
                    : String(p.userId)
        }))
    };
}

async function loadParticipants(sessionId) {
    return syncRepository.participants.getActive(sessionId);
}

async function assertChannelAccess(channel, userId) {
    await isMemberPartOfWorkspace(channel.workspaceId.toString(), userId);
}

function syncError(message, statusCode) {
    return customErrorResponse({ message, statusCode });
}

/** Realtime payload sender (never let a broadcast failure break a request). */
function broadcastAll(event, payload) {
    try {
        io.to(payload.channelId).emit(event, payload);
    } catch (error) {
        console.error('[SYNC] Broadcast failed:', error?.message);
    }
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

export const startSyncService = async ({ channelId }, userId) => {
    try {
        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw syncError('Channel not found.', StatusCodes.NOT_FOUND);
        }
        // Sync is a channel feature; DM calls are intentionally out of scope.
        if (channel.type === 'dm') {
            throw syncError(
                'Sync is only available in channels.',
                StatusCodes.BAD_REQUEST
            );
        }
        await assertChannelAccess(channel, userId);

        // Fast-path duplicate guard; the concurrent case is caught by the
        // partial unique index below (mongod rejects the second insert).
        const existing = await syncRepository.sessions.findActiveForChannel(channelId);
        if (existing) {
            throw syncError(
                'A Sync is already active in this channel.',
                StatusCodes.CONFLICT
            );
        }

        let session;
        try {
            session = await syncRepository.sessions.create({
                channelId,
                workspaceId: channel.workspaceId,
                creatorId: userId
            });
        } catch (error) {
            if (error?.code === 11000) {
                throw syncError(
                    'A Sync is already active in this channel.',
                    StatusCodes.CONFLICT
                );
            }
            throw error;
        }

        // The creator starts inside their own session.
        await syncRepository.participants.create({ sessionId: session._id, userId });

        const formatted = formatSyncSession(
            session,
            await loadParticipants(session._id)
        );
        return { session: formatted, channel };
    } catch (error) {
        console.error('[ERROR] startSyncService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not start Sync.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const joinSyncService = async (sessionId, userId) => {
    try {
        const session = await syncRepository.sessions.getById(sessionId);
        if (!session) {
            throw syncError('Sync session not found.', StatusCodes.NOT_FOUND);
        }
        if (session.status !== 'active') {
            throw syncError('This Sync has already ended.', StatusCodes.CONFLICT);
        }

        const channel = await Channel.findById(session.channelId);
        if (!channel) {
            throw syncError('Channel not found.', StatusCodes.NOT_FOUND);
        }
        await assertChannelAccess(channel, userId);

        let participantRow = await syncRepository.participants.getActiveForUser(
            sessionId,
            userId
        );
        if (!participantRow) {
            try {
                await syncRepository.participants.create({ sessionId, userId });
            } catch (error) {
                // Lost a unique-index race with a concurrent join of the same
                // user — they are already in, treat as success.
                if (error?.code !== 11000) throw error;
            }
        } else {
            await syncRepository.participants.touch(sessionId, userId).catch(() => {});
        }

        const formatted = formatSyncSession(
            session,
            await loadParticipants(sessionId)
        );
        return { session: formatted, channel };
    } catch (error) {
        console.error('[ERROR] joinSyncService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not join Sync.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const leaveSyncService = async (sessionId, userId) => {
    try {
        const session = await syncRepository.sessions.getById(sessionId);
        if (!session) {
            throw syncError('Sync session not found.', StatusCodes.NOT_FOUND);
        }

        const channel = await Channel.findById(session.channelId);
        if (!channel) {
            throw syncError('Channel not found.', StatusCodes.NOT_FOUND);
        }

        await syncRepository.participants.leave(sessionId, userId);

        // A session with nobody left inside ends itself (no zombie sessions).
        const remaining = await loadParticipants(sessionId);
        let ended = false;
        if (session.status === 'active' && remaining.length === 0) {
            await syncRepository.sessions.updateById(sessionId, {
                status: 'ended',
                endedAt: new Date()
            });
            ended = true;
        }

        const fresh = await syncRepository.sessions.getById(sessionId);
        const formatted = formatSyncSession(fresh, ended ? [] : remaining);

        return { ended, session: formatted, channel };
    } catch (error) {
        console.error('[ERROR] leaveSyncService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not leave Sync.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const endSyncService = async (sessionId, userId) => {
    try {
        const session = await syncRepository.sessions.getById(sessionId);
        if (!session) {
            throw syncError('Sync session not found.', StatusCodes.NOT_FOUND);
        }
        if (session.status !== 'active') {
            throw syncError('This Sync has already ended.', StatusCodes.CONFLICT);
        }

        const channel = await Channel.findById(session.channelId);
        if (!channel) {
            throw syncError('Channel not found.', StatusCodes.NOT_FOUND);
        }
        const workspace = await workspaceRepository.getById(
            channel.workspaceId.toString()
        );
        const requester = (workspace?.members ?? []).find(
            (m) => String(m.memberId) === String(userId)
        );
        const isCreator = String(session.creatorId) === String(userId);
        const isAdmin = requester?.role === 'Admin';
        if (!isCreator && !isAdmin) {
            throw syncError(
                'Only the session creator or a workspace admin can end this Sync.',
                StatusCodes.FORBIDDEN
            );
        }

        await syncRepository.sessions.updateById(sessionId, {
            status: 'ended',
            endedAt: new Date()
        });
        await syncRepository.participants.leaveAll(sessionId);

        return {
            ended: true,
            channel,
            session: formatSyncSession(session, [])
        };
    } catch (error) {
        console.error('[ERROR] endSyncService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not end Sync.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const getActiveSyncService = async (channelId, userId) => {
    try {
        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw syncError('Channel not found.', StatusCodes.NOT_FOUND);
        }
        await assertChannelAccess(channel, userId);

        const session = await syncRepository.sessions.findActiveForChannel(channelId);
        if (!session) return { session: null, channel };

        return {
            session: formatSyncSession(session, await loadParticipants(session._id)),
            channel
        };
    } catch (error) {
        console.error('[ERROR] getActiveSyncService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not fetch Sync state.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getActiveSyncsForWorkspaceService = async (workspaceId, userId) => {
    try {
        await isMemberPartOfWorkspace(workspaceId.toString(), userId);

        const sessions = await syncRepository.sessions.findActiveForWorkspace(workspaceId);
        if (sessions.length === 0) return [];

        const participantLists = await Promise.all(
            sessions.map((s) => loadParticipants(s._id))
        );

        return sessions.map((session, i) => ({
            _id: String(session._id),
            channelId: String(session.channelId),
            workspaceId: String(session.workspaceId),
            creatorId: String(session.creatorId),
            status: session.status,
            startedAt: session.createdAt,
            participants: formatSyncSession(session, participantLists[i]).participants
        }));
    } catch (error) {
        console.error('[ERROR] getActiveSyncsForWorkspaceService:', error?.message || error);
        throw error?.statusCode
            ? error
            : syncError(error?.message || 'Could not fetch active Syncs.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/* ------------------------------------------------------------------ */
/* Auxiliaries                                                         */
/* ------------------------------------------------------------------ */

/** Posts the "started/ended a Sync" system message into the channel. */
export const postSyncSystemMessage = async ({ channelId, workspaceId, body, userId }) => {
    try {
        const message = await messageRepository.create({
            body,
            attachments: [],
            senderId: userId,
            channelId,
            workspaceId
        });
        await message.populate('senderId', 'username email avatar');
        return message;
    } catch (error) {
        console.error('[ERROR] postSyncSystemMessage:', error?.message || error);
        return null; // Never fail the session operation because of a system message.
    }
};

/**
 * Sweeps participants whose sockets died without a clean leave (crashed tabs,
 * dropped connections) and auto-ends sessions with nobody inside.
 */
export const runStaleSweeper = async () => {
    try {
        const cutoff = new Date(Date.now() - 90 * 1000);
        const stale = await syncRepository.participants.getStaleRecords(cutoff);

        for (const record of stale) {
            const session = record.sessionId;
            const sessionId = session?._id ?? session;
            await syncRepository.participants
                .leave(sessionId, record.userId)
                .catch(() => {});

            if (session) {
                // Tell everyone in the room the presence changed.
                const remaining = await loadParticipants(sessionId).catch(() => []);
                broadcastAll('syncUpdated', {
                    session: formatSyncSession(session, remaining)
                });
            }
        }

        // Auto-end active sessions that no longer have anyone inside.
        const activeSessions = await syncRepository.sessions.findActiveForAll();
        let endedCount = 0;
        for (const session of activeSessions) {
            const remaining = await loadParticipants(session._id);
            if (remaining.length > 0) continue;
            await syncRepository.sessions.updateById(session._id, {
                status: 'ended',
                endedAt: new Date()
            });
            endedCount += 1;
            broadcastAll('syncEnded', {
                sessionId: String(session._id),
                channelId: String(session.channelId)
            });
        }

        return { swept: stale.length, ended: endedCount };
    } catch (error) {
        console.error('[ERROR] runStaleSweeper:', error?.message || error);
        return { swept: 0, error: error?.message };
    }
};

export const startSyncSweeper = () => {
    setInterval(() => {
        runStaleSweeper();
    }, 45 * 1000);
};
