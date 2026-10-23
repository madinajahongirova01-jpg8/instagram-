import { ConfigService } from '@nestjs/config';
import { MediaUrlService } from './media-url.service';

describe('MediaUrlService', () => {
  const service = new MediaUrlService(new ConfigService({ MEDIA_URL_SECRET: 'x'.repeat(40) }));
  const mediaId = '11111111-1111-4111-8111-111111111111';

  function parse(url: string): { exp: number; sig: string } {
    const params = new URL(url, 'http://localhost').searchParams;
    return { exp: Number(params.get('exp')), sig: params.get('sig') as string };
  }

  it('signs a url that verifies', () => {
    const { exp, sig } = parse(service.sign(mediaId));
    expect(service.verify(mediaId, exp, sig)).toBe(true);
  });

  it('rejects a signature for another media id', () => {
    const { exp, sig } = parse(service.sign(mediaId));
    expect(service.verify('22222222-2222-4222-8222-222222222222', exp, sig)).toBe(false);
  });

  it('rejects a changed expiry', () => {
    const { exp, sig } = parse(service.sign(mediaId));
    expect(service.verify(mediaId, exp + 3600, sig)).toBe(false);
  });

  it('rejects an expired link', () => {
    const now = Date.now();
    const { exp, sig } = parse(service.sign(mediaId, now));
    expect(service.verify(mediaId, exp, sig, exp * 1000 + 1)).toBe(false);
  });

  it('gives the same url within one hour so browsers can cache it', () => {
    const base = Date.UTC(2026, 0, 1, 10, 5);
    expect(service.sign(mediaId, base)).toBe(service.sign(mediaId, base + 30 * 60 * 1000));
  });

  it('is valid for at least one hour', () => {
    const now = Date.UTC(2026, 0, 1, 10, 59, 59);
    const { exp } = parse(service.sign(mediaId, now));
    expect(exp * 1000 - now).toBeGreaterThanOrEqual(60 * 60 * 1000);
  });
});
