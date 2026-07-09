import * as server from '../entries/pages/admin/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.BeiE4DLe.js","_app/immutable/chunks/Dq2AAGkP.js","_app/immutable/chunks/1y-_6oB9.js","_app/immutable/chunks/DsBketEV.js","_app/immutable/chunks/xPE5xD44.js","_app/immutable/chunks/cuytnhZq.js","_app/immutable/chunks/26J-EZ4K.js","_app/immutable/chunks/CehGfz5k.js","_app/immutable/chunks/CHX0T0en.js"];
export const stylesheets = [];
export const fonts = [];
