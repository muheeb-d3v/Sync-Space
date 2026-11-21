import { useEffect, useState } from 'react';

import { formatElapsed } from '@/lib/sync';

/** Ticking live duration since a session started. */
export const SyncDuration = ({ startedAt }) => {
    const [, forceTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => forceTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    return <span className="tabular-nums">{formatElapsed(startedAt)}</span>;
};
