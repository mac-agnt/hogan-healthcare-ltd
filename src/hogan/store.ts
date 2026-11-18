/* ─────────────────────────────────────────────────────────────────────────────
   Hogan Healthcare OS: local demo state.

   One store for every module. It seeds itself from data.ts, holds everything
   that a demo interaction can change (stock, orders, transfers, tasks, plans,
   invoices, rentals, activity), and exposes:
     • useHogan()            → the whole state (re-renders on change)
     • selectors (pure)      → derived numbers, so every screen agrees
     • actions               → the six story interactions and generic helpers
     • nav / openRecord      → navigation and the slide-out record drawer
   Nothing here talks to a server. Nothing posts money or regulated actions:
   agents only propose, people decide.
   ───────────────────────────────────────────────────────────────────────────── */

import { useSyncExternalStore, type ComponentType } from "react";
import * as D from "./data";
import { TODAY, addDays, date, daysAgo, eur, nowTime } from "./fmt";
import { buildGs1 } from "./gs1";

export type RecordRef = { type: string; id: string };
export type Toast = { id: number; text: string; kind: "ok" | "info" | "warn" };
export type AgentNote = { agent: string; date: string; time: string; text: string; ref?: string };

export type HState = {
  tab: Record<string, string>;
  ui: Record<string, any>;
  stock: D.StockLine[];
  movements: D.Movement[];
  orders: D.SalesOrder[];
  transfers: D.Transfer[];
  tasks: D.Task[];
  approvals: D.Approval[];
  events: D.HEvent[];
  activities: D.SalesActivity[];
  proposals: D.SalesActivity[];
  opps: D.Opportunity[];
  invoices: D.Invoice[];
  bills: D.Bill[];
  bank: D.BankTxn[];
  pos: D.PurchaseOrder[];
  grns: D.GRN[];
  bookings: D.RentalBooking[];
  assets: D.RentalAsset[];
  returns: D.ReturnRec[];
  loanSets: D.LoanSet[];
  qx: D.QualityException[];
  agentNotes: AgentNote[];
  drawer: RecordRef[];
  toasts: Toast[];
  seq: number;
};

/* ── Module top-bar tabs (PulseLogic builds the header pills from these) ── */

export const MODULE_TABS: Record<string, [string, string][]> = {
  Dashboard: [["exec", "Executive Overview"], ["sales", "Sales Performance"], ["inventory", "Inventory Performance"], ["finance", "Finance & Margins"], ["ops", "Operational Trends"]],
  Sales: [["myday", "My Day"], ["pipeline", "Pipeline"], ["accounts", "Accounts"], ["followups", "Follow-ups"], ["planner", "Weekly Planner"], ["team", "Team Performance"]],
  Orders: [["overview", "Overview"], ["new", "New Order"], ["picking", "Picking & Packing"], ["dispatch", "Dispatch"], ["returns", "Returns"], ["loansets", "Loan Sets"]],
  Inventory: [["live", "Live Inventory"], ["locations", "Locations"], ["hospital", "Hospital Stock"], ["scanning", "Barcode Scanning"], ["trace", "Traceability"], ["counts", "Stock Counts"], ["replenish", "Replenishment"]],
  Purchasing: [["overview", "Overview"], ["pos", "Purchase Orders"], ["receiving", "Goods Receiving"], ["suppliers", "Suppliers"], ["reorder", "Reorder Recommendations"], ["exceptions", "Exceptions"]],
  Finance: [["overview", "Overview"], ["ar", "Receivables"], ["ap", "Payables"], ["recon", "Reconciliation"], ["profit", "Profitability"], ["forecast", "Forecast"]],
  Compliance: [["register", "Device Register"], ["udi", "UDI & Lot Trace"], ["docs", "Quality Documents"], ["exceptions", "Exceptions"], ["audit", "Audit History"]],
  Rentals: [["overview", "Overview"], ["bookings", "Bookings"], ["assets", "Rental Assets"], ["dispatch", "Dispatch & Returns"], ["revenue", "Rental Revenue"]],
  Work: [["tasks", "My Tasks"], ["team", "Team Plan"], ["approvals", "Approvals"], ["schedule", "Schedule"], ["workflows", "Workflows"]],
};
export const MODULE_PAGES = ["Sales", "Orders", "Inventory", "Purchasing", "Finance", "Compliance", "Rentals"];

/* ── Store core ─────────────────────────────────────────────────────────── */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function seed(): HState {
  const approvals = clone(D.APPROVALS);
  const ap71 = approvals.find(a => a.id === "AP-71");
  const po341 = D.PURCHASE_ORDERS.find(p => p.id === "PO-341");
  if (ap71 && po341) ap71.value = D.poValue(po341);
  const ap72 = approvals.find(a => a.id === "AP-72");
  if (ap72) ap72.value = 6 * (D.productBySku("HH-OR-201")?.unitPrice || 0);
  return {
    tab: {}, ui: {},
    stock: clone(D.STOCK), movements: clone(D.MOVEMENTS), orders: clone(D.ORDERS), transfers: clone(D.TRANSFERS),
    tasks: clone(D.TASKS), approvals, events: clone(D.SEED_EVENTS), activities: clone(D.SALES_ACTIVITIES), proposals: [],
    opps: clone(D.OPPORTUNITIES), invoices: clone(D.INVOICES), bills: clone(D.BILLS), bank: clone(D.BANK),
    pos: clone(D.PURCHASE_ORDERS), grns: clone(D.GRNS), bookings: clone(D.RENTAL_BOOKINGS), assets: clone(D.RENTAL_ASSETS),
    returns: clone(D.RETURNS), loanSets: clone(D.LOAN_SETS), qx: clone(D.QUALITY_EXCEPTIONS),
    agentNotes: [], drawer: [], toasts: [], seq: 1,
  };
}

/* State, listeners and the navigator live on one shared holder so a hot
   reload of this module during development keeps the same live store (and
   the shell's navigator) instead of orphaning it. */
type Shared = { state: HState; listeners: Set<() => void>; navigator: ((page: string) => void) | null };
const G = (typeof window !== "undefined" ? window : {}) as unknown as { __hhShared?: Shared };
const shared: Shared = G.__hhShared || (G.__hhShared = { state: seed(), listeners: new Set(), navigator: null });
const listeners = shared.listeners;

export function getState(): HState { return shared.state; }
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
function set(patch: Partial<HState> | ((s: HState) => Partial<HState>)) {
  const p = typeof patch === "function" ? patch(shared.state) : patch;
  shared.state = { ...shared.state, ...p };
  listeners.forEach(l => l());
}
/** Escape hatch for module-local actions: patch(s => ({ ...changes })). Prefer the named actions below. */
export const patch = set;
/** Restores the opening demo state (Settings → Reset demo). */
export function resetDemo() { const t = shared.state.tab; shared.state = { ...seed(), tab: t }; listeners.forEach(l => l()); }

/** The whole demo state. Components re-render whenever anything changes. */
export function useHogan(): HState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/* ── Navigation, tabs, UI keys ──────────────────────────────────────────── */

export function setNavigator(fn: (page: string) => void) { shared.navigator = fn; }

export function tabOf(page: string, s: HState = getState()): string {
  return s.tab[page] || (MODULE_TABS[page] ? MODULE_TABS[page][0][0] : "");
}
export function setTab(page: string, tab: string) { set(s => ({ tab: { ...s.tab, [page]: tab } })); }

/** Go to a page (and optionally a tab), optionally setting UI keys the page reads (e.g. a selected record). */
export function nav(page: string, tab?: string, ui?: Record<string, any>) {
  set(s => ({ tab: tab ? { ...s.tab, [page]: tab } : s.tab, ui: ui ? { ...s.ui, ...ui } : s.ui, drawer: [] }));
  shared.navigator?.(page);
  const el = document.querySelector("[data-scroll-main]");
  if (el) el.scrollTop = 0;
}

