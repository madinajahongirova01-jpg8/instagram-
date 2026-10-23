export type RelativeUnit = 'justNow' | 'minutes' | 'hours' | 'days' | 'weeks';

export interface RelativeTime {
  unit: RelativeUnit;
  count: number;
}

export function relativeTime(iso: string, now: number = Date.now()): RelativeTime {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) {
    return { unit: 'justNow', count: 0 };
  }
  if (minutes < 60) {
    return { unit: 'minutes', count: minutes };
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return { unit: 'hours', count: hours };
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return { unit: 'days', count: days };
  }
  return { unit: 'weeks', count: Math.floor(days / 7) };
}
