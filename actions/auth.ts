// actions/auth.ts
"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/index";
import { users } from "@/db/schema";
import { RegisterSchema, LoginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";

// Đăng ký
export async function register(prevState: any, formData: FormData) {
  const validated = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      error: "Dữ liệu không hợp lệ",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validated.data;

  // Check email đã tồn tại chưa
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return { error: "Email đã được sử dụng" };

  // Hash password — KHÔNG lưu plain text
  const hashedPassword = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
    role: "user",
  });

  // Tự động login sau khi đăng ký
  await signIn("credentials", { email, password, redirectTo: "/" });
}

// Đăng nhập Email/Password
export async function loginWithCredentials(prevState: any, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email hoặc mật khẩu không đúng" };
        default:
          return { error: "Đã có lỗi xảy ra" };
      }
    }
    throw error; // re-throw để Next.js xử lý redirect
  }
}

// Đăng nhập Google
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

// Đăng xuất
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
