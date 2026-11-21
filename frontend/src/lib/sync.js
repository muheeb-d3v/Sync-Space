/** mm:ss (or h:mm:ss past an hour) since a session start timestamp. */
export function formatElapsed(startedAt) {
    if (!startedAt) return '00:00';
    const started = new Date(startedAt).getTime();
    if (Number.isNaN(started)) return '00:00';
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
