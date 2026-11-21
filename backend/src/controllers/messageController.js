import { StatusCodes } from 'http-status-codes';
import {
  customErrorResponse,
  successResponse
} from '../utils/common/responseObjects.js';
import { createMessageService, deleteMessageService, getMessagesService, toggleReactionService, updateMessageService } from '../services/messagesService.js';
import { io } from '../index.js';
import Message from '../schema/message.js';
import { UPLOAD_DIR_PATH, getContentDisposition } from '../config/uploadConfig.js';
import fs from 'node:fs';
import path from 'node:path';


export const getMessagesController = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const channelId = req.params.channelId;
    const userId = req.user.id;

    if (!channelId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Channel ID is required.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    const messages = await getMessagesService({ channelId }, Number(page), Number(limit), userId);

    return res.status(StatusCodes.OK).json(successResponse(messages, 'Messages fetched successfully!'));
  } catch (error) {
    console.error('[ERROR] Exception in getMessagesController:', error);

    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};

export const createMessageController = async (req, res) => {
  try {
    const userId = req.user.id;
    const channelId = req.params.channelId;
    const { body } = req.body;
    const files = req.files || [];

    if (!channelId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Channel ID is required.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    if (!body && (!files || files.length === 0)) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Message body or at least one attachment is required.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    // Build attachment metadata from uploaded files.
    // URL points to the authenticated download endpoint.
    const attachments = (files || []).map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/messages/files/${file.filename}`,
    }));

    const savedMessage = await createMessageService({ body: body || '', attachments }, userId, channelId);

    // Emit the event to users in the specific channel
    io.to(channelId).emit('newMessage', savedMessage);

    console.log('[SUCCESS] Message created:', savedMessage._id);

    return res.status(StatusCodes.CREATED).json(successResponse(savedMessage, 'Message created successfully!'));
  } catch (error) {
    // Clean up any uploaded files if message creation failed.
    if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
            try {
                fs.unlinkSync(path.join(UPLOAD_DIR_PATH, file.filename));
            } catch (unlinkErr) {
                console.warn('[WARN] Could not delete orphaned upload:', unlinkErr.message);
            }
        }
    }

    console.error('[ERROR] Exception in createMessageController:', error);
    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};

export const downloadFileController = async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;

    if (!filename) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Filename is required.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    // Prevent path traversal — filename must be a simple basename.
    if (filename.includes('/') || filename.includes('\\') || filename === '..') {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Invalid filename.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    // Find a message that references this file to verify access.
    const message = await Message.findOne({ 'attachments.filename': filename });
    if (!message) {
      return res.status(StatusCodes.NOT_FOUND).json(
        customErrorResponse({
          message: 'File not found.',
          statusCode: StatusCodes.NOT_FOUND
        })
      );
    }

    // Authorization: user must be a member of the workspace.
    const { isMemberPartOfWorkspace } = await import('../services/memberService.js');
    await isMemberPartOfWorkspace(message.workspaceId.toString(), userId);

    const filePath = path.join(UPLOAD_DIR_PATH, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(StatusCodes.NOT_FOUND).json(
        customErrorResponse({
          message: 'File not found on server.',
          statusCode: StatusCodes.NOT_FOUND
        })
      );
    }

    const attachment = message.attachments.find((a) => a.filename === filename);

    // Set headers for secure, correct file delivery.
    res.setHeader('Content-Disposition', getContentDisposition(attachment.mimetype, attachment.originalName));
    res.setHeader('Content-Type', attachment.mimetype || 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent execution of potentially active content (SVG, HTML).
    if (attachment.mimetype === 'image/svg+xml' || attachment.mimetype === 'text/html') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('[ERROR] Exception in downloadFileController:', error);
    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};

export const toggleReactionController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body ?? {};

    const updated = await toggleReactionService(messageId, userId, emoji);

    // Reuse the message update event so every open client re-renders the
    // reaction pills without a dedicated listener.
    io.to(updated.channelId.toString()).emit('messageUpdated', updated);

    return res.status(StatusCodes.OK).json(
      successResponse(updated, 'Reaction updated successfully!')
    );
  } catch (error) {
    console.error('[ERROR] Exception in toggleReactionController:', error);
    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};

export const updateMessageController = async (req, res) => {  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        customErrorResponse({
          message: 'Message body is required.',
          statusCode: StatusCodes.BAD_REQUEST
        })
      );
    }

    const updated = await updateMessageService(messageId, userId, body);
    io.to(updated.channelId.toString()).emit('messageUpdated', updated);
    return res.status(StatusCodes.OK).json(successResponse(updated, 'Message updated successfully!'));
  } catch (error) {
    console.error('[ERROR] Exception in updateMessageController:', error);
    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};

export const deleteMessageController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const result = await deleteMessageService(messageId, userId);
    io.to(result.channelId.toString()).emit('messageDeleted', { messageId: result.messageId });
    return res.status(StatusCodes.OK).json(successResponse(result, 'Message deleted successfully!'));
  } catch (error) {
    console.error('[ERROR] Exception in deleteMessageController:', error);
    return res.status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(
      customErrorResponse({
        message: error?.message || 'Internal Server Error',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      })
    );
  }
};
