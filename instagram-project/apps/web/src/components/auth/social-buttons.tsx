'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

export function SocialButtons() {
  const t = useTranslations('auth');
  const [notice, setNotice] = useState(false);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('orContinueWith')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Button type="button" variant="outline" size="lg" aria-label="GitHub" onClick={() => setNotice(true)}>
          <FaGithub className="size-5" />
        </Button>
        <Button type="button" variant="outline" size="lg" aria-label="Google" onClick={() => setNotice(true)}>
          <FaGoogle className="size-5" />
        </Button>
      </div>
      {notice ? (
        <p role="status" className="mt-3 text-center text-xs text-muted-foreground">
          {t('oauthSoon')}
        </p>
      ) : null}
    </div>
  );
}
