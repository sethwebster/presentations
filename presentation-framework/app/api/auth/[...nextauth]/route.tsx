import { handlers, auth, authOptions } from '@/lib/auth.config';

console.log('[NextAuth] Route handlers initialized');

export const GET = handlers.GET;
export const POST = handlers.POST;

// Export auth and authOptions for use in other parts of the app
export { auth, authOptions };
