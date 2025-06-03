// /c/Users/hp/desktop/clerk-webhooks/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)', // Clerk webhooks
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    // Allow access to public routes
    return;
  }
  // For all other routes, protect them.
  auth.protect();
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', // Matches all routes except static files and _next internal routes
    '/',                      // Ensure the root route is matched
    '/(api|trpc)(.*)',        // Matches all API routes
  ],
};