/* Purchasing: shared helpers and small actions built on the store.
   Agents propose; every committing button here is an explicit human action. */

import * as D from "../../data";
import { TODAY, addDays, daysBetween, eur } from "../../fmt";
import { buildGs1 } from "../../gs1";
import {
  BILL_EXCEPTIONS, addTask, createBillReviewTask, decideApproval, getState, log, nextId, patch, receivePO, setBillStatus, setPOStatus, setQxStatus, setTaskStatus, toast, type HState,
} from "../../store";
import type { Tone } from "../../ui";

export const OPEN_PO: D.POStatus[] = ["Draft", "Awaiting approval", "Sent", "Confirmed", "Part received"];
export const RECEIVABLE: D.POStatus[] = ["Sent", "Confirmed", "Part received"];
/** Sign-off threshold the store applies when a PO is drafted. */
export const APPROVAL_LIMIT = 5000;

export const supName = (id: string) => D.supplierById(id)?.name || id;
export const prodName = (sku: string) => D.productBySku(sku)?.name || sku;
export const poOpen = (p: D.PurchaseOrder) => OPEN_PO.includes(p.status);
export const poOrdered = (p: D.PurchaseOrder) => p.lines.reduce((a, l) => a + l.qty, 0);
export const poReceived = (p: D.PurchaseOrder) => p.lines.reduce((a, l) => a + Math.min(l.qty, l.received), 0);
export const poOutstandingValue = (p: D.PurchaseOrder) => p.lines.reduce((a, l) => a + Math.max(0, l.qty - l.received) * l.cost, 0);
export const poLateDays = (p: D.PurchaseOrder) => (RECEIVABLE.includes(p.status) && p.expected < TODAY ? daysBetween(p.expected, TODAY) : 0);
export const poApproval = (id: string, s: HState) => s.approvals.find(a => a.ref.type === "po" && a.ref.id === id);
export const grnsFor = (poId: string, s: HState) => s.grns.filter(g => g.po === poId);
export const billsFor = (poId: string, s: HState) => s.bills.filter(b => b.po === poId);
export const openBills = (supplier: string, s: HState) => s.bills.filter(b => b.supplier === supplier && b.status !== "Paid");
export const isException = (b: D.Bill) => BILL_EXCEPTIONS.includes(b.status);

/** Where a PO sits in the procure-to-pay chain. */
export function matchState(p: D.PurchaseOrder, s: HState): { label: string; tone: Tone } {
  const bills = billsFor(p.id, s);
  const grns = grnsFor(p.id, s);
  if (bills.some(isException)) return { label: "Exception", tone: "bad" };
  if (bills.length && bills.every(b => b.status === "Paid")) return { label: "Paid", tone: "ok" };
  if (bills.length) return { label: "Matched", tone: "ok" };
  if (grns.length || p.status === "Received" || p.status === "Part received" || p.status === "Closed") return { label: "Awaiting invoice", tone: "warn" };
  if (p.status === "Draft" || p.status === "Awaiting approval") return { label: "Not sent", tone: "neutral" };
  return { label: "Not received", tone: "neutral" };
}

/** Three-way match figures for a bill with quantities (PO, GRN, invoice). */
export function threeWay(b: D.Bill, s: HState) {
  const po = b.po ? s.pos.find(p => p.id === b.po) : undefined;
  const grn = b.grn ? s.grns.find(g => g.id === b.grn) : undefined;
  const line = po?.lines[0];
  const sku = line?.sku || "";
  const ordered = po ? po.lines.filter(l => l.sku === sku).reduce((a, l) => a + l.qty, 0) : 0;
  const received = grn ? grn.lines.filter(l => l.sku === sku).reduce((a, l) => a + l.qty, 0) : 0;
  const unit = line?.cost || 0;
  const freight = po?.freight || 0;
  const invoiced = b.invoicedQty || 0;
  const poTotal = po ? D.poValue(po) : 0;
  const varianceUnits = invoiced - received;
  return { po, grn, sku, ordered, received, invoiced, unit, freight, poTotal, invoiceTotal: b.amount, varianceUnits, varianceValue: varianceUnits * unit, matchedValue: b.amount - varianceUnits * unit };
}

/* ── PO actions ─────────────────────────────────────────────────────────── */

export function approvePO(poId: string) {
  const ap = getState().approvals.find(a => a.ref.type === "po" && a.ref.id === poId && a.status === "Awaiting");
  if (ap) decideApproval(ap.id, true, "GH");
  else { setPOStatus(poId, "Sent"); toast(poId + " approved and marked sent."); }
}