export function setUi(key: string, value: any) { set(s => ({ ui: { ...s.ui, [key]: value } })); }
export function useUi<T>(key: string, fallback: T): [T, (v: T) => void] {
  const s = useHogan();
  const v = key in s.ui ? (s.ui[key] as T) : fallback;
  return [v, (nv: T) => setUi(key, nv)];
}

/* ── Record drawer ──────────────────────────────────────────────────────── */

export type RecordView = ComponentType<{ id: string }>;
const registry: Record<string, { view: RecordView; label: string }> = {};
/** Modules register a detail view per record type, e.g. registerRecordView("product", ProductDetail, "Product"). */
export function registerRecordView(type: string, view: RecordView, label: string) { registry[type] = { view, label }; }
export function recordView(type: string) { return registry[type]; }

export function openRecord(type: string, id: string) {
  set(s => {
    const top = s.drawer[s.drawer.length - 1];
    if (top && top.type === type && top.id === id) return {};
    return { drawer: s.drawer.concat([{ type, id }]).slice(-12) };
  });
}
export function backRecord() { set(s => ({ drawer: s.drawer.slice(0, -1) })); }
export function closeRecord() { set({ drawer: [] }); }

/* ── Toasts and the activity log ────────────────────────────────────────── */

let toastN = 0;
export function toast(text: string, kind: Toast["kind"] = "ok") {
  const id = ++toastN;
  set(s => ({ toasts: s.toasts.concat([{ id, text, kind }]).slice(-4) }));
  setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4200);
}

/** Next sequential id for a prefix, e.g. nextId("SO-", orders, 4, 1047) → SO-1048. */
export function nextId(prefix: string, list: { id: string }[], pad = 3, floor = 0): string {
  let max = floor;
  for (const x of list) {
    const m = x.id.match(/(\d+)$/);
    if (m && x.id.startsWith(prefix)) max = Math.max(max, Number(m[1]));
  }
  return prefix + String(max + 1).padStart(pad, "0");
}

export function log(e: Omit<D.HEvent, "id" | "date" | "time"> & { date?: string; time?: string }) {
  set(s => ({ events: [{ id: "E-" + (1000 + s.seq), date: e.date || TODAY, time: e.time || nowTime(), ...e } as D.HEvent].concat(s.events), seq: s.seq + 1 }));
}
export function agentNote(agent: string, text: string, ref?: string) {
  const note: AgentNote = { agent, text, ref, date: TODAY, time: nowTime() };
  set(s => ({ agentNotes: [note, ...s.agentNotes] }));
}

/* ── Selectors: stock ───────────────────────────────────────────────────── */

export const RESERVING: D.OrderStatus[] = ["Confirmed", "Picking", "Packed", "Awaiting courier", "Issue"];

export function locTotals(s: HState = getState()): Record<D.LocId, number> {
  const t = Object.fromEntries(D.LOCATIONS.map(l => [l.id, 0])) as Record<D.LocId, number>;
  for (const l of s.stock) t[l.loc] += l.qty;
  return t;
}
export function totalUnits(s: HState = getState()) { return s.stock.reduce((a, l) => a + l.qty, 0); }
export function centralUnits(s: HState = getState()) { return s.stock.filter(l => l.loc === "DLM").reduce((a, l) => a + l.qty, 0); }
export function hospitalUnits(s: HState = getState()) { return s.stock.filter(l => l.loc !== "DLM").reduce((a, l) => a + l.qty, 0); }
export function activeSkus(s: HState = getState()) { return new Set(s.stock.filter(l => l.qty > 0).map(l => l.sku)).size; }

export function reservedBySku(s: HState = getState()): Record<string, number> {
  const r: Record<string, number> = {};
  for (const o of s.orders) if (RESERVING.includes(o.status)) for (const l of o.lines) r[l.sku] = (r[l.sku] || 0) + l.qty;
  return r;
}

export type ProductStock = { total: number; central: number; hospital: number; reserved: number; available: number; byLoc: Record<string, number>; lines: D.StockLine[]; value: number };
export function productStock(sku: string, s: HState = getState()): ProductStock {
  const lines = s.stock.filter(l => l.sku === sku && l.qty > 0);
  const byLoc: Record<string, number> = {};
  lines.forEach(l => { byLoc[l.loc] = (byLoc[l.loc] || 0) + l.qty; });
  const central = byLoc.DLM || 0;
  const total = lines.reduce((a, l) => a + l.qty, 0);
  const reserved = Math.min(central, reservedBySku(s)[sku] || 0);
  const quarantine = lines.filter(l => l.loc === "DLM" && l.status === "Quarantine").reduce((a, l) => a + l.qty, 0);
  const p = D.productBySku(sku);
  return { total, central, hospital: total - central, reserved, available: Math.max(0, central - reserved - quarantine), byLoc, lines, value: total * (p?.unitCost || 0) };
}

export function stockValue(s: HState = getState(), loc?: string): number {
  let v = 0;
  for (const l of s.stock) if (!loc || l.loc === loc) v += l.qty * (D.productBySku(l.sku)?.unitCost || 0);
  return v;
}

export type SiteLow = { line: D.StockLine; suggested: number; pending?: D.Transfer; centralAvail: number; lots?: D.StockLine[] };
/** Consignment SKUs below their par level at a site, summed across lots, with the suggested top-up (par − on hand + 1).
    `line` is a summary line (total quantity, first lot) so screens can show one row per SKU and site. */
export function lowSiteLines(s: HState = getState()): SiteLow[] {
  const groups = new Map<string, D.StockLine[]>();
  for (const l of s.stock) {
    if (l.loc === "DLM" || l.min === undefined) continue;
    const k = l.loc + "|" + l.sku;
    groups.set(k, (groups.get(k) || []).concat([l]));
  }
  const out: SiteLow[] = [];
  groups.forEach(lots => {
    const qty = lots.reduce((a, l) => a + l.qty, 0);
    const min = Math.max(...lots.map(l => l.min || 0));
    if (qty >= min) return;
    const first = lots.find(l => l.qty > 0) || lots[0];
    out.push({
      line: { ...first, qty, min }, lots, suggested: min - qty + 1,
      pending: s.transfers.find(t => t.sku === first.sku && t.to === first.loc && (t.status === "Awaiting approval" || t.status === "Proposed")),
      centralAvail: productStock(first.sku, s).available,
    });
  });
  return out;
}

export function expiringLines(days: number, s: HState = getState()): D.StockLine[] {
  const limit = addDays(TODAY, days);
  return s.stock.filter(l => l.qty > 0 && l.expiry && l.expiry <= limit).sort((a, b) => (a.expiry! < b.expiry! ? -1 : 1));
}

/** FEFO: the main-stockroom lot to take first for a SKU. */
export function fefoLot(sku: string, s: HState = getState()): D.StockLine | undefined {
  return s.stock.filter(l => l.sku === sku && l.loc === "DLM" && l.qty > 0 && l.status === "Available")
    .sort((a, b) => (a.expiry || "9999") < (b.expiry || "9999") ? -1 : 1)[0];
}

