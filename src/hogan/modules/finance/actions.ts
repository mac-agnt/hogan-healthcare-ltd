/* ─────────────────────────────────────────────────────────────────────────────
   Finance actions that the shared store does not cover.

   Every one of these is an explicit human action (Margaret or Graham) and is
   written to the audit log. None of them posts to an accounting system, sends
   an email or moves money: this is demo state only.
   ───────────────────────────────────────────────────────────────────────────── */

import * as D from "../../data";
import { addTask, getState, log, matchBank, patch, setBankState, setBillStatus, toast } from "../../store";
import { TODAY, addDays, eur } from "../../fmt";
import { accName } from "./derive";

const who = (id: D.StaffId) => D.staffById(id)?.name || id;

/** Margaret logs reminders against several overdue invoices at once. Nothing is emailed in the demo. */
export function sendReminders(ids: string[], by: D.StaffId = "MD") {
  const list = getState().invoices.filter(i => ids.includes(i.id) && i.status !== "Paid");
  if (!list.length) return;
  patch(s => ({ invoices: s.invoices.map(i => (list.some(x => x.id === i.id) ? { ...i, reminders: i.reminders + 1, lastReminder: TODAY } : i)) }));
  list.forEach(inv => log({ stream: "people", actor: who(by), title: "Reminder sent for " + inv.id, note: accName(inv.account) + " · " + eur(inv.amount) + " · reminder " + (inv.reminders + 1) + ". Demo: no email actually sent.", status: "completed", ref: inv.id, refType: "invoice" }));
  toast(list.length + " reminder" + (list.length === 1 ? "" : "s") + " logged (demo, nothing sent).");
}

/** Margaret matches every suggested bank line at or above a confidence threshold. One click, still her decision. */
export function matchHighConfidence(min = 90) {
  const list = getState().bank.filter(t => t.state === "Suggested match" && (t.confidence || 0) >= min && t.suggest);
  list.forEach(t => matchBank(t.id, t.suggest));
  return list.length;
}

/** Margaret rejects a suggested match. The line goes back to the manual queue with no suggestion. */
export function rejectSuggestion(txnId: string, by: D.StaffId = "MD") {
  const t = getState().bank.find(x => x.id === txnId);
  if (!t) return;
  patch(s => ({ bank: s.bank.map(x => (x.id === txnId ? { ...x, state: "Unmatched", suggest: undefined, confidence: undefined, note: "Suggested match " + (t.suggest || "") + " rejected by " + who(by) + ". Needs a manual match." } : x)) }));
  log({ stream: "people", actor: who(by), title: "Rejected suggested match on " + txnId, note: (t.suggest || "") + " · " + eur(t.amount) + ". Line returned to the manual queue.", status: "completed", ref: txnId, refType: "bank" });
  toast(txnId + " back in the manual queue.", "info");
}

/** A credit that covers only part of an invoice: noted against it, allocation left to the accounting system. */
export function notePartPayment(txnId: string, invId: string, by: D.StaffId = "MD") {
  const s = getState();
  const t = s.bank.find(x => x.id === txnId), inv = s.invoices.find(x => x.id === invId);
  if (!t || !inv) return;
  const note = "Part payment of " + eur(t.amount) + " noted against " + invId + ". Balance " + eur(inv.amount - t.amount) + " still open. Allocate in the accounting system.";
  patch(x => ({ bank: x.bank.map(b => (b.id === txnId ? { ...b, state: "Matched", suggest: invId, note } : b)) }));
  log({ stream: "people", actor: who(by), title: "Part payment noted on " + invId, note: txnId + " · " + eur(t.amount) + " of " + eur(inv.amount) + ". Demo state only: nothing posted to accounting.", status: "completed", ref: invId, refType: "invoice" });
  toast(eur(t.amount) + " noted against " + invId + ". Invoice stays open for the balance.", "info");
}

/** Flags a line for review with a reason. */
export function flagBankLine(txnId: string, reason: string, by: D.StaffId = "MD") {
  setBankState(txnId, "Exception", reason);
  log({ stream: "people", actor: who(by), title: "Flagged bank line " + txnId, note: reason, status: "awaiting", ref: txnId, refType: "bank" });
  toast(txnId + " flagged for review.", "info");
}

/** Codes a card or direct debit to an expense line. Recorded here; the posting is made in the accounts. */
export function codeBankLine(txnId: string, code: string, by: D.StaffId = "MD") {
  const t = getState().bank.find(x => x.id === txnId);
  if (!t) return;
  setBankState(txnId, "Matched", "Coded to " + code + " by " + who(by) + ". Receipt requested. Post in the accounting system.");
  log({ stream: "people", actor: who(by), title: "Coded " + txnId + " to " + code, note: eur(t.amount) + " · " + t.desc + ". Demo state only: nothing posted to accounting.", status: "completed", ref: txnId, refType: "bank" });
  toast(txnId + " coded to " + code + ".");
}

/** Closes an exception with Margaret's explanation. */
export function resolveBankLine(txnId: string, resolution: string, by: D.StaffId = "MD") {
  setBankState(txnId, "Matched", resolution);
  log({ stream: "people", actor: who(by), title: "Resolved bank exception " + txnId, note: resolution + " Demo state only: nothing posted.", status: "completed", ref: txnId, refType: "bank" });
  toast(txnId + " resolved.");
}

/** Raises a follow-up task for a person, linked to the record, and logs it. */
export function raiseTask(p: { title: string; owner: D.StaffId; dueIn?: number; priority?: D.Task["priority"]; ref: { type: string; id: string; label: string }; note?: string; by?: D.StaffId }) {
  const existing = getState().tasks.find(t => t.related?.id === p.ref.id && t.title === p.title && t.status !== "Done");
  if (existing) { toast("Task " + existing.id + " already covers this.", "info"); return existing.id; }
  const id = addTask({ title: p.title, owner: p.owner, due: addDays(TODAY, p.dueIn ?? 2), priority: p.priority || "Medium", dept: "Finance", related: p.ref, status: "Not started", createdBy: p.by || "MD", note: p.note });
  log({ stream: "people", actor: who(p.by || "MD"), title: "Created task " + id + ": " + p.title, note: "Assigned to " + who(p.owner) + ". " + (p.note || ""), status: "awaiting", ref: p.ref.id, refType: p.ref.type });
  toast("Task " + id + " created for " + (D.staffById(p.owner)?.first || p.owner) + ".", "info");
  return id;
}

/** Margaret asks the supplier for a credit note on a price variance. The bill is held; nothing is paid or posted. */
export function requestCreditNote(billId: string) {
  const b = getState().bills.find(x => x.id === billId);
  if (!b) return;
  setBillStatus(billId, "Under review", "Credit note requested from " + (D.supplierById(b.supplier)?.name || "") + ". Bill held from the payment run.");
  raiseTask({ title: "Chase credit note for " + billId, owner: "MD", dueIn: 5, priority: "Medium", ref: { type: "bill", id: billId, label: billId + " · " + eur(b.amount) }, note: b.detail });
}
