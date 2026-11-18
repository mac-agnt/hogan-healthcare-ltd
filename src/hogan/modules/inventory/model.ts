/* Inventory: pure derivations over the live demo state.
   Every figure on the Inventory and Compliance screens comes from here or from
   the store selectors, so the numbers agree everywhere. Nothing in this file
   changes state. */

import * as D from "../../data";
import { TODAY, addDays } from "../../fmt";
import { locTotals, onOrder, productStock, stockValue, type HState, type SiteLow } from "../../store";

/* ── Per-SKU status ─────────────────────────────────────────────────────── */

export type Flag = "Quarantine" | "Verify" | "Expiring" | "Low";
export type RowStatus = Flag | "OK";
export const FLAGS: Flag[] = ["Quarantine", "Verify", "Expiring", "Low"];
/** Lines expiring within this many days count as "Expiring". */
export const EXPIRY_WINDOW = 90;

export type SkuRow = {
  p: D.Product;
  sup?: D.Supplier;
  cat?: (typeof D.CATEGORIES)[number];
  total: number; central: number; hospital: number; reserved: number; available: number; onOrder: number; value: number;
  byLoc: Record<string, number>;
  lines: D.StockLine[];
  lots: string[];
  serials: string[];
  nearest?: string;
  flags: Flag[];
  status: RowStatus;
  siteLow: SiteLow[];
};

export function skuRows(s: HState): SkuRow[] {
  const low = siteLows(s);
  return D.PRODUCTS.map(p => rowFor(s, p, low));
}

/** One SKU's row (product drawer, alerts). */
export function skuRow(s: HState, sku: string): SkuRow | undefined {
  const p = D.productBySku(sku);
  return p ? rowFor(s, p, siteLows(s)) : undefined;
}

function rowFor(s: HState, p: D.Product, low: SiteLow[]): SkuRow {
  const limit = addDays(TODAY, EXPIRY_WINDOW);
  const ps = productStock(p.sku, s);
  const lines = ps.lines;
  const siteLow = low.filter(x => x.line.sku === p.sku);
  const exp = lines.filter(l => l.expiry).map(l => l.expiry as string).sort();
  const flags: Flag[] = [];
  if (lines.some(l => l.status === "Quarantine")) flags.push("Quarantine");
  if (lines.some(l => l.status === "Verify")) flags.push("Verify");
  if (exp[0] && exp[0] <= limit) flags.push("Expiring");
  if (siteLow.length || ps.available < p.minCentral) flags.push("Low");
  return {
    p, sup: D.supplierById(p.supplier), cat: D.catById(p.cat),
    total: ps.total, central: ps.central, hospital: ps.hospital, reserved: ps.reserved, available: ps.available,
    onOrder: onOrder(p.sku, s), value: ps.value, byLoc: ps.byLoc, lines,
    lots: Array.from(new Set(lines.map(l => l.lot))),
    serials: lines.filter(l => l.serial).map(l => l.serial as string),
    nearest: exp[0], flags, status: flags[0] || "OK", siteLow,
  };
}

/* ── Par levels ─────────────────────────────────────────────────────────── */

/** Consignment products below par, judged on the site's total for the SKU.
    (A top-up from a different lot adds a second line at the site, so a
    line-by-line check would flag the product twice after replenishment.) */
export function siteLows(s: HState): SiteLow[] {
  const groups = new Map<string, D.StockLine[]>();
  for (const l of s.stock) {
    if (l.loc === "DLM") continue;
    const k = l.sku + "|" + l.loc;
    const g = groups.get(k);
    if (g) g.push(l); else groups.set(k, [l]);
  }
  const out: SiteLow[] = [];
  for (const ls of groups.values()) {
    const rep = ls.find(l => l.min !== undefined);
    if (!rep || rep.min === undefined) continue;
    const qty = ls.reduce((a, l) => a + l.qty, 0);
    if (qty >= rep.min) continue;
    out.push({
      line: { ...rep, qty }, suggested: rep.min - qty + 1,
      pending: s.transfers.find(t => t.sku === rep.sku && t.to === rep.loc && (t.status === "Awaiting approval" || t.status === "Proposed")),
      centralAvail: productStock(rep.sku, s).available,
    });
  }
  return out;
}

export type SiteSku = { sku: string; p?: D.Product; lines: D.StockLine[]; qty: number; par?: number; low?: SiteLow; nearest?: string; status: "Below par" | "Verify" | "Quarantine" | "OK" };