export function traceLot(sku: string, lot: string, s: HState = getState()): D.Movement[] {
  return s.movements.filter(m => m.sku === sku && m.lot === lot).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** Units still to arrive on open purchase orders. */
export function onOrder(sku: string, s: HState = getState()): number {
  return s.pos.filter(p => ["Draft", "Awaiting approval", "Sent", "Confirmed", "Part received"].includes(p.status))
    .reduce((a, p) => a + p.lines.filter(l => l.sku === sku).reduce((b, l) => b + Math.max(0, l.qty - l.received), 0), 0);
}

export type ReorderRec = { product: D.Product; available: number; onOrder: number; min: number; suggested: number; cost: number; supplier: D.Supplier };
/** Central lines where available + on order is below the reorder point. Suggests enough to reach twice the reorder point. */
export function reorderRecs(s: HState = getState()): ReorderRec[] {
  const out: ReorderRec[] = [];
  for (const p of D.PRODUCTS) {
    const ps = productStock(p.sku, s);
    const oo = onOrder(p.sku, s);
    if (ps.available + oo < p.minCentral) {
      const suggested = Math.max(p.minCentral * 2 - ps.available - oo, 2);
      out.push({ product: p, available: ps.available, onOrder: oo, min: p.minCentral, suggested, cost: suggested * p.unitCost, supplier: D.supplierById(p.supplier)! });
    }
  }
  return out.sort((a, b) => (a.available + a.onOrder - a.min) - (b.available + b.onOrder - b.min));
}

/* ── Selectors: orders, sales, finance ──────────────────────────────────── */

export function openOrders(s: HState = getState()) { return s.orders.filter(o => D.OPEN_STATUSES.includes(o.status)); }
export function orderById(id: string, s: HState = getState()) { return s.orders.find(o => o.id === id); }
export function orderProgress(o: D.SalesOrder) { return { scanned: o.lines.filter(l => l.scanned).length, total: o.lines.length }; }

export function openOpps(s: HState = getState()) { return s.opps.filter(o => o.stage !== "Won" && o.stage !== "Lost"); }
export function pipelineValue(s: HState = getState()) { return openOpps(s).reduce((a, o) => a + o.value, 0); }
export function overdueFollowups(s: HState = getState()) { return openOpps(s).filter(o => o.nextDue < TODAY).sort((a, b) => b.value - a.value); }
export function quietOpps(days = 14, s: HState = getState()) { return openOpps(s).filter(o => daysAgo(o.lastActivity) >= days); }

export function overdueInvoices(s: HState = getState()) { return s.invoices.filter(i => i.status === "Overdue").sort((a, b) => b.amount - a.amount); }
export function overdueTotal(s: HState = getState()) { return overdueInvoices(s).reduce((a, i) => a + i.amount, 0); }
export const BILL_EXCEPTIONS: D.BillStatus[] = ["Quantity discrepancy", "Price variance", "No matching receipt", "Under review"];
export function billExceptions(s: HState = getState()) { return s.bills.filter(b => BILL_EXCEPTIONS.includes(b.status)); }

export function tasksFor(owner: string, s: HState = getState()) { return s.tasks.filter(t => t.owner === owner); }
export function openTasks(s: HState = getState()) { return s.tasks.filter(t => t.status !== "Done"); }
export function pendingApprovals(s: HState = getState(), approver?: string) { return s.approvals.filter(a => a.status === "Awaiting" && (!approver || a.approver === approver)); }

/** The six business-health indicators on Home. Revenue and EBITDA are month-to-date demo figures. */
export function healthKpis(s: HState = getState()) {
  return {
    revenue: D.FIN.revenue, ebitda: D.FIN.ebitda,
    openOrders: openOrders(s).length, units: totalUnits(s),
    openOpps: openOpps(s).length, overdueFollowups: overdueFollowups(s).length,
  };
}

export type Alert = { id: string; title: string; sub: string; tone: "bad" | "warn" | "info" | "ok"; done: boolean; go: () => void; cta: string };
/** "Needs your attention" on Home, derived from live state so it updates as you work. */
export function alerts(s: HState = getState()): Alert[] {
  const fu = overdueFollowups(s);
  const so = orderById("SO-1047", s);
  const prog = so ? orderProgress(so) : { scanned: 0, total: 0 };
  const harbour = s.stock.filter(l => l.sku === "HH-OR-204" && l.loc === "HAR").reduce((a, l) => a + l.qty, 0);
  const tr = s.transfers.find(t => t.sku === "HH-OR-204" && t.to === "HAR" && t.status !== "Rejected");
  const inv = overdueInvoices(s);
  const bills = billExceptions(s);
  return [
    { id: "followups", title: fu.length ? fu.length + " sales follow-ups overdue" : "No overdue follow-ups",
      sub: fu.length ? "Largest: " + (D.accountById(fu[0].account)?.name || "") + ", " + eur(fu[0].value) : "Every open opportunity has a current next step.",
      tone: fu.length ? "warn" : "ok", done: fu.length === 0, cta: "Review", go: () => nav("Sales", "followups") },
    { id: "so1047", title: prog.scanned < prog.total ? "SO-1047 needs " + (prog.total - prog.scanned) + " final scan" + (prog.total - prog.scanned === 1 ? "" : "s") : "SO-1047 " + (so?.status === "Dispatched" ? "dispatched" : "ready for dispatch"),
      sub: "South Dublin Surgical Centre · " + prog.scanned + "/" + prog.total + " lines scanned · Sharon", tone: prog.scanned < prog.total ? "bad" : "ok", done: prog.scanned >= prog.total, cta: "Open",
      go: () => nav("Orders", "picking", { "orders.pick": "SO-1047" }) },
    { id: "harbour", title: harbour < 6 ? "Harbour Orthopaedic Clinic needs replenishment" : "Harbour replenished",
      sub: harbour < 6 ? "HH-OR-204: " + harbour + " on hand, minimum 6" + (tr && tr.status === "Awaiting approval" ? " · " + tr.id + " awaiting John" : "") : "HH-OR-204 now " + harbour + " on hand · " + (tr?.id || ""),
      tone: harbour < 6 ? "warn" : "ok", done: harbour >= 6, cta: harbour < 6 ? "Replenish" : "View",
      go: () => nav("Inventory", "replenish", { "inventory.focus": "HH-OR-204" }) },
    { id: "invoices", title: inv.length + " customer invoices overdue, " + eur(inv.reduce((a, i) => a + i.amount, 0)),
      sub: inv[0] ? "Largest: " + inv[0].id + " · " + (D.accountById(inv[0].account)?.name || "") + " · " + eur(inv[0].amount) : "", tone: "warn", done: inv.length === 0, cta: "Open",
      go: () => nav("Finance", "ar") },
    { id: "bills", title: bills.length + " supplier bills awaiting resolution",
      sub: bills.map(b => b.id).join(" · "), tone: bills.length ? "info" : "ok", done: bills.length === 0, cta: "Resolve",
      go: () => nav("Purchasing", "exceptions") },
  ];
}

/** The AI morning briefing, written from current state. */
export function briefing(s: HState = getState()): string {
  const parts: string[] = [];
  const harbour = s.stock.filter(l => l.sku === "HH-OR-204" && l.loc === "HAR").reduce((a, l) => a + l.qty, 0);
  const so = orderById("SO-1047", s);
  const left = so ? so.lines.filter(l => !l.scanned).length : 0;
  const fu = overdueFollowups(s);
  const pin = fu.find(o => o.id === "OPP-301");
  const things = [harbour < 6, left > 0, fu.length > 0].filter(Boolean).length;
  parts.push(things === 0 ? "Everything that needed you this morning is handled." : (["", "One thing needs", "Two things need", "Three things need"][things]) + " attention today.");
  if (harbour < 6) parts.push("Harbour Orthopaedic Clinic has " + harbour + " units of HH-OR-204 against a minimum of 6.");
  else parts.push("Harbour is back to " + harbour + " units of HH-OR-204.");
  if (left > 0) parts.push("Order SO-1047 still needs " + left + " item" + (left === 1 ? "" : "s") + " scanned.");
  else if (so) parts.push("SO-1047 is fully scanned and " + (so.status === "Dispatched" ? "on its way." : "ready to dispatch."));
  if (fu.length) parts.push((fu.length === 7 ? "Seven" : String(fu.length)) + " sales opportunit" + (fu.length === 1 ? "y has an overdue follow-up" : "ies have overdue follow-ups") + (pin ? ", including Pinewood Orthopaedics worth " + eur(pin.value) + "." : "."));
  return parts.join(" ");
}

/* ── Actions: tasks, approvals ──────────────────────────────────────────── */

export function addTask(t: Omit<D.Task, "id">): string {
  const id = nextId("T-", getState().tasks, 3, 120);
  set(s => ({ tasks: [{ id, ...t }, ...s.tasks] }));
  return id;
}
export function setTaskStatus(id: string, status: D.TaskStatus) {
  const t = getState().tasks.find(x => x.id === id);
  set(s => ({ tasks: s.tasks.map(x => x.id === id ? { ...x, status } : x) }));
  if (t && status === "Done") log({ stream: "people", actor: D.staffById(t.owner)?.name || t.owner, title: "Completed: " + t.title, note: t.related?.label || t.dept, status: "completed", ref: t.related?.id, refType: t.related?.type });
}
function patchTask(id: string, patch: Partial<D.Task>) { set(s => ({ tasks: s.tasks.map(x => x.id === id ? { ...x, ...patch } : x) })); }

export function decideApproval(id: string, approve: boolean, by: D.StaffId = "GH") {
  const a = getState().approvals.find(x => x.id === id);
  if (!a || a.status !== "Awaiting") return;
  set(s => ({ approvals: s.approvals.map(x => x.id === id ? { ...x, status: approve ? "Approved" : "Rejected", decidedAt: TODAY + " " + nowTime(), decidedBy: by } : x) }));
  const who = D.staffById(by)?.name || by;
  if (a.ref.type === "transfer") { approve ? completeTransfer(a.ref.id, by) : rejectTransfer(a.ref.id, by); return; }
  if (a.ref.type === "po" && approve) set(s => ({ pos: s.pos.map(p => p.id === a.ref.id ? { ...p, status: "Sent" } : p), tasks: s.tasks.map(t => t.related?.id === a.ref.id ? { ...t, status: "Done" } : t) }));
  if (a.ref.type === "booking" && approve) approveExtension(a.ref.id, true);
  if (a.kind === "Weekly plan" && approve) acceptAllProposals(a.ref.id);
  log({ stream: "people", actor: who, title: (approve ? "Approved: " : "Rejected: ") + a.title, note: a.kind + (a.value ? " · " + eur(a.value) : ""), status: "completed", ref: a.ref.id, refType: a.ref.type });
  toast((approve ? "Approved: " : "Rejected: ") + a.title);
}

/* ── Story A: hospital stock replenishment ──────────────────────────────── */

/** Raise a transfer request. Stock does not move until someone approves it. */
export function proposeTransfer(p: { sku: string; to: D.LocId; qty: number; from?: D.LocId; reason?: string; by?: string }): string {
  const lot = fefoLot(p.sku);
  const id = nextId("TR-0", getState().transfers, 3, 506);
  const approver: D.StaffId = "JC";
  const tr: D.Transfer = { id, sku: p.sku, qty: p.qty, lot: lot?.lot || "", from: p.from || "DLM", to: p.to, status: "Awaiting approval",
    proposedBy: p.by || "GH", approver, created: TODAY, reason: p.reason || "Below par level" };
  const site = D.locById(p.to)!;
  set(s => ({
    transfers: [tr, ...s.transfers],
    approvals: [{ id: nextId("AP-", s.approvals, 2, 74), kind: "Stock transfer", title: id + ": " + p.qty + " × " + p.sku + " to " + site.short, requestedBy: p.by || "GH", approver,
      value: p.qty * (D.productBySku(p.sku)?.unitCost || 0), raised: TODAY, status: "Awaiting", ref: { type: "transfer", id },
      detail: "Move " + p.qty + " units of " + p.sku + " (lot " + tr.lot + ") from the main stockroom to " + site.name + ". " + tr.reason + "." } as D.Approval, ...s.approvals],
  }));
  if (p.sku === "HH-OR-204" && p.to === "HAR") patchTask("T-104", { status: "Not started", title: "Approve Harbour stock transfer " + id, note: p.qty + " units of HH-OR-204 from the main stockroom.", related: { type: "transfer", id, label: id + " · " + p.qty + " × HH-OR-204 → Harbour" } });
  else addTask({ title: "Approve stock transfer " + id, owner: approver, due: TODAY, priority: "Medium", dept: "Operations", related: { type: "transfer", id, label: id + " · " + p.qty + " × " + p.sku + " → " + site.short }, status: "Not started", createdBy: p.by });
  const byName = p.by?.startsWith("agent:") ? "Stock & Traceability Agent" : D.staffById(p.by || "GH")?.name || "Graham Hogan";
  log({ stream: p.by?.startsWith("agent:") ? "ai" : "people", actor: byName, title: "Requested transfer " + id, note: p.qty + " × " + p.sku + " to " + site.name + ". Waiting for John Culkin.", status: "awaiting", ref: id, refType: "transfer" });
  toast("Transfer " + id + " raised. Waiting for John's approval.", "info");
  return id;
}

/** Approve and execute a transfer: both locations update and a traceable movement is written. */
export function approveTransfer(id: string, by: D.StaffId = "JC") {
  const ap = getState().approvals.find(a => a.ref.type === "transfer" && a.ref.id === id && a.status === "Awaiting");
  if (ap) { decideApproval(ap.id, true, by); return; }
  completeTransfer(id, by);
}
function completeTransfer(id: string, by: D.StaffId) {
  const tr = getState().transfers.find(t => t.id === id);
  if (!tr || tr.status === "Completed") return;
  const src = getState().stock.find(l => l.loc === tr.from && l.sku === tr.sku && l.lot === tr.lot && l.qty >= tr.qty) || fefoLot(tr.sku);
  if (!src) { toast("Not enough stock in the main stockroom for " + id, "warn"); return; }
  const time = nowTime();
  set(s => {
    const stock = s.stock.map(l => l.id === src.id ? { ...l, qty: l.qty - tr.qty } : l);
    const dest = stock.find(l => l.loc === tr.to && l.sku === tr.sku && l.lot === src.lot);
    const min = s.stock.find(l => l.loc === tr.to && l.sku === tr.sku)?.min;
    const nextStock = dest ? stock.map(l => l === dest ? { ...l, qty: l.qty + tr.qty } : l)
      : stock.concat([{ id: "SL-" + (9000 + s.seq), sku: tr.sku, loc: tr.to, lot: src.lot, expiry: src.expiry, received: TODAY, qty: tr.qty, min, status: "Available" }]);
    return {
      stock: nextStock,
      movements: s.movements.concat([{ id: "MV-" + (90000 + s.seq), date: TODAY, time, type: "Transfer", sku: tr.sku, lot: src.lot, qty: tr.qty, from: tr.from, to: tr.to, ref: id, by, note: "Approved by " + (D.staffById(by)?.name || by) + ". Demo state: stock moved immediately." }]),
      transfers: s.transfers.map(t => t.id === id ? { ...t, status: "Completed", completed: TODAY, lot: src.lot } : t),
      tasks: s.tasks.map(t => t.related?.id === id ? { ...t, status: "Done" } : t),
      seq: s.seq + 1,
    };
  });
  const site = D.locById(tr.to)!;
  const after = getState().stock.filter(l => l.sku === tr.sku && l.loc === tr.to).reduce((a, l) => a + l.qty, 0);
  const central = getState().stock.filter(l => l.sku === tr.sku && l.loc === "DLM").reduce((a, l) => a + l.qty, 0);
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Approved transfer " + id, note: tr.qty + " × " + tr.sku + " moved to " + site.name + ". " + site.short + " now " + after + ", main stockroom " + central + ".", status: "completed", ref: id, refType: "transfer" });
  log({ stream: "ai", actor: "Stock & Traceability Agent", title: "Movement recorded for " + tr.sku, note: "Lot " + src.lot + " · " + tr.from + " → " + tr.to + " · " + id + ". Alert closed.", status: "completed", ref: tr.sku, refType: "product" });
  agentNote("stock", "Transfer " + id + " executed after approval. " + site.short + " at " + after + " against par " + (getState().stock.find(l => l.loc === tr.to && l.sku === tr.sku)?.min ?? "n/a") + ". Main stockroom down to " + central + ": reorder check queued for Purchasing.", tr.sku);
  toast(id + " approved: " + site.short + " now " + after + ", main stockroom " + central + ".");
}
export function rejectTransfer(id: string, by: D.StaffId = "JC") {
  set(s => ({ transfers: s.transfers.map(t => t.id === id ? { ...t, status: "Rejected" } : t) }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Rejected transfer " + id, note: "No stock moved.", status: "completed", ref: id, refType: "transfer" });
}

/* ── Generic stock movements (scanner transactions) ─────────────────────── */

export type MoveInput = { type: D.MoveType; sku: string; lot: string; serial?: string; expiry?: string; qty: number; from: string; to: string; ref?: string; by?: D.StaffId; note?: string };
/** Applies a scanned stock transaction: receipt, transfer, consumption, return or count adjustment. */
export function moveStock(m: MoveInput): boolean {
  const s0 = getState();
  const take = (stock: D.StockLine[], loc: string, qty: number): D.StockLine[] | null => {
    const line = stock.find(l => l.loc === loc && l.sku === m.sku && (m.serial ? l.serial === m.serial : l.lot === m.lot) && l.qty >= qty)
      || stock.find(l => l.loc === loc && l.sku === m.sku && l.qty >= qty && !m.serial);
    if (!line) return null;
    return stock.map(l => l === line ? { ...l, qty: l.qty - qty } : l);
  };
  const put = (stock: D.StockLine[], loc: string, qty: number): D.StockLine[] => {
    const line = stock.find(l => l.loc === loc && l.sku === m.sku && l.lot === m.lot && (m.serial ? l.serial === m.serial : !l.serial));
    if (line) return stock.map(l => l === line ? { ...l, qty: l.qty + qty } : l);
    return stock.concat([{ id: "SL-" + (9500 + s0.seq), sku: m.sku, loc: loc as D.LocId, lot: m.lot, serial: m.serial, expiry: m.expiry, received: TODAY, qty, status: "Available" }]);
  };
  let stock: D.StockLine[] | null = s0.stock;
  const isLoc = (x: string) => !!D.locById(x);
  if (isLoc(m.from)) stock = take(stock, m.from, m.qty);
  if (!stock) { toast("No matching stock at " + (D.locById(m.from)?.short || m.from) + " for that scan.", "warn"); return false; }
  if (isLoc(m.to)) stock = put(stock, m.to, m.qty);
  const ref = m.ref || ({ Receipt: "GRN-DEMO", Transfer: "TR-SCAN", Consumption: "USAGE", Return: "RMA-SCAN", "Count adjustment": "COUNT", Dispatch: "SO", Pick: "PICK" } as Record<string, string>)[m.type] + "-" + (100 + s0.seq);
  set(s => ({ stock: stock!, movements: s.movements.concat([{ id: "MV-" + (95000 + s.seq), date: TODAY, time: nowTime(), type: m.type, sku: m.sku, lot: m.lot, serial: m.serial, qty: m.qty, from: m.from, to: m.to, ref, by: m.by || "JC", note: m.note || "Scanned in Pulse (demo)." }]), seq: s.seq + 1 }));
  log({ stream: "people", actor: D.staffById(m.by || "JC")?.name || "Scanner", title: m.type + " scanned: " + m.qty + " × " + m.sku, note: "Lot " + m.lot + (m.serial ? " · serial " + m.serial : "") + " · " + (D.locById(m.from)?.short || m.from) + " → " + (D.locById(m.to)?.short || m.to), status: "completed", ref: m.sku, refType: "product" });
  return true;
}

/** Count adjustment: sets a line to the counted quantity and records the variance. */
export function recordCount(lineId: string, counted: number, by: D.StaffId = "JC") {
  const line = getState().stock.find(l => l.id === lineId);
  if (!line) return;
  const variance = counted - line.qty;
  set(s => ({
    stock: s.stock.map(l => l.id === lineId ? { ...l, qty: counted, status: "Available", note: variance ? "Counted " + counted + " on " + date(TODAY) + " (variance " + variance + ")." : "Count confirmed " + date(TODAY) + "." } : l),
    movements: variance ? s.movements.concat([{ id: "MV-" + (97000 + s.seq), date: TODAY, time: nowTime(), type: "Count adjustment", sku: line.sku, lot: line.lot, qty: variance, from: line.loc, to: line.loc, ref: "COUNT-" + (200 + s.seq), by, note: "Cycle count variance " + variance + "." }]) : s.movements,
    seq: s.seq + 1,
  }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Cycle count: " + line.sku + " at " + (D.locById(line.loc)?.short || line.loc), note: variance ? "Counted " + counted + ", system " + line.qty + ". Variance " + variance + " recorded." : "Count matches the system: " + counted + ".", status: "completed", ref: line.sku, refType: "product" });
  toast(variance ? "Variance of " + variance + " recorded for " + line.sku : "Count confirmed for " + line.sku);
}

/* ── Story B: order scanning and dispatch ───────────────────────────────── */

export function scanTargetFor(orderId: string, lineId: string): string {
  const o = orderById(orderId);
  const ln = o?.lines.find(l => l.id === lineId);
  if (!ln) return "";
  const p = D.productBySku(ln.sku)!;
  const sl = ln.serial ? getState().stock.find(l => l.serial === ln.serial) : p.tracking === "serial"
    ? getState().stock.find(l => l.sku === ln.sku && l.loc === "DLM" && l.serial && !getState().orders.some(oo => oo.lines.some(x => x.serial === l.serial)))
    : (ln.lot ? getState().stock.find(l => l.sku === ln.sku && l.lot === ln.lot) : fefoLot(ln.sku));
  return buildGs1({ gtin: p.gtin, expiry: sl?.expiry, lot: sl?.lot, serial: sl?.serial });
}

export function scanOrderLine(orderId: string, lineId: string, scan: { lot?: string; serial?: string; expiry?: string }, by: D.StaffId = "SO") {
  const o = orderById(orderId);
  if (!o) return;
  const ln = o.lines.find(l => l.id === lineId);
  if (!ln || ln.scanned) return;
  set(s => ({ orders: s.orders.map(x => x.id !== orderId ? x : { ...x, lines: x.lines.map(l => l.id === lineId ? { ...l, scanned: true, lot: scan.lot || l.lot, serial: scan.serial || l.serial } : l) }) }));
  const after = orderById(orderId)!;
  const prog = orderProgress(after);
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Scanned " + ln.sku + " on " + orderId, note: (scan.serial ? "Serial " + scan.serial : "Lot " + (scan.lot || ln.lot)) + (scan.expiry ? " · exp " + scan.expiry : "") + " · " + prog.scanned + "/" + prog.total + " lines", status: "completed", ref: orderId, refType: "order" });
  if (prog.scanned === prog.total) {
    set(s => ({ orders: s.orders.map(x => x.id === orderId ? { ...x, status: "Packed", note: "All lines scanned and validated. Ready for dispatch." } : x),
      tasks: s.tasks.map(t => t.related?.id === orderId && t.status !== "Done" ? { ...t, status: "Done" } : t) }));
    log({ stream: "ai", actor: "Order Flow Agent", title: orderId + " ready for dispatch", note: prog.total + "/" + prog.total + " lines validated against lot, serial and expiry. Courier cut-off 16:00.", status: "completed", ref: orderId, refType: "order" });
    toast(orderId + ": " + prog.total + "/" + prog.total + " scanned. Ready for dispatch.");
  } else toast(ln.sku + " validated · " + prog.scanned + "/" + prog.total, "info");
}

/** Demo helper: scan the next outstanding line with a valid barcode. */
export function simulateNextScan(orderId: string) {
  const o = orderById(orderId);
  const ln = o?.lines.find(l => !l.scanned);
  if (!o || !ln) return;
  const p = D.productBySku(ln.sku)!;
  const sl = p.tracking === "serial"
    ? getState().stock.find(l => l.sku === ln.sku && l.loc === "DLM" && l.serial && !getState().orders.some(oo => oo.lines.some(x => x.serial === l.serial)))
    : (ln.lot ? getState().stock.find(l => l.sku === ln.sku && l.lot === ln.lot) : fefoLot(ln.sku));
  scanOrderLine(orderId, ln.id, { lot: sl?.lot, serial: sl?.serial, expiry: sl?.expiry });
}

export function dispatchOrder(orderId: string, courier = "Overnight courier", by: D.StaffId = "SO") {
  const o = orderById(orderId);
  if (!o) return;
  if (o.lines.some(l => !l.scanned)) { toast("Scan every line before dispatching " + orderId, "warn"); return; }
  const time = nowTime();
  set(s => {
    let stock = s.stock.slice();
    const mv: D.Movement[] = [];
    for (const l of o.lines) {
      let need = l.qty;
      const cands = stock.filter(x => x.loc === "DLM" && x.sku === l.sku && x.qty > 0 && (l.serial ? x.serial === l.serial : true))
        .sort((a, b) => (a.lot === l.lot ? -1 : 0) - (b.lot === l.lot ? -1 : 0));
      for (const c of cands) {
        if (need <= 0) break;
        const take = Math.min(need, c.qty);
        need -= take;
        stock = stock.map(x => x.id === c.id ? { ...x, qty: x.qty - take } : x);
        mv.push({ id: "MV-" + (98000 + s.seq + mv.length), date: TODAY, time, type: "Dispatch", sku: l.sku, lot: c.lot, serial: c.serial, qty: take, from: "DLM", to: D.accountById(o.account)?.name || o.account, ref: orderId, by, note: "Dispatched by " + courier + "." });
      }
    }
    return { stock, movements: s.movements.concat(mv), seq: s.seq + mv.length + 1,
      orders: s.orders.map(x => x.id === orderId ? { ...x, status: "Dispatched", courier, dispatched: TODAY, tracking: "DEMO-" + (60000 + s.seq) } : x) };
  });
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Dispatched " + orderId, note: (D.accountById(o.account)?.name || "") + " · " + courier + " · " + eur(D.orderValue(o)), status: "completed", ref: orderId, refType: "order" });
  toast(orderId + " dispatched with " + courier + ".");
}

export function setOrderStatus(orderId: string, status: D.OrderStatus, note?: string) {
  set(s => ({ orders: s.orders.map(o => o.id === orderId ? { ...o, status, note: note ?? o.note, delivered: status === "Delivered" ? TODAY : o.delivered } : o) }));
  log({ stream: "people", actor: "Sharon O'Mongain", title: orderId + ": " + status, note: note || "", status: "completed", ref: orderId, refType: "order" });
}

export function createOrder(p: { account: string; lines: { sku: string; qty: number; lot?: string }[]; required?: string; poRef?: string; by?: D.StaffId }): string {
  const id = nextId("SO-", getState().orders, 4, 1047);
  const order: D.SalesOrder = { id, account: p.account, created: TODAY, required: p.required || addDays(TODAY, 1), status: "Confirmed", owner: p.by || "SO",
    poRef: p.poRef || "HPO-pending", lines: p.lines.map((l, i) => ({ id: "L" + (i + 1), sku: l.sku, qty: l.qty, price: D.productBySku(l.sku)!.unitPrice, lot: l.lot, scanned: false })) };
  set(s => ({ orders: s.orders.concat([order]) }));
  addTask({ title: "Pick and scan " + id, owner: "SO", due: order.required, priority: "Medium", dept: "Orders", related: { type: "order", id, label: id + " · " + (D.accountById(p.account)?.name || "") }, status: "Not started", createdBy: p.by || "SO" });
  log({ stream: "people", actor: D.staffById(p.by || "SO")?.name || "Sharon O'Mongain", title: "Created " + id, note: (D.accountById(p.account)?.name || "") + " · " + order.lines.length + " lines · " + eur(D.orderValue(order)) + ". Stock reserved.", status: "completed", ref: id, refType: "order" });
  toast(id + " confirmed and stock reserved.");
  return id;
}

/* ── Story C: sales planning ────────────────────────────────────────────── */

export function addActivity(a: Omit<D.SalesActivity, "id">): string {
  const id = nextId("SA-", getState().activities.concat(getState().proposals), 3, 200);
  set(s => ({ activities: s.activities.concat([{ id, ...a }]) }));
  const rep = D.staffById(a.rep)?.name || a.rep;
  log({ stream: a.source === "agent" ? "ai" : "people", actor: a.source === "planner" ? "Graham Hogan" : a.source === "agent" ? "Sales Agent" : rep,
    title: "Added to " + (D.staffById(a.rep)?.first || a.rep) + "'s plan: " + a.title, note: a.date + " " + a.time + (a.account ? " · " + (D.accountById(a.account)?.name || "") : ""), status: "completed", ref: a.opp || a.account, refType: a.opp ? "opp" : "account" });
  return id;
}
export function moveActivity(id: string, date: string, time?: string) {
  set(s => ({ activities: s.activities.map(a => a.id === id ? { ...a, date, time: time || a.time } : a) }));
}
export function removeActivity(id: string) { set(s => ({ activities: s.activities.filter(a => a.id !== id) })); }

export function completeActivity(id: string) {
  const a = getState().activities.find(x => x.id === id);
  if (!a) return;
  set(s => ({
    activities: s.activities.map(x => x.id === id ? { ...x, status: "Done" } : x),
    opps: a.opp ? s.opps.map(o => o.id === a.opp ? { ...o, lastActivity: TODAY, nextDue: addDays(TODAY, 7), nextAction: "Follow up with " + (D.accountById(o.account)?.name || "the account") } : o) : s.opps,
    tasks: a.opp ? s.tasks.map(t => t.related?.id === a.opp && t.status !== "Done" ? { ...t, status: "Done" } : t) : s.tasks,
  }));
  log({ stream: "people", actor: D.staffById(a.rep)?.name || a.rep, title: "Done: " + a.title, note: (a.account ? D.accountById(a.account)?.name + ". " : "") + (a.opp ? "Opportunity " + a.opp + " updated; follow-up no longer overdue." : ""), status: "completed", ref: a.opp || a.account, refType: a.opp ? "opp" : "account" });
  toast("Marked done: " + a.title);
}

/** The Sales Agent drafts a plan. Nothing is committed until someone accepts it. */
export function generatePlan(rep: D.StaffId, weekStart: string) {
  const days = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
  const existing = getState().activities.filter(a => a.rep === rep && days.includes(a.date));
  const theirs = openOpps().filter(o => o.owner === rep).sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1));
  const accountsQuiet = D.ACCOUNTS.filter(a => a.owner === rep && daysAgo(a.lastVisit) >= 14);
  const slots = ["09:00", "11:00", "14:00", "16:00"];
  const out: D.SalesActivity[] = [];
  let n = 0;
  const free = (date: string) => slots.find(t => !existing.concat(out).some(a => a.date === date && a.time === t));
  const push = (date: string, type: D.ActType, title: string, account?: string, opp?: string, priority: D.SalesActivity["priority"] = "Medium", note?: string) => {
    const time = free(date);
    if (!time) return;
    out.push({ id: "PR-" + rep + "-" + (++n) + "-" + getState().seq, rep, date, time, type, title, account, opp, status: "Planned", priority, source: "agent", note });
  };
  theirs.filter(o => o.nextDue < TODAY).forEach((o, i) => push(days[Math.min(i, 1)], "Follow-up", "Overdue follow-up: " + o.title, o.account, o.id, "High", "Quiet " + daysAgo(o.lastActivity) + " days · " + eur(o.value)));
  accountsQuiet.slice(0, 3).forEach((a, i) => push(days[2 + (i % 3)], "Visit", "Account visit: " + a.name, a.id, undefined, "Medium", "Not visited for " + daysAgo(a.lastVisit) + " days"));
  theirs.filter(o => o.nextDue >= TODAY).slice(0, 4).forEach((o, i) => push(days[(i + 1) % 5], o.stage === "Quotation" ? "Follow-up" : "Meeting", o.nextAction, o.account, o.id, o.stage === "Negotiation" ? "High" : "Medium"));
  set(s => ({ proposals: s.proposals.filter(p => p.rep !== rep).concat(out), seq: s.seq + 1 }));
  log({ stream: "ai", actor: "Sales Agent", title: "Drafted a plan for " + (D.staffById(rep)?.first || rep), note: out.length + " suggested activities for w/c " + weekStart + ". Nothing added until approved.", status: "awaiting" });
  return out.length;
}
export function acceptProposal(id: string) {
  const p = getState().proposals.find(x => x.id === id);
  if (!p) return;
  set(s => ({ proposals: s.proposals.filter(x => x.id !== id) }));
  const { id: _omit, ...rest } = p;
  addActivity({ ...rest, source: "planner" });
}
export function dismissProposal(id: string) { set(s => ({ proposals: s.proposals.filter(x => x.id !== id) })); }
export function acceptAllProposals(rep: string) {
  getState().proposals.filter(p => p.rep === rep).forEach(p => acceptProposal(p.id));
  toast("Plan approved for " + (D.staffById(rep)?.first || rep) + ".");
}
export function updateOpp(id: string, patch: Partial<D.Opportunity>) {
  set(s => ({ opps: s.opps.map(o => o.id === id ? { ...o, ...patch } : o) }));
}

/* ── Story D: receivables ───────────────────────────────────────────────── */

/** Margaret sends a reminder. Agents may draft it; a person sends it. */
export function sendReminder(invId: string, by: D.StaffId = "MD") {
  const inv = getState().invoices.find(i => i.id === invId);
  if (!inv) return;
  set(s => ({ invoices: s.invoices.map(i => i.id === invId ? { ...i, reminders: i.reminders + 1, lastReminder: TODAY } : i) }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Reminder sent for " + invId, note: (D.accountById(inv.account)?.name || "") + " · " + eur(inv.amount) + " · reminder " + (inv.reminders + 1) + ". Demo: no email actually sent.", status: "completed", ref: invId, refType: "invoice" });
  toast("Reminder logged for " + invId + " (demo, nothing sent).");
}

export function matchBank(txnId: string, invId?: string, by: D.StaffId = "MD") {
  const t = getState().bank.find(x => x.id === txnId);
  if (!t) return;
  const inv = invId ? getState().invoices.find(i => i.id === invId) : undefined;
  set(s => ({
    bank: s.bank.map(x => x.id === txnId ? { ...x, state: "Matched", suggest: invId || x.suggest } : x),
    invoices: inv && t.amount >= inv.amount ? s.invoices.map(i => i.id === invId ? { ...i, status: "Paid", paid: TODAY } : i) : s.invoices,
  }));
  const paid = !!inv && t.amount >= inv.amount;
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Matched bank line " + txnId, note: (invId ? invId + (paid ? " marked paid · " : " part payment noted, invoice stays open · ") : "") + eur(t.amount) + ". Demo state only: nothing posted to accounting.", status: "completed", ref: invId || txnId, refType: invId ? "invoice" : "bank" });
  toast(invId ? (paid ? invId + " matched and marked paid (demo)." : "Part payment noted against " + invId + ". Invoice stays open.") : txnId + " matched.");
}
export function setBankState(txnId: string, st: D.BankTxn["state"], note?: string) {
  set(s => ({ bank: s.bank.map(x => x.id === txnId ? { ...x, state: st, note: note ?? x.note } : x) }));
}

/* ── Story E: supplier invoice discrepancy ──────────────────────────────── */

/** Creates Margaret's review task. The bill is held; nothing is approved or posted. */
export function createBillReviewTask(billId: string, by: D.StaffId = "MD") {
  const b = getState().bills.find(x => x.id === billId);
  if (!b) return;
  const existing = getState().tasks.find(t => t.related?.id === billId && t.status !== "Done" && t.id !== "T-102");
  if (existing) { toast("A review task for " + billId + " already exists.", "info"); return; }
  set(s => ({ bills: s.bills.map(x => x.id === billId ? { ...x, status: "Under review" } : x) }));
  const extra = b.invoicedQty && b.expectedQty ? (b.invoicedQty - b.expectedQty) * 290 : 0;
  patchTask("T-102", { status: "In progress" });
  const id = addTask({ title: "Investigate " + billId + ": request credit note from " + (D.supplierById(b.supplier)?.name || ""), owner: by, due: addDays(TODAY, 2), priority: "High", dept: "Finance",
    related: { type: "bill", id: billId, label: billId + " · " + eur(b.amount) }, status: "Not started", createdBy: "agent:finance",
    note: b.invoicedQty ? "Billed " + b.invoicedQty + ", ordered and received " + b.expectedQty + ". Ask for a credit note of " + eur(extra) + " or a corrected invoice. Pay the undisputed " + eur(b.amount - extra) + " only after approval." : b.detail });
  set(s => ({ approvals: [{ id: nextId("AP-", s.approvals, 2, 74), kind: "Bill resolution", title: billId + ": hold " + eur(extra || b.amount) + " pending credit note", requestedBy: by, approver: "GH", value: extra || b.amount, raised: TODAY, status: "Awaiting", ref: { type: "bill", id: billId },
    detail: "Margaret proposes paying only the matched amount once a credit note arrives. No payment or posting happens from Pulse." } as D.Approval, ...s.approvals] }));
  agentNote("finance", "Suggested next action for " + billId + ": request a credit note for " + (b.invoicedQty! - b.expectedQty!) + " units (" + eur(extra) + ") from " + (D.supplierById(b.supplier)?.name || "") + "; hold the disputed amount. Recorded on " + id + ". No financial posting made.", billId);
  agentNote("purchasing", "Three-way match on " + billId + ": PO-337 ordered 12, GRN-0419 received 12, invoice billed 14. Variance 2 units (" + eur(extra) + ").", billId);
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Opened review of " + billId, note: "Task " + id + " created. Bill held. No financial posting made.", status: "awaiting", ref: billId, refType: "bill" });
  log({ stream: "ai", actor: "Finance Agent", title: "Recorded next action on " + billId, note: "Request credit note for " + eur(extra) + ". Waiting for Margaret.", status: "awaiting", ref: billId, refType: "bill" });
  toast("Review task " + id + " created. No financial posting made.", "info");
  return id;
}
export function setBillStatus(billId: string, status: D.BillStatus, note?: string) {
  set(s => ({ bills: s.bills.map(b => b.id === billId ? { ...b, status } : b) }));
  log({ stream: "people", actor: "Margaret Duff", title: billId + ": " + status, note: note || "Demo state only: nothing posted to accounting.", status: "completed", ref: billId, refType: "bill" });
}

/* ── Purchasing ─────────────────────────────────────────────────────────── */

export function createPO(supplier: D.SupplierId, lines: { sku: string; qty: number }[], by: D.StaffId = "SO"): string {
  const id = nextId("PO-", getState().pos, 3, 341);
  const p: D.PurchaseOrder = { id, supplier, created: TODAY, expected: addDays(TODAY, D.supplierById(supplier)?.leadDays || 10), status: "Draft", freight: 0, raisedBy: by,
    lines: lines.map(l => ({ sku: l.sku, qty: l.qty, cost: D.productBySku(l.sku)!.unitCost, received: 0 })), note: "Drafted from reorder recommendations." };
  const value = D.poValue(p);
  const needsApproval = value > 5000;
  p.status = needsApproval ? "Awaiting approval" : "Draft";
  set(s => ({ pos: [p, ...s.pos] }));
  if (needsApproval) set(s => ({ approvals: [{ id: nextId("AP-", s.approvals, 2, 74), kind: "Purchase order", title: id + " to " + (D.supplierById(supplier)?.name || ""), requestedBy: by, approver: "GH", value, raised: TODAY, status: "Awaiting", ref: { type: "po", id }, detail: "Raised from reorder recommendations. Over €5,000." } as D.Approval, ...s.approvals] }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Drafted " + id, note: (D.supplierById(supplier)?.name || "") + " · " + lines.length + " lines · " + eur(value) + (needsApproval ? " · needs Graham's approval" : ""), status: needsApproval ? "awaiting" : "completed", ref: id, refType: "po" });
  toast(id + " drafted" + (needsApproval ? " and sent for approval." : "."));
  return id;
}
export function setPOStatus(poId: string, status: D.POStatus) {
  set(s => ({ pos: s.pos.map(p => p.id === poId ? { ...p, status } : p) }));
  log({ stream: "people", actor: "Sharon O'Mongain", title: poId + ": " + status, note: "", status: "completed", ref: poId, refType: "po" });
}
/** Receive a PO line by scan: adds stock, writes a receipt movement and a GRN. */
export function receivePO(poId: string, lines: { sku: string; qty: number; lot: string; expiry?: string }[], by: D.StaffId = "SO"): string {
  const p = getState().pos.find(x => x.id === poId);
  const grnId = nextId("GRN-0", getState().grns, 3, 419);
  lines.forEach(l => moveStock({ type: "Receipt", sku: l.sku, lot: l.lot, expiry: l.expiry, qty: l.qty, from: p?.supplier || "Supplier", to: "DLM", ref: poId, by, note: grnId + ": received and scanned." }));
  set(s => ({
    grns: [{ id: grnId, po: poId, date: TODAY, by, status: "Passed", lines, checks: [{ k: "Packaging intact", ok: true }, { k: "Quantity matches PO", ok: true }, { k: "UDI / GS1 label scanned", ok: true }, { k: "Lot and expiry captured", ok: true }, { k: "Documentation present", ok: true }, { k: "Storage conditions met", ok: true }] } as D.GRN, ...s.grns],
    pos: s.pos.map(x => x.id !== poId ? x : { ...x, lines: x.lines.map(pl => { const r = lines.find(l => l.sku === pl.sku); return r ? { ...pl, received: Math.min(pl.qty, pl.received + r.qty) } : pl; }) })
      .map(x => x.id !== poId ? x : { ...x, status: x.lines.every(l => l.received >= l.qty) ? "Received" : "Part received" }),
  }));
  toast(grnId + " booked in against " + poId + ".");
  return grnId;
}

/* ── Story F: NICE1 rentals ─────────────────────────────────────────────── */

export function completeRentalStep(bookingId: string, idx: number) {
  set(s => ({ bookings: s.bookings.map(b => b.id !== bookingId ? b : { ...b, steps: b.steps?.map((st, i) => i === idx ? { ...st, done: !st.done } : st) }) }));
}
export function dispatchRental(bookingId: string, by: D.StaffId = "JC") {
  const b = getState().bookings.find(x => x.id === bookingId);
  if (!b) return;
  set(s => ({
    bookings: s.bookings.map(x => x.id === bookingId ? { ...x, status: "Dispatched", steps: x.steps?.map(st => ({ ...st, done: true })) } : x),
    assets: s.assets.map(a => a.id === b.asset ? { ...a, status: "On hire" } : a),
    tasks: s.tasks.map(t => t.related?.id === bookingId && t.status !== "Done" ? { ...t, status: "Done" } : t),
  }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Dispatched " + bookingId + " (" + b.asset + ")", note: b.pkg + " · " + eur(b.price) + " · hire " + b.start + " to " + b.end + ". Invoice raised on the start date.", status: "completed", ref: bookingId, refType: "booking" });
  toast(bookingId + " dispatched. " + b.asset + " now out on hire.");
}
export function approveExtension(bookingId: string, silent = false) {
  const b = getState().bookings.find(x => x.id === bookingId);
  if (!b || !b.extension) return;
  set(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, end: addDays(x.end, 7 * (x.extension?.weeks || 1)), price: x.price + (x.extension?.fee || 0), extension: { ...x.extension!, state: "Approved" } } : x),
    tasks: s.tasks.map(t => t.related?.id === bookingId && t.status !== "Done" ? { ...t, status: "Done" } : t) }));
  if (!silent) { log({ stream: "people", actor: "John Culkin", title: "Extended " + bookingId, note: "+1 week · +" + eur(b.extension.fee), status: "completed", ref: bookingId, refType: "booking" }); toast(bookingId + " extended by one week."); }
}
export function returnRental(bookingId: string) {
  const b = getState().bookings.find(x => x.id === bookingId);
  if (!b) return;
  set(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, status: "Returned" } : x), assets: s.assets.map(a => a.id === b.asset ? { ...a, status: "Inspection", booking: undefined } : a) }));
  log({ stream: "people", actor: "John Culkin", title: "Returned " + bookingId, note: (b.asset || "") + " booked in for cleaning and inspection.", status: "completed", ref: bookingId, refType: "booking" });
  toast(bookingId + " returned. " + b.asset + " queued for inspection.");
}
export function completeInspection(assetId: string) {
  set(s => ({ assets: s.assets.map(a => a.id === assetId ? { ...a, status: "Available", cleaned: TODAY } : a), bookings: s.bookings.map(b => b.asset === assetId && b.status === "Returned" ? { ...b, status: "Completed" } : b) }));
  log({ stream: "people", actor: "John Culkin", title: "Cleaned and inspected " + assetId, note: "Available for hire.", status: "completed", ref: assetId, refType: "rental" });
  toast(assetId + " cleaned, inspected and available.");
}
export function confirmBooking(bookingId: string, assetId: string) {
  set(s => ({ bookings: s.bookings.map(b => b.id === bookingId ? { ...b, status: "Reserved", asset: assetId } : b), assets: s.assets.map(a => a.id === assetId ? { ...a, status: "Reserved", booking: bookingId } : a) }));
  log({ stream: "people", actor: "John Culkin", title: "Reserved " + assetId + " for " + bookingId, note: "Enquiry confirmed.", status: "completed", ref: bookingId, refType: "booking" });
  toast(bookingId + " confirmed on " + assetId + ".");
}

/* ── Compliance, returns, loan sets ─────────────────────────────────────── */

export function setQxStatus(id: string, status: D.QualityException["status"], by: D.StaffId = "JC") {
  set(s => ({ qx: s.qx.map(q => q.id === id ? { ...q, status } : q) }));
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: id + ": " + status, note: "Quality exception updated. Human decision recorded.", status: "completed", ref: id, refType: "qx" });
}
export function runTraceDrill(sku: string, lot: string, by: D.StaffId = "GH") {
  log({ stream: "people", actor: D.staffById(by)?.name || by, title: "Ran a SIMULATED traceability drill", note: sku + " lot " + lot + ". Exercise only: no recall exists.", status: "completed", ref: sku, refType: "product" });
}
export function setReturnStatus(id: string, status: D.ReturnRec["status"]) {
  set(s => ({ returns: s.returns.map(r => r.id === id ? { ...r, status } : r) }));
  log({ stream: "people", actor: "Sharon O'Mongain", title: id + ": " + status, note: "", status: "completed", ref: id, refType: "return" });
}
export function setLoanSetStatus(id: string, status: D.LoanSet["status"], patch?: Partial<D.LoanSet>) {
  set(s => ({ loanSets: s.loanSets.map(l => l.id === id ? { ...l, status, ...(patch || {}) } : l) }));
  log({ stream: "people", actor: "John Culkin", title: id + ": " + status, note: D.LOAN_SETS.find(l => l.id === id)?.name || "", status: "completed", ref: id, refType: "loanset" });
  toast(id + ": " + status + ".");
}

/* Dev aid: expose the store for console poking during the demo build. */
if (typeof window !== "undefined") (window as any).__hogan = { getState, nav, openRecord, resetDemo };
