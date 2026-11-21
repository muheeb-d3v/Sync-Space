import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AudioLinesIcon,
    CircleAlertIcon,
    Loader,
    MicIcon,
    MicOffIcon,
    PhoneOffIcon,
    UsersIcon,
    VideoIcon,
    VideoOffIcon
} from 'lucide-react';

import { SyncDuration } from '@/components/molecules/Sync/SyncDuration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function participantName(p) {
    return p?.userId?.username || p?.userId?.email || 'Member';
}

/**
 * Compact, always-visible session bar docked above the composer. Channel
 * messaging keeps working underneath it — the bar only overlays controls:
 * participants, duration, mic, camera, leave (and end, for the host).
 */
export const SyncSessionBar = ({
    session,
    currentUserId,
    media,
    onLeave,
    isLeaving,
    onEnd,
    isEnding
}) => {
    const participants = session?.participants ?? [];
    const count = participants.length;
    const isHost = String(session?.creatorId) === String(currentUserId);

    // Browser autoplay policy can block programmatic playback; surface a
    // one-click recovery banner instead of leaving the user confused.
    const [audioBlocked, setAudioBlocked] = useState(false);
    const audioElementsRef = useRef(new Map()); // userId -> HTMLAudioElement
    const remoteStreams = media?.remoteStreams ?? {};

    const bindRemoteAudio = useCallback((userId, stream) => (element) => {
        if (!element) {
            audioElementsRef.current.delete(userId);
            return;
        }
        audioElementsRef.current.set(userId, element);
        if (element.srcObject !== stream) {
            element.srcObject = stream;
            element
                .play()
                .then(() => setAudioBlocked(false))
                .catch(() => setAudioBlocked(true));
        }
    }, []);

    function resumePlayback() {
        for (const element of audioElementsRef.current.values()) {
            element.play().catch(() => setAudioBlocked(true));
        }
    }

    return (
        <div
            className="mx-3 mb-1 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-dash-green-500/25 bg-dash-green-500/[0.06] px-3 py-2 shadow-xs sm:mx-4 lg:mx-6"
            role="status"
            aria-label={`Live Sync with ${count} participant${count === 1 ? '' : 's'}`}
        >
            {/* Session identity + participants */}
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-dash-green-500 opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-dash-green-500" />
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-dash-green-700">
                        <AudioLinesIcon className="size-3.5" />
                        Sync
                        <span className="font-medium text-dash-green-600/90 tabular-nums">
                            <SyncDuration startedAt={session?.startedAt} />
                        </span>
                    </span>
                    <span className="hidden items-center gap-1 text-[11px] text-gray-500 min-[430px]:flex">
                        <UsersIcon className="size-3" />
                        {count === 1
                            ? 'Just you — invite teammates'
                            : `${count} participants`}
                    </span>
                </div>

                <div className="flex items-center -space-x-1.5" aria-hidden="true">
                    {participants.slice(0, 5).map((p) => (
                        <Avatar
                            key={String(p.userId?._id)}
                            className="size-6 rounded-full ring-2 ring-white"
                        >
                            <AvatarImage src={p.userId?.avatar} alt={participantName(p)} />
                            <AvatarFallback className="bg-dash-violet-500 text-[9px] font-semibold text-white">
                                {participantName(p).charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {count > 5 && (
                        <span className="flex size-6 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-700 ring-2 ring-white">
                            +{count - 5}
                        </span>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={media?.toggleMic}
                    className={`inline-flex size-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40 ${
                        media?.micOn
                            ? 'text-gray-600 hover:bg-gray-200/70'
                            : 'bg-dash-red-500 text-white hover:bg-dash-red-600'
                    }`}
                    aria-label={media?.micOn ? 'Mute microphone' : 'Unmute microphone'}
                    aria-pressed={!media?.micOn}
                    title={media?.micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                    {media?.micOn ? (
                        <MicIcon className="size-4" />
                    ) : (
                        <MicOffIcon className="size-4" />
                    )}
                </button>

                <button
                    type="button"
                    onClick={media?.toggleCamera}
                    disabled={media?.requestingCamera || !media}
                    className={`inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40 ${
                        media?.cameraOn
                            ? 'bg-dash-violet-500 text-white hover:bg-dash-violet-600'
                            : 'text-gray-600 hover:bg-gray-200/70'
                    }`}
                    aria-label={media?.cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    aria-pressed={!!media?.cameraOn}
                    title={media?.cameraOn ? 'Turn camera off' : 'Turn camera on'}
                >
                    {media?.requestingCamera ? (
                        <Loader className="size-4 animate-spin" />
                    ) : media?.cameraOn ? (
                        <VideoIcon className="size-4" />
                    ) : (
                        <VideoOffIcon className="size-4" />
                    )}
                </button>

                {isHost && (
                    <button
                        type="button"
                        onClick={onEnd}
                        disabled={isEnding}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-dash-red-600 transition-colors hover:bg-dash-red-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40"
                        aria-label="End the Sync session for everyone"
                        title="End Sync for everyone (host)"
                    >
                        {isEnding ? (
                            <Loader className="size-3.5 animate-spin" />
                        ) : (
                            <PhoneOffIcon className="size-3.5" />
                        )}
                        End
                    </button>
                )}

                <button
                    type="button"
                    onClick={onLeave}
                    disabled={isLeaving}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/40"
                    aria-label="Leave the Sync session"
                    title="Leave Sync"
                >
                    {isLeaving ? (
                        <Loader className="size-4 animate-spin" />
                    ) : (
                        <PhoneOffIcon className="size-4" />
                    )}
                </button>
            </div>

            {/* Remote audio playback (imperative MediaStream binding) */}
            <div aria-hidden="true" className="contents">
                {Object.entries(remoteStreams).map(([userId, stream]) => (
                    <audio
                        key={userId}
                        ref={bindRemoteAudio(userId, stream)}
                        autoPlay
                        playsInline
                    />
                ))}
            </div>

            {(audioBlocked || media?.mediaError) && (
                <div className="flex w-full items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-gray-600">
                    {media?.mediaError ? (
                        <>
                            <CircleAlertIcon className="size-3.5 shrink-0 text-dash-yellow-600" />
                            <span className="min-w-0 flex-1">{media.mediaError}</span>
                        </>
                    ) : (
                        <>
                            <CircleAlertIcon className="size-3.5 shrink-0 text-dash-yellow-600" />
                            <span className="min-w-0 flex-1">
                                Browsers blocked audio playback.
                            </span>
                            <button
                                type="button"
                                onClick={resumePlayback}
                                className="shrink-0 font-semibold text-dash-violet-700 underline underline-offset-2"
                            >
                                Enable audio
                            </button>
                        </>
                    )}
                </div>
            )}

            {media?.cameraOn && (
                <div className="flex w-full items-center gap-1.5 text-[10px] font-medium text-dash-violet-700">
                    <VideoIcon className="size-3" />
                    Camera is on — you are sharing video with the session
                </div>
            )}
        </div>
    );
};
