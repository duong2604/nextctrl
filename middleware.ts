// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// ✅ Chỉ 1 hàm middleware duy nhất
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Use case 1: Authentication Guard ──────────────────
  const protectedRoutes = ["/dashboard", "/profile", "/settings"];
  const authRoutes = ["/login", "/register"];

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Lấy token từ cookie — thực tế dùng cookie, không phải Authorization header
  // vì middleware không nhận được body, chỉ headers và cookies
  const token = request.cookies.get("token")?.value;

  if (isProtected && !token) {
    // Chưa login → vào trang protected → redirect /login
    // Lưu lại URL để sau login redirect đúng chỗ
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && token) {
    // Đã login → vào /login hoặc /register → redirect /dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Use case 2: Localization ───────────────────────────
  if (
    pathname.startsWith("/products") &&
    !pathname.startsWith("/vi") &&
    !pathname.startsWith("/en")
  ) {
    // Parse Accept-Language header đúng cách
    // Header thực tế: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
    const acceptLang = request.headers.get("accept-language") ?? "";
    const lang = acceptLang.split(",")[0].split("-")[0].toLowerCase();
    const supportedLangs = ["vi", "en"];
    const detectedLang = supportedLangs.includes(lang) ? lang : "en";

    return NextResponse.redirect(
      new URL(`/${detectedLang}${pathname}`, request.url),
    );
  }

  // ── Use case 3: Rate Limiting ──────────────────────────
  if (pathname.startsWith("/api")) {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const isRateLimited = checkRateLimit(ip); // logic bên dưới

    if (isRateLimited) {
      return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }
  }

  // Không có điều kiện nào match → cho request đi tiếp
  return NextResponse.next();
}

// Rate limiting đơn giản với Map — lưu trong memory
// Thực tế dùng Redis hoặc Upstash cho production
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 phút
  const limit = 100;

  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    // Chưa có record hoặc đã qua window → reset
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return false; // chưa bị limit
  }

  if (record.count >= limit) {
    return true; // đã vượt limit
  }

  record.count++;
  return false;
}

// Matcher — chỉ chạy middleware trên các route cần thiết
// Bỏ qua: static files, _next, favicon
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/products/:path*",
    "/api/:path*",
  ],
};
