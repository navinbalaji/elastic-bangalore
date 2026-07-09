import { s as setSessionCookie } from "../../../../chunks/session-cookie.js";
const load = async ({ params, cookies }) => {
  setSessionCookie(cookies, params.sessionId);
  return {};
};
export {
  load
};
