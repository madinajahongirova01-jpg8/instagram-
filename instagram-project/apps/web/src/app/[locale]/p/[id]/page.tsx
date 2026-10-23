import { setRequestLocale } from 'next-intl/server';
import { ProtectedPage } from '@/components/layout/protected-page';
import { PostDetail } from '@/components/post/post-detail';
import { pageMetadata } from '@/lib/page-metadata';

export const generateMetadata = pageMetadata('post');

export default async function PostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <PostDetail id={id} />
    </ProtectedPage>
  );
}
