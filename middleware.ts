import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Constants for session management
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthRoute = ["/login", "/signup"].includes(req.nextUrl.pathname);
  const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard");

  // Check if session is valid and not expired
  const isSessionValid = session && new Date(session.expires_at) > new Date();

  // Check for session inactivity
  let isSessionActive = true;
  if (session) {
    // Get last activity from cookies or use session creation time as fallback
    const lastActivityStr = req.cookies.get('last_activity')?.value;
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : new Date(session.created_at).getTime();
    const now = Date.now();

    // Check if session is inactive
    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      isSessionActive = false;
    } else {
      // Update last activity in cookies
      res.cookies.set('last_activity', now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
    }
  }

  // If user is already logged in and on an auth route, redirect to dashboard
  if (isSessionValid && isSessionActive && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is not logged in or session is expired/inactive and trying to access a protected route, redirect to login
  if ((!isSessionValid || !isSessionActive) && !isAuthRoute) {
    // Clear any existing session cookies
    res.cookies.delete('last_activity');

    // Sign out the user on the server side
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*", // Protect dashboard and its subroutes
    "/profile/:path*", // Protect profile routes
    "/settings/:path*", // Protect settings
  ],
};
