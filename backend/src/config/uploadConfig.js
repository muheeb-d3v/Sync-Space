import multer from 'multer';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure the upload directory exists.
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types.
// NOTE: MIME types from the browser are treated as untrusted; the server
// re-validates on download and never executes user-provided filenames as paths.
const ALLOWED_MIMETYPES = new Set([
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml', // stored but served with Content-Security-Policy sandbox
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Spreadsheets
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
]);

// Maximum file size: 25 MB.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 80);
        const uniqueName = `${base}-${uuidv4()}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.mimetype), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10,
    },
});

/* ------------------------------------------------------------------ */
/* Avatars                                                             */
/* ------------------------------------------------------------------ */

const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

// Raster-only: SVGs are deliberately excluded for avatars (they can carry
// active content when opened directly).
const AVATAR_MIME_EXTENSIONS = new Map([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/gif', '.gif'],
    ['image/webp', '.webp'],
]);

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const avatarStorage = multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => {
        const ext = AVATAR_MIME_EXTENSIONS.get(file.mimetype) ?? '.png';
        const owner = req.user?.id ?? 'user';
        cb(null, `avatar-${owner}-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    },
});

const avatarFileFilter = (req, file, cb) => {
    if (AVATAR_MIME_EXTENSIONS.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'avatar'), false);
    }
};

export const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: AVATAR_MAX_FILE_SIZE,
        files: 1,
    },
});

export const AVATAR_DIR_PATH = AVATAR_DIR;
export const AVATAR_MAX_FILE_SIZE_BYTES = AVATAR_MAX_FILE_SIZE;
export const AVATAR_MIME_TYPES = [...AVATAR_MIME_EXTENSIONS.keys()];

export const getAvatarContentType = (filename = '') => {
    const ext = path.extname(filename).toLowerCase();
    return [...AVATAR_MIME_EXTENSIONS.entries()].find(([, value]) => value === ext)?.[0]
        ?? 'application/octet-stream';
};

export const UPLOAD_URL_PATH = '/uploads';
export const UPLOAD_DIR_PATH = UPLOAD_DIR;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE;

// Helper: determine if a mimetype should be displayed inline (images/videos)
export const isInlineDisplayable = (mimetype) => {
    return (
        mimetype.startsWith('image/') ||
        mimetype.startsWith('video/') ||
        mimetype === 'application/pdf'
    );
};

// Helper: get a safe Content-Disposition value for a file.
export const getContentDisposition = (mimetype, originalName) => {
    const encoded = encodeURIComponent(originalName);
    if (isInlineDisplayable(mimetype)) {
        // Inline display for images, videos, PDFs (browser can render them).
        return `inline; filename*=UTF-8''${encoded}`;
    }
    // Force download for documents, archives, etc.
    return `attachment; filename*=UTF-8''${encoded}`;
};
