// Avatar rules shared by the picker UI and the profile settings screen.
// Must stay in sync with backend/src/config/uploadConfig.js.
export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
export const AVATAR_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
]);

const API_BASE = import.meta.env.VITE_BACKEND_API_URL || '';
// `http://host:3000/api/v1` → `http://host:3000` so relative avatar paths can
// be resolved no matter which device/tunnel the app is opened from.
const API_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/i, '');

export function resolveAvatarUrl(src) {
    if (!src) return undefined;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    return `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** True while the avatar still comes from the username-based generator. */
export function isGeneratedAvatar(avatar) {
    return !avatar || avatar.includes('robohash.org/');
}

export function validateAvatarFile(file) {
    if (!file) return 'Choose an image to upload.';
    if (!AVATAR_MIME_TYPES.has(file.type)) {
        return 'Use a PNG, JPEG, GIF or WebP image.';
    }
    if (file.size > AVATAR_MAX_FILE_SIZE_BYTES) {
        return 'Image is too large. Maximum size is 5 MB.';
    }
    return null;
}
