import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Real WebRTC audio mesh for a Sync session, signaled over the app's existing
 * Socket.IO connection (server relays `syncSignal` between session members).
 *
 * - Mic mute flips the actual audio track (`track.enabled`) — remote peers
 *   immediately stop receiving audio. Not a UI-only fake.
 * - Camera is added on demand: `getUserMedia({video})` + `addTrack` triggers a
 *   renegotiation handled by the perfect-negotiation pattern below.
 * - Screen sharing is a planned extension (same track/renegotiation path);
 *   intentionally not part of the first version.
 */

const ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];

export const useSyncMedia = ({ socket, session, currentUserId, active }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // userId -> MediaStream
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(false);
    const [mediaError, setMediaError] = useState(null);
    const [requestingCamera, setRequestingCamera] = useState(false);

    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map()); // userId -> peer state
    const sessionRef = useRef(null);
    const activeRef = useRef(false);

    sessionRef.current = session;
    activeRef.current = active;

    const participantsKey = active
        ? (session?.participants ?? [])
              .map((p) => String(p.userId?._id))
              .filter((id) => id !== currentUserId)
              .sort()
              .join(',')
        : '';

    /* ------------------------------------------------------------------ */
    /* Signaling helpers                                                   */
    /* ------------------------------------------------------------------ */

    const emitSignal = useCallback(
        (to, payload) => {
            if (!socket?.connected) return;
            socket.emit('syncSignal', {
                sessionId: sessionRef.current?._id,
                to,
                payload
            });
        },
        [socket]
    );

    const destroyPeer = useCallback((userId) => {
        const peer = peersRef.current.get(userId);
        if (!peer) return;
        try {
            peer.pc.ontrack = null;
            peer.pc.onicecandidate = null;
            peer.pc.onnegotiationneeded = null;
            peer.pc.close();
        } catch {
            /* already closed */
        }
        peersRef.current.delete(userId);
        setRemoteStreams((prev) => {
            if (!(userId in prev)) return prev;
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    }, []);

    /* ------------------------------------------------------------------ */
    /* Peer creation (perfect negotiation)                                 */
    /* ------------------------------------------------------------------ */

    const createPeer = useCallback(
        (forUserId) => {
            // Deterministic roles: the side with the larger id rolls back on
            // offer glare; the other side insists on its own offer.
            const polite = String(currentUserId) > String(forUserId);
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            const peer = { pc, polite, makingOffer: false, ignoreOffer: false };

            pc.onnegotiationneeded = async () => {
                try {
                    peer.makingOffer = true;
                    await pc.setLocalDescription();
                    emitSignal(forUserId, { description: pc.localDescription });
                } catch (error) {
                    console.error('[syncMedia] negotiation failed:', error);
                } finally {
                    peer.makingOffer = false;
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) emitSignal(forUserId, { candidate });
            };

            pc.ontrack = ({ streams }) => {
                const stream = streams?.[0];
                if (!stream) return;
                setRemoteStreams((prev) =>
                    prev[forUserId] === stream ? prev : { ...prev, [forUserId]: stream }
                );
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                    // Best effort: let ICE restart by renegotiating.
                    try {
                        pc.restartIce?.();
                    } catch {
                        /* older browsers */
                    }
                }
            };

            localStreamRef.current
                ?.getTracks()
                .forEach((track) => pc.addTrack(track, localStreamRef.current));

            peersRef.current.set(forUserId, peer);
            return peer;
        },
        [currentUserId, emitSignal]
    );

    async function handleRemoteDescription(userId, description) {
        let peer = peersRef.current.get(userId);
        if (!peer) peer = createPeer(userId);

        const pc = peer.pc;
        const offerCollision =
            description.type === 'offer' &&
            (peer.makingOffer || pc.signalingState !== 'stable');

        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) {
            console.log('[syncMedia] ignoring offer glare from', userId);
            return;
        }

        try {
            await pc.setRemoteDescription(description);
            if (description.type === 'offer') {
                await pc.setLocalDescription();
                emitSignal(userId, { description: pc.localDescription });
            }
        } catch (error) {
            console.error('[syncMedia] failed to apply description:', error);
        }
    }

    async function handleRemoteCandidate(userId, candidate) {
        const peer = peersRef.current.get(userId);
        if (!peer) return;
        try {
            await peer.pc.addIceCandidate(candidate);
        } catch (error) {
            if (!peer.ignoreOffer) {
                console.error('[syncMedia] addIceCandidate failed:', error);
            }
        }
    }

    /* Incoming signaling (stable handler keyed by refs). */
    useEffect(() => {
        if (!socket) return;
        const handler = ({ from, payload }) => {
            if (!payload || !from) return;
            if (payload.description) {
                handleRemoteDescription(String(from), payload.description);
            } else if (payload.candidate) {
                handleRemoteCandidate(String(from), payload.candidate);
            }
        };
        socket.on('syncSignal', handler);
        return () => socket.off('syncSignal', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    /* ------------------------------------------------------------------ */
    /* Presence: join the sync socket room + heartbeat                     */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        if (!socket || !active || !session?._id) return;
        const sessionId = session._id;

        const join = () => {
            socket.emit('syncSocketJoin', { sessionId }, (ack) => {
                if (ack && !ack.success) {
                    console.warn('[syncMedia] socket room join failed:', ack.message);
                }
            });
        };
        join();

        // Re-join after a socket reconnection so signaling never dies silently.
        socket.on('connect', join);

        const heartbeat = setInterval(() => {
            socket.emit('syncHeartbeat', { sessionId });
        }, 25 * 1000);

        return () => {
            socket.off('connect', join);
            clearInterval(heartbeat);
            if (socket.connected) {
                socket.emit('syncSocketLeave', { sessionId });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, active, session?._id]);

    /* ------------------------------------------------------------------ */
    /* Mic acquisition + participant reconciliation + teardown             */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        let cancelled = false;

        async function acquireLocalAudio() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                localStreamRef.current = stream;
                setLocalStream(stream);
                const hasMic = stream.getAudioTracks().length > 0;
                setMicOn(hasMic);
            } catch (error) {
                if (cancelled) return;
                // Permission denied / no device — presence keeps working,
                // only the own-audio layer is missing.
                console.warn('[syncMedia] microphone unavailable:', error?.name);
                localStreamRef.current = new MediaStream();
                setLocalStream(localStreamRef.current);
                setMicOn(false);
                setMediaError(
                    error?.name === 'NotAllowedError'
                        ? 'Microphone permission was denied. You can still see who is in the Sync.'
                        : 'Microphone is not available on this device.'
                );
            }
        }

        if (active && session && socket) {
            if (!navigator.mediaDevices?.getUserMedia) {
                setMediaError(
                    'Your browser does not support audio calling (secure connection required).'
                );
                localStreamRef.current = new MediaStream();
                setLocalStream(localStreamRef.current);
            } else {
                acquireLocalAudio();
            }
        }

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, socket]);

    /* Keep the peer graph in sync with the server participants list. */
    useEffect(() => {
        if (!active) return;
        const wanted = participantsKey ? participantsKey.split(',') : [];
        const existing = Array.from(peersRef.current.keys());

        for (const id of wanted) {
            if (!existing.includes(id)) createPeer(id);
        }
        for (const id of existing) {
            if (!wanted.includes(id)) destroyPeer(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participantsKey, active]);

    /* Full teardown when the session ends or the user leaves. */
    useEffect(() => {
        if (active) return;

        for (const userId of Array.from(peersRef.current.keys())) {
            destroyPeer(userId);
        }
        peersRef.current.clear();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStreams({});
        setMicOn(true);
        setCameraOn(false);
        setCameraAvailable(false);
        setMediaError(null);
    }, [active, destroyPeer]);

    /* ------------------------------------------------------------------ */
    /* Controls                                                            */
    /* ------------------------------------------------------------------ */

    const toggleMic = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack) {
            setMediaError('No microphone available to unmute.');
            return;
        }
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
    }, []);

    const toggleCamera = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        let videoTrack = stream.getVideoTracks()[0] ?? null;
        setRequestingCamera(true);
        try {
            if (!videoTrack) {
                const cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
                videoTrack = cameraStream.getVideoTracks()[0];
                stream.addTrack(videoTrack);
                setLocalStream(new MediaStream(stream.getTracks()));
                // Adding the track triggers renegotiation on every peer.
                for (const peer of peersRef.current.values()) {
                    peer.pc.addTrack(videoTrack, stream);
                }
            } else {
                videoTrack.enabled = !videoTrack.enabled;
            }
            setCameraAvailable(true);
            setCameraOn(!!videoTrack?.enabled);
            setMediaError(null);
        } catch (error) {
            console.warn('[syncMedia] camera unavailable:', error?.name);
            setMediaError(
                error?.name === 'NotAllowedError'
                    ? 'Camera permission was denied.'
                    : 'Camera is not available on this device.'
            );
            setCameraOn(false);
        } finally {
            setRequestingCamera(false);
        }
    }, []);

    return {
        localStream,
        remoteStreams,
        micOn,
        cameraOn,
        cameraAvailable,
        mediaError,
        requestingCamera,
        toggleMic,
        toggleCamera
    };
};
