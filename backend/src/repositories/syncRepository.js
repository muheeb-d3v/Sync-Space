import SyncSession from '../schema/syncSession.js';
import SyncParticipant from '../schema/syncParticipant.js';

const syncRepository = {
    // ---- Sessions ----------------------------------------------------------------
    sessions: {
        getById: async (id) => {
            try {
                return await SyncSession.findById(id);
            } catch (error) {
                console.error('[syncRepository] get session:', error.message);
                throw error;
            }
        },

        findActiveForChannel: async (channelId) => {
            try {
                return await SyncSession.findOne({ channelId, status: 'active' });
            } catch (error) {
                console.error('[syncRepository] findActiveForChannel:', error.message);
                throw error;
            }
        },

        create: async (data) => {
            try {
                return await SyncSession.create(data);
            } catch (error) {
                console.error('[syncRepository] create session:', error.message);
                throw error;
            }
        },

        updateById: async (id, data) => {
            try {
                return await SyncSession.findByIdAndUpdate(id, data, { new: true });
            } catch (error) {
                console.error('[syncRepository] update session:', error.message);
                throw error;
            }
        },

        // All active sessions in a workspace (for channel-list indicators).
        findActiveForWorkspace: async (workspaceId) => {
            try {
                return await SyncSession.find({ workspaceId, status: 'active' });
            } catch (error) {
                console.error('[syncRepository] findActiveForWorkspace:', error.message);
                throw error;
            }
        },

        // Every active session (used by the stale sweeper).
        findActiveForAll: async () => {
            try {
                return await SyncSession.find({ status: 'active' });
            } catch (error) {
                console.error('[syncRepository] findActiveForAll:', error.message);
                throw error;
            }
        }
    },

    // ---- Participants ------------------------------------------------------------
    participants: {
        getActive: async (sessionId) => {
            try {
                return await SyncParticipant.find({ sessionId, leftAt: null })
                    .populate('userId', 'username email avatar');
            } catch (error) {
                console.error('[syncRepository] active participants:', error.message);
                throw error;
            }
        },

        getActiveForUser: async (sessionId, userId) => {
            try {
                return await SyncParticipant.findOne({ sessionId, userId, leftAt: null });
            } catch (error) {
                console.error('[syncRepository] active participant for user:', error.message);
                throw error;
            }
        },

        /** Find a user's live row without consuming it — used to detect rejoin. */
        countActiveForUserAnywhere: async (userId) => {
            try {
                return await SyncParticipant.find({ userId, leftAt: null })
                    .populate('sessionId');
            } catch (error) {
                console.error('[syncRepository] countActiveForUserAnywhere:', error.message);
                throw error;
            }
        },

        create: async (data) => {
            try {
                return await SyncParticipant.create(data);
            } catch (error) {
                console.error('[syncRepository] create participant:', error.message);
                throw error;
            }
        },

        touch: async (sessionId, userId) => {
            try {
                return await SyncParticipant.findOneAndUpdate(
                    { sessionId, userId, leftAt: null },
                    { lastSeenAt: new Date() }
                );
            } catch (error) {
                console.error('[syncRepository] touch participant:', error.message);
                throw error;
            }
        },

        leave: async (sessionId, userId) => {
            try {
                return await SyncParticipant.updateMany(
                    { sessionId, userId, leftAt: null },
                    { leftAt: new Date() }
                );
            } catch (error) {
                console.error('[syncRepository] leave participant:', error.message);
                throw error;
            }
        },

        leaveAll: async (sessionId) => {
            try {
                return await SyncParticipant.updateMany(
                    { sessionId, leftAt: null },
                    { leftAt: new Date() }
                );
            } catch (error) {
                console.error('[syncRepository] leaveAll participants:', error.message);
                throw error;
            }
        },

        /** Live participants with commit... used by the stale sweeper. */
        getStaleRecords: async (cutoff) => {
            try {
                return await SyncParticipant.find({ leftAt: null, lastSeenAt: { $lt: cutoff } })
                    .populate('sessionId');
            } catch (error) {
                console.error('[syncRepository] stale records:', error.message);
                throw error;
            }
        }
    }
};

export default syncRepository;
