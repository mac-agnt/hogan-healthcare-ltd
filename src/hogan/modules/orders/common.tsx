/* Orders: shared helpers and the small order actions built on the store.
   Everything reads live state, so every Orders screen tells the same story. */

import * as D from "../../data";
import { TODAY, addDays, daysBetween, date, eur } from "../../fmt";
import { buildGs1, type Gs1 } from "../../gs1";
import {
  addTask, dispatchOrder, fefoLot, getState, orderById, patch, reservedBySku, scanTargetFor, setOrderStatus, setTaskStatus, toast, type HState,
} from "../../store";

export const FLOW: D.OrderStatus[] = ["Confirmed", "Picking", "Packed", "Awaiting courier", "Dispatched"];
export const COURIERS = ["Overnight courier", "Same-day courier", "Hogan van run"];
/** Courier cut-off used across the order desk (same figure the Order Flow Agent quotes). */
export const CUTOFF = "16:00";

export const accName = (id: string) => D.accountById(id)?.name || id;
/** "2026-11-19 14:30" → "19 Nov, 14:30" for approval decisions. */
export const whenDecided = (x?: string) => (x ? date(x.slice(0, 10), false) + (x.length > 10 ? ", " + x.slice(11) : "") : "");
/** Seed labels such as "Reamers 7–11 mm" use a dash we do not show on screen. */
export const clean = (s: string) => s.replace(/[\u2013\u2014]/g, "-");
export const prodName = (sku: string) => D.productBySku(sku)?.name || sku;
/** Seed dates can run a day past the demo date; never show an order as created in the future. */
export const createdOf = (o: D.SalesOrder) => (o.created > TODAY ? TODAY : o.created);
export const shipped = (o: D.SalesOrder) => o.status === "Dispatched" || o.status === "Delivered";
export const daysLate = (o: D.SalesOrder) => (!shipped(o) && o.required < TODAY ? daysBetween(o.required, TODAY) : 0);
export const unitsOf = (o: D.SalesOrder) => o.lines.reduce((a, l) => a + l.qty, 0);
/** An order held for a missing hospital PO shows that, not the placeholder reference. */
export const poMissing = (o: D.SalesOrder) => o.status === "Issue" && /purchase order/i.test(o.issue || "");
export const poRefOf = (o: D.SalesOrder) => (poMissing(o) ? "hospital PO not received" : o.poRef);

export function requiredLabel(o: D.SalesOrder): string {
  if (shipped(o)) return date(o.required, false);
  if (o.required === TODAY) return "Today";
  if (o.required === addDays(TODAY, 1)) return "Tomorrow";
  return date(o.required, false);
}

/** Main-stockroom units that can be picked (not quarantined). */
export function freeCentral(sku: string, s: HState): number {
  return s.stock.filter(l => l.sku === sku && l.loc === "DLM" && l.status !== "Quarantine").reduce((a, l) => a + l.qty, 0);
}

/** Unpicked lines whose SKU is reserved beyond the free main-stockroom stock. */
export function shortLines(o: D.SalesOrder, s: HState): D.OrderLine[] {
  if (o.status !== "Confirmed" && o.status !== "Picking") return [];
  const res = reservedBySku(s);
  return o.lines.filter(l => !l.scanned && (res[l.sku] || 0) > freeCentral(l.sku, s));
}

/** The stock line behind a scanned order line (for expiry and location read-outs). */
export function stockFor(l: D.OrderLine, s: HState): D.StockLine | undefined {
  if (l.serial) return s.stock.find(x => x.serial === l.serial);
  if (l.lot) return s.stock.find(x => x.sku === l.sku && x.lot === l.lot);
  return undefined;
}

/** Open purchase order lines that will bring this SKU in, soonest first. */
export function incoming(sku: string, s: HState): { po: D.PurchaseOrder; qty: number }[] {
  return s.pos.filter(p => ["Draft", "Awaiting approval", "Sent", "Confirmed", "Part received"].includes(p.status))
    .map(p => ({ po: p, qty: p.lines.filter(l => l.sku === sku).reduce((a, l) => a + Math.max(0, l.qty - l.received), 0) }))
    .filter(x => x.qty > 0).sort((a, b) => (a.po.expected < b.po.expected ? -1 : 1));
}

/* ── Actions ────────────────────────────────────────────────────────────── */

