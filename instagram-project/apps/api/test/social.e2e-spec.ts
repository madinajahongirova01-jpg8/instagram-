import request from 'supertest';
import {
  auth,
  createTestApp,
  fakeMp4,
  pngBuffer,
  registerUser,
  resetDatabase,
  TestContext,
  TestUser,
  uploadMedia,
} from './utils';

describe('Social features (e2e)', () => {
  let ctx: TestContext;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    alice = await registerUser(ctx.http, 'alice');
    bob = await registerUser(ctx.http, 'bob');
    carol = await registerUser(ctx.http, 'carol');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function createPost(user: TestUser, caption: string): Promise<string> {
    const mediaId = await uploadMedia(ctx.http, user, 'POST', await pngBuffer(), 'a.png', 'image/png');
    const res = await request(ctx.http).post('/api/posts').set(...auth(user)).send({ mediaIds: [mediaId], caption }).expect(201);
    return res.body.id as string;
  }

  describe('media', () => {
    it('re-encodes images with Sharp and serves them only through signed URLs', async () => {
      const res = await request(ctx.http)
        .post('/api/media')
        .set(...auth(alice))
        .field('purpose', 'POST')
        .attach('file', await pngBuffer('#123456', 2000), { filename: 'big.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body).toMatchObject({ kind: 'IMAGE', mimeType: 'image/jpeg' });
      expect(res.body.width).toBeLessThanOrEqual(1080);
      const file = await request(ctx.http).get(res.body.url).expect(200);
      expect(file.headers['content-type']).toBe('image/jpeg');
      const tampered = (res.body.url as string).replace(/sig=[^&]+/, 'sig=' + 'A'.repeat(43));
      await request(ctx.http).get(tampered).expect(403);
      await request(ctx.http).get(`/api/media/${res.body.id}/file`).expect(400);
    });

    it('rejects files with a fake type or forbidden purpose', async () => {
      await request(ctx.http)
        .post('/api/media')
        .set(...auth(alice))
        .field('purpose', 'POST')
        .attach('file', Buffer.from('not an image at all'), { filename: 'x.png', contentType: 'image/png' })
        .expect(415);
      await request(ctx.http)
        .post('/api/media')
        .set(...auth(alice))
        .field('purpose', 'POST')
        .attach('file', Buffer.from('#!/bin/sh'), { filename: 'x.sh', contentType: 'application/x-sh' })
        .expect(415);
      await request(ctx.http)
        .post('/api/media')
        .set(...auth(alice))
        .field('purpose', 'AVATAR')
        .attach('file', fakeMp4(), { filename: 'v.mp4', contentType: 'video/mp4' })
        .expect(415);
    });

    it('does not let another user attach your media', async () => {
      const mediaId = await uploadMedia(ctx.http, alice, 'POST', await pngBuffer(), 'a.png', 'image/png');
      await request(ctx.http).post('/api/posts').set(...auth(bob)).send({ mediaIds: [mediaId] }).expect(400);
    });
  });

  describe('posts, hashtags, mentions', () => {
    it('creates a post with hashtags (including Cyrillic) and notifies mentioned users', async () => {
      const mediaId = await uploadMedia(ctx.http, alice, 'POST', await pngBuffer(), 'a.png', 'image/png');
      const res = await request(ctx.http)
        .post('/api/posts')
        .set(...auth(alice))
        .send({ mediaIds: [mediaId], caption: `Салом #SoftClub #душанбе @${bob.username}`, location: 'Dushanbe' })
        .expect(201);
      expect(res.body.hashtags.sort()).toEqual(['softclub', 'душанбе']);
      expect(res.body.author.username).toBe(alice.username);
      expect(res.body.media).toHaveLength(1);
      const notes = await request(ctx.http).get('/api/notifications').set(...auth(bob)).expect(200);
      expect(notes.body.items.some((n: { type: string }) => n.type === 'MENTION')).toBe(true);
    });

    it('only the author can edit or delete a post', async () => {
      const postId = await createPost(alice, 'mine');
      await request(ctx.http).patch(`/api/posts/${postId}`).set(...auth(bob)).send({ caption: 'hacked' }).expect(403);
      await request(ctx.http).delete(`/api/posts/${postId}`).set(...auth(bob)).expect(403);
      const updated = await request(ctx.http).patch(`/api/posts/${postId}`).set(...auth(alice)).send({ caption: 'edited #new' }).expect(200);
      expect(updated.body.hashtags).toEqual(['new']);
      await request(ctx.http).delete(`/api/posts/${postId}`).set(...auth(alice)).expect(204);
      await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(alice)).expect(404);
    });

    it('returns 400 for malformed ids', async () => {
      await request(ctx.http).get('/api/posts/not-a-uuid').set(...auth(alice)).expect(400);
    });
  });

  describe('likes and comments', () => {
    it('likes are idempotent, counted, and notify the author once', async () => {
      const postId = await createPost(alice, 'like me');
      await request(ctx.http).post(`/api/posts/${postId}/like`).set(...auth(bob)).expect(200);
      const again = await request(ctx.http).post(`/api/posts/${postId}/like`).set(...auth(bob)).expect(200);
      expect(again.body).toEqual({ liked: true, likesCount: 1 });
      const post = await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(bob)).expect(200);
      expect(post.body).toMatchObject({ likesCount: 1, likedByMe: true });
      const likeNotes = await ctx.prisma.notification.count({ where: { recipientId: alice.id, type: 'LIKE', entityId: postId } });
      expect(likeNotes).toBe(1);
      const unliked = await request(ctx.http).delete(`/api/posts/${postId}/like`).set(...auth(bob)).expect(200);
      expect(unliked.body).toEqual({ liked: false, likesCount: 0 });
      expect(await ctx.prisma.notification.count({ where: { recipientId: alice.id, type: 'LIKE', entityId: postId } })).toBe(0);
    });

    it('hides like count from others when hideLikeCount is on', async () => {
      const postId = await createPost(alice, 'secret count');
      await request(ctx.http).patch(`/api/posts/${postId}`).set(...auth(alice)).send({ hideLikeCount: true }).expect(200);
      const forBob = await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(bob)).expect(200);
      expect(forBob.body.likesCount).toBeNull();
      const forAlice = await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(alice)).expect(200);
      expect(forAlice.body.likesCount).toBe(0);
    });

    it('supports comments, replies, comment likes and deletion rules', async () => {
      const postId = await createPost(alice, 'discuss');
      const top = await request(ctx.http).post(`/api/posts/${postId}/comments`).set(...auth(bob)).send({ content: 'Nice!' }).expect(201);
      const reply = await request(ctx.http)
        .post(`/api/posts/${postId}/comments`)
        .set(...auth(carol))
        .send({ content: 'Agree', parentId: top.body.id })
        .expect(201);
      expect(reply.body.parentId).toBe(top.body.id);
      const list = await request(ctx.http).get(`/api/posts/${postId}/comments`).set(...auth(alice)).expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0].repliesCount).toBe(1);
      const replies = await request(ctx.http).get(`/api/comments/${top.body.id}/replies`).set(...auth(alice)).expect(200);
      expect(replies.body.items[0].content).toBe('Agree');
      await request(ctx.http).post(`/api/comments/${top.body.id}/like`).set(...auth(alice)).expect(200);

      await request(ctx.http).delete(`/api/comments/${top.body.id}`).set(...auth(carol)).expect(403);
      await request(ctx.http).delete(`/api/comments/${reply.body.id}`).set(...auth(carol)).expect(204);
      await request(ctx.http).delete(`/api/comments/${top.body.id}`).set(...auth(alice)).expect(204);
    });

    it('respects commentsDisabled', async () => {
      const postId = await createPost(alice, 'quiet');
      await request(ctx.http).patch(`/api/posts/${postId}`).set(...auth(alice)).send({ commentsDisabled: true }).expect(200);
      await request(ctx.http).post(`/api/posts/${postId}/comments`).set(...auth(bob)).send({ content: 'hi' }).expect(403);
    });
  });

  describe('private accounts and follow requests', () => {
    let privateUser: TestUser;
    let privatePostId: string;

    beforeAll(async () => {
      privateUser = await registerUser(ctx.http, 'priv');
      privatePostId = await createPost(privateUser, 'only followers');
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(privateUser)).send({ isPrivate: true }).expect(200);
    });

    it('hides content of a private account from non-followers', async () => {
      const profile = await request(ctx.http).get(`/api/profiles/${privateUser.username}`).set(...auth(bob)).expect(200);
      expect(profile.body).toMatchObject({ isPrivate: true, canViewContent: false, followStatus: 'NONE' });
      await request(ctx.http).get(`/api/profiles/${privateUser.username}/posts`).set(...auth(bob)).expect(403);
      await request(ctx.http).get(`/api/posts/${privatePostId}`).set(...auth(bob)).expect(404);
      await request(ctx.http).get(`/api/posts/${privatePostId}/comments`).set(...auth(bob)).expect(404);
      await request(ctx.http).post(`/api/posts/${privatePostId}/like`).set(...auth(bob)).expect(404);
      const search = await request(ctx.http).get('/api/search').query({ q: 'followers', type: 'posts' }).set(...auth(bob)).expect(200);
      expect(search.body.posts).toHaveLength(0);
    });

    it('creates a follow request that the owner can accept', async () => {
      const follow = await request(ctx.http).post(`/api/follows/${privateUser.id}`).set(...auth(bob)).expect(200);
      expect(follow.body.status).toBe('REQUESTED');
      const requests = await request(ctx.http).get('/api/follow-requests').set(...auth(privateUser)).expect(200);
      expect(requests.body.items).toHaveLength(1);
      const requestId = requests.body.items[0].id as string;
      await request(ctx.http).post(`/api/follow-requests/${requestId}/accept`).set(...auth(bob)).expect(403);
      await request(ctx.http).post(`/api/follow-requests/${requestId}/accept`).set(...auth(privateUser)).expect(204);
      const posts = await request(ctx.http).get(`/api/profiles/${privateUser.username}/posts`).set(...auth(bob)).expect(200);
      expect(posts.body.items).toHaveLength(1);
      const feed = await request(ctx.http).get('/api/feed').set(...auth(bob)).expect(200);
      expect(feed.body.items.some((p: { id: string }) => p.id === privatePostId)).toBe(true);
    });

    it('can decline a request', async () => {
      await request(ctx.http).post(`/api/follows/${privateUser.id}`).set(...auth(carol)).expect(200);
      const requests = await request(ctx.http).get('/api/follow-requests').set(...auth(privateUser)).expect(200);
      await request(ctx.http).post(`/api/follow-requests/${requests.body.items[0].id}/decline`).set(...auth(privateUser)).expect(204);
      await request(ctx.http).get(`/api/profiles/${privateUser.username}/posts`).set(...auth(carol)).expect(403);
    });
  });

  describe('follows, followers lists and feed', () => {
    it('follows a public account immediately and shows its posts in the feed', async () => {
      const dave = await registerUser(ctx.http, 'dave');
      const postId = await createPost(carol, 'carol post');
      const res = await request(ctx.http).post(`/api/follows/${carol.id}`).set(...auth(dave)).expect(200);
      expect(res.body.status).toBe('FOLLOWING');
      const feed = await request(ctx.http).get('/api/feed').set(...auth(dave)).expect(200);
      expect(feed.body.items.map((p: { id: string }) => p.id)).toContain(postId);
      const followers = await request(ctx.http).get(`/api/profiles/${carol.username}/followers`).set(...auth(alice)).expect(200);
      expect(followers.body.items.map((u: { id: string }) => u.id)).toContain(dave.id);
      await request(ctx.http).delete(`/api/follows/${carol.id}`).set(...auth(dave)).expect(200);
      const after = await request(ctx.http).get('/api/feed').set(...auth(dave)).expect(200);
      expect(after.body.items.map((p: { id: string }) => p.id)).not.toContain(postId);
      await request(ctx.http).post(`/api/follows/${dave.id}`).set(...auth(dave)).expect(400);
    });

    it('paginates the feed with a cursor', async () => {
      const eve = await registerUser(ctx.http, 'eve');
      for (let i = 0; i < 3; i += 1) {
        await createPost(eve, `post ${i}`);
      }
      const page1 = await request(ctx.http).get('/api/feed').query({ limit: 2 }).set(...auth(eve)).expect(200);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).toEqual(expect.any(String));
      const page2 = await request(ctx.http).get('/api/feed').query({ limit: 2, cursor: page1.body.nextCursor }).set(...auth(eve)).expect(200);
      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });
  });

  describe('blocking and reports', () => {
    it('blocking hides profile, removes follows and forbids messaging', async () => {
      const x = await registerUser(ctx.http, 'blk');
      const y = await registerUser(ctx.http, 'blk');
      await request(ctx.http).post(`/api/follows/${x.id}`).set(...auth(y)).expect(200);
      await request(ctx.http).post(`/api/privacy/blocks/${y.id}`).set(...auth(x)).expect(204);
      await request(ctx.http).get(`/api/profiles/${x.username}`).set(...auth(y)).expect(404);
      const asBlocker = await request(ctx.http).get(`/api/profiles/${y.username}`).set(...auth(x)).expect(200);
      expect(asBlocker.body.blockedByMe).toBe(true);
      expect(await ctx.prisma.follow.count({ where: { followerId: y.id, followingId: x.id } })).toBe(0);
      await request(ctx.http).post(`/api/follows/${x.id}`).set(...auth(y)).expect(404);
      await request(ctx.http).post('/api/conversations').set(...auth(y)).send({ participantIds: [x.id] }).expect(403);
      const search = await request(ctx.http).get('/api/search').query({ q: x.username, type: 'users' }).set(...auth(y)).expect(200);
      expect(search.body.users).toHaveLength(0);
      await request(ctx.http).delete(`/api/privacy/blocks/${y.id}`).set(...auth(x)).expect(204);
      await request(ctx.http).get(`/api/profiles/${x.username}`).set(...auth(y)).expect(200);
    });

    it('accepts a report once per target', async () => {
      const postId = await createPost(alice, 'reportable');
      const body = { targetType: 'POST', targetId: postId, reason: 'SPAM' };
      await request(ctx.http).post('/api/reports').set(...auth(bob)).send(body).expect(201);
      await request(ctx.http).post('/api/reports').set(...auth(bob)).send(body).expect(409);
      await request(ctx.http)
        .post('/api/reports')
        .set(...auth(bob))
        .send({ ...body, targetId: '00000000-0000-4000-8000-000000000000' })
        .expect(404);
    });
  });

  describe('search and explore', () => {
    it('finds users, hashtags and posts; strips @ and #', async () => {
      await createPost(carol, 'Ищу друзей #searchable');
      const users = await request(ctx.http).get('/api/search').query({ q: `@${carol.username.slice(0, 6)}` }).set(...auth(alice)).expect(200);
      expect(users.body.users.map((u: { id: string }) => u.id)).toContain(carol.id);
      const tags = await request(ctx.http).get('/api/search').query({ q: '#searcha' }).set(...auth(alice)).expect(200);
      expect(tags.body.hashtags).toEqual([{ name: 'searchable', postsCount: 1 }]);
      const byTag = await request(ctx.http).get('/api/search/hashtags/searchable/posts').set(...auth(alice)).expect(200);
      expect(byTag.body.items).toHaveLength(1);
      const regexAttack = await request(ctx.http).get('/api/search').query({ q: '(a+)+$' }).set(...auth(alice)).expect(200);
      expect(regexAttack.body.users).toEqual([]);
    });

    it('explore returns popular content from accounts you do not follow', async () => {
      const res = await request(ctx.http).get('/api/feed/explore').set(...auth(bob)).expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({ posts: expect.any(Array), reels: expect.any(Array), trendingHashtags: expect.any(Array), suggestedUsers: expect.any(Array) }),
      );
      expect(res.body.posts.every((p: { author: { id: string } }) => p.author.id !== bob.id)).toBe(true);
    });
  });

  describe('stories', () => {
    it('creates, shows to followers, tracks views, hides expired', async () => {
      await request(ctx.http).post(`/api/follows/${alice.id}`).set(...auth(carol)).expect(200);
      const mediaId = await uploadMedia(ctx.http, alice, 'STORY', await pngBuffer(), 's.png', 'image/png');
      const story = await request(ctx.http).post('/api/stories').set(...auth(alice)).send({ mediaId, caption: 'today' }).expect(201);
      const feed = await request(ctx.http).get('/api/stories/feed').set(...auth(carol)).expect(200);
      const group = feed.body.find((g: { author: { id: string } }) => g.author.id === alice.id);
      expect(group.hasUnseen).toBe(true);
      await request(ctx.http).post(`/api/stories/${story.body.id}/view`).set(...auth(carol)).expect(204);
      const after = await request(ctx.http).get('/api/stories/feed').set(...auth(carol)).expect(200);
      expect(after.body.find((g: { author: { id: string } }) => g.author.id === alice.id).hasUnseen).toBe(false);
      await request(ctx.http).get(`/api/stories/${story.body.id}/viewers`).set(...auth(carol)).expect(403);
      const viewers = await request(ctx.http).get(`/api/stories/${story.body.id}/viewers`).set(...auth(alice)).expect(200);
      expect(viewers.body.items[0].user.id).toBe(carol.id);

      await ctx.prisma.story.update({ where: { id: story.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const expired = await request(ctx.http).get(`/api/profiles/${alice.username}/stories`).set(...auth(carol)).expect(200);
      expect(expired.body).toHaveLength(0);
      await request(ctx.http).post(`/api/stories/${story.body.id}/view`).set(...auth(carol)).expect(404);
    });

    it('only the author deletes a story', async () => {
      const mediaId = await uploadMedia(ctx.http, alice, 'STORY', await pngBuffer(), 's.png', 'image/png');
      const story = await request(ctx.http).post('/api/stories').set(...auth(alice)).send({ mediaId }).expect(201);
      await request(ctx.http).delete(`/api/stories/${story.body.id}`).set(...auth(bob)).expect(403);
      await request(ctx.http).delete(`/api/stories/${story.body.id}`).set(...auth(alice)).expect(204);
    });
  });

  describe('reels', () => {
    it('creates a reel from a video, likes, comments, views', async () => {
      const videoId = await uploadMedia(ctx.http, alice, 'REEL', fakeMp4(), 'r.mp4', 'video/mp4');
      const reel = await request(ctx.http).post('/api/reels').set(...auth(alice)).send({ videoMediaId: videoId, caption: '#reel' }).expect(201);
      expect(reel.body.video.kind).toBe('VIDEO');
      await request(ctx.http).post(`/api/reels/${reel.body.id}/like`).set(...auth(carol)).expect(200);
      await request(ctx.http).post(`/api/reels/${reel.body.id}/comments`).set(...auth(carol)).send({ content: 'wow' }).expect(201);
      await request(ctx.http).post(`/api/reels/${reel.body.id}/view`).set(...auth(carol)).expect(204);
      const got = await request(ctx.http).get(`/api/reels/${reel.body.id}`).set(...auth(carol)).expect(200);
      expect(got.body).toMatchObject({ likesCount: 1, commentsCount: 1, viewsCount: 1, likedByMe: true });
      const feed = await request(ctx.http).get('/api/reels').set(...auth(carol)).expect(200);
      expect(feed.body.items.map((r: { id: string }) => r.id)).toContain(reel.body.id);
      await request(ctx.http).delete(`/api/reels/${reel.body.id}`).set(...auth(carol)).expect(403);
      await request(ctx.http).delete(`/api/reels/${reel.body.id}`).set(...auth(alice)).expect(204);
    });
  });

  describe('messages', () => {
    let conversationId: string;

    it('creates one direct conversation per pair', async () => {
      const first = await request(ctx.http).post('/api/conversations').set(...auth(alice)).send({ participantIds: [bob.id] }).expect(201);
      const second = await request(ctx.http).post('/api/conversations').set(...auth(bob)).send({ participantIds: [alice.id] }).expect(201);
      expect(second.body.id).toBe(first.body.id);
      conversationId = first.body.id;
    });

    it('sends text, voice and shared-post messages, counts unread, marks read', async () => {
      await request(ctx.http).post(`/api/conversations/${conversationId}/messages`).set(...auth(alice)).send({ content: 'Салом!' }).expect(201);
      const audio = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(128, 2)]);
      const audioId = await uploadMedia(ctx.http, alice, 'MESSAGE', audio, 'v.ogg', 'audio/ogg');
      const voice = await request(ctx.http)
        .post(`/api/conversations/${conversationId}/messages`)
        .set(...auth(alice))
        .send({ type: 'AUDIO', mediaId: audioId })
        .expect(201);
      expect(voice.body.media.kind).toBe('AUDIO');
      const postId = await createPost(alice, 'share me');
      await request(ctx.http)
        .post(`/api/conversations/${conversationId}/messages`)
        .set(...auth(alice))
        .send({ type: 'POST_SHARE', sharedPostId: postId })
        .expect(201);

      const list = await request(ctx.http).get('/api/conversations').set(...auth(bob)).expect(200);
      const conv = list.body.items.find((c: { id: string }) => c.id === conversationId);
      expect(conv.unreadCount).toBe(3);
      expect(conv.lastMessage.type).toBe('POST_SHARE');
      const badge = await request(ctx.http).get('/api/conversations/unread-count').set(...auth(bob)).expect(200);
      expect(badge.body).toEqual({ count: 1 });
      const senderBadge = await request(ctx.http).get('/api/conversations/unread-count').set(...auth(alice)).expect(200);
      expect(senderBadge.body).toEqual({ count: 0 });

      const messages = await request(ctx.http).get(`/api/conversations/${conversationId}/messages`).set(...auth(bob)).expect(200);
      expect(messages.body.items).toHaveLength(3);
      expect(messages.body.items[0].sharedPost.id).toBe(postId);
      const afterRead = await request(ctx.http).get(`/api/conversations/${conversationId}`).set(...auth(bob)).expect(200);
      expect(afterRead.body.unreadCount).toBe(0);
      const badgeAfterRead = await request(ctx.http).get('/api/conversations/unread-count').set(...auth(bob)).expect(200);
      expect(badgeAfterRead.body).toEqual({ count: 0 });
    });

    it('lists direct conversation partners as contacts with privacy-aware presence', async () => {
      const contacts = await request(ctx.http).get('/api/users/me/contacts').set(...auth(bob)).expect(200);
      expect(contacts.body).toEqual([
        expect.objectContaining({ id: alice.id, username: alice.username, online: false }),
      ]);
      const outsider = await request(ctx.http).get('/api/users/me/contacts').set(...auth(carol)).expect(200);
      expect(outsider.body).toEqual([]);

      await ctx.prisma.user.update({ where: { id: alice.id }, data: { lastSeenAt: new Date() } });
      const seen = await request(ctx.http).get('/api/users/me/contacts').set(...auth(bob)).expect(200);
      expect(seen.body[0].lastSeenAt).not.toBeNull();
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(alice)).send({ showOnlineStatus: false }).expect(200);
      const hidden = await request(ctx.http).get('/api/users/me/contacts').set(...auth(bob)).expect(200);
      expect(hidden.body[0]).toMatchObject({ online: false, lastSeenAt: null });
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(alice)).send({ showOnlineStatus: true }).expect(200);

    });

    it('hides blocked users from contacts', async () => {
      const x = await registerUser(ctx.http, 'cnt');
      const y = await registerUser(ctx.http, 'cnt');
      await request(ctx.http).post('/api/conversations').set(...auth(x)).send({ participantIds: [y.id] }).expect(201);
      const before = await request(ctx.http).get('/api/users/me/contacts').set(...auth(y)).expect(200);
      expect(before.body).toHaveLength(1);
      await request(ctx.http).post(`/api/privacy/blocks/${y.id}`).set(...auth(x)).expect(204);
      const blocked = await request(ctx.http).get('/api/users/me/contacts').set(...auth(y)).expect(200);
      expect(blocked.body).toEqual([]);
      const blocker = await request(ctx.http).get('/api/users/me/contacts').set(...auth(x)).expect(200);
      expect(blocker.body).toEqual([]);
    });

    it('validates message payloads', async () => {
      await request(ctx.http).post(`/api/conversations/${conversationId}/messages`).set(...auth(alice)).send({}).expect(400);
      await request(ctx.http)
        .post(`/api/conversations/${conversationId}/messages`)
        .set(...auth(alice))
        .send({ type: 'IMAGE', content: 'no media' })
        .expect(400);
    });

    it('keeps conversations private to participants', async () => {
      await request(ctx.http).get(`/api/conversations/${conversationId}/messages`).set(...auth(carol)).expect(404);
      await request(ctx.http).post(`/api/conversations/${conversationId}/messages`).set(...auth(carol)).send({ content: 'hi' }).expect(404);
    });

    it('reactions and deletion', async () => {
      const msg = await request(ctx.http).post(`/api/conversations/${conversationId}/messages`).set(...auth(bob)).send({ content: 'react' }).expect(201);
      await request(ctx.http).put(`/api/messages/${msg.body.id}/reaction`).set(...auth(alice)).send({ emoji: '❤️' }).expect(204);
      await request(ctx.http).put(`/api/messages/${msg.body.id}/reaction`).set(...auth(alice)).send({ emoji: 'not emoji' }).expect(400);
      await request(ctx.http).put(`/api/messages/${msg.body.id}/reaction`).set(...auth(carol)).send({ emoji: '👍' }).expect(404);
      await request(ctx.http).delete(`/api/messages/${msg.body.id}`).set(...auth(alice)).expect(403);
      await request(ctx.http).delete(`/api/messages/${msg.body.id}`).set(...auth(bob)).expect(204);
      const messages = await request(ctx.http).get(`/api/conversations/${conversationId}/messages`).set(...auth(alice)).expect(200);
      const deleted = messages.body.items.find((m: { id: string }) => m.id === msg.body.id);
      expect(deleted).toMatchObject({ deleted: true, content: null, reactions: [] });
    });

    it('respects allowDirectMessages=NO_ONE', async () => {
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(carol)).send({ allowDirectMessages: 'NO_ONE' }).expect(200);
      await request(ctx.http).post('/api/conversations').set(...auth(bob)).send({ participantIds: [carol.id] }).expect(403);
    });

    it('creates group conversations', async () => {
      const dan = await registerUser(ctx.http, 'dan');
      const group = await request(ctx.http)
        .post('/api/conversations')
        .set(...auth(alice))
        .send({ participantIds: [bob.id, dan.id], title: 'SoftClub' })
        .expect(201);
      expect(group.body).toMatchObject({ isGroup: true, title: 'SoftClub' });
      expect(group.body.participants).toHaveLength(3);
    });
  });

  describe('notifications', () => {
    it('lists, counts and marks notifications as read; nobody can create them via API', async () => {
      const count = await request(ctx.http).get('/api/notifications/unread-count').set(...auth(alice)).expect(200);
      expect(count.body.count).toBeGreaterThan(0);
      await request(ctx.http).post('/api/notifications').set(...auth(bob)).send({ userId: alice.id, type: 'LIKE' }).expect(404);
      const list = await request(ctx.http).get('/api/notifications').set(...auth(alice)).expect(200);
      await request(ctx.http).patch(`/api/notifications/${list.body.items[0].id}/read`).set(...auth(bob)).expect(404);
      await request(ctx.http).post('/api/notifications/read-all').set(...auth(alice)).expect(200);
      const after = await request(ctx.http).get('/api/notifications/unread-count').set(...auth(alice)).expect(200);
      expect(after.body.count).toBe(0);
    });

    it('respects notification settings', async () => {
      await request(ctx.http).patch('/api/settings/notifications').set(...auth(alice)).send({ likes: false }).expect(200);
      const postId = await createPost(alice, 'silent likes');
      await request(ctx.http).post(`/api/posts/${postId}/like`).set(...auth(bob)).expect(200);
      expect(await ctx.prisma.notification.count({ where: { recipientId: alice.id, type: 'LIKE', entityId: postId } })).toBe(0);
    });
  });

  describe('profile', () => {
    it('updates profile and avatar, old avatar file is replaced', async () => {
      const updated = await request(ctx.http)
        .patch('/api/profiles/me')
        .set(...auth(bob))
        .send({ fullName: 'Bob Builder', bio: 'Hello', website: 'https://example.com' })
        .expect(200);
      expect(updated.body).toMatchObject({ fullName: 'Bob Builder', bio: 'Hello', website: 'https://example.com' });
      await request(ctx.http).patch('/api/profiles/me').set(...auth(bob)).send({ website: 'javascript:alert(1)' }).expect(400);
      const first = await uploadMedia(ctx.http, bob, 'AVATAR', await pngBuffer('#ff0000', 500), 'a.png', 'image/png');
      const withAvatar = await request(ctx.http).put('/api/profiles/me/avatar').set(...auth(bob)).send({ mediaId: first }).expect(200);
      expect(withAvatar.body.avatarUrl).toContain(`/api/media/${first}/file`);
      const avatarFile = await ctx.prisma.media.findUniqueOrThrow({ where: { id: first } });
      expect([avatarFile.width, avatarFile.height]).toEqual([320, 320]);
      const second = await uploadMedia(ctx.http, bob, 'AVATAR', await pngBuffer('#00ff00'), 'b.png', 'image/png');
      await request(ctx.http).put('/api/profiles/me/avatar').set(...auth(bob)).send({ mediaId: second }).expect(200);
      expect(await ctx.prisma.media.findUnique({ where: { id: first } })).toBeNull();
      const removed = await request(ctx.http).delete('/api/profiles/me/avatar').set(...auth(bob)).expect(200);
      expect(removed.body.avatarUrl).toBeNull();
    });

    it('shows counts and follow status', async () => {
      const profile = await request(ctx.http).get(`/api/profiles/${alice.username}`).set(...auth(carol)).expect(200);
      expect(profile.body).toMatchObject({ isMe: false, followStatus: 'FOLLOWING', canViewContent: true });
      expect(profile.body.counts.posts).toBeGreaterThan(0);
      await request(ctx.http).get('/api/profiles/does.not.exist').set(...auth(carol)).expect(404);
    });
  });
});
