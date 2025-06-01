// /c/Users/hp/desktop/clerk-webhooks/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/protected(.*)',
  '/dashboard(.*)', // Protect dashboard
  '/employees(.*)', // Protect employees
  '/assets(.*)',    // Protect assets
  '/roles(.*)',     // Protect roles
  '/reports(.*)',   // Protect reports (if you add this page)
  '/settings(.*)',  // Protect settings (if you add this page)
  '/api/me(.*)'     // Keep existing protected API routes
]);

// Also make the Clerk webhooks route public
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)' // Ensure webhook is public
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return; // Do not protect public routes
  }
  if (isProtectedRoute(req)) {
    await auth.protect();
    return;
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
}