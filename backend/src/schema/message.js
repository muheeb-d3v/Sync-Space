import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    mimetype: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const reactionSchema = new mongoose.Schema({
    emoji: {
        type: String,
        required: true,
        trim: true,
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { _id: false });

const messageSchema = new mongoose.Schema({
    body: {
        type: String,
        default: '',
    },
    attachments: {
        type: [attachmentSchema],
        default: [],
    },
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: [true, 'Channel ID is required'],
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender ID is required'],
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: [true, 'Workspace ID is required'],
    },
    reactions: {
        type: [reactionSchema],
        default: [],
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;
