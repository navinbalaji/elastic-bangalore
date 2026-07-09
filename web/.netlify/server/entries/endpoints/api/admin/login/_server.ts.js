import { json } from "@sveltejs/kit";
import { A as ADMIN_COOKIE_NAME, a as adminCookieValue } from "../../../../../chunks/auth.js";
import { b as private_env } from "../../../../../chunks/shared-server.js";
const POST = async ({ request, cookies }) => {
  const body = await request.json();
  const password = String(body.password ?? "");
  const expected = private_env.ADMIN_PASSWORD ?? "change-me";
  if (password !== expected) {
    return json({ error: "Invalid password" }, { status: 401 });
  }
  cookies.set(ADMIN_COOKIE_NAME, adminCookieValue(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7
  });
  return json({ ok: true });
};
const DELETE = async ({ cookies }) => {
  cookies.delete(ADMIN_COOKIE_NAME, { path: "/" });
  return json({ ok: true });
};
export {
  DELETE,
  POST
};
