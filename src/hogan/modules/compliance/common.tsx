/* Compliance: shared notice and human-decision helpers. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, addDays, date } from "../../fmt";
import { addTask, getState, log, setQxStatus, setTaskStatus, toast, useUi } from "../../store";
import { Btn, I, Icon, Notice } from "../../ui";
import { DOC_KEY, type DocState, type DocView } from "./model";

/** The regulatory status notice shown on every Compliance tab. */
export function RegNotice({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  return (
    <Notice tone="warn" icon={I.shield} title="Design reference only: not certified, validated or regulator-approved"
      right={compact ? <Btn size="sm" kind="ghost" onClick={() => setOpen(!open)}>{open ? "Less" : "More"}</Btn> : undefined}>
      {open ? (
        <span>
          This demonstration frontend is not certified, validated or approved by any regulator, and it is not automatically GDPR-compliant.
          A production system would need a validated implementation and expert regulatory and data-protection review.
          EU MDR (Regulation (EU) 2017/745, distributor obligations in Article 14) and HPRA guidance for distributors were used as design inputs only.
          No patient-level data is held: usage is recorded by date and hospital. All records shown are fictional demo data.
        </span>
      ) : <span>Not automatically GDPR-compliant; production use needs a validated implementation and expert review. EU MDR Article 14 and HPRA distributor guidance are design inputs only. Fictional data, no patient-level data.</span>}
    </Notice>
  );
}

export function useDocState(): [DocState, (st: DocState) => void] {
  return useUi<DocState>(DOC_KEY, {});
}

export type DocAction = "review" | "request" | "received";

/** The decisions available for a document in its current state. */
export function docActions(d: DocView): { a: DocAction; label: string; primary?: boolean }[] {
  const sup = d.supplier ? D.supplierById(d.supplier)?.name || "supplier" : "";
  const owner = D.staffById(d.owner)?.first || d.owner;
  if (d.status === "Missing") return [{ a: "received", label: "Record copy received as John Culkin", primary: true }, { a: "request", label: "Request from " + sup }];
  if (d.status === "Expiring") return [{ a: "received", label: "Record renewed copy as John Culkin", primary: true }, { a: "request", label: "Request renewal from " + sup }];
  if (d.status === "Review due" || d.status === "Draft") return [{ a: "review", label: "Mark reviewed as John Culkin", primary: true }, { a: "request", label: d.supplier ? "Request update from " + sup : "Request update from " + owner }];
  return [{ a: "review", label: "Record a fresh review as John Culkin" }];
}

/** Applies a document decision: always a named human decision, always logged. */
export function runDocAction(d: DocView, a: DocAction, st: DocState, setSt: (s: DocState) => void) {
  const prev = st[d.id] || {};
  const closeTasks = () => getState().tasks.filter(t => t.related?.id === d.id && t.status !== "Done").forEach(t => setTaskStatus(t.id, "Done"));
  if (a === "review") {
    const next = addDays(TODAY, 365);
    setSt({ ...st, [d.id]: { ...prev, status: "Current", reviewed: TODAY, nextReview: next } });
    log({ stream: "people", actor: "John Culkin", title: "Reviewed " + d.id + ": " + d.title, note: "Marked current. Next review " + date(next) + ". Human decision recorded.", status: "completed", ref: d.id, refType: "doc" });
    closeTasks();
    toast(d.id + " marked reviewed by John Culkin. Next review " + date(next) + ".");
    return;
  }
  if (a === "received") {
    const next = addDays(TODAY, d.kind === "CE certificate" ? 730 : 365);
    setSt({ ...st, [d.id]: { ...prev, status: "Current", reviewed: TODAY, nextReview: next, version: "Copy received " + date(TODAY) } });
    log({ stream: "people", actor: "John Culkin", title: "Recorded " + (d.status === "Expiring" ? "renewed " : "") + d.kind.toLowerCase() + " for " + d.id, note: d.title + ". Copy checked and filed. Human decision recorded; demo only, no document system connected.", status: "completed", ref: d.id, refType: "doc" });
    closeTasks();
    toast(d.id + " recorded as received and reviewed by John Culkin.");
    return;
  }
  const open = getState().tasks.find(t => t.related?.id === d.id && t.status !== "Done");
  setSt({ ...st, [d.id]: { ...prev, requested: TODAY } });
  if (open) {
    log({ stream: "people", actor: "John Culkin", title: "Chased " + d.id + " again", note: "Follow-up already open as " + open.id + ".", status: "awaiting", ref: d.id, refType: "doc" });
    toast("Already requested: " + open.id + " is open for " + (D.staffById(open.owner)?.name || open.owner) + ". Chase logged.", "info");
    return;
  }
  const sup = d.supplier ? D.supplierById(d.supplier)?.name || "" : "";
  const owner: D.StaffId = d.supplier ? "JC" : d.owner;
  const tid = addTask({ title: d.supplier ? "Chase " + sup + ": " + d.title : "Update " + d.title, owner, due: addDays(TODAY, 7), priority: d.status === "Missing" ? "High" : "Medium", dept: "Compliance",
    related: { type: "doc", id: d.id, label: d.id + " · " + d.title }, status: "Not started", createdBy: "JC" });
  log({ stream: "people", actor: "John Culkin", title: "Requested " + (d.supplier ? "document from " + sup : "update to " + d.id), note: d.title + ". Task " + tid + " for " + (D.staffById(owner)?.name || owner) + ". Demo: nothing sent.", status: "awaiting", ref: d.id, refType: "doc" });
  toast("Request logged: task " + tid + " for " + (D.staffById(owner)?.name || owner) + ". Nothing is sent from the demo.", "info");
}

/** Exception status change: a named human decision. */
export function setQx(id: string, status: D.QualityException["status"]) {
  setQxStatus(id, status, "JC");
  toast(id + (status === "Closed" ? " closed by John Culkin." : status === "In review" ? " moved to review." : " reopened."), status === "Closed" ? "ok" : "info");
}

export function CheckIcon({ ok }: { ok: boolean | null }) {
  const c = ok === null ? "var(--warn)" : ok ? "var(--ok)" : "var(--bad)";
  return (
    <span style={{ width: 20, height: 20, borderRadius: 7, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: ok === null ? "var(--warn-soft)" : ok ? "var(--ok-soft)" : "var(--bad-soft)", color: c }}>
      <Icon d={ok === null ? I.clock : ok ? I.check : I.x} size={11} stroke={2.4} />
    </span>
  );
}
