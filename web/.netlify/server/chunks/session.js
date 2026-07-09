import { A as ALL_STEPS } from "./steps.js";
function statesToJson(states) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return states.map((st) => ({
    stepId: st.step.id,
    status: st.status,
    reason: st.reason,
    marked: st.marked,
    verifiedAt: st.status === "pass" ? now : null,
    updatedAt: now
  }));
}
function jsonToStates(json) {
  const byId = new Map(json.map((j) => [j.stepId, j]));
  return ALL_STEPS.map((step) => {
    const saved = byId.get(step.id);
    return {
      step,
      status: saved?.status ?? "pending",
      reason: saved?.reason ?? "",
      marked: saved?.marked ?? false
    };
  });
}
export {
  jsonToStates as j,
  statesToJson as s
};
