// Re-export auth function from NextAuth route
// The route file is at app/api/auth/[...nextauth]/route.tsx (root level, not in src/)
// From src/lib/auth.ts, we need to go up two levels: ../../
export async function auth() {
  // Use dynamic import with relative path from src/lib to app (go up two levels to root)
  const routeModule = await import('../../app/api/auth/[...nextauth]/route');
  return routeModule.auth();
}

