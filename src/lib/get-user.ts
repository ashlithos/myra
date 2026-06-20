import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isDevOrPreview =
  process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

export async function getUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      if (isDevOrPreview) {
        return { id: "dev", name: "Dev User", email: "dev@localhost" };
      }
      return null;
    }
    return session.user;
  } catch {
    if (isDevOrPreview) {
      return { id: "dev", name: "Dev User", email: "dev@localhost" };
    }
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Sign in required" }, { status: 401 });
}
