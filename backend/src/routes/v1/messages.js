import express from 'express';
import { isAuthenticated, isAuthenticatedForFiles } from '../../middlewares/authMiddleware.js';
import { createMessageController, deleteMessageController, downloadFileController, getMessagesController, toggleReactionController, updateMessageController } from '../../controllers/messageController.js';
import { upload } from '../../config/uploadConfig.js';

const router = express.Router();

// `/files/:filename` must be matched before `/:channelId`.
router.get('/files/:filename', isAuthenticatedForFiles, downloadFileController);
router.get('/:channelId', isAuthenticated, getMessagesController);
router.post('/:channelId', isAuthenticated, upload.array('attachments', 10), createMessageController);
router.put('/:messageId', isAuthenticated, updateMessageController);
router.post('/:messageId/reactions', isAuthenticated, toggleReactionController);
router.delete('/:messageId', isAuthenticated, deleteMessageController);

export default router;
