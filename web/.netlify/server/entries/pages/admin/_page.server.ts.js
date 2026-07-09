import { i as isAdminAuthed } from "../../../chunks/auth.js";
const load = async ({ cookies }) => {
  return { authed: isAdminAuthed(cookies) };
};
export {
  load
};
