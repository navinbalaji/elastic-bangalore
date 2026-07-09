import * as server from '../entries/pages/workshop/_sessionId_/_page.server.ts.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/workshop/_sessionId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/workshop/[sessionId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/4.D6jFHCTR.js","_app/immutable/chunks/Dq2AAGkP.js","_app/immutable/chunks/1y-_6oB9.js","_app/immutable/chunks/DsBketEV.js","_app/immutable/chunks/xPE5xD44.js","_app/immutable/chunks/D6BERlYk.js","_app/immutable/chunks/CuptgcrW.js","_app/immutable/chunks/cuytnhZq.js","_app/immutable/chunks/26J-EZ4K.js","_app/immutable/chunks/CehGfz5k.js","_app/immutable/chunks/CHX0T0en.js","_app/immutable/chunks/CNHio2Y9.js","_app/immutable/chunks/BDg7tD3J.js","_app/immutable/chunks/BGfpGaWW.js","_app/immutable/chunks/CDvUxAMp.js"];
export const stylesheets = [];
export const fonts = [];