/** A site's stock grouped by product, with the par level judged on the total. */
export function siteSkus(s: HState, loc: string, low: SiteLow[]): SiteSku[] {
  const by = new Map<string, D.StockLine[]>();
  for (const l of s.stock) if (l.loc === loc && l.qty > 0) { const g = by.get(l.sku); if (g) g.push(l); else by.set(l.sku, [l]); }
  const rank = { "Below par": 0, Verify: 1, Quarantine: 2, OK: 3 };
  return Array.from(by.entries()).map(([sku, lines]) => {
    const lo = low.find(x => x.line.sku === sku && x.line.loc === loc);
    const par = s.stock.find(l => l.loc === loc && l.sku === sku && l.min !== undefined)?.min;
    const exp = lines.filter(l => l.expiry).map(l => l.expiry as string).sort()[0];
    const status: SiteSku["status"] = lo ? "Below par" : lines.some(l => l.status === "Verify") ? "Verify" : lines.some(l => l.status === "Quarantine") ? "Quarantine" : "OK";
    return { sku, p: D.productBySku(sku), lines, qty: lines.reduce((a, l) => a + l.qty, 0), par, low: lo, nearest: exp, status };
  }).sort((a, b) => rank[a.status] - rank[b.status] || (a.p?.name || "").localeCompare(b.p?.name || ""));
}

/* ── Locations and consignment sites ────────────────────────────────────── */

export function lineValue(l: D.StockLine): number {
  return l.qty * (D.productBySku(l.sku)?.unitCost || 0);
}

/** Last replenishment: the site record, any transfer completed since, or a transfer scanned in today. */
export function lastReplenished(s: HState, loc: D.Location): string | undefined {
  let d = loc.lastReplenished;
  for (const t of s.transfers) if (t.to === loc.id && t.status === "Completed" && t.completed && (!d || t.completed > d)) d = t.completed;
  for (const m of s.movements) if (m.type === "Transfer" && m.to === loc.id && m.date === TODAY && (!d || m.date > d)) d = m.date;
  return d;
}