export function sendBackPO(poId: string) {
  const ap = getState().approvals.find(a => a.ref.type === "po" && a.ref.id === poId && a.status === "Awaiting");
  if (ap) decideApproval(ap.id, false, "GH");
  setPOStatus(poId, "Draft");
  toast(poId + " sent back to Sharon as a draft.", "info");
}

export function submitPO(p: D.PurchaseOrder) {
  const value = D.poValue(p);
  if (value <= APPROVAL_LIMIT) {
    setPOStatus(p.id, "Sent");
    toast(p.id + " marked as sent. Pulse does not email the supplier: that link is not connected.", "info");
    return;
  }
  const s = getState();
  if (!s.approvals.some(a => a.ref.type === "po" && a.ref.id === p.id && a.status === "Awaiting")) {
    const ap: D.Approval = { id: nextId("AP-", s.approvals, 2, 74), kind: "Purchase order", title: p.id + " to " + supName(p.supplier), requestedBy: "SO", approver: "GH", value, raised: TODAY,
      status: "Awaiting", ref: { type: "po", id: p.id }, detail: "Resubmitted after changes. Over the €5,000 sign-off threshold." };
    patch(st => ({ approvals: [ap, ...st.approvals] }));
  }
  setPOStatus(p.id, "Awaiting approval");
  toast(p.id + " is over " + eur(APPROVAL_LIMIT) + ": sent to Graham for approval.", "info");
}

export function confirmPO(poId: string) {
  setPOStatus(poId, "Confirmed");
  toast(poId + ": supplier confirmation recorded.");
}

export function closePO(poId: string) {
  setPOStatus(poId, "Closed");
  toast(poId + " closed.");
}

export function chasePO(p: D.PurchaseOrder) {
  const s = getState();
  const ex = s.tasks.find(t => t.related?.id === p.id && t.status !== "Done" && t.title.startsWith("Chase"));
  if (ex) { toast("Already on Sharon's list as " + ex.id + ".", "info"); return; }
  const late = poLateDays(p);
  const id = addTask({ title: "Chase " + supName(p.supplier) + " for " + p.id, owner: "SO", due: TODAY, priority: late > 7 ? "High" : "Medium", dept: "Purchasing",
    related: { type: "po", id: p.id, label: p.id + " · " + supName(p.supplier) }, status: "Not started", createdBy: "agent:purchasing",
    note: (late ? late + " days past the expected date. " : "") + (p.note || "") });
  log({ stream: "ai", actor: "Purchasing Agent", title: "Chase drafted for " + p.id, note: supName(p.supplier) + (late ? " · " + late + " days late" : "") + ". Task " + id + " for Sharon.", status: "awaiting", ref: p.id, refType: "po" });
  toast("Chase task " + id + " added for Sharon.", "info");
}

/* ── Receiving ──────────────────────────────────────────────────────────── */

const SHELF_YEARS: Record<D.CatId, number> = { OR: 5, SM: 4, AC: 3, PT: 3, AR: 2, IN: 0 };

/** A plausible supplier GS1 label for a new delivery of a SKU (demo identifiers). */
export function supplierLabel(sku: string, expired = false): string {
  const p = D.productBySku(sku)!;
  const yymm = TODAY.slice(2, 4) + TODAY.slice(5, 7);
  const years = SHELF_YEARS[p.cat];
  const expiry = expired ? addDays(TODAY, -21) : years ? addDays(TODAY, years * 365 - 30) : undefined;
  const lot = p.supplier.slice(0, 2) + "-" + (expired ? "2309" : yymm) + "-" + sku.slice(-3);
  return buildGs1({ gtin: p.gtin, expiry, lot });
}

export type Staged = { sku: string; qty: number; lot: string; expiry?: string };
export type DoorChecks = { packaging: boolean; docs: boolean; storage: boolean };

function statusOf(checks: D.GRN["checks"]): D.GRN["status"] {
  return checks.some(c => c.ok === false) ? "Exception" : checks.some(c => c.ok === null) ? "Pending docs" : "Passed";
}

