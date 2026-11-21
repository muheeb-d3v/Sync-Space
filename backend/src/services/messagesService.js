import messageRepository from "../repositories/messageRepository.js";
import Channel from "../schema/channel.js";
import { isMemberPartOfWorkspace } from "../services/memberService.js";
import { assertDmParticipantship } from "../services/dmService.js";
import { createMessageNotifications } from "../services/notificationService.js";
import { customErrorResponse } from "../utils/common/responseObjects.js";
import { StatusCodes } from "http-status-codes";

export const getMessagesService = async (messageParams, page, limit, userId) => {
    try {
        const channel = await Channel.findById(messageParams.channelId);
        if (!channel) {
            throw customErrorResponse({
                message: "Channel not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        await isMemberPartOfWorkspace(channel.workspaceId.toString(), userId);
        assertDmParticipantship(channel, userId);

        // Fetch paginated messages
        const messages = await messageRepository.getPaginatedMessages(messageParams, page, limit);
        console.log("[DEBUG] Messages fetched:", messages.length);

        return messages;
    } catch (error) {
        console.error("[ERROR] getMessagesService:", error.message);
        throw error;
    }
};

export const updateMessageService = async (messageId, userId, body) => {
    try {
        const message = await messageRepository.getById(messageId);
        if (!message) {
            throw customErrorResponse({
                message: "Message not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        // Only the author can edit their own message.
        if (message.senderId.toString() !== userId) {
            throw customErrorResponse({
                message: "You can only edit your own messages.",
                statusCode: StatusCodes.FORBIDDEN
            });
        }

        message.body = body;
        await message.save();
        await message.populate('senderId', 'username email avatar');
        return message;
    } catch (error) {
        console.error("[ERROR] updateMessageService:", error);
        throw error;
    }
};

export const deleteMessageService = async (messageId, userId) => {
    try {
        const message = await messageRepository.getById(messageId);
        if (!message) {
            throw customErrorResponse({
                message: "Message not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        if (message.senderId.toString() !== userId) {
            throw customErrorResponse({
                message: "You can only delete your own messages.",
                statusCode: StatusCodes.FORBIDDEN
            });
        }

        const channelId = message.channelId;
        await messageRepository.delete(messageId);
        return { messageId, channelId };
    } catch (error) {
        console.error("[ERROR] deleteMessageService:", error);
        throw error;
    }
};

export const createMessageService = async ({ body, attachments }, userId, channelId) => {    try {
        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw customErrorResponse({
                message: "Channel not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        await isMemberPartOfWorkspace(channel.workspaceId.toString(), userId);
        assertDmParticipantship(channel, userId);

        const newMessage = await messageRepository.create({
            body,
            attachments,
            senderId: userId,
            channelId,
            workspaceId: channel.workspaceId
        });

        // Populate the sender so REST responses and the realtime socket payload
        // both carry the author's identity (needed to render the message list).
        await newMessage.populate('senderId', 'username email avatar');

        // Notify the DM recipient or any @mentioned workspace members.
        await createMessageNotifications(newMessage, channel);

        console.log("[SUCCESS] Message created:", newMessage);
        return newMessage;
    } catch (error) {
        console.error("[ERROR] createMessageService:", error);
        throw error;
    }
};

// Single emoji (including ZWJ sequences, skin-tone modifiers, flags).
const REACTION_EMOJI_PATTERN =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D|\uFE0F|\u20E3)+$/u;
const MAX_REACTION_LENGTH = 32;
const MAX_REACTION_KINDS = 25;

export const toggleReactionService = async (messageId, userId, emoji) => {
    try {
        const normalized = typeof emoji === 'string' ? emoji.trim() : '';

        if (
            !normalized ||
            normalized.length > MAX_REACTION_LENGTH ||
            !REACTION_EMOJI_PATTERN.test(normalized)
        ) {
            throw customErrorResponse({
                message: "A single valid emoji is required.",
                statusCode: StatusCodes.BAD_REQUEST
            });
        }

        const message = await messageRepository.getById(messageId);
        if (!message) {
            throw customErrorResponse({
                message: "Message not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        const channel = await Channel.findById(message.channelId);
        if (!channel) {
            throw customErrorResponse({
                message: "Channel not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        // Same access rules as reading/posting in the conversation.
        await isMemberPartOfWorkspace(channel.workspaceId.toString(), userId);
        assertDmParticipantship(channel, userId);

        // Anyone in the conversation may react; just keep the emoji set bounded.
        const reactions = message.reactions ?? [];
        const hasBucket = reactions.some((reaction) => reaction.emoji === normalized);
        if (!hasBucket && reactions.length >= MAX_REACTION_KINDS) {
            throw customErrorResponse({
                message: "This message has too many different reactions.",
                statusCode: StatusCodes.BAD_REQUEST
            });
        }

        const updated = await messageRepository.toggleReaction(messageId, userId, normalized);
        if (!updated) {
            throw customErrorResponse({
                message: "Message not found.",
                statusCode: StatusCodes.NOT_FOUND
            });
        }

        return updated;
    } catch (error) {
        console.error("[ERROR] toggleReactionService:", error?.message || error);
        throw error;
    }
};
