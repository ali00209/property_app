import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-change-me",
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAuth = pathname === "/login" || pathname === "/register";
  const isApiUpload = pathname.startsWith("/api/uploads/");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let authenticated = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  if (isAuth && authenticated) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
  }

  if (isDashboard && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isApiUpload && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/api/uploads/:path*"],
};
