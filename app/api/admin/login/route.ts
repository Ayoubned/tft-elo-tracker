import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSessionToken, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const secret = typeof body.secret === "string" ? body.secret : "";
    if (!verifyAdminPassword(secret)) {
      return NextResponse.json({ error: "Incorrect admin code." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Could not start admin session." }, { status: 500 });
  }
}
