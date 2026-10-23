'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Hash, History, Search, X } from 'lucide-react';
import { SEARCH_QUERY_MAX } from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/profile/avatar';
import { PostTile } from '@/components/profile/posts-grid';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';
import { useMeQuery } from '@/store/api';
import { useSearchQuery, type SearchRequest } from '@/store/social-api';

type Tab = SearchRequest['type'];
const TABS: Tab[] = ['all', 'users', 'hashtags', 'posts'];
const HISTORY_MAX = 10;

function readHistory(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function writeHistory(key: string, items: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    return;
  }
}

export function SearchView() {
  const t = useTranslations('search');
  const params = useSearchParams();
  const { data: me } = useMeQuery();
  const [text, setText] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const [history, setHistory] = useState<string[]>([]);
  const q = useDebounced(text.trim(), 300);
  const historyKey = `search-history:${me?.id ?? 'guest'}`;
  const { data, isFetching, isError, refetch } = useSearchQuery({ q, type: tab }, { skip: q.length === 0 });

  useEffect(() => {
    setHistory(readHistory(historyKey));
  }, [historyKey]);

  const remember = useCallback(
    (value: string) => {
      const clean = value.trim();
      if (!clean) {
        return;
      }
      const next = [clean, ...history.filter((h) => h !== clean)].slice(0, HISTORY_MAX);
      setHistory(next);
      writeHistory(historyKey, next);
    },
    [history, historyKey],
  );

  const clearHistory = () => {
    setHistory([]);
    writeHistory(historyKey, []);
  };

  const removeItem = (value: string) => {
    const next = history.filter((h) => h !== value);
    setHistory(next);
    writeHistory(historyKey, next);
  };

  const empty = data && data.users.length === 0 && data.hashtags.length === 0 && data.posts.length === 0;

  return (
    <div className="grid gap-4 px-4 pt-4 md:px-0 md:pt-0">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          remember(text);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          autoFocus
          value={text}
          maxLength={SEARCH_QUERY_MAX}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="h-12 w-full rounded-full border border-surface-border bg-surface pl-12 pr-4 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div role="tablist" aria-label={t('placeholder')} className="flex gap-2 overflow-x-auto">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn('h-9 shrink-0 rounded-full px-4 text-sm font-semibold', tab === key ? 'nav-active' : 'bg-muted text-muted-foreground')}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {q.length === 0 ? (
        <section className="post-card rounded-3xl p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">{t('recent')}</h2>
            {history.length > 0 ? (
              <button type="button" onClick={clearHistory} className="text-sm font-semibold text-see-all">
                {t('clear')}
              </button>
            ) : null}
          </header>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noRecent')}</p>
          ) : (
            <ul className="grid gap-1">
              {history.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-nav-hover">
                  <History className="size-5 text-muted-foreground" />
                  <button type="button" onClick={() => setText(item)} className="flex-1 text-left text-sm">
                    {item}
                  </button>
                  <button type="button" aria-label={t('removeRecent')} onClick={() => removeItem(item)} className="rounded-full p-1 hover:bg-muted">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : isFetching && !data ? (
        <Spinner />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : empty ? (
        <EmptyState icon={Search} title={t('noResults')} text={t('noResultsText', { q })} />
      ) : data ? (
        <div className="grid gap-6">
          {data.users.length > 0 ? (
            <section className="post-card rounded-3xl p-3">
              <h2 className="px-2 pb-2 text-sm font-semibold text-muted-foreground">{t('users')}</h2>
              <ul className="grid gap-1">
                {data.users.map((user) => (
                  <li key={user.id}>
                    <Link href={`/profile/${user.username}`} onClick={() => remember(q)} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-nav-hover">
                      <Avatar src={user.avatarUrl} alt={user.username} className="size-11" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{user.username}</span>
                        <span className="block truncate text-xs text-muted-foreground">{user.fullName}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {data.hashtags.length > 0 ? (
            <section className="post-card rounded-3xl p-3">
              <h2 className="px-2 pb-2 text-sm font-semibold text-muted-foreground">{t('hashtags')}</h2>
              <ul className="grid gap-1">
                {data.hashtags.map((tag) => (
                  <li key={tag.name}>
                    <Link href={`/explore/tags/${encodeURIComponent(tag.name)}`} onClick={() => remember(q)} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-nav-hover">
                      <span className="flex size-11 items-center justify-center rounded-full border">
                        <Hash className="size-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">#{tag.name}</span>
                        <span className="block text-xs text-muted-foreground">{t('postsCount', { count: tag.postsCount })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {data.posts.length > 0 ? (
            <section>
              <h2 className="pb-2 text-sm font-semibold text-muted-foreground">{t('posts')}</h2>
              <ul className="grid grid-cols-3 gap-1">
                {data.posts.map((post) => (
                  <PostTile key={post.id} post={post} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
