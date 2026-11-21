import fs from 'node:fs';
import path from 'node:path';
import { StatusCodes } from "http-status-codes";
import {
    resetAvatarService,
    signUpService,
    signInService,
    updateAvatarService,
    updateProfileService
} from "../services/userService.js";
import { customErrorResponse,  successResponse } from "../utils/common/responseObjects.js";
import {
    AVATAR_DIR_PATH,
    getAvatarContentType
} from "../config/uploadConfig.js";

export const signUp = async (req, res) => {
    try {
        const user = await signUpService(req.body);
        return res.status(StatusCodes.CREATED).json(successResponse(user, "User created successfully"));
    } catch (error) {
        console.log('User Controller Error:', error);
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse(error));
    }
};

export const signIn = async (req, res) => {
    try {
        const {token ,user} = await signInService(req.body);
       
        // TODO: Implement JWT token generation and send it to the client instead of the token itself
        return res.status(StatusCodes.OK).json(successResponse({ token , user  }, "User signed in successfully"));
    } catch (error) {
        console.log('User Controller Error:', error);
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse(error));
    }
};

export const updateProfile = async (req, res) => {
    try {
        const user = await updateProfileService(req.user.id, req.body);
        return res
            .status(StatusCodes.OK)
            .json(successResponse(user, 'Profile updated successfully'));
    } catch (error) {
        console.log('Update Profile Error:', error?.message || error);
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse(error));
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file?.filename) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                customErrorResponse({
                    message: 'An avatar image is required.',
                    statusCode: StatusCodes.BAD_REQUEST
                })
            );
        }

        const user = await updateAvatarService(req.user.id, req.file.filename);
        return res
            .status(StatusCodes.OK)
            .json(successResponse(user, 'Avatar updated successfully'));
    } catch (error) {
        // The file was already written by multer; don't leave an orphan behind.
        if (req.file?.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch {
                // Ignore — nothing to clean up.
            }
        }

        console.log('Upload Avatar Error:', error?.message || error);
        return res
            .status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse({
                message: error?.message || 'Could not upload avatar',
                statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
            }));
    }
};

export const deleteAvatar = async (req, res) => {
    try {
        const user = await resetAvatarService(req.user.id);
        return res
            .status(StatusCodes.OK)
            .json(successResponse(user, 'Avatar reset to generated picture'));
    } catch (error) {
        console.log('Delete Avatar Error:', error?.message || error);
        return res
            .status(error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse({
                message: error?.message || 'Could not reset avatar',
                statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
            }));
    }
};

/**
 * Public avatar files.
 *
 * Filenames are random and immutable, so they can be cached forever. Access is
 * deliberately unauthenticated: avatars are rendered by plain <img> tags all
 * over the app (including on devices signed in with a different account).
 */
export const getAvatar = async (req, res) => {
    try {
        const { filename } = req.params;

        if (
            !filename ||
            path.basename(filename) !== filename ||
            filename.includes('..')
        ) {
            return res.status(StatusCodes.NOT_FOUND).json(
                customErrorResponse({
                    message: 'Avatar not found.',
                    statusCode: StatusCodes.NOT_FOUND
                })
            );
        }

        const filePath = path.join(AVATAR_DIR_PATH, filename);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return res.status(StatusCodes.NOT_FOUND).json(
                customErrorResponse({
                    message: 'Avatar not found.',
                    statusCode: StatusCodes.NOT_FOUND
                })
            );
        }

        res.setHeader('Content-Type', getAvatarContentType(filename));
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(filePath);
    } catch (error) {
        console.log('Get Avatar Error:', error?.message || error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(customErrorResponse({
                message: 'Could not load avatar',
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR
            }));
    }
};
