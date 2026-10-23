import request from 'supertest';
import { auth, createTestApp, pngBuffer, registerUser, resetDatabase, TestContext, TestUser, uploadMedia } from './utils';

describe('Privacy, saved posts and story audience (e2e)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let follower: TestUser;
  let friend: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    owner = await registerUser(ctx.http, 'own');
    follower = await registerUser(ctx.http, 'fol');
    friend = await registerUser(ctx.http, 'frn');
    stranger = await registerUser(ctx.http, 'str');
    await request(ctx.http).post(`/api/follows/${owner.id}`).set(...auth(follower)).expect(200);
    await request(ctx.http).post(`/api/follows/${owner.id}`).set(...auth(friend)).expect(200);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function createPost(user: TestUser): Promise<string> {
    const mediaId = await uploadMedia(ctx.http, user, 'POST', await pngBuffer(), 'a.png', 'image/png');
    const res = await request(ctx.http).post('/api/posts').set(...auth(user)).send({ mediaIds: [mediaId], caption: 'hi' }).expect(201);
    return res.body.id as string;
  }

  async function createStory(user: TestUser, audience?: string): Promise<string> {
    const mediaId = await uploadMedia(ctx.http, user, 'STORY', await pngBuffer(), 's.png', 'image/png');
    const res = await request(ctx.http).post('/api/stories').set(...auth(user)).send({ mediaId, audience }).expect(201);
    return res.body.id as string;
  }

  async function storyIdsInFeed(user: TestUser): Promise<string[]> {
    const res = await request(ctx.http).get('/api/stories/feed').set(...auth(user)).expect(200);
    return (res.body as { stories: { id: string }[] }[]).flatMap((g) => g.stories.map((s) => s.id));
  }

  describe('saved posts', () => {
    it('saves, lists with savedByMe and unsaves', async () => {
      const postId = await createPost(owner);
      await request(ctx.http).post(`/api/posts/${postId}/save`).set(...auth(follower)).expect(200, { saved: true });
      await request(ctx.http).post(`/api/posts/${postId}/save`).set(...auth(follower)).expect(200, { saved: true });
      const post = await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(follower)).expect(200);
      expect(post.body.savedByMe).toBe(true);
      const otherView = await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(friend)).expect(200);
      expect(otherView.body.savedByMe).toBe(false);
      const saved = await request(ctx.http).get('/api/users/me/saved').set(...auth(follower)).expect(200);
      expect(saved.body.items.map((p: { id: string }) => p.id)).toEqual([postId]);
      await request(ctx.http).delete(`/api/posts/${postId}/save`).set(...auth(follower)).expect(200, { saved: false });
      const empty = await request(ctx.http).get('/api/users/me/saved').set(...auth(follower)).expect(200);
      expect(empty.body.items).toEqual([]);
    });

    it('cannot save a post you cannot see, and hides saved posts after a block', async () => {
      const privateUser = await registerUser(ctx.http, 'prv');
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(privateUser)).send({ isPrivate: true }).expect(200);
      const hidden = await createPost(privateUser);
      await request(ctx.http).post(`/api/posts/${hidden}/save`).set(...auth(stranger)).expect(404);

      const visible = await createPost(owner);
      await request(ctx.http).post(`/api/posts/${visible}/save`).set(...auth(stranger)).expect(200);
      await request(ctx.http).post(`/api/privacy/blocks/${stranger.id}`).set(...auth(owner)).expect(204);
      const saved = await request(ctx.http).get('/api/users/me/saved').set(...auth(stranger)).expect(200);
      expect(saved.body.items).toEqual([]);
      await request(ctx.http).delete(`/api/privacy/blocks/${stranger.id}`).set(...auth(owner)).expect(204);
    });
  });

  describe('story audience, close friends and hidden stories', () => {
    it('shows FOLLOWERS stories only to followers, CLOSE_FRIENDS only to close friends', async () => {
      const everyone = await createStory(owner);
      const followersOnly = await createStory(owner, 'FOLLOWERS');
      const closeOnly = await createStory(owner, 'CLOSE_FRIENDS');
      await request(ctx.http).post('/api/stories').set(...auth(owner)).send({ mediaId: everyone, audience: 'WRONG' }).expect(400);

      await request(ctx.http).put(`/api/privacy/close-friends/${friend.id}`).set(...auth(owner)).expect(204);
      const list = await request(ctx.http).get('/api/privacy/close-friends').set(...auth(owner)).expect(200);
      expect(list.body.map((u: { id: string }) => u.id)).toEqual([friend.id]);

      expect(await storyIdsInFeed(follower)).toEqual(expect.arrayContaining([everyone, followersOnly]));
      expect(await storyIdsInFeed(follower)).not.toContain(closeOnly);
      expect(await storyIdsInFeed(friend)).toEqual(expect.arrayContaining([everyone, followersOnly, closeOnly]));

      const profileStories = await request(ctx.http).get(`/api/profiles/${owner.username}/stories`).set(...auth(stranger)).expect(200);
      expect(profileStories.body.map((s: { id: string }) => s.id)).toEqual([everyone]);
      await request(ctx.http).post(`/api/stories/${followersOnly}/view`).set(...auth(stranger)).expect(404);
      await request(ctx.http).post(`/api/stories/${closeOnly}/view`).set(...auth(follower)).expect(404);
      await request(ctx.http).post(`/api/stories/${closeOnly}/view`).set(...auth(friend)).expect(204);

      const mine = await request(ctx.http).get(`/api/profiles/${owner.username}/stories`).set(...auth(owner)).expect(200);
      expect(mine.body).toHaveLength(3);
      expect(mine.body.find((s: { id: string }) => s.id === closeOnly).audience).toBe('CLOSE_FRIENDS');

      await request(ctx.http).delete(`/api/privacy/close-friends/${friend.id}`).set(...auth(owner)).expect(204);
      expect(await storyIdsInFeed(friend)).not.toContain(closeOnly);
    });

    it('hides all stories from a specific person', async () => {
      const storyId = await createStory(owner);
      await request(ctx.http).put(`/api/privacy/story-hidden/${follower.id}`).set(...auth(owner)).expect(204);
      const hiddenList = await request(ctx.http).get('/api/privacy/story-hidden').set(...auth(owner)).expect(200);
      expect(hiddenList.body.map((u: { id: string }) => u.id)).toEqual([follower.id]);
      expect(await storyIdsInFeed(follower)).not.toContain(storyId);
      await request(ctx.http).post(`/api/stories/${storyId}/view`).set(...auth(follower)).expect(404);
      expect(await storyIdsInFeed(friend)).toContain(storyId);
      await request(ctx.http).delete(`/api/privacy/story-hidden/${follower.id}`).set(...auth(owner)).expect(204);
      expect(await storyIdsInFeed(follower)).toContain(storyId);
    });

    it('validates the people lists', async () => {
      await request(ctx.http).put(`/api/privacy/close-friends/${owner.id}`).set(...auth(owner)).expect(400);
      await request(ctx.http).put('/api/privacy/close-friends/00000000-0000-4000-8000-000000000000').set(...auth(owner)).expect(404);
      await request(ctx.http).put('/api/privacy/story-hidden/not-a-uuid').set(...auth(owner)).expect(400);
    });

    it('hides stories of a private account from non-followers even with audience EVERYONE', async () => {
      const privateUser = await registerUser(ctx.http, 'prs');
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(privateUser)).send({ isPrivate: true }).expect(200);
      const storyId = await createStory(privateUser);
      await request(ctx.http).get(`/api/profiles/${privateUser.username}/stories`).set(...auth(stranger)).expect(403);
      await request(ctx.http).post(`/api/stories/${storyId}/view`).set(...auth(stranger)).expect(404);
    });
  });

  describe('message privacy', () => {
    it('FOLLOWING lets only people I follow write to me, checked on every message', async () => {
      const picky = await registerUser(ctx.http, 'pck');
      const conv = await request(ctx.http).post('/api/conversations').set(...auth(stranger)).send({ participantIds: [picky.id] }).expect(201);
      await request(ctx.http).patch('/api/privacy/settings').set(...auth(picky)).send({ allowDirectMessages: 'FOLLOWING' }).expect(200);
      await request(ctx.http).post(`/api/conversations/${conv.body.id}/messages`).set(...auth(stranger)).send({ content: 'hi' }).expect(403);
      await request(ctx.http).post('/api/conversations').set(...auth(follower)).send({ participantIds: [picky.id] }).expect(403);
      await request(ctx.http).post(`/api/follows/${stranger.id}`).set(...auth(picky)).expect(200);
      await request(ctx.http).post(`/api/conversations/${conv.body.id}/messages`).set(...auth(stranger)).send({ content: 'hi' }).expect(201);
      await request(ctx.http).post(`/api/conversations/${conv.body.id}/messages`).set(...auth(picky)).send({ content: 'hey' }).expect(201);
    });

    it('keeps message notifications out of the notifications list and badge', async () => {
      const a = await registerUser(ctx.http, 'mna');
      const b = await registerUser(ctx.http, 'mnb');
      const conv = await request(ctx.http).post('/api/conversations').set(...auth(a)).send({ participantIds: [b.id] }).expect(201);
      await request(ctx.http).post(`/api/conversations/${conv.body.id}/messages`).set(...auth(a)).send({ content: 'hi' }).expect(201);
      expect(await ctx.prisma.notification.count({ where: { recipientId: b.id, type: 'MESSAGE' } })).toBe(1);
      const count = await request(ctx.http).get('/api/notifications/unread-count').set(...auth(b)).expect(200);
      expect(count.body.count).toBe(0);
      const list = await request(ctx.http).get('/api/notifications').set(...auth(b)).expect(200);
      expect(list.body.items).toEqual([]);
    });
  });

  describe('blocking', () => {
    it('blocked user cannot see profile content, follow or message, and close-friend links are removed', async () => {
      const x = await registerUser(ctx.http, 'bkx');
      const y = await registerUser(ctx.http, 'bky');
      await request(ctx.http).post(`/api/follows/${x.id}`).set(...auth(y)).expect(200);
      await request(ctx.http).post(`/api/follows/${y.id}`).set(...auth(x)).expect(200);
      await request(ctx.http).put(`/api/privacy/close-friends/${y.id}`).set(...auth(x)).expect(204);
      const postId = await createPost(x);
      await request(ctx.http).post(`/api/privacy/blocks/${y.id}`).set(...auth(x)).expect(204);
      expect(await ctx.prisma.follow.count({ where: { OR: [{ followerId: x.id }, { followerId: y.id }] } })).toBe(0);
      expect(await ctx.prisma.closeFriend.count({ where: { userId: x.id } })).toBe(0);
      await request(ctx.http).get(`/api/posts/${postId}`).set(...auth(y)).expect(404);
      await request(ctx.http).get(`/api/profiles/${x.username}/posts`).set(...auth(y)).expect(404);
      await request(ctx.http).post(`/api/follows/${x.id}`).set(...auth(y)).expect(404);
      await request(ctx.http).post('/api/conversations').set(...auth(y)).send({ participantIds: [x.id] }).expect(403);
      const blocked = await request(ctx.http).get('/api/privacy/blocks').set(...auth(x)).expect(200);
      expect(blocked.body.items.map((u: { id: string }) => u.id)).toEqual([y.id]);
    });

    it('accepts reports for users, posts and comments with a reason from the list', async () => {
      const postId = await createPost(owner);
      const comment = await request(ctx.http).post(`/api/posts/${postId}/comments`).set(...auth(follower)).send({ content: 'spam' }).expect(201);
      await request(ctx.http).post('/api/reports').set(...auth(stranger)).send({ targetType: 'USER', targetId: owner.id, reason: 'SPAM' }).expect(201);
      await request(ctx.http).post('/api/reports').set(...auth(stranger)).send({ targetType: 'POST', targetId: postId, reason: 'NUDITY' }).expect(201);
      await request(ctx.http).post('/api/reports').set(...auth(stranger)).send({ targetType: 'COMMENT', targetId: comment.body.id, reason: 'HARASSMENT' }).expect(201);
      await request(ctx.http).post('/api/reports').set(...auth(stranger)).send({ targetType: 'POST', targetId: postId, reason: 'NOT_A_REASON' }).expect(400);
    });
  });
});
