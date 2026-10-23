'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReportReason, ReportTarget } from '@insta/shared';
import { Modal } from '@/components/ui/modal';
import { errorStatus } from '@/lib/errors';
import { useReportMutation } from '@/store/settings-api';

const REASONS: ReportReason[] = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'NUDITY', 'FALSE_INFORMATION', 'COPYRIGHT', 'OTHER'];

export function ReportDialog({ targetType, targetId, onClose }: { targetType: ReportTarget; targetId: string; onClose: () => void }) {
  const t = useTranslations('report');
  const common = useTranslations('common');
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [report, state] = useReportMutation();

  const status = errorStatus(state.error);

  return (
    <Modal title={t('title')} closeLabel={common('close')} onClose={onClose}>
      {state.isSuccess ? (
        <p className="py-4 text-center text-sm">{t('sent')}</p>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void report({ targetType, targetId, reason });
          }}
        >
          <fieldset className="grid gap-1">
            <legend className="mb-2 text-sm text-muted-foreground">{t('why')}</legend>
            {REASONS.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-nav-hover">
                <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                <span className="text-sm">{t(`reasons.${value}`)}</span>
              </label>
            ))}
          </fieldset>
          {state.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {status === 409 ? t('already') : common('failed')}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state.isLoading}
            className="h-11 rounded-xl bg-destructive text-sm font-semibold text-badge-foreground disabled:opacity-60"
          >
            {t('submit')}
          </button>
        </form>
      )}
    </Modal>
  );
}
