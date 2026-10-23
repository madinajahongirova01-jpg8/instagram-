import { Fragment } from 'react';
import { Link } from '@/i18n/navigation';

const TOKEN = /([#＃][\p{L}\p{N}_]+|@[a-z0-9._]{1,30})/gu;

export function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return <Fragment key={index}>{part}</Fragment>;
        }
        if (part.startsWith('@')) {
          return (
            <Link key={index} href={`/profile/${part.slice(1)}`} className="font-medium text-link hover:underline">
              {part}
            </Link>
          );
        }
        return (
          <Link key={index} href={`/explore/tags/${encodeURIComponent(part.slice(1).toLowerCase())}`} className="text-link hover:underline">
            {part}
          </Link>
        );
      })}
    </>
  );
}
