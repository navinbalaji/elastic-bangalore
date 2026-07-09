import { a as attr, e as escape_html } from "../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let name = "";
    let loading = false;
    $$renderer2.push(`<div class="header"><div class="logo">ELASTIC <span>BANGALORE</span></div> <a href="/admin" class="btn btn-secondary" style="text-decoration:none;font-size:0.875rem">Admin</a></div> <main class="container" style="max-width:560px;padding-top:4rem">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="card" style="text-align:center"><h1 style="margin:0 0 0.5rem;font-size:1.75rem">Workshop Lab</h1> <p style="color:var(--muted);margin:0 0 1.5rem">Agentic Workflows &amp; Searchable Applications with Elasticsearch, Jina, and A2A</p> <form style="text-align:left"><label class="label" for="name">Your name</label> <input id="name" class="input" type="text" placeholder="e.g. Navin"${attr("value", name)} autocomplete="name" required="" minlength="2"/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn btn-primary" type="submit"${attr("disabled", loading, true)} style="width:100%;margin-top:1.25rem">${escape_html("Enter workshop")}</button></form></div> <p style="text-align:center;color:var(--muted);font-size:0.875rem;margin-top:1.5rem">Your progress is tied to this browser (local storage). Elastic credentials also stay in this
		browser only.</p></main>`);
  });
}
export {
  _page as default
};
