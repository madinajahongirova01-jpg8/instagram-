import { FaInstagram } from 'react-icons/fa';
import { Heart, MessageCircle, Send, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const bubbles = [
  { Icon: Send, className: 'left-[2%] top-[14%]', delay: '0s' },
  { Icon: UserRound, className: 'right-[2%] top-[8%]', delay: '1.2s' },
  { Icon: Heart, className: 'left-0 top-[58%]', delay: '2.1s' },
  { Icon: MessageCircle, className: 'right-0 top-[46%]', delay: '0.6s' },
];

export function HeroPanel() {
  return (
    <div aria-hidden="true" className="hero-bg relative hidden items-center justify-center overflow-hidden md:flex">
      <div className="hero-glow absolute -inset-1/4 animate-hero-drift" />
      <div className="relative h-[340px] w-[360px]">
        {bubbles.map(({ Icon, className, delay }) => (
          <div
            key={className}
            className={cn(
              'animate-float hero-bubble absolute flex size-16 items-center justify-center rounded-full shadow-lg shadow-black/10',
              className,
            )}
            style={{ animationDelay: delay }}
          >
            <Icon className="size-7 fill-hero-foreground text-hero-foreground" strokeWidth={1.5} />
          </div>
        ))}
        <div className="hero-badge absolute left-1/2 top-0 flex size-52 -translate-x-1/2 items-center justify-center rounded-full shadow-2xl shadow-black/20">
          <FaInstagram className="size-28 text-hero-foreground drop-shadow-lg" />
        </div>
        <div className="hero-base absolute bottom-6 left-1/2 h-12 w-60 -translate-x-1/2 rounded-[50%] shadow-xl shadow-black/20" />
      </div>
    </div>
  );
}