export function bookCourier(id: string, courier: string) {
  patch(s => ({ orders: s.orders.map(o => (o.id === id ? { ...o, courier } : o)) }));
  setOrderStatus(id, "Awaiting courier", courier + " booked. Waiting for collection before the " + CUTOFF + " cut-off.");
  toast(id + ": " + courier + " booked for collection.", "info");
}

export function dispatchNow(id: string, fallbackCourier = COURIERS[0]) {
  const o = orderById(id);
  if (!o) return;
  dispatchOrder(id, o.courier || fallbackCourier);
  closeDispatchTasks();
}

function orderIdsIn(text: string): string[] {
  const m = text.match(/SO-(\d{4}) to SO-(\d{4})/);
  if (m) {
    const out: string[] = [];
    for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push("SO-" + n);
    return out;
  }
  return text.match(/SO-\d{4}/g) || [];
}

/** Closes open dispatch-board tasks once every order they name has gone. */
function closeDispatchTasks() {
  const s = getState();
  s.tasks.filter(t => t.status !== "Done" && t.related?.type === "page" && t.related.id === "Orders:dispatch").forEach(t => {
    const ids = orderIdsIn(t.title);
    if (ids.length && ids.every(x => { const o = s.orders.find(q => q.id === x); return !o || shipped(o); })) setTaskStatus(t.id, "Done");
  });
}

export function confirmDelivery(id: string) {
  setOrderStatus(id, "Delivered", "Delivery confirmed by hand. Courier tracking is not connected.");
  toast(id + " marked as delivered.");
}

export function startPicking(id: string) {
  const o = orderById(id);
  if (o && o.status === "Confirmed") setOrderStatus(id, "Picking", "Picking started.");
}

/** Closes off a fully scanned order that was never moved on: Packed, and its pick task done. */
export function markPacked(id: string) {
  setOrderStatus(id, "Packed", "All lines scanned and validated. Ready for dispatch.");
  getState().tasks.filter(t => t.related?.id === id && t.status !== "Done").forEach(t => setTaskStatus(t.id, "Done"));
  toast(id + " packed and ready for dispatch.");
}

/** Lifts a hold: back to Packed when every line is scanned, otherwise back to Picking. */
export function releaseIssue(id: string, note: string, poRef?: string) {
  const o = orderById(id);
  if (!o) return;
  const next: D.OrderStatus = o.lines.every(l => l.scanned) ? "Packed" : "Picking";
  patch(s => ({ orders: s.orders.map(x => (x.id === id ? { ...x, issue: undefined, poRef: poRef || x.poRef } : x)) }));
  setOrderStatus(id, next, note);
  toast(id + " released: " + (next === "Packed" ? "ready for dispatch." : "back to picking."));
}

/** Keeps the hold and puts a dated follow-up on Sharon's list. */
export function followUpIssue(id: string) {
  const o = orderById(id);
  if (!o) return;
  const exists = getState().tasks.find(t => t.related?.id === id && t.status !== "Done" && t.title.startsWith("Follow up"));
  if (exists) { toast("A follow-up for " + id + " is already on " + exists.id + ".", "info"); return; }
  const tid = addTask({ title: "Follow up " + id + " with " + accName(o.account), owner: "SO", due: addDays(TODAY, 1), priority: "High", dept: "Orders",
    related: { type: "order", id, label: id + " · " + accName(o.account) }, status: "Not started", createdBy: "SO", note: o.issue });
  toast("Hold kept. Follow-up " + tid + " added for tomorrow.", "info");
}

/* ── Picking scan validation ────────────────────────────────────────────── */

export type ScanVerdict = { ok: true; line: D.OrderLine } | { ok: false; code: string; msg: string };

