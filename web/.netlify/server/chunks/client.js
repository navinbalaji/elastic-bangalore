import { Client } from "@elastic/elasticsearch";
const ENGLISH_PROPERTY_QUERY = `FROM properties METADATA _score
| WHERE MATCH(body_content_jina, "House with direct beach access and nature walks")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| KEEP title, miles, _score
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10`;
const FRENCH_PROPERTY_QUERY = `FROM properties METADATA _score
| WHERE MATCH(body_content_jina, "Maison avec accès direct à la plage et balades en pleine nature")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| KEEP title, miles, _score
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10`;
const COMPLETION_QUERY = `FROM properties METADATA _id, _score
| WHERE MATCH(body_content_jina, "House with direct beach access and nature walks")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10
| EVAL prompt = CONCAT(
    "**Property details**\\n",
    "PropertyID: ", _id, "\\n",
    "Title: ", title, "\\n",
    "Description: ", \`property-description\`, "\\n",
    "Features: ", \`property-features\`, "\\n",
    "Distance from location: ", TO_STRING(miles), " miles\\n",
    "Score: ", TO_STRING(_score), "\\n\\n"
  )
| STATS combined = VALUES(prompt)
| COMPLETION outcome = CONCAT(
    "Based on the search for 'House with direct beach access and nature walks', which property is the best match and why? ",
    MV_CONCAT(combined, ", ")
  ) WITH {"inference_id": ".anthropic-claude-4.6-opus-completion"}
| KEEP outcome`;
function truncate(s, n) {
  s = s.replace(/\n/g, " ");
  return s.length <= n ? s : s.slice(0, n) + "...";
}
function authHint(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("403") || msg.includes("security_exception")) {
    return " (check API key privileges)";
  }
  return "";
}
function columnIndex(res, name) {
  return res.columns.findIndex((c) => c.name === name);
}
function hasTitleContaining(res, substr) {
  const idx = columnIndex(res, "title");
  if (idx < 0) return false;
  const needle = substr.toLowerCase();
  for (const row of res.values) {
    const title = String(row[idx] ?? "");
    if (title.toLowerCase().includes(needle)) return true;
  }
  return false;
}
function hasNonEmptyColumn(res, name) {
  const idx = columnIndex(res, name);
  if (idx < 0) return false;
  for (const row of res.values) {
    const val = row[idx];
    if (val != null && String(val).trim() !== "") return true;
  }
  return false;
}
function hitContent(hit) {
  const fields = hit.fields;
  if (!fields) return "";
  const content = fields.content;
  if (!content?.length) return "";
  return String(content[0] ?? "");
}
function topHitContent(result) {
  const hits = result.hits;
  const hitList = hits?.hits;
  if (!hitList?.length) return "";
  return hitContent(hitList[0]);
}
class VerifyClient {
  es;
  config;
  httpTimeout = 6e4;
  constructor(config) {
    this.config = config;
    const esConfig = {
      auth: { apiKey: config.apiKey }
    };
    if (config.elasticsearchUrl) {
      esConfig.node = config.elasticsearchUrl;
    } else if (config.cloudId) {
      esConfig.cloud = { id: config.cloudId };
    }
    this.es = new Client(esConfig);
  }
  async validateConnection() {
    await this.es.cluster.health();
  }
  async kibanaGet(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.httpTimeout);
    try {
      const res = await fetch(`${this.config.kibanaUrl}${path}`, {
        headers: {
          Authorization: `ApiKey ${this.config.apiKey}`,
          "kbn-xsrf": "true",
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      const body = await res.text();
      return { body, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  }
  async indexExists(index) {
    return this.es.indices.exists({ index });
  }
  async docCount(index) {
    const res = await this.es.count({ index });
    return res.count;
  }
  async getFieldProperty(index, field) {
    const res = await this.es.indices.getMapping({ index });
    const idx = res[index];
    const props = idx?.mappings?.properties;
    const prop = props?.[field];
    if (!prop) throw new Error(`field ${field} not found in mapping`);
    return prop;
  }
  async getMappingFieldType(index, field) {
    const prop = await this.getFieldProperty(index, field);
    const typ = prop.type;
    if (!typ) throw new Error(`field ${field} has no type`);
    return typ;
  }
  async getSemanticTextInferenceID(index, field) {
    const prop = await this.getFieldProperty(index, field);
    const inf = prop.inference_id;
    if (!inf) throw new Error(`field ${field} has no inference_id`);
    return inf;
  }
  async rawSearch(index, body) {
    const res = await this.es.search({ index, body });
    return res;
  }
  async rawInference(inferenceId, input) {
    const res = await this.es.transport.request({
      method: "POST",
      path: `/_inference/${inferenceId}`,
      body: { input }
    });
    return res;
  }
  async runESQL(query) {
    const res = await this.es.esql.query({ query });
    return res;
  }
  async indexExistsCheck(index) {
    try {
      const ok = await this.indexExists(index);
      if (!ok) return { pass: false, reason: `index "${index}" does not exist` };
      return { pass: true, reason: `index "${index}" exists` };
    } catch (err) {
      return { pass: false, reason: `check failed: ${err}${authHint(err)}` };
    }
  }
  async docCountCheck(index, want) {
    try {
      const count = await this.docCount(index);
      if (count !== want) {
        return { pass: false, reason: `expected ${want} documents, got ${count}` };
      }
      return { pass: true, reason: `${count} documents indexed` };
    } catch (err) {
      return { pass: false, reason: `count failed: ${err}${authHint(err)}` };
    }
  }
  async docCountAtLeast(index, min) {
    try {
      const count = await this.docCount(index);
      if (count < min) {
        return { pass: false, reason: `expected at least ${min} documents, got ${count}` };
      }
      return { pass: true, reason: `${count} document(s) found` };
    } catch (err) {
      return { pass: false, reason: `count failed: ${err}${authHint(err)}` };
    }
  }
  async fieldTypeCheck(index, field, want) {
    try {
      const typ = await this.getMappingFieldType(index, field);
      if (typ !== want) {
        return { pass: false, reason: `field "${field}" type is "${typ}", expected "${want}"` };
      }
      return { pass: true, reason: `field "${field}" is type "${typ}"` };
    } catch (err) {
      return { pass: false, reason: `mapping check failed: ${err}${authHint(err)}` };
    }
  }
  async kibanaResource(path, label) {
    try {
      const { body, status } = await this.kibanaGet(path);
      if (status === 403) {
        return { pass: false, reason: `403 forbidden — API key needs privileges for ${label}` };
      }
      if (status === 404) return { pass: false, reason: `${label} not found (404)` };
      if (status !== 200) {
        return { pass: false, reason: `${label} returned ${status}: ${truncate(body, 120)}` };
      }
      return { pass: true, reason: `${label} exists` };
    } catch (err) {
      return { pass: false, reason: `${label} check failed: ${err}` };
    }
  }
  async verify(stepId) {
    switch (stepId) {
      case "m1-embeddings": {
        try {
          const out = await this.rawInference(
            ".jina-embeddings-v5-text-small",
            "There is no reason anyone would want a computer in their home"
          );
          const emb = out.text_embedding;
          if (!emb?.length) {
            return { pass: false, reason: "text_embedding is empty" };
          }
          return { pass: true, reason: "Jina embedding endpoint returned vectors" };
        } catch (err) {
          return { pass: false, reason: `inference failed: ${err}${authHint(err)}` };
        }
      }
      case "m1-index":
        return this.indexExistsCheck("rerank-demo");
      case "m1-bulk":
        return this.docCountCheck("rerank-demo", 11);
      case "m1-mapping":
        return this.fieldTypeCheck("rerank-demo", "content", "text");
      case "m1-search": {
        try {
          const out = await this.rawSearch("rerank-demo", {
            size: 10,
            query: { match: { content: "Capital of the USA?" } },
            _source: false,
            fields: ["content"]
          });
          const hits = out.hits;
          const total = hits?.total;
          const value = total?.value ?? 0;
          if (value < 1) return { pass: false, reason: "search returned no hits" };
          return { pass: true, reason: `search returned ${value} hit(s)` };
        } catch (err) {
          return { pass: false, reason: `search failed: ${err}${authHint(err)}` };
        }
      }
      case "m1-rerank": {
        try {
          const out = await this.rawSearch("rerank-demo", {
            size: 10,
            retriever: {
              text_similarity_reranker: {
                retriever: {
                  standard: {
                    query: { match: { content: "What is the capital of the USA?" } }
                  }
                },
                field: "content",
                inference_id: ".jina-reranker-v3",
                inference_text: "What is the capital of the USA?",
                rank_window_size: 10,
                min_score: 0
              }
            },
            _source: false,
            fields: ["content"]
          });
          const top = topHitContent(out);
          if (!top.includes("Washington, D.C.")) {
            return { pass: false, reason: `top result is not Washington, D.C.: ${truncate(top, 80)}` };
          }
          return { pass: true, reason: "Washington, D.C. is the top reranked result" };
        } catch (err) {
          return { pass: false, reason: `rerank search failed: ${err}${authHint(err)}` };
        }
      }
      case "m2-verify-index": {
        const r = await this.indexExistsCheck("harrypotter");
        if (!r.pass) return r;
        try {
          const typ = await this.getMappingFieldType("harrypotter", "content_jina");
          if (typ !== "semantic_text") {
            return { pass: false, reason: `content_jina type is "${typ}", expected semantic_text` };
          }
          const inf = await this.getSemanticTextInferenceID("harrypotter", "content_jina");
          if (inf !== ".jina-embeddings-v5-text-small") {
            return {
              pass: false,
              reason: `inference_id is "${inf}", expected .jina-embeddings-v5-text-small`
            };
          }
        } catch (err) {
          return { pass: false, reason: `mapping check failed: ${err}` };
        }
        return this.docCountAtLeast("harrypotter", 1);
      }
      case "m3-verify-index": {
        const r = await this.indexExistsCheck("properties");
        if (!r.pass) return r;
        for (const [field, typ] of [
          ["body_content_jina", "semantic_text"],
          ["location", "geo_point"]
        ]) {
          const check = await this.fieldTypeCheck("properties", field, typ);
          if (!check.pass) return check;
        }
        return this.docCountAtLeast("properties", 1);
      }
      case "m3-english-search": {
        try {
          const res = await this.runESQL(ENGLISH_PROPERTY_QUERY);
          if (!hasTitleContaining(res, "1 E Scott Street")) {
            return { pass: false, reason: "1 E Scott Street not found in top 10 results" };
          }
          return { pass: true, reason: "English query returned 1 E Scott Street within 10mi" };
        } catch (err) {
          return { pass: false, reason: `ES|QL failed: ${err}${authHint(err)}` };
        }
      }
      case "m3-french-search": {
        try {
          const res = await this.runESQL(FRENCH_PROPERTY_QUERY);
          if (!hasTitleContaining(res, "1 E Scott Street")) {
            return { pass: false, reason: "1 E Scott Street not found in French query results" };
          }
          return {
            pass: true,
            reason: "French query returned same property (cross-language search works)"
          };
        } catch (err) {
          return { pass: false, reason: `ES|QL failed: ${err}${authHint(err)}` };
        }
      }
      case "m3-completion": {
        try {
          const res = await this.runESQL(COMPLETION_QUERY);
          if (!hasNonEmptyColumn(res, "outcome")) {
            return {
              pass: false,
              reason: "outcome column is empty — check Anthropic inference endpoint"
            };
          }
          return { pass: true, reason: "COMPLETION returned LLM outcome" };
        } catch (err) {
          return { pass: false, reason: `COMPLETION query failed: ${err}${authHint(err)}` };
        }
      }
      case "m4-verify-index":
        return this.docCountAtLeast("user_emails", 1);
      case "m4-verify-workflow": {
        try {
          const { body, status } = await this.kibanaGet("/api/workflows?size=100&page=1");
          if (status === 403) {
            return { pass: false, reason: "403 forbidden — API key needs workflowsManagement:read" };
          }
          if (status !== 200) {
            return { pass: false, reason: `workflows API returned ${status}: ${truncate(body, 120)}` };
          }
          const resp = JSON.parse(body);
          const want = "send-email-with-lookup";
          for (const wf of resp.results ?? []) {
            if (wf.name === want || wf.definition?.name === want) {
              return { pass: true, reason: `workflow "${want}" found` };
            }
          }
          return { pass: false, reason: `workflow "${want}" not found` };
        } catch (err) {
          return { pass: false, reason: `workflows API failed: ${err}` };
        }
      }
      case "m5-verify-tool-email":
        return this.kibanaResource("/api/agent_builder/tools/potter.send.email", "tool potter.send.email");
      case "m5-verify-tool-search":
        return this.kibanaResource("/api/agent_builder/tools/potter.chapter.5", "tool potter.chapter.5");
      case "m5-verify-skill":
        return this.kibanaResource(
          "/api/agent_builder/skills/ministry-of-magic",
          "skill ministry-of-magic"
        );
      case "m5-verify-agent": {
        try {
          const { body, status } = await this.kibanaGet("/api/agent_builder/agents/potter-answers");
          if (status !== 200) {
            return { pass: false, reason: `agent potter-answers returned ${status}` };
          }
          const raw = body.toLowerCase();
          for (const tool of ["potter.chapter.5", "potter.send.email"]) {
            if (!raw.includes(tool.toLowerCase())) {
              return { pass: false, reason: `agent missing tool "${tool}"` };
            }
          }
          return { pass: true, reason: "agent potter-answers exists with both tools" };
        } catch (err) {
          return { pass: false, reason: `agent check failed: ${err}` };
        }
      }
      case "m6-verify-agent-card": {
        try {
          const { body, status } = await this.kibanaGet(
            "/api/agent_builder/a2a/potter-answers.json"
          );
          if (status === 404) {
            return { pass: false, reason: "agent card not found — create potter-answers agent first" };
          }
          if (status !== 200) {
            return { pass: false, reason: `agent card returned ${status}: ${truncate(body, 120)}` };
          }
          const card = JSON.parse(body);
          if (!card || Object.keys(card).length === 0) {
            return { pass: false, reason: "agent card JSON is empty" };
          }
          return { pass: true, reason: "A2A agent card is reachable" };
        } catch (err) {
          return { pass: false, reason: `agent card check failed: ${err}` };
        }
      }
      default:
        return { pass: false, reason: "no verifier for this step" };
    }
  }
}
function validateConfig(cfg) {
  if (!cfg.apiKey?.trim()) return "API key is required";
  if (!cfg.kibanaUrl?.trim()) return "Kibana URL is required";
  if (!cfg.elasticsearchUrl?.trim()) {
    return "Elasticsearch URL is required";
  }
  if (!cfg.kibanaUrl.includes(".kb.") && !cfg.kibanaUrl.toLowerCase().includes("kibana")) {
    return "Kibana URL should look like https://....kb....elastic-cloud.com";
  }
  return null;
}
export {
  VerifyClient as V,
  validateConfig as v
};
