// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Dùng authConfig (không có Drizzle) để chạy trên Edge Runtime
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/admin/:path*", // bảo vệ toàn bộ /admin
    "/profile/:path*", // bảo vệ profile
    "/login", // redirect nếu đã login
    "/register",
  ],
};
