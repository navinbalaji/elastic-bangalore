import { a as attr, e as escape_html, b as attr_class, c as ensure_array_like, d as derived } from "../../../chunks/index.js";
import { M as MODULE_ORDER } from "../../../chunks/steps.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let password = "";
    let loading = false;
    let participants = [];
    let doubts = [];
    let blinking = {};
    let activeTab = "progress";
    let activeModuleIndex = 0;
    let refreshing = false;
    const moduleRosters = derived(() => buildModuleRosters(participants));
    const activeRoster = derived(() => moduleRosters()[activeModuleIndex] ?? null);
    function buildModuleRosters(list) {
      return MODULE_ORDER.map((moduleName, index) => {
        const shortName = moduleName.split(" — ")[0] ?? moduleName;
        const complete = [];
        const inProgress = [];
        const notStarted = [];
        const failed = [];
        for (const p of list) {
          const mod = p.modules[index];
          if (!mod) continue;
          const entry = {
            sessionId: p.sessionId,
            name: p.name,
            userKey: p.userKey,
            passed: mod.passed,
            total: mod.total,
            percent: mod.percent,
            complete: mod.complete,
            hasFailed: mod.hasFailed,
            inProgress: mod.passed > 0 && !mod.complete && !mod.hasFailed,
            stuckAt: p.stuckAt
          };
          if (mod.hasFailed) failed.push(entry);
          else if (mod.complete) complete.push(entry);
          else if (mod.passed > 0) inProgress.push(entry);
          else notStarted.push(entry);
        }
        const sortByStuckThenName = (a, b) => {
          if (a.stuckAt && !b.stuckAt) return -1;
          if (!a.stuckAt && b.stuckAt) return 1;
          return a.name.localeCompare(b.name);
        };
        complete.sort(sortByStuckThenName);
        inProgress.sort((a, b) => {
          if (a.stuckAt && !b.stuckAt) return -1;
          if (!a.stuckAt && b.stuckAt) return 1;
          return b.percent - a.percent || a.name.localeCompare(b.name);
        });
        notStarted.sort(sortByStuckThenName);
        failed.sort(sortByStuckThenName);
        return {
          module: moduleName,
          shortName,
          complete,
          inProgress,
          notStarted,
          failed
        };
      });
    }
    $$renderer2.push(`<div class="header"><div class="logo">ELASTIC <span>BANGALORE</span> — Admin</div> <a href="/" class="btn btn-secondary" style="text-decoration:none;font-size:0.875rem">Home</a></div> <main class="container" style="padding-top:2rem;max-width:1400px">`);
    if (!data.authed) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="card" style="max-width:400px;margin:0 auto"><h1 style="margin:0 0 1rem;font-size:1.25rem">Admin login</h1> <form><label class="label" for="pw">Password</label> <input id="pw" class="input" type="password"${attr("value", password)} required=""/> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button class="btn btn-primary" type="submit"${attr("disabled", loading, true)} style="margin-top:1rem">${escape_html("Login")}</button></form> <p style="font-size:0.8rem;color:var(--muted);margin:1rem 0 0">Set <code>ADMIN_PASSWORD</code> in your environment.</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem"><div><h1 style="margin:0">Workshop admin</h1> <p style="color:var(--muted);margin:0.25rem 0 0">${escape_html(participants.length)} participants · ${escape_html(doubts.length)} questions · questions refresh every 5s</p></div> <div style="display:flex;gap:0.5rem;align-items:center"><button class="btn btn-primary" type="button"${attr("disabled", refreshing, true)}>${escape_html("Refresh progress")}</button> <button class="btn btn-secondary">Logout</button></div></div> <div class="admin-tabs" role="tablist"><button type="button"${attr_class("admin-tab", void 0, { "active": activeTab === "progress" })} role="tab"${attr("aria-selected", activeTab === "progress")}>Module progress</button> <button type="button"${attr_class("admin-tab", void 0, { "active": activeTab === "questions" })} role="tab"${attr("aria-selected", activeTab === "questions")}>Questions `);
      if (doubts.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="admin-tab-badge">${escape_html(doubts.length)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button></div> `);
      {
        $$renderer2.push("<!--[0-->");
        if (participants.length === 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="card" style="text-align:center;color:var(--muted);padding:3rem">No participants yet</div>`);
        } else if (activeRoster()) {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`<div class="module-tabs" role="tablist" aria-label="Workshop modules"><!--[-->`);
          const each_array = ensure_array_like(moduleRosters());
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let roster = each_array[i];
            $$renderer2.push(`<button type="button"${attr_class("module-tab", void 0, { "active": activeModuleIndex === i })} role="tab"${attr("aria-selected", activeModuleIndex === i)}>${escape_html(roster.shortName)} <span style="opacity:0.7">(${escape_html(roster.complete.length)}/${escape_html(participants.length)})</span></button>`);
          }
          $$renderer2.push(`<!--]--></div> <section class="module-roster"><div class="module-roster-header"><div><h2>${escape_html(activeRoster().module)}</h2> <p style="margin:0.35rem 0 0;font-size:0.85rem;color:var(--muted)">Who has completed this module and who is still working on it</p></div> <div class="module-roster-stats"><span class="roster-stat complete">${escape_html(activeRoster().complete.length)} completed</span> <span class="roster-stat in-progress">${escape_html(activeRoster().inProgress.length)} in progress</span> <span class="roster-stat not-started">${escape_html(activeRoster().notStarted.length)} not started</span> `);
          if (activeRoster().failed.length > 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="roster-stat failed">${escape_html(activeRoster().failed.length)} failed</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div></div> <div class="roster-groups"><div class="roster-group complete"><h3 class="roster-group-title">Completed (${escape_html(activeRoster().complete.length)})</h3> `);
          if (activeRoster().complete.length === 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<p class="roster-empty">No one has completed this module yet</p>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="roster-names"><!--[-->`);
            const each_array_1 = ensure_array_like(activeRoster().complete);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let entry = each_array_1[$$index_1];
              $$renderer2.push(`<div${attr_class("roster-name-row", void 0, { "stuck": !!entry.stuckAt })}><span class="roster-name">${escape_html(entry.name)}</span> <span class="roster-name-meta">${escape_html(entry.passed)}/${escape_html(entry.total)}</span></div>`);
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div> <div class="roster-group in-progress"><h3 class="roster-group-title">In progress (${escape_html(activeRoster().inProgress.length)})</h3> `);
          if (activeRoster().inProgress.length === 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<p class="roster-empty">No one is currently on this module</p>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="roster-names"><!--[-->`);
            const each_array_2 = ensure_array_like(activeRoster().inProgress);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let entry = each_array_2[$$index_2];
              $$renderer2.push(`<div${attr_class("roster-name-row", void 0, { "stuck": !!entry.stuckAt })}><div><div${attr_class("roster-name", void 0, { "stuck-blink": !!entry.stuckAt })}>${escape_html(entry.name)}</div> `);
              if (entry.stuckAt) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<div style="font-size:0.72rem;color:var(--warning);margin-top:0.15rem">Needs help</div>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></div> <div style="display:flex;align-items:center;gap:0.4rem"><span class="roster-name-meta">${escape_html(entry.passed)}/${escape_html(entry.total)} · ${escape_html(entry.percent)}%</span> `);
              if (entry.stuckAt) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<button type="button" class="btn-blink"${attr("disabled", blinking[entry.sessionId], true)}>${escape_html(blinking[entry.sessionId] ? "…" : "Blink")}</button>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></div></div>`);
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div> <div class="roster-group"><h3 class="roster-group-title">Not started (${escape_html(activeRoster().notStarted.length)})</h3> `);
          if (activeRoster().notStarted.length === 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<p class="roster-empty">Everyone has started this module</p>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="roster-names"><!--[-->`);
            const each_array_3 = ensure_array_like(activeRoster().notStarted);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let entry = each_array_3[$$index_3];
              $$renderer2.push(`<div${attr_class("roster-name-row", void 0, { "stuck": !!entry.stuckAt })}><span class="roster-name">${escape_html(entry.name)}</span> <span class="roster-name-meta">0/${escape_html(entry.total)}</span></div>`);
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div> `);
          if (activeRoster().failed.length > 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<div class="roster-group failed"><h3 class="roster-group-title">Failed steps (${escape_html(activeRoster().failed.length)})</h3> <div class="roster-names"><!--[-->`);
            const each_array_4 = ensure_array_like(activeRoster().failed);
            for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
              let entry = each_array_4[$$index_4];
              $$renderer2.push(`<div${attr_class("roster-name-row", void 0, { "stuck": !!entry.stuckAt })}><div><div class="roster-name">${escape_html(entry.name)}</div> `);
              if (entry.stuckAt) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<div style="font-size:0.72rem;color:var(--warning);margin-top:0.15rem">Needs help</div>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></div> <div style="display:flex;align-items:center;gap:0.4rem"><span class="roster-name-meta">${escape_html(entry.passed)}/${escape_html(entry.total)}</span> `);
              if (entry.stuckAt) {
                $$renderer2.push("<!--[0-->");
                $$renderer2.push(`<button type="button" class="btn-blink"${attr("disabled", blinking[entry.sessionId], true)}>${escape_html(blinking[entry.sessionId] ? "…" : "Blink")}</button>`);
              } else {
                $$renderer2.push("<!--[-1-->");
              }
              $$renderer2.push(`<!--]--></div></div>`);
            }
            $$renderer2.push(`<!--]--></div></div>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div></section>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
