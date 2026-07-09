import { g as getContext, a as attr, f as stringify, d as derived, h as store_get, u as unsubscribe_stores } from "../../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "clsx";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const sessionId = derived(() => store_get($$store_subs ??= {}, "$page", page).params.sessionId);
    $$renderer2.push(`<div class="header"><div class="logo">ELASTIC <span>BANGALORE</span></div> <div style="display:flex;align-items:center;gap:1rem;font-size:0.9rem">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <a${attr("href", `/workshop/${stringify(sessionId())}/setup`)} class="btn btn-secondary" style="text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem">Elastic setup</a> <a href="/" class="btn btn-secondary" style="text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem">Exit</a></div></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="container" style="padding:3rem;text-align:center;color:var(--muted)">Loading workshop…</div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
