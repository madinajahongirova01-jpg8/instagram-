import type {
  CommentDto,
  ExploreDto,
  FollowRequestDto,
  LikeState,
  Paginated,
  PostDto,
  ReelDto,
  SearchResultDto,
  StoryAudience,
  StoryDto,
  StoryGroupDto,
} from '@insta/shared';
import { api } from './api';

type Cursor = string | null;

const cursorPages = {
  initialPageParam: null as Cursor,
  getNextPageParam: (last: Paginated<unknown>) => last.nextCursor,
};

function cursorParams(cursor: Cursor, extra: Record<string, unknown> = {}) {
  return cursor ? { ...extra, cursor } : extra;
}

function postTags(data: { pages: Paginated<PostDto>[] } | undefined) {
  return (data?.pages ?? []).flatMap((page) => page.items.map((post) => ({ type: 'Post' as const, id: post.id })));
}

export interface CreatePostRequest {
  mediaIds: string[];
  caption?: string;
  location?: string | null;
}

export interface CreateStoryRequest {
  mediaId: string;
  caption?: string;
  audience: StoryAudience;
}

export interface CreateReelRequest {
  videoMediaId: string;
  caption?: string;
}

export interface ToggleRequest {
  id: string;
  on: boolean;
}

export interface CommentTarget {
  kind: 'posts' | 'reels';
  id: string;
}

export interface AddCommentRequest extends CommentTarget {
  content: string;
}

export interface SearchRequest {
  q: string;
  type: 'all' | 'users' | 'hashtags' | 'posts';
}

