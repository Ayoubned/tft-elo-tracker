import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "tft_admin_session";
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

function adminSecret() {
  return process.env.ADMIN_SECRET || "";
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(value: string) {
  return createHmac("sha256", adminSecret()).update(value).digest("base64url");
}

export function verifyAdminPassword(supplied: string) {
  const expected = adminSecret();
  return Boolean(expected && supplied && safeEqual(expected, supplied));
}

export function createAdminSessionToken() {
  if (!adminSecret()) throw new Error("ADMIN_SECRET is not configured.");
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `${expiresAt}.${randomBytes(24).toString("base64url")}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function isAdminRequest(request: NextRequest) {
  const secret = adminSecret();
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!secret || !token) return false;

  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return false;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const [expiresAtText, nonce, extraPayload] = payload.split(".");
  const expiresAt = Number(expiresAtText);
  if (!nonce || extraPayload || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(sign(payload), suppliedSignature);
}
