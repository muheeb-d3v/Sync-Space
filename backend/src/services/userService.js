import bcrypt from "bcryptjs";
import fs from 'node:fs';
import path from 'node:path';
import {
    createUser,
    getUserByEmail,
    getUserById,
    getUserByName,
    updateUser
} from "../repositories/userRepository.js";
import { AVATAR_DIR_PATH } from "../config/uploadConfig.js";
import validationError from "../utils/errors/validationError.js";
import { createJWT } from "../utils/common/authUtils.js";

const AVATAR_ROUTE_PREFIX = '/api/v1/users/avatar/';
const generatedAvatarUrl = (username) => `https://robohash.org/${username}`;

const isGeneratedAvatar = (avatar) =>
    !avatar || avatar.startsWith('https://robohash.org/');

/** Only files served by our avatar route may be deleted from disk. */
function managedAvatarPath(avatar) {
    if (typeof avatar !== 'string' || !avatar.startsWith(AVATAR_ROUTE_PREFIX)) {
        return null;
    }
    const filename = path.basename(avatar.slice(AVATAR_ROUTE_PREFIX.length));
    if (!filename) return null;

    const root = path.resolve(AVATAR_DIR_PATH);
    const filePath = path.resolve(root, filename);
    return filePath.startsWith(`${root}${path.sep}`) ? filePath : null;
}

async function removeManagedAvatar(avatar) {
    const filePath = managedAvatarPath(avatar);
    if (!filePath) return;
    try {
        await fs.promises.unlink(filePath);
    } catch {
        // Missing file is fine — the DB reference is what matters.
    }
}

function toSafeUser(user) {
    const safeUser = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
    delete safeUser.password;
    return safeUser;
}


export const signUpService = async (data) => {
    try {
        const existingUser = await getUserByEmail(data.email);
        if (existingUser) {
            throw new validationError(
                { error: { email: "A user with this email already exists" } },
                "A user with this email already exists"
            );
        }

        const newUser = await createUser(data);
        return newUser;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
};

export const signInService = async (data) => {
    try {
        const user = await getUserByEmail(data.email);
        if (!user) {
            throw new validationError(
                { error: { email: "User not found" } },
                "User not found"
            );
        }

        const isPasswordValid = bcrypt.compareSync(data.password, user.password);
        if (!isPasswordValid) {
            throw new validationError(
                { error: { password: "Incorrect password" } },
                "Incorrect password"
            );
        }

        const token = createJWT({ id: user._id, email: user.email })

        // Never send the password hash back to the client.
        const safeUser = user.toObject();
        delete safeUser.password;

        return {token, user: safeUser};
    } catch (error) {
        console.error("Sign-in Error:", error);
        throw error;
    }
};

export const updateProfileService = async (userId, data = {}) => {
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new validationError(
                { error: { user: 'User not found' } },
                'User not found'
            );
        }

        const updates = {};

        if (data.username && data.username !== user.username) {
            const existing = await getUserByName(data.username);
            if (existing && String(existing._id) !== String(userId)) {
                throw new validationError(
                    { error: { username: 'Username is already taken' } },
                    'Username is already taken'
                );
            }
            updates.username = data.username;
            // Keep the generated avatar in sync with the new username, but
            // never overwrite a picture the user uploaded themselves.
            if (isGeneratedAvatar(user.avatar)) {
                updates.avatar = generatedAvatarUrl(data.username);
            }
        }

        if (data.email && data.email !== user.email) {
            const existing = await getUserByEmail(data.email);
            if (existing && String(existing._id) !== String(userId)) {
                throw new validationError(
                    { error: { email: 'Email is already registered' } },
                    'Email is already registered'
                );
            }
            updates.email = data.email;
        }

        if (Object.keys(updates).length === 0) {
            const unchanged = user.toObject();
            delete unchanged.password;
            return unchanged;
        }

        // findByIdAndUpdate avoids the user schema's pre-save password hashing,
        // which would otherwise re-hash the already-hashed password.
        const updated = await updateUser(userId, updates);
        const safeUser = updated.toObject();
        delete safeUser.password;

        return safeUser;
    } catch (error) {
        console.error('Update profile error:', error?.message || error);
        throw error;
    }
};

const assertUserExists = (user) => {
    if (!user) {
        throw new validationError(
            { error: { user: 'User not found' } },
            'User not found'
        );
    }
};

/**
 * Point the user at a freshly uploaded avatar file.
 *
 * `filename` comes from multer's storage engine (already sanitised); only the
 * basename is ever used so a crafted value cannot escape the avatars folder.
 */
export const updateAvatarService = async (userId, filename) => {
    const user = await getUserById(userId);
    assertUserExists(user);

    const safeFilename = path.basename(String(filename ?? ''));
    if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
        throw new validationError(
            { error: { avatar: 'Invalid avatar file' } },
            'Invalid avatar file'
        );
    }

    const avatar = `${AVATAR_ROUTE_PREFIX}${safeFilename}`;
    const updated = await updateUser(userId, { avatar });

    // Best-effort cleanup of the previous upload (generated avatars are remote).
    if (user.avatar && user.avatar !== avatar) {
        await removeManagedAvatar(user.avatar);
    }

    return toSafeUser(updated);
};

/** Restore the automatic avatar derived from the username. */
export const resetAvatarService = async (userId) => {
    const user = await getUserById(userId);
    assertUserExists(user);

    const updated = await updateUser(userId, {
        avatar: generatedAvatarUrl(user.username)
    });
    await removeManagedAvatar(user.avatar);

    return toSafeUser(updated);
};