/** Books a scanned delivery in: stock and a GRN via the store, then records the real door checks. */
export function bookIn(poId: string, staged: Staged[], door: DoorChecks): string {
  const before = getState().pos.find(p => p.id === poId);
  const outstanding = before ? before.lines.reduce((a, l) => a + Math.max(0, l.qty - l.received), 0) : 0;
  const units = staged.reduce((a, x) => a + x.qty, 0);
  const id = receivePO(poId, staged.map(x => ({ sku: x.sku, qty: x.qty, lot: x.lot, expiry: x.expiry })), "SO");
  const complete = units >= outstanding;
  const checks: D.GRN["checks"] = [
    { k: "Packaging intact", ok: door.packaging, note: door.packaging ? undefined : "Damage noted at the door" },
    { k: "Quantity matches PO", ok: complete, note: units + " of " + outstanding + " outstanding" + (complete ? "" : ": balance stays open on " + poId) },
    { k: "UDI / GS1 label scanned", ok: true, note: staged.length + " labels scanned" },
    { k: "Lot and expiry captured", ok: true },
    { k: "Documentation present", ok: door.docs ? true : null, note: door.docs ? undefined : "Delivery docket to follow" },
    { k: "Storage conditions met", ok: door.storage, note: door.storage ? undefined : "Held aside: storage conditions to confirm" },
  ];
  const status = statusOf(checks);
  patch(s => ({ grns: s.grns.map(g => (g.id === id ? { ...g, checks, status } : g)) }));
  log({ stream: "people", actor: "Sharon O'Mongain", title: "Booked in " + id + " against " + poId, note: units + " units on " + staged.length + (staged.length === 1 ? " line · " : " lines · ") + status + ". Lot and expiry captured from the labels.", status: "completed", ref: id, refType: "grn" });
  return id;
}

/** Resolves one failed or pending goods-in check with a note. */
export function resolveGrnCheck(grnId: string, k: string, note: string) {
  patch(s => ({ grns: s.grns.map(g => {
    if (g.id !== grnId) return g;
    const checks = g.checks.map(c => (c.k === k ? { ...c, ok: true, note } : c));
    return { ...g, checks, status: statusOf(checks) };
  }) }));
  log({ stream: "people", actor: k.startsWith("UDI") ? "John Culkin" : "Sharon O'Mongain", title: grnId + ": " + k.toLowerCase() + " resolved", note, status: "completed", ref: grnId, refType: "grn" });
  if (k.startsWith("UDI")) getState().qx.filter(q => q.ref === grnId && q.status !== "Closed").forEach(q => setQxStatus(q.id, "Closed", "JC"));
  const g = getState().grns.find(x => x.id === grnId);
  toast(grnId + ": " + k.toLowerCase() + " resolved" + (g?.status === "Passed" ? ". All checks passed." : "."));
}

/* ── Bills ──────────────────────────────────────────────────────────────── */

export const billReviewTask = (billId: string, s: HState) => s.tasks.find(t => t.related?.id === billId && t.id !== "T-102" && t.title.startsWith("Investigate"));
export const billApproval = (billId: string, s: HState) => s.approvals.find(a => a.ref.type === "bill" && a.ref.id === billId);

export function startReview(billId: string) {
  createBillReviewTask(billId, "MD");
}

/** Margaret records the supplier's credit note: the bill now matches and joins the payment run (not paid by Pulse). */
export function recordCreditNote(billId: string) {
  const s = getState();
  const b = s.bills.find(x => x.id === billId);
  if (!b) return;
  const tw = threeWay(b, s);
  setBillStatus(billId, "Awaiting payment run", "Credit note for " + eur(tw.varianceValue) + " received from " + supName(b.supplier) + ". " + eur(tw.matchedValue) + " now matches " + (b.po || "") + " and " + (b.grn || "") + ". Nothing paid or posted by Pulse.");
  s.tasks.filter(t => t.related?.id === billId && t.status !== "Done").forEach(t => setTaskStatus(t.id, "Done"));
  toast(billId + " matched at " + eur(tw.matchedValue) + ". Queued for the next payment run; nothing paid.");
}

export function askSupplier(b: D.Bill, owner: D.StaffId, title: string, note: string) {
  const s = getState();
  const ex = s.tasks.find(t => t.related?.id === b.id && t.status !== "Done" && t.title === title);
  if (ex) { toast("Already on the list as " + ex.id + ".", "info"); return; }
  const id = addTask({ title, owner, due: addDays(TODAY, 2), priority: "Medium", dept: "Finance", related: { type: "bill", id: b.id, label: b.id + " · " + eur(b.amount) }, status: "Not started", createdBy: "MD", note });
  toast("Task " + id + " added for " + (D.staffById(owner)?.first || owner) + ".", "info");
}

export function settleBill(billId: string, status: D.BillStatus, note: string) {
  setBillStatus(billId, status, note);
  getState().tasks.filter(t => t.related?.id === billId && t.status !== "Done").forEach(t => setTaskStatus(t.id, "Done"));
  toast(billId + ": " + status.toLowerCase() + ". Nothing paid or posted by Pulse.");
}
