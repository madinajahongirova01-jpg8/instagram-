import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\.(?:ico|svg|png|jpe?g|webp|gif|txt|xml|json|webmanifest|js|css|map)).*)',
};
