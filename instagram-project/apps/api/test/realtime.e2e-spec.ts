import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { RealtimeEvents } from '@insta/shared';
import { auth, createTestApp, registerUser, resetDatabase, TestContext, TestUser } from './utils';

function connect(url: string, token?: string): Socket {
  return io(url, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false, forceNew: true });
}

function waitFor<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connected(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
}

describe('Realtime (e2e)', () => {
  let ctx: TestContext;
  let url: string;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  let conversationId: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    await ctx.app.listen(0);
    const address = ctx.app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
    alice = await registerUser(ctx.http, 'rta');
    bob = await registerUser(ctx.http, 'rtb');
    carol = await registerUser(ctx.http, 'rtc');
    const conv = await request(ctx.http).post('/api/conversations').set(...auth(alice)).send({ participantIds: [bob.id] }).expect(201);
    conversationId = conv.body.id;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.app.close();
  });

  function track(socket: Socket): Socket {
    sockets.push(socket);
    return socket;
  }

  it('disconnects clients without a valid token', async () => {
    const anonymous = track(connect(url));
    await new Promise<void>((resolve) => anonymous.on('disconnect', () => resolve()));
    const forged = track(connect(url, 'invalid.token.value'));
    await new Promise<void>((resolve) => forged.on('disconnect', () => resolve()));
  });

  it('delivers new messages, typing and read receipts to participants only', async () => {
    const aliceSocket = track(connect(url, alice.token));
    const bobSocket = track(connect(url, bob.token));
    const carolSocket = track(connect(url, carol.token));
    await Promise.all([connected(aliceSocket), connected(bobSocket), connected(carolSocket)]);

    let carolGotMessage = false;
    carolSocket.on(RealtimeEvents.MessageNew, () => {
      carolGotMessage = true;
    });

    const incoming = waitFor<{ content: string; sender: { id: string } }>(bobSocket, RealtimeEvents.MessageNew);
    await request(ctx.http)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(...auth(alice))
      .send({ content: 'realtime hello' })
      .expect(201);
    const message = await incoming;
    expect(message).toMatchObject({ content: 'realtime hello', sender: { id: alice.id } });

    const typing = waitFor<{ userId: string; isTyping: boolean }>(bobSocket, RealtimeEvents.Typing);
    const ack = await aliceSocket.emitWithAck(RealtimeEvents.TypingStart, { conversationId });
    expect(ack).toEqual({ ok: true });
    expect(await typing).toMatchObject({ userId: alice.id, isTyping: true, conversationId });

    const carolAck = await carolSocket.emitWithAck(RealtimeEvents.TypingStart, { conversationId });
    expect(carolAck).toEqual({ ok: false, error: 'Conversation not found' });

    const read = waitFor<{ userId: string }>(aliceSocket, RealtimeEvents.ConversationRead);
    await bobSocket.emitWithAck(RealtimeEvents.ConversationRead, { conversationId });
    expect(await read).toMatchObject({ userId: bob.id, conversationId });

    expect(carolGotMessage).toBe(false);
  });

  it('pushes notifications in real time', async () => {
    const aliceSocket = track(connect(url, alice.token));
    await connected(aliceSocket);
    const note = waitFor<{ type: string; actor: { id: string } }>(aliceSocket, RealtimeEvents.NotificationNew);
    await request(ctx.http).post(`/api/follows/${alice.id}`).set(...auth(carol)).expect(200);
    expect(await note).toMatchObject({ type: 'FOLLOW', actor: { id: carol.id } });
  });

  it('relays WebRTC signaling with the sender id taken from the token', async () => {
    const aliceSocket = track(connect(url, alice.token));
    const bobSocket = track(connect(url, bob.token));
    await Promise.all([connected(aliceSocket), connected(bobSocket)]);

    const offer = waitFor<{ fromUserId: string; callType: string; sdp: string }>(bobSocket, RealtimeEvents.CallOffer);
    const ack = await aliceSocket.emitWithAck(RealtimeEvents.CallOffer, { toUserId: bob.id, callType: 'VIDEO', sdp: 'v=0' });
    expect(ack).toEqual({ ok: true });
    expect(await offer).toEqual({ fromUserId: alice.id, callType: 'VIDEO', sdp: 'v=0' });

    const answer = waitFor<{ fromUserId: string }>(aliceSocket, RealtimeEvents.CallAnswer);
    await bobSocket.emitWithAck(RealtimeEvents.CallAnswer, { toUserId: alice.id, sdp: 'v=0' });
    expect(await answer).toMatchObject({ fromUserId: bob.id });

    const offline = await aliceSocket.emitWithAck(RealtimeEvents.CallOffer, {
      toUserId: '00000000-0000-4000-8000-000000000000',
      callType: 'VOICE',
      sdp: 'v=0',
    });
    expect(offline.ok).toBe(false);
  });

  it('refuses calls between blocked users', async () => {
    await request(ctx.http).post(`/api/privacy/blocks/${alice.id}`).set(...auth(bob)).expect(204);
    const aliceSocket = track(connect(url, alice.token));
    const bobSocket = track(connect(url, bob.token));
    await Promise.all([connected(aliceSocket), connected(bobSocket)]);
    const ack = await aliceSocket.emitWithAck(RealtimeEvents.CallOffer, { toUserId: bob.id, callType: 'VOICE', sdp: 'v=0' });
    expect(ack).toEqual({ ok: false, error: 'User is not available' });
  });

  it('reports presence according to privacy settings', async () => {
    const dave = await registerUser(ctx.http, 'rtd');
    const presenceBefore = await request(ctx.http).get(`/api/users/${dave.id}/presence`).set(...auth(carol)).expect(200);
    expect(presenceBefore.body.online).toBe(false);
    const daveSocket = track(connect(url, dave.token));
    await connected(daveSocket);
    const online = await request(ctx.http).get(`/api/users/${dave.id}/presence`).set(...auth(carol)).expect(200);
    expect(online.body.online).toBe(true);
    await request(ctx.http).patch('/api/privacy/settings').set(...auth(dave)).send({ showOnlineStatus: false }).expect(200);
    const hidden = await request(ctx.http).get(`/api/users/${dave.id}/presence`).set(...auth(carol)).expect(200);
    expect(hidden.body).toEqual({ online: false, lastSeenAt: null });
  });

  it('shows contacts as online while they are connected', async () => {
    const eve = await registerUser(ctx.http, 'rte');
    const frank = await registerUser(ctx.http, 'rtf');
    await request(ctx.http).post('/api/conversations').set(...auth(eve)).send({ participantIds: [frank.id] }).expect(201);
    const frankSocket = track(connect(url, frank.token));
    await connected(frankSocket);
    const online = await request(ctx.http).get('/api/users/me/contacts').set(...auth(eve)).expect(200);
    expect(online.body).toEqual([expect.objectContaining({ id: frank.id, online: true })]);
    const offline = waitFor(track(connect(url, eve.token)), RealtimeEvents.PresenceOffline).catch(() => null);
    frankSocket.disconnect();
    await offline;
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = await request(ctx.http).get('/api/users/me/contacts').set(...auth(eve)).expect(200);
    expect(after.body[0].online).toBe(false);
    expect(after.body[0].lastSeenAt).not.toBeNull();
  });
});
