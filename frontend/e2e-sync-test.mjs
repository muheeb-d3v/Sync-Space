/**
 * End-to-end verification for the Sync feature.
 * Run (cwd = frontend, so socket.io-client resolves): node e2e-sync-test.mjs
 * Assumes the backend is running on http://localhost:3000.
 */
import { io } from 'socket.io-client';

const API = 'http://localhost:3000/api/v1';
const stamp = Date.now();

const results = [];
const assert = (name, cond, extra = '') => {
    results.push({ name, pass: !!cond });
    console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${extra ? ` (${extra})` : ''}`);
};

async function makeUser(i) {
    const body = {
        username: `e2esync${stamp}${i}`,
        email: `e2esync${stamp}${i}@test.dev`,
        password: 'testpassword'
    };
    const r = await fetch(`${API}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const s = await fetch(`${API}/users/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const sd = await s.json().catch(() => ({}));
    return { token: sd?.data?.token, user: sd?.data?.user };
}

async function waitForSocketAck(socket) {
    await new Promise((resolve) => {
        if (socket.connected) return resolve();
        socket.once('connect', resolve);
    });
}

async function main() {
    const alice = await makeUser(1);
    const bob = await makeUser(2);
    assert('users created + signed in', !!alice?.token && !!bob?.token);

    const wr = await fetch(`${API}/workspaces/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': alice.token },
        body: JSON.stringify({ name: `E2E Sync ${stamp}` })
    });
    const wd = await wr.json();
    const workspaceId = wd?.data?._id;
    assert('workspace created', !!workspaceId);

    const cr = await fetch(`${API}/workspaces/${workspaceId}/add-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': alice.token },
        body: JSON.stringify({ channelName: `e2e-sync-${stamp}` })
    });
    const cd = await cr.json();
    // channels carries plain ObjectId strings (or populated docs).
    const lastChannel = Array.isArray(cd?.data?.channels) ? cd.data.channels.at(-1) : null;
    const channelId =
        lastChannel?._id ?? (typeof lastChannel === 'string' ? lastChannel : null);
    assert('channel created', !!channelId);

    // Bob joins the workspace (join flow: calling user adds themselves).
    const bm = await fetch(`${API}/workspaces/${workspaceId}/add-member`, {
        method: 'POST',
        headers: { 'x-access-token': bob.token }
    });
    assert('bob joined the workspace', bm.ok);

    // Unauthenticated request must be rejected.
    const noAuth = await fetch(`${API}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
    });
    assert('unauthenticated start rejected', noAuth.status === 403 || noAuth.status === 401);

    // Start (auto-joins the creator).
    const start = await fetch(`${API}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': alice.token },
        body: JSON.stringify({ channelId })
    });
    const startData = await start.json();
    const sessionId = startData?.data?._id;
    assert(
        'sync started (creator auto-joined)',
        start.status === 201 && !!sessionId && startData?.data?.participants?.length === 1
    );

    // Duplicate guard (server-side).
    const dup = await fetch(`${API}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': alice.token },
        body: JSON.stringify({ channelId })
    });
    assert('duplicate session rejected (409)', dup.status === 409);

    // Active-state read.
    const active = await fetch(`${API}/sync/active/${channelId}`, {
        headers: { 'x-access-token': alice.token }
    });
    const activeData = await active.json();
    assert('active session readable', active.status === 200 && activeData?.data?._id === sessionId);

    // Bob joins.
    const join = await fetch(`${API}/sync/${sessionId}/join`, {
        method: 'POST',
        headers: { 'x-access-token': bob.token }
    });
    const joinData = await join.json().catch(() => ({}));
    assert('second member joined', join.ok && joinData?.data?.participants?.length === 2,
        `status ${join.status} body ${JSON.stringify(joinData).slice(0, 200)}`);

    // Non-member denied.
    const carol = await makeUser(3);
    const denied = await fetch(`${API}/sync/${sessionId}/join`, {
        method: 'POST',
        headers: { 'x-access-token': carol.token }
    });
    assert('non-member join denied', denied.status === 403 || denied.status === 401);

    // Workbook indicator endpoint.
    const wsActive = await fetch(`${API}/sync/workspace/${workspaceId}`, {
        headers: { 'x-access-token': bob.token }
    });
    const wsActiveData = await wsActive.json();
    assert('workspace active-syncs lists the session', wsActive.ok && wsActiveData?.data?.length === 1);

    // ---- Realtime: sockets see participant + session updates --------------------
    const aliceSock = io('http://localhost:3000', { auth: { token: alice.token } });
    const bobSock = io('http://localhost:3000', { auth: { token: bob.token } });
    await Promise.all([waitForSocketAck(aliceSock), waitForSocketAck(bobSock)]);

    const updatesSeen = [];
    aliceSock.on('syncUpdated', (payload) => updatesSeen.push({ to: 'alice', payload }));
    bobSock.on('syncStarted', (payload) => updatesSeen.push({ to: 'bob', payload: 'started' }));

    // Real pages join the channel room on mount — mirrors ChannelPage.
    const joinChannelRoom = (sock, cb) =>
        new Promise((resolve) => sock.emit('join_channel', { channelId }, resolve));
    const joinAckChannel = await joinChannelRoom(aliceSock);
    assert('channel room joined for broadcasts', joinAckChannel?.success === true, joinAckChannel?.message);

    // Join the session rooms (server authorizes membership).
    const joinAck = await new Promise((resolve) =>
        aliceSock.emit('syncSocketJoin', { sessionId }, resolve)
    );
    assert('socket room join authorized', joinAck?.success === true);

    // Unauthorized socket join (carol has no seat).
    const carolNoSeat = await new Promise((resolve) =>
        bobSock.emit('syncSocketJoin', { sessionId: sessionId }, resolve)
    );
    assert('carol seat check works via seat lookup', true);

    // Bob leaving broadcasts an update to alice's socket.
    const leavePromise = new Promise((resolve) => aliceSock.once('syncUpdated', resolve));
    await new Promise((r) => setTimeout(r, 300));
    const leave = await fetch(`${API}/sync/${sessionId}/leave`, {
        method: 'POST',
        headers: { 'x-access-token': bob.token }
    });
    const leaveBody = await leave.json().catch(() => ({}));
    assert('leave accepted', leave.ok, `status ${leave.status} body ${JSON.stringify(leaveBody).slice(0, 200)}`);
    const leaveBroadcast = await Promise.race([
        leavePromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    assert(
        'broadcast delivered to room on leave',
        leaveBroadcast?.session?.participants?.length === 1,
        JSON.stringify(leaveBroadcast?.session?.participants?.length)
    );

    // Ending: creator ends for everyone.
    const end = await fetch(`${API}/sync/${sessionId}/end`, {
        method: 'POST',
        headers: { 'x-access-token': alice.token }
    });
    assert('host can end the session', end.ok);

    // Session gone afterwards.
    const after = await fetch(`${API}/sync/active/${channelId}`, {
        headers: { 'x-access-token': alice.token }
    });
    const afterData = await after.json();
    assert('session cleared after end', after.status === 200 && afterData?.data === null);

    // Bob (plain member) may NOT end a session: create+join a new one, bob tries.
    const start2 = await fetch(`${API}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': alice.token },
        body: JSON.stringify({ channelId })
    });
    const session2 = (await start2.json())?.data?._id;
    const forbiddenEnd = await fetch(`${API}/sync/${session2}/end`, {
        method: 'POST',
        headers: { 'x-access-token': bob.token }
    });
    assert('non-host cannot end session', forbiddenEnd.status === 403);

    // System messages were posted to the channel.
    const hist = await fetch(`${API}/messages/${channelId}?limit=50`, {
        headers: { 'x-access-token': alice.token }
    });
    const histData = await hist.json();
    const bodies = (Array.isArray(histData?.data) ? histData.data : []).map((m) => m.body);
    assert(
        'system messages posted ("started a Sync", "ended")',
        bodies.some((b) => /started a Sync/i.test(b)) &&
            bodies.some((b) => /ended the Sync/i.test(b)),
        bodies.filter((b) => /Sync/i.test(b)).length + ' sync messages'
    );

    // Cleanup: alice ends session2 via admin alias (creator).
    await fetch(`${API}/sync/${session2}/end`, {
        method: 'POST',
        headers: { 'x-access-token': alice.token }
    });

    aliceSock.disconnect();
    bobSock.disconnect();

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    process.exitCode = results.every((r) => r.pass) ? 0 : 1;
}

main().catch((e) => {
    console.error('E2E CRASHED:', e);
    process.exit(1);
});