export const socialApi = api.injectEndpoints({
  endpoints: (build) => ({
    feed: build.infiniteQuery<Paginated<PostDto>, void, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ pageParam }) => ({ url: '/feed', params: cursorParams(pageParam, { limit: 10 }) }),
      providesTags: (result) => [...postTags(result), 'Feed'],
    }),
    post: build.query<PostDto, string>({
      query: (id) => ({ url: `/posts/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Post', id }],
    }),
    createPost: build.mutation<PostDto, CreatePostRequest>({
      query: (data) => ({ url: '/posts', method: 'POST', data }),
      invalidatesTags: (result) => ['Feed', ...(result ? [{ type: 'ProfilePosts' as const, id: result.author.username }, { type: 'Profile' as const, id: result.author.username }] : [])],
    }),
    deletePost: build.mutation<void, PostDto>({
      query: (post) => ({ url: `/posts/${post.id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, post) => [
        'Feed',
        'Saved',
        { type: 'ProfilePosts', id: post.author.username },
        { type: 'Profile', id: post.author.username },
      ],
    }),
    setPostLike: build.mutation<LikeState, ToggleRequest>({
      query: ({ id, on }) => ({ url: `/posts/${id}/like`, method: on ? 'POST' : 'DELETE' }),
      async onQueryStarted({ id, on }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          socialApi.util.updateQueryData('post', id, (draft) => {
            if (draft.likedByMe !== on) {
              draft.likedByMe = on;
              if (draft.likesCount !== null) {
                draft.likesCount += on ? 1 : -1;
              }
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    setPostSave: build.mutation<{ saved: boolean }, ToggleRequest>({
      query: ({ id, on }) => ({ url: `/posts/${id}/save`, method: on ? 'POST' : 'DELETE' }),
      async onQueryStarted({ id, on }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          socialApi.util.updateQueryData('post', id, (draft) => {
            draft.savedByMe = on;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Saved'],
    }),
    savedPosts: build.infiniteQuery<Paginated<PostDto>, void, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ pageParam }) => ({ url: '/users/me/saved', params: cursorParams(pageParam) }),
      providesTags: (result) => [...postTags(result), 'Saved'],
    }),
    profilePosts: build.infiniteQuery<Paginated<PostDto>, string, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ queryArg, pageParam }) => ({
        url: `/profiles/${encodeURIComponent(queryArg)}/posts`,
        params: cursorParams(pageParam),
      }),
      providesTags: (result, _error, username) => [...postTags(result), { type: 'ProfilePosts', id: username }],
    }),
    profileReels: build.infiniteQuery<Paginated<ReelDto>, string, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ queryArg, pageParam }) => ({
        url: `/profiles/${encodeURIComponent(queryArg)}/reels`,
        params: cursorParams(pageParam),
      }),
      providesTags: (_result, _error, username) => [{ type: 'ProfileReels', id: username }],
    }),
    comments: build.infiniteQuery<Paginated<CommentDto>, CommentTarget, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ queryArg, pageParam }) => ({
        url: `/${queryArg.kind}/${queryArg.id}/comments`,
        params: cursorParams(pageParam),
      }),
      providesTags: (_result, _error, target) => [{ type: 'Comments', id: target.id }],
    }),
    addComment: build.mutation<CommentDto, AddCommentRequest>({
      query: ({ kind, id, content }) => ({ url: `/${kind}/${id}/comments`, method: 'POST', data: { content } }),
      invalidatesTags: (_result, _error, { kind, id }) => [
        { type: 'Comments', id },
        ...(kind === 'posts' ? [{ type: 'Post' as const, id }] : ['Reels' as const]),
      ],
    }),
    deleteComment: build.mutation<void, { commentId: string; target: CommentTarget }>({
      query: ({ commentId }) => ({ url: `/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { target }) => [
        { type: 'Comments', id: target.id },
        ...(target.kind === 'posts' ? [{ type: 'Post' as const, id: target.id }] : ['Reels' as const]),
      ],
    }),
    storiesFeed: build.query<StoryGroupDto[], void>({
      query: () => ({ url: '/stories/feed' }),
      providesTags: ['Stories'],
    }),
    userStories: build.query<StoryDto[], string>({
      query: (username) => ({ url: `/profiles/${encodeURIComponent(username)}/stories` }),
      providesTags: ['Stories'],
    }),
    createStory: build.mutation<StoryDto, CreateStoryRequest>({
      query: (data) => ({ url: '/stories', method: 'POST', data }),
      invalidatesTags: ['Stories'],
    }),
    viewStory: build.mutation<void, string>({
      query: (id) => ({ url: `/stories/${id}/view`, method: 'POST' }),
    }),
    deleteStory: build.mutation<void, string>({
      query: (id) => ({ url: `/stories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Stories'],
    }),
    reels: build.infiniteQuery<Paginated<ReelDto>, void, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ pageParam }) => ({ url: '/reels', params: cursorParams(pageParam, { limit: 5 }) }),
      providesTags: ['Reels'],
    }),
    createReel: build.mutation<ReelDto, CreateReelRequest>({
      query: (data) => ({ url: '/reels', method: 'POST', data }),
      invalidatesTags: (result) => ['Reels', ...(result ? [{ type: 'ProfileReels' as const, id: result.author.username }] : [])],
    }),
    setReelLike: build.mutation<LikeState, ToggleRequest>({
      query: ({ id, on }) => ({ url: `/reels/${id}/like`, method: on ? 'POST' : 'DELETE' }),
    }),
    viewReel: build.mutation<void, string>({
      query: (id) => ({ url: `/reels/${id}/view`, method: 'POST' }),
    }),
    followRequests: build.query<Paginated<FollowRequestDto>, void>({
      query: () => ({ url: '/follow-requests', params: { limit: 50 } }),
      providesTags: ['FollowRequests'],
    }),
    answerFollowRequest: build.mutation<void, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/follow-requests/${id}/${accept ? 'accept' : 'decline'}`, method: 'POST' }),
      invalidatesTags: ['FollowRequests', 'Profile'],
    }),
    search: build.query<SearchResultDto, SearchRequest>({
      query: ({ q, type }) => ({ url: '/search', params: { q, type } }),
    }),
    hashtagPosts: build.infiniteQuery<Paginated<PostDto>, string, Cursor>({
      infiniteQueryOptions: cursorPages,
      query: ({ queryArg, pageParam }) => ({
        url: `/search/hashtags/${encodeURIComponent(queryArg)}/posts`,
        params: cursorParams(pageParam),
      }),
      providesTags: (result) => postTags(result),
    }),
    explore: build.query<ExploreDto, void>({
      query: () => ({ url: '/feed/explore' }),
      providesTags: ['Explore'],
    }),
  }),
});

export const {
  useFeedInfiniteQuery,
  usePostQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useSetPostLikeMutation,
  useSetPostSaveMutation,
  useSavedPostsInfiniteQuery,
  useProfilePostsInfiniteQuery,
  useProfileReelsInfiniteQuery,
  useCommentsInfiniteQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useStoriesFeedQuery,
  useUserStoriesQuery,
  useCreateStoryMutation,
  useViewStoryMutation,
  useDeleteStoryMutation,
  useReelsInfiniteQuery,
  useCreateReelMutation,
  useSetReelLikeMutation,
  useViewReelMutation,
  useFollowRequestsQuery,
  useAnswerFollowRequestMutation,
  useSearchQuery,
  useHashtagPostsInfiniteQuery,
  useExploreQuery,
} = socialApi;
