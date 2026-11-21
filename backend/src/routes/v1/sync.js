import express from 'express';

import {
    endSyncController,
    getActiveSyncController,
    getActiveSyncsForWorkspaceController,
    joinSyncController,
    leaveSyncController,
    startSyncController
} from '../../controllers/syncController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Every operation re-checks authentication + workspace/channel membership on
// the server route itself.
router.post('/start', isAuthenticated, startSyncController);
router.get('/active/:channelId', isAuthenticated, getActiveSyncController);
router.get('/workspace/:workspaceId', isAuthenticated, getActiveSyncsForWorkspaceController);
router.post('/:sessionId/join', isAuthenticated, joinSyncController);
router.post('/:sessionId/leave', isAuthenticated, leaveSyncController);
router.post('/:sessionId/end', isAuthenticated, endSyncController);

export default router;
