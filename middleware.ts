import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/api/auth");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isPublicRoute || !isDashboardRoute) {
    return;
  }

  if (!request.auth) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
