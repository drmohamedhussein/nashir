import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "nashir_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    return false;
  }
  const key = secretKey();
  if (!key) {
    return false;
  }
  try {
    const { payload } = await jwtVerify(token, key);
    return (
      typeof payload.id === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      typeof payload.workspaceId === "string"
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const valid = await hasValidSession(request);
  const isApp = request.nextUrl.pathname.startsWith("/app");
  const isAuth =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  if (isApp && !valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    const response = NextResponse.redirect(url);
    if (request.cookies.get(COOKIE)) {
      response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  if (isAuth && request.cookies.get(COOKIE) && !valid) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
