import express from 'express';
import {
    deleteAvatar,
    getAvatar,
    signUp,
    signIn,
    updateProfile,
    uploadAvatar
} from '../../controllers/userController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';
import { avatarUpload } from '../../config/uploadConfig.js';
import { validate } from '../../validators/zodValidator.js';
import { userSignupSchema, userSigninSchema, userUpdateSchema } from '../../validators/userSchema.js';

const router = express.Router();

router.post('/signup', validate(userSignupSchema), signUp);
router.post('/signin', validate(userSigninSchema), signIn);

// Avatar files are public and immutable (random filenames).
router.get('/avatar/:filename', getAvatar);
router.post('/avatar', isAuthenticated, avatarUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', isAuthenticated, deleteAvatar);

router.put('/profile', isAuthenticated, validate(userUpdateSchema), updateProfile);

export default router;
