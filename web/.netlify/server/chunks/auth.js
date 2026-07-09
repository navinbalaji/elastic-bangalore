import { b as private_env } from "./shared-server.js";
const COOKIE = "admin_session";
function isAdminAuthed(cookies) {
  const token = cookies.get(COOKIE);
  const password = private_env.ADMIN_PASSWORD ?? "change-me";
  return token === hashPassword(password);
}
function adminCookieValue() {
  const password = private_env.ADMIN_PASSWORD ?? "change-me";
  return hashPassword(password);
}
const ADMIN_COOKIE_NAME = COOKIE;
function hashPassword(password) {
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = Math.imul(31, h) + password.charCodeAt(i) | 0;
  }
  return `admin_${h >>> 0}`;
}
export {
  ADMIN_COOKIE_NAME as A,
  adminCookieValue as a,
  isAdminAuthed as i
};
