import { FaInstagram } from 'react-icons/fa';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="Instagram" className={cn('inline-flex items-center', className)}>
      <span className={cn('font-logo text-brand-gradient pr-1 leading-none', compact ? 'hidden lg:inline' : 'inline')}>
        Instagram
      </span>
      {compact ? <FaInstagram className="size-7 lg:hidden" /> : null}
    </Link>
  );
}
