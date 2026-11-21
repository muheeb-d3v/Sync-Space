import mongoose from 'mongoose';

/**
 * One row per join into a Sync session. Presence is derived from the data —
 * a participant is "in the session" while `leftAt` is null. Leaving closes the
 * current row; rejoining creates a fresh one (so join/leave history survives).
 */
const syncParticipantSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SyncSession',
            required: [true, 'Session ID is required']
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required']
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastSeenAt: {
            type: Date,
            default: Date.now
        },
        leftAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Live participants of a session.
syncParticipantSchema.index({ sessionId: 1, leftAt: 1 });

// A user can occupy at most one live seat per session (concurrent-join safe).
syncParticipantSchema.index(
    { sessionId: 1, userId: 1 },
    {
        unique: true,
        partialFilterExpression: { leftAt: null },
        name: 'unique_active_participant_per_session'
    }
);

const SyncParticipant = mongoose.model('SyncParticipant', syncParticipantSchema);

export default SyncParticipant;
