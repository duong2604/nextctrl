// auth.config.ts
// Tách riêng để dùng được trong Middleware (Edge Runtime)
// Middleware không dùng được Drizzle/Node.js adapter
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login", // redirect về đây nếu chưa login
    error: "/auth/error", // trang hiển thị lỗi auth
  },

  callbacks: {
    // Kiểm soát redirect sau login
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isAuthRoute = nextUrl.pathname.startsWith("/login");

      if (isAdminRoute) {
        if (!isLoggedIn) return false; // redirect về /login
        if (auth?.user?.role !== "admin") {
          return Response.redirect(new URL("/", nextUrl)); // không phải admin → về home
        }
        return true;
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl)); // đã login → về home
      }

      return true;
    },

    // Thêm thông tin vào JWT token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // thêm role vào token
      }
      return token;
    },

    // Thêm thông tin vào session
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Credentials provider định nghĩa trong auth.ts
    // vì cần Drizzle để query DB
  ],
};