/** Hospital usage reported from a site within the last `days` days. */
export function usageAt(s: HState, loc: string, days = 30): D.Movement[] {
  const from = addDays(TODAY, -days);
  return s.movements.filter(m => m.type === "Consumption" && m.from === loc && m.date > from)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export function pendingTransfersTo(s: HState, loc: string): D.Transfer[] {
  return s.transfers.filter(t => t.to === loc && (t.status === "Awaiting approval" || t.status === "Proposed"));
}

export type SiteStat = {
  loc: D.Location; account?: D.Account; units: number; value: number; lines: D.StockLine[]; skus: SiteSku[];
  low: SiteLow[]; verify: D.StockLine[]; used: D.Movement[]; usedUnits: number; lastRepl?: string;
  pending: D.Transfer[]; cats: { cat: (typeof D.CATEGORIES)[number]; units: number; lines: number }[];
};

export function siteStat(s: HState, loc: D.Location, low: SiteLow[] = siteLows(s)): SiteStat {
  const lines = s.stock.filter(l => l.loc === loc.id && l.qty > 0);
  const used = usageAt(s, loc.id, 30);
  const cats = D.CATEGORIES.map(c => {
    const ls = lines.filter(l => D.productBySku(l.sku)?.cat === c.id);
    return { cat: c, units: ls.reduce((a, l) => a + l.qty, 0), lines: ls.length };
  }).filter(c => c.lines > 0).sort((a, b) => b.units - a.units);
  return {
    loc, account: D.accountForLoc(loc.id), lines, skus: siteSkus(s, loc.id, low),
    units: locTotals(s)[loc.id], value: stockValue(s, loc.id),
    low: low.filter(x => x.line.loc === loc.id),
    verify: lines.filter(l => l.status === "Verify"),
    used, usedUnits: used.reduce((a, m) => a + m.qty, 0),
    lastRepl: lastReplenished(s, loc), pending: pendingTransfersTo(s, loc.id), cats,
  };
}

/** A SKU's quantity at a location straight after a given movement: today's
    figure with every later movement of that SKU unwound. */
export function qtyAfter(s: HState, sku: string, loc: string, mvId: string): number {
  const now = s.stock.filter(l => l.sku === sku && l.loc === loc).reduce((a, l) => a + l.qty, 0);
  const i = s.movements.findIndex(m => m.id === mvId);
  if (i < 0) return now;
  let later = 0;
  for (const m of s.movements.slice(i + 1)) {
    if (m.sku !== sku) continue;
    if (m.type === "Count adjustment") { if (m.from === loc) later += m.qty; continue; }
    if (m.to === loc) later += m.qty;
    if (m.from === loc) later -= m.qty;
  }
  return now - later;
}

/* ── Movement references ────────────────────────────────────────────────── */

/** Which record type a reference points to, and whether that record exists in the demo state. */
export function refInfo(s: HState, ref?: string): { type?: string; exists: boolean } {
  if (!ref) return { exists: false };
  if (ref.startsWith("TR-")) return { type: "transfer", exists: s.transfers.some(t => t.id === ref) || s.movements.some(m => m.ref === ref) };
  if (ref.startsWith("PO-")) return { type: "po", exists: s.pos.some(p => p.id === ref) };
  if (ref.startsWith("SO-")) return { type: "order", exists: s.orders.some(o => o.id === ref) };
  if (ref.startsWith("INV-")) return { type: "invoice", exists: s.invoices.some(i => i.id === ref) };
  if (ref.startsWith("BILL-")) return { type: "bill", exists: s.bills.some(b => b.id === ref) };
  if (ref.startsWith("GRN-")) return { type: "grn", exists: s.grns.some(g => g.id === ref) };
  if (ref.startsWith("RMA-")) return { type: "return", exists: s.returns.some(r => r.id === ref) };
  if (ref.startsWith("MV-")) return { type: "movement", exists: s.movements.some(m => m.id === ref) };
  return { exists: false };
}

/** Readable name for a movement end point: a location, a supplier or a free-text destination. */
export function whereName(x: string, long = false): string {
  const l = D.locById(x);
  if (l) return long ? l.name : l.short;
  const sp = D.supplierById(x);
  if (sp) return sp.name;
  return x;
}

/* ── Lots and traceability ──────────────────────────────────────────────── */

export const lotKey = (sku: string, lot: string) => sku + "|" + lot;
export function splitLotKey(id: string): { sku: string; lot: string } {
  const i = id.indexOf("|");
  return i < 0 ? { sku: id, lot: "" } : { sku: id.slice(0, i), lot: id.slice(i + 1) };
}

/** Every lot a SKU has had (stock lines and movement history), newest receipt first. */
export function lotsOf(s: HState, sku: string): string[] {
  const seen = new Map<string, string>();
  for (const m of s.movements) if (m.sku === sku && m.lot) { const d = seen.get(m.lot); if (!d || m.date < d) seen.set(m.lot, m.date); }
  for (const l of s.stock) if (l.sku === sku && l.lot && !seen.has(l.lot)) seen.set(l.lot, l.received);
  return Array.from(seen.entries()).sort((a, b) => b[1].localeCompare(a[1])).map(e => e[0]);
}

export type Drill = {
  sku: string; lot: string; p?: D.Product; sup?: D.Supplier; moves: D.Movement[];
  held: D.StockLine[]; heldUnits: number; heldLocs: string[];
  received: number; consumed: D.Movement[]; consumedUnits: number; dispatched: D.Movement[]; dispatchedUnits: number;
  sites: D.Location[]; customers: string[]; serials: string[];
};

/** Everything a traceability drill needs for one lot, from the live movement history. */
export function drillFor(s: HState, sku: string, lot: string): Drill {
  const moves = s.movements.filter(m => m.sku === sku && m.lot === lot).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const held = s.stock.filter(l => l.sku === sku && l.lot === lot && l.qty > 0);
  const consumed = moves.filter(m => m.type === "Consumption");
  const dispatched = moves.filter(m => m.type === "Dispatch");
  const siteIds = new Set<string>();
  held.forEach(l => { if (l.loc !== "DLM") siteIds.add(l.loc); });
  moves.forEach(m => { if (D.locById(m.to)?.kind === "consignment") siteIds.add(m.to); if (D.locById(m.from)?.kind === "consignment") siteIds.add(m.from); });
  return {
    sku, lot, p: D.productBySku(sku), sup: D.supplierById(D.productBySku(sku)?.supplier || ""), moves, held,
    heldUnits: held.reduce((a, l) => a + l.qty, 0), heldLocs: Array.from(new Set(held.map(l => l.loc))),
    received: moves.filter(m => m.type === "Receipt").reduce((a, m) => a + m.qty, 0),
    consumed, consumedUnits: consumed.reduce((a, m) => a + m.qty, 0),
    dispatched, dispatchedUnits: dispatched.reduce((a, m) => a + m.qty, 0),
    sites: D.SITES.filter(l => siteIds.has(l.id)),
    customers: Array.from(new Set(dispatched.map(m => m.to))),
    serials: Array.from(new Set(held.filter(l => l.serial).map(l => l.serial as string).concat(moves.filter(m => m.serial).map(m => m.serial as string)))),
  };
}

/* ── Cycle counts ───────────────────────────────────────────────────────── */

/* Demo count calendar. Consignment shelves are counted on each replenishment
   visit (monthly); the main stockroom is counted one category zone a week.
   Eastgate was last counted on 14 Nov (the count that found the variance). */
export const COUNT_CADENCE: Record<D.LocId, number> = { DLM: 7, HAR: 30, SDS: 30, LIF: 30, EAS: 30, ATL: 30, BLK: 30, RIV: 30, WES: 30 };
const COUNT_BASE: Partial<Record<D.LocId, string>> = { DLM: "2026-11-13", EAS: "2026-11-14" };
/** Main stockroom zones, counted in this order; Arthroscopy was counted on 13 Nov. */
export const DLM_ZONES: D.CatId[] = ["AC", "OR", "SM", "PT", "AR", "IN"];
export const LAST_DLM_ZONE: D.CatId = "AC";

const countedToday = (l: D.StockLine) => !!l.note && l.note.startsWith("Count") && l.note.includes(TODAY);

export function lastCount(s: HState, loc: D.Location): string {
  let d = COUNT_BASE[loc.id] || loc.lastReplenished || "2026-10-01";
  for (const m of s.movements) if (m.type === "Count adjustment" && m.from === loc.id && m.date > d) d = m.date;
  if (s.stock.some(l => l.loc === loc.id && countedToday(l))) d = TODAY;
  return d;
}

export type PlanRow = { loc: D.Location; last: string; next: string; lines: D.StockLine[]; state: "Overdue" | "Due this week" | "Scheduled" | "Counted today" };

export function countPlan(s: HState): PlanRow[] {
  const week = addDays(TODAY, 7);
  return D.LOCATIONS.map(loc => {
    const last = lastCount(s, loc);
    const next = addDays(last, COUNT_CADENCE[loc.id]);
    const all = s.stock.filter(l => l.loc === loc.id && (l.qty > 0 || countedToday(l)));
    const zone = DLM_ZONES[(DLM_ZONES.indexOf(LAST_DLM_ZONE) + 1) % DLM_ZONES.length];
    const lines = loc.id === "DLM" ? all.filter(l => D.productBySku(l.sku)?.cat === zone) : all;
    const state: PlanRow["state"] = last === TODAY ? "Counted today" : next < TODAY ? "Overdue" : next <= week ? "Due this week" : "Scheduled";
    return { loc, last, next, lines, state };
  });
}

/** Count accuracy over the last 30 days: lines counted versus lines that showed a variance. */
export function countAccuracy(s: HState): { counted: number; variances: number; pct: number } {
  const since = addDays(TODAY, -30);
  let counted = 0, variances = 0;
  for (const loc of D.LOCATIONS) {
    if (lastCount(s, loc) <= since) continue;
    const lines = s.stock.filter(l => l.loc === loc.id && (loc.id !== "DLM" || D.productBySku(l.sku)?.cat === LAST_DLM_ZONE || countedToday(l)));
    counted += lines.length;
    variances += lines.filter(l => l.status === "Verify").length;
  }
  variances += s.movements.filter(m => m.type === "Count adjustment" && m.date > since).length;
  return { counted, variances, pct: counted ? Math.max(0, (1 - variances / counted) * 100) : 100 };
}

/** The counted (or reported) figure behind a "Verify" line, read from its note. */
export function verifyDetail(l: D.StockLine): { kind: "count" | "usage" | "other"; counted?: number; used?: number } {
  const n = l.note || "";
  const c = n.match(/found (\d+)/i);
  if (c) return { kind: "count", counted: Number(c[1]) };
  const u = n.match(/reported (\d+) unit/i);
  if (u) return { kind: "usage", used: Number(u[1]) };
  return { kind: "other" };
}
