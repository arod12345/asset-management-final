// /c/Users/hp/desktop/clerk-webhooks/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isAppRoute = createRouteMatcher([
  // Routes that require authentication
  '/dashboard(.*)',
  '/employees(.*)',
  '/assets(.*)',
  '/roles(.*)',
  '/reports(.*)',
  '/settings(.*)',
  '/api/(.*)', // Protect all API routes (webhooks are already excluded by isPublicRoute)
]);

// Public routes: landing page, sign-in/up, Clerk webhooks
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)', // Clerk webhooks
  // Add other public static pages if any, e.g., /pricing, /about
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    // Allow access to public routes
    return;
  }

  if (isAppRoute(req)) {
    // Protect app routes
    auth.protect();
  }
  // If it's not explicitly public or an app route, 
  // by default Clerk will protect it if no other rule matches.
  // Or, you can decide to make unmatched routes public or redirect.
  // For now, we assume any route not listed as public and not an app route should be protected.
  // If you have other specific public pages (e.g. /pricing, /about), add them to isPublicRoute.
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', // Matches all routes except static files and _next internal routes
    '/',                      // Ensure the root route is matched
    '/(api|trpc)(.*)',        // Matches all API routes
  ],
};