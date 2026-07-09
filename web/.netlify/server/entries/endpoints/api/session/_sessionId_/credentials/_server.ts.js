import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { v as validateConfig, V as VerifyClient } from "../../../../../../chunks/client.js";
const PUT = async ({ params, request }) => {
  const [existing] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  if (!existing) error(404, "Session not found");
  const body = await request.json();
  const apiKey = String(body.apiKey ?? "").trim();
  if (!apiKey) return json({ error: "API key is required" }, { status: 400 });
  const config = {
    elasticsearchUrl: String(body.elasticsearchUrl ?? "").trim() || void 0,
    apiKey,
    kibanaUrl: String(body.kibanaUrl ?? "").trim()
  };
  const err = validateConfig(config);
  if (err) return json({ error: err }, { status: 400 });
  const client = new VerifyClient(config);
  try {
    await client.validateConnection();
  } catch (e) {
    return json({ error: `Elasticsearch connection failed: ${e}` }, { status: 400 });
  }
  return json({ ok: true });
};
export {
  PUT
};
