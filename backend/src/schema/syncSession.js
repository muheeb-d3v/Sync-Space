import mongoose from 'mongoose';

/**
 * A Sync session: a live team conversation attached to one channel
 * (Slack-huddle style). The server owns the session state — clients only
 * reflect what this collection says.
 */
const syncSessionSchema = new mongoose.Schema(
    {
        channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Channel',
            required: [true, 'Channel ID is required']
        },
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Workspace',
            required: [true, 'Workspace ID is required']
        },
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator ID is required']
        },
        status: {
            type: String,
            enum: ['active', 'ended'],
            default: 'active'
        },
        endedAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true } // createdAt/updatedAt
);

// Fast lookups of the session state for a channel.
syncSessionSchema.index({ channelId: 1, status: 1 });

// Server-enforced single active session per channel: MongoDB rejects a second
// insert while an `active` session exists, which makes duplicate sessions
// impossible even under concurrent "Start Sync" requests.
syncSessionSchema.index(
    { channelId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'active' },
        name: 'unique_active_session_per_channel'
    }
);

const SyncSession = mongoose.model('SyncSession', syncSessionSchema);

export default SyncSession;
