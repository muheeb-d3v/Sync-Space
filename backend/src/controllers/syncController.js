import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import {
    endSyncService,
    getActiveSyncService,
    getActiveSyncsForWorkspaceService,
    joinSyncService,
    leaveSyncService,
    postSyncSystemMessage,
    startSyncService
} from '../services/syncService.js';
import { customErrorResponse, successResponse } from '../utils/common/responseObjects.js';
import { io } from '../index.js';

function badId(res) {
    return res
        .status(StatusCodes.BAD_REQUEST)
        .json(customErrorResponse({
            message: 'Invalid identifier supplied.',
            statusCode: StatusCodes.BAD_REQUEST
        }));
}

function errorResponse(res, error) {
    console.error('[ERROR] syncController:', error?.message || error);
    const statusCode = error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    return res
        .status(statusCode)
        .json(customErrorResponse({
            message: error?.message || 'Internal Server Error',
            statusCode
        }));
}

/** Post the system message + emit newMessage to the channel room (no-op on failure). */
async function announceSystemMessage({ channel, body, userId }) {
    if (!channel || !userId) return;
    const message = await postSyncSystemMessage({
        channelId: String(channel._id),
        workspaceId: String(channel.workspaceId),
        body,
        userId
    });
    if (!message) return;
    io.to(String(channel._id)).emit('newMessage', message);
}

/* POST /sync/start — creator opens a Sync in a channel. */
export const startSyncController = async (req, res) => {
    try {
        const userId = req.user?.id;
        const channelId = req.body?.channelId;
        if (!channelId || !mongoose.isValidObjectId(channelId)) {
            return badId(res);
        }

        const { session, channel } = await startSyncService({ channelId }, userId);

        // System message: "<name> started a Sync in this channel."
        const username = req.user?.username || 'Someone';
        await announceSystemMessage({
            channel,
            body: `${username} started a Sync in this channel.`,
            userId
        });

        // Tell everyone in the channel (including the creator's other tabs).
        io.to(String(channelId)).emit('syncStarted', { session });

        return res
            .status(StatusCodes.CREATED)
            .json(successResponse(session, 'Sync started successfully!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};

/* GET /sync/active/:channelId — header state on page load / refocus. */
export const getActiveSyncController = async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const userId = req.user?.id;
        if (!channelId || !mongoose.isValidObjectId(channelId)) {
            return badId(res);
        }

        const { session } = await getActiveSyncService(channelId, userId);
        return res
            .status(StatusCodes.OK)
            .json(successResponse(session, 'Active Sync fetched successfully!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};

/* GET /sync/workspace/:workspaceId — channel-list indicators. */
export const getActiveSyncsForWorkspaceController = async (req, res) => {
    try {
        const workspaceId = req.params.workspaceId;
        if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
            return badId(res);
        }

        const sessions = await getActiveSyncsForWorkspaceService(workspaceId, req.user.id);
        return res
            .status(StatusCodes.OK)
            .json(successResponse(sessions, 'Active syncs fetched successfully!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};

/* POST /sync/:sessionId/join */
export const joinSyncController = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const userId = req.user?.id;
        if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
            return badId(res);
        }

        const { session, channel } = await joinSyncService(sessionId, userId);

        io.to(String(session.channelId)).emit('syncUpdated', { session });

        return res
            .status(StatusCodes.OK)
            .json(successResponse(session, 'Joined Sync successfully!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};

/* POST /sync/:sessionId/leave */
export const leaveSyncController = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const userId = req.user?.id;
        if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
            return badId(res);
        }

        const { ended, session, channel } = await leaveSyncService(sessionId, userId);

        if (ended) {
            if (channel) {
                await announceSystemMessage({
                    channel,
                    body: `The Sync ended after everyone left.`,
                    userId
                });
            }
            io.to(String(session.channelId)).emit('syncEnded', {
                sessionId,
                channelId: session.channelId
            });
        } else {
            io.to(String(session.channelId)).emit('syncUpdated', { session });
        }

        return res
            .status(StatusCodes.OK)
            .json(successResponse({ session, ended }, 'Left Sync!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};

/* POST /sync/:sessionId/end — creator or workspace admin. */
export const endSyncController = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const userId = req.user?.id;
        if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
            return badId(res);
        }

        const { channel } = await endSyncService(sessionId, userId);

        if (channel) {
            const username = req.user?.username || 'Someone';
            await announceSystemMessage({
                channel,
                body: `${username} ended the Sync.`,
                userId
            });
        }

        io.to(String(channel?._id ?? '')).emit('syncEnded', {
            sessionId,
            channelId: String(channel?._id ?? '')
        });

        return res
            .status(StatusCodes.OK)
            .json(successResponse(null, 'Sync ended!'));
    } catch (error) {
        return errorResponse(res, error);
    }
};