/** Checks a decoded barcode against an order before anything is marked. */
export function checkPickScan(o: D.SalesOrder, g: Gs1, s: HState): ScanVerdict {
  const sku = g.sku || "";
  const p = D.productBySku(sku);
  const lines = o.lines.filter(l => l.sku === sku);
  if (!lines.length) return { ok: false, code: "Not on this order", msg: "Not on this order: " + sku + " " + (p?.name || "") + ". Nothing marked; put it back." };
  if (g.expiry && g.expiry < TODAY) return { ok: false, code: "Expired lot rejected", msg: "Expired lot rejected: " + (g.lot || sku) + " expired " + date(g.expiry) + ". Take the next lot (FEFO)." };
  const line = lines.find(l => !l.scanned);
  if (!line) return { ok: false, code: "Already validated", msg: sku + " is already validated on " + o.id + "." };
  if (p?.tracking === "serial" && !g.serial) return { ok: false, code: "Serial required", msg: "Serial number required for " + sku + ". Scan the label that carries (21)." };
  if (p?.tracking === "lot" && (!g.lot || (p.sterile && !g.expiry))) return { ok: false, code: "Lot and expiry required", msg: "Lot and expiry required for " + sku + ". Scan the full GS1 label, not the shelf code." };
  if (g.serial) {
    const other = s.orders.find(x => x.id !== o.id && x.lines.some(l => l.serial === g.serial));
    if (other) return { ok: false, code: "Serial already allocated", msg: "Serial " + g.serial + " is already allocated to " + other.id + "." };
    if (!s.stock.some(l => l.serial === g.serial && l.loc === "DLM" && l.qty > 0)) return { ok: false, code: "Serial not in stock", msg: "Serial " + g.serial + " is not booked into the main stockroom." };
  } else if (g.lot) {
    const held = s.stock.filter(l => l.sku === sku && l.lot === g.lot && l.loc === "DLM");
    if (held.some(l => l.status === "Quarantine")) return { ok: false, code: "Quarantined lot", msg: "Lot " + g.lot + " is quarantined. It cannot be picked." };
    if (!held.some(l => l.qty > 0)) return { ok: false, code: "Lot not in stock", msg: "Lot " + g.lot + " is not booked into the main stockroom. Check the shelf." };
  }
  return { ok: true, line };
}

/** Demo barcodes for an order: the next valid label plus labels that should be refused. */
export function pickSamples(o: D.SalesOrder, s: HState): { label: string; code: string }[] {
  const out: { label: string; code: string }[] = [];
  const next = o.lines.find(l => !l.scanned);
  if (next) out.push({ label: "Next line: " + next.sku, code: scanTargetFor(o.id, next.id) });
  const other = D.PRODUCTS.find(p => p.tracking === "lot" && !o.lines.some(l => l.sku === p.sku) && fefoLot(p.sku, s));
  if (other) {
    const f = fefoLot(other.sku, s)!;
    out.push({ label: "Wrong product", code: buildGs1({ gtin: other.gtin, expiry: f.expiry, lot: f.lot }) });
  }
  const lotLine = o.lines.find(l => !l.scanned && D.productBySku(l.sku)?.tracking === "lot") || o.lines.find(l => D.productBySku(l.sku)?.tracking === "lot");
  if (lotLine) {
    const p = D.productBySku(lotLine.sku)!;
    const exp = addDays(TODAY, -40);
    const made = addDays(exp, -730);
    out.push({ label: "Expired lot", code: buildGs1({ gtin: p.gtin, expiry: exp, lot: "L" + made.slice(2, 4) + made.slice(5, 7) + "-" + p.sku.slice(-3) + "X" }) });
  }
  const serialLine = o.lines.find(l => !l.scanned && D.productBySku(l.sku)?.tracking === "serial");
  if (serialLine) out.push({ label: "Shelf code, no serial", code: serialLine.sku });
  return out;
}

/* ── Picking exception log (kept in UI state for the session) ───────────── */

export type PickEvent = { time: string; order: string; ok: boolean; code: string; msg: string };
const LOG_KEY = "orders.pickLog";
export function pushPickEvent(e: PickEvent) {
  patch(s => ({ ui: { ...s.ui, [LOG_KEY]: [e, ...((s.ui[LOG_KEY] as PickEvent[] | undefined) || [])].slice(0, 60) } }));
}
export function pickEvents(s: HState, order: string): PickEvent[] {
  return ((s.ui[LOG_KEY] as PickEvent[] | undefined) || []).filter(e => e.order === order);
}

/** Order value and estimated gross margin from product cost. */
export function orderMargin(o: { lines: { sku: string; qty: number; price: number }[] }): { value: number; gp: number; pct: number } {
  const value = o.lines.reduce((a, l) => a + l.qty * l.price, 0);
  const cost = o.lines.reduce((a, l) => a + l.qty * (D.productBySku(l.sku)?.unitCost || 0), 0);
  return { value, gp: value - cost, pct: value ? ((value - cost) / value) * 100 : 0 };
}

export const eurOf = (o: D.SalesOrder) => eur(D.orderValue(o));
