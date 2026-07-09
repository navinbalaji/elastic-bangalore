import { e as escape_html, a as attr } from "../../../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
const HELP_ELASTICSEARCH_URL = `Elasticsearch URL

1. Go to cloud.elastic.co
2. Open your project / deployment
3. Click Help (?) → Connection details
4. Endpoints tab → copy "Elasticsearch endpoint"

Example:
https://my-project-d9fc53.es.us-central1.gcp.elastic.cloud`;
const HELP_API_KEY = `API key (Encoded / base64)

1. Open Kibana (Elastic Cloud → Open Kibana)
2. Search bar → type "API keys"
3. Create API key → set privileges → Create
4. Copy the ENCODED key shown once (long base64 string)

Use in Authorization header as:
ApiKey <your-encoded-key>

Do NOT paste the API key into the Kibana URL field.`;
const HELP_KIBANA_URL = `Kibana URL

1. Go to cloud.elastic.co
2. Open your project / deployment
3. Click "Open Kibana" (or find Kibana under Applications)
4. Copy the browser URL base (no path after the host)

Example:
https://my-project-d9fc53.kb.us-central1.gcp.elastic.cloud:9243

Serverless: Help (?) → Connection details may list the Kibana endpoint.

Must start with https:// — this is NOT your API key.`;
const CREDENTIALS_DOCS_URL = "https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let elasticsearchUrl = "";
    let apiKey = "";
    let kibanaUrl = "";
    let loading = false;
    $$renderer2.push(`<div class="header"><div class="logo">ELASTIC <span>BANGALORE</span></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <main class="container" style="max-width:640px;padding-top:2rem"><div class="card"><h1 style="margin:0 0 0.5rem">${escape_html("Elastic Cloud setup")}</h1> <p style="color:var(--muted);margin:0 0 1.25rem">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Enter your Elastic Cloud credentials. They are saved only in this browser (local storage)
				and sent to Elastic for step verification — never stored on the workshop server.`);
    }
    $$renderer2.push(`<!--]--> <a${attr("href", CREDENTIALS_DOCS_URL)} target="_blank" rel="noopener noreferrer">Elastic connection docs</a></p> <div class="setup-mistakes"><strong style="color:var(--text)">Common mistakes</strong> <ul><li>Do not put the API key in the Kibana URL field</li> <li>Do not put an <code>https://…es…</code> URL in the API key field</li></ul></div> <form><div style="margin-bottom:1rem"><label class="label" for="esUrl">Elasticsearch URL</label> <details class="field-help"><summary>Where to find this</summary> <div class="field-help-body">${escape_html(HELP_ELASTICSEARCH_URL)}</div></details> <input id="esUrl" class="input"${attr("value", elasticsearchUrl)} placeholder="https://….es….elastic-cloud.com" required=""/></div> <div style="margin-bottom:1rem"><label class="label" for="apiKey">API key</label> <details class="field-help"><summary>Where to find this</summary> <div class="field-help-body">${escape_html(HELP_API_KEY)}`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></details> <input id="apiKey" class="input" type="password"${attr("value", apiKey)}${attr("placeholder", "Base64-encoded API key")}${attr("required", true, true)}/></div> <div style="margin-bottom:1rem"><label class="label" for="kibanaUrl">Kibana URL</label> <details class="field-help"><summary>Where to find this</summary> <div class="field-help-body">${escape_html(HELP_KIBANA_URL)}</div></details> <input id="kibanaUrl" class="input"${attr("value", kibanaUrl)} placeholder="https://….kb….elastic-cloud.com" required=""/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn btn-primary" type="submit"${attr("disabled", loading, true)}>${escape_html("Save & continue")}</button></form></div></main>`);
  });
}
export {
  _page as default
};
