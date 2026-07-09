const SESSION_COOKIE = "eb_session";
const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30
  // 30 days
};
function setSessionCookie(cookies, sessionId) {
  cookies.set(SESSION_COOKIE, sessionId, COOKIE_OPTS);
}
function getSessionIdFromCookie(cookies) {
  return cookies.get(SESSION_COOKIE);
}
export {
  getSessionIdFromCookie as g,
  setSessionCookie as s
};
