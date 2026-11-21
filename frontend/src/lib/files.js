export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — must match backend/uploadConfig.js
export const MAX_FILES = 10;

// Meta info per "kind" of file (for icons/colors/labels in the UI).
export const FILE_KINDS = {
    image: {
        label: 'Image',
        accept: 'image/png,image/jpeg,image/jpg,image/gif,image/webp',
        extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    video: {
        label: 'Video',
        accept: 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi',
        extensions: ['.mp4', '.webm', '.mov', '.avi', '.ogg'],
    },
    pdf: {
        label: 'PDF',
        accept: 'application/pdf,.pdf',
        extensions: ['.pdf'],
    },
    word: {
        label: 'Word',
        accept: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx',
        extensions: ['.doc', '.docx'],
    },
    excel: {
        label: 'Sheet',
        accept: 'text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,.xls,.xlsx',
        extensions: ['.csv', '.xls', '.xlsx'],
    },
    powerpoint: {
        label: 'Slides',
        accept: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,.pptx',
        extensions: ['.ppt', '.pptx'],
    },
    text: {
        label: 'Text',
        accept: 'text/plain,.txt',
        extensions: ['.txt'],
    },
    archive: {
        label: 'Archive',
        accept: 'application/zip,application/x-zip-compressed,.zip',
        extensions: ['.zip'],
    },
    file: {
        label: 'File',
        accept: '',
        extensions: [],
    },
};

// All accepts combined for the "Any supported file" picker.
export const ALL_ACCEPTED =
    Object.values(FILE_KINDS)
        .map((k) => k.accept)
        .filter(Boolean)
        .join(',') + ',.txt';

export function getFileExtension(name = '') {
    const idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx + 1).toUpperCase() : '';
}

export function detectKind(mimetype = '', name = '') {
    const mt = mimetype.toLowerCase();
    if (mt.startsWith('image/')) return 'image';
    if (mt.startsWith('video/')) return 'video';
    if (mt === 'application/pdf') return 'pdf';
    if (mt.includes('word') || mt.includes('document')) return 'word';
    if (mt.includes('excel') || mt.includes('sheet') || mt.includes('csv')) return 'excel';
    if (mt.includes('powerpoint') || mt.includes('presentation')) return 'powerpoint';
    if (mt.includes('zip')) return 'archive';
    if (mt.startsWith('text/')) return 'text';

    const ext = `.${name.split('.').pop()?.toLowerCase() ?? ''}`;
    for (const [kind, meta] of Object.entries(FILE_KINDS)) {
        if (meta.extensions.includes(ext)) return kind;
    }
    return 'file';
}

export function formatFileSize(bytes = 0) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Client-side pre-upload validation. Backend re-validates everything —
 * never rely on the browser's `accept` attribute alone.
 */
export function validateFiles(files = [], existingFiles = []) {
    const errors = [];
    const valid = [];

    for (const file of files) {
        const kind = detectKind(file.type, file.name);
        if (kind === 'file') {
            errors.push(`"${file.name}" is not a supported file type.`);
            continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            errors.push(`"${file.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE_BYTES)} limit.`);
            continue;
        }
        if (file.size === 0) {
            errors.push(`"${file.name}" is empty.`);
            continue;
        }
        // Prevent accidental duplicate uploads (same name + size already staged).
        const key = `${file.name}:${file.size}`;
        const isDuplicate =
            valid.some((f) => `${f.name}:${f.size}` === key) ||
            existingFiles.some((f) => `${f.name}:${f.size}` === key);
        if (isDuplicate) continue;
        valid.push(file);
    }

    let droppedForLimit = false;
    if (existingFiles.length + valid.length > MAX_FILES) {
        valid = valid.slice(0, MAX_FILES - existingFiles.length);
        droppedForLimit = true;
    }
    if (droppedForLimit) {
        errors.push(`You can attach at most ${MAX_FILES} files per message.`);
    }

    return { valid, errors };
}

/** Authenticated URL for <img>/<video>/iframe src — the backend accepts the
 *  JWT via ?token= on the file endpoints (headers are impossible on <img>). */
export function attachmentSrc(baseURL, url, token) {
    if (!url) return '';
    const sep = url.includes('?') ? '&' : '?';
    return `${baseURL}${url}${sep}token=${encodeURIComponent(token ?? '')}`;
}

/** Build a styled "download original file" object URL — used to preserve the
 *  original filename cross-origin without relying on Content-Disposition. */
export async function downloadAttachment(attachment, token, fallbackName = 'file') {
    const baseURL = import.meta.env.VITE_BACKEND_API_URL || '';
    const url = `${baseURL}${attachment.url}`;
    try {
        const response = await fetch(url, {
            headers: { 'x-access-token': token ?? '' },
        });
        if (!response.ok) {
            throw new Error(
                response.status === 401 || response.status === 403
                    ? 'You are not authorized to download this file.'
                    : `Download failed (${response.status}).`
            );
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = attachment.originalName || fallbackName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    } catch (error) {
        if (error?.message) throw error;
        throw new Error('Network error during download.');
    }
}
