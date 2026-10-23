import { setRequestLocale } from 'next-intl/server';
import { RequireAuth } from '@/components/auth/route-guards';
import { StoryViewer } from '@/components/stories/story-viewer';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('stories');

export default async function StoriesPage({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  return (
    <RequireAuth>
      <StoryViewer username={decodeURIComponent(username)} />
    </RequireAuth>
  );
}
