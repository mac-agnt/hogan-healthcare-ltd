/* ─────────────────────────────────────────────────────────────────────────────
   Finance and Dashboard derivations.

   Pure functions over data.ts and the live store state, so every Finance and
   Dashboard screen shows the same numbers as the rest of Hogan Healthcare OS.
   Nothing here is hard-coded: totals are summed from the records so that the
   figures visibly reconcile. All figures are fictional demonstration data.
   ───────────────────────────────────────────────────────────────────────────── */

import * as D from "../../data";
import {
  type HState, BILL_EXCEPTIONS, overdueInvoices, overdueTotal, openOpps, overdueFollowups,
  locTotals, stockValue, expiringLines, lowSiteLines, reorderRecs, openOrders, orderById, orderProgress,
} from "../../store";
import { TODAY, addDays, daysAgo, daysUntil, date } from "../../fmt";

export const FIN = D.FIN;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const MONTH_START = TODAY.slice(0, 8) + "01";
export const MTD_LABEL = "1 to " + date(TODAY);
export const CHART = ["var(--accent)", "#267985", "#7FB8C9", "#9FB5D9", "#D9C27A", "#E0A98C", "#B9A9D9"];

/* ── Profit and loss (November to date) ────────────────────────────────── */

export type Pnl = {
  revenue: number; cogs: number; gp: number; opex: number; ebitda: number; gm: number; em: number;
  cogsPct: number; opexPct: number; reconciles: boolean; selling: number; sellingLines: { k: string; v: number }[];
};

/** Recomputes the month-to-date P&L from its parts and checks it against the stated totals. */
export function pnl(): Pnl {
  const opex = sum(FIN.opexLines.map(l => l.v));
  const gp = FIN.revenue - FIN.cogs;
  const ebitda = gp - opex;
  const sellingLines = FIN.opexLines.filter(l => /^(Vehicles|Marketing)/.test(l.k));
  return {
    revenue: FIN.revenue, cogs: FIN.cogs, gp, opex, ebitda,
    gm: (gp / FIN.revenue) * 100, em: (ebitda / FIN.revenue) * 100,
    cogsPct: (FIN.cogs / FIN.revenue) * 100, opexPct: (opex / FIN.revenue) * 100,
    reconciles: gp === FIN.grossProfit && ebitda === FIN.ebitda && opex === FIN.opex
      && sum(FIN.byCategory.map(c => c.rev)) === FIN.revenue && sum(FIN.byCategory.map(c => c.cogs)) === FIN.cogs,
    selling: sum(sellingLines.map(l => l.v)), sellingLines,
  };
}

export type MonthRow = { m: string; rev: number; gp: number; ebitda: number; cogs: number; opex: number; gm: number; em: number; mtd: boolean };
export function months(): MonthRow[] {
  return FIN.monthly.map(r => ({
    ...r, cogs: r.rev - r.gp, opex: r.gp - r.ebitda, gm: (r.gp / r.rev) * 100, em: (r.ebitda / r.rev) * 100, mtd: r.m.endsWith("*"),
  }));
}
/** Averages over the full (illustrative) months only, excluding the month to date. */
export function fullMonthAverages() {
  const full = months().filter(m => !m.mtd);
  const rev = sum(full.map(m => m.rev)), gp = sum(full.map(m => m.gp)), eb = sum(full.map(m => m.ebitda));
  return { n: full.length, rev: rev / full.length, gm: (gp / rev) * 100, em: (eb / rev) * 100, last: full[full.length - 1] };
}

export function forecast() {
  const f = FIN.forecast;
  const p = pnl();
  const runRate = Math.round((FIN.revenue / f.workingDaysDone) * f.workingDays);
  const scen = ([["Low", f.low], ["Base", f.base], ["High", f.high]] as [string, number][]).map(([k, rev]) => ({
    k, rev, gp: Math.round((rev * p.gm) / 100), ebitda: Math.round((rev * p.em) / 100),
  }));
  return { ...f, runRate, scen, toGo: f.base - FIN.revenue, daysLeft: f.workingDays - f.workingDaysDone };
}

/* ── Receivables ───────────────────────────────────────────────────────── */

export const unpaid = (i: D.Invoice) => i.status !== "Paid";
export function daysOver(i: D.Invoice) { return i.status === "Paid" ? 0 : Math.max(0, daysAgo(i.due)); }
export const accName = (id: string) => D.accountById(id)?.name || id;
/** The customer account a bank reference most likely belongs to (first word of the account name). */
export const accountInDesc = (desc: string) => D.ACCOUNTS.find(a => desc.toUpperCase().includes(a.name.split(/[\s(]/)[0].toUpperCase()));

export const AGE_BUCKETS = [
  { k: "current", label: "Not yet due", lo: -99999, hi: 0, color: "#7FB8C9" },
  { k: "1-30", label: "1 to 30 days", lo: 1, hi: 30, color: "#D9C27A" },
  { k: "31-60", label: "31 to 60 days", lo: 31, hi: 60, color: "#E0A98C" },
  { k: "61-90", label: "61 to 90 days", lo: 61, hi: 90, color: "var(--bad)" },
  { k: "90+", label: "Over 90 days", lo: 91, hi: 99999, color: "var(--bad)" },
];

export function arAgeing(s: HState) {
  const open = s.invoices.filter(unpaid);
  return AGE_BUCKETS.map(b => {
    const inv = open.filter(i => {
      if (i.status === "Open") return b.k === "current";
      const d = daysOver(i);
      return d >= b.lo && d <= b.hi;
    });
    return { ...b, count: inv.length, amount: sum(inv.map(i => i.amount)), invoices: inv };
  });
}

export function arSummary(s: HState) {
  const overdue = overdueInvoices(s);
  const open = s.invoices.filter(i => i.status === "Open");
  const paidMonth = s.invoices.filter(i => i.status === "Paid" && (i.paid || "") >= MONTH_START);
  const never = overdue.filter(i => i.reminders === 0);
  const dueSoon = open.filter(i => daysUntil(i.due) <= 7);
  return {
    overdue, overdueTotal: overdueTotal(s), open, openTotal: sum(open.map(i => i.amount)),
    total: overdueTotal(s) + sum(open.map(i => i.amount)), paidMonth, paidMonthTotal: sum(paidMonth.map(i => i.amount)),
    never, neverTotal: sum(never.map(i => i.amount)), dueSoon, dueSoonTotal: sum(dueSoon.map(i => i.amount)),
    oldest: overdue.slice().sort((a, b) => daysOver(b) - daysOver(a))[0],
  };
}

/** Bank credits matched to an invoice for less than its value: noted, not yet allocated in the accounts. */
export function partPayments(inv: D.Invoice, s: HState): D.BankTxn[] {
  return s.bank.filter(t => t.state === "Matched" && t.suggest === inv.id && t.amount > 0 && t.amount < inv.amount);
}
/** Bank lines that point at an invoice: a suggested match, or an unmatched credit whose note names it. */
export function bankHints(inv: D.Invoice, s: HState) {
  return {
    suggested: s.bank.find(t => t.state === "Suggested match" && t.suggest === inv.id),
    named: s.bank.find(t => t.state === "Unmatched" && t.amount > 0 && (t.note || "").includes(inv.id)),
    sameAmount: s.bank.find(t => t.state === "Unmatched" && t.amount === inv.amount && !t.suggest),
  };
}

export type Advice = { text: string; tone: "ok" | "warn" | "bad" | "info" | "neutral"; kind: "paid" | "match" | "check" | "wait" | "remind" | "call" | "none" };
/** The suggested next step for an invoice, from its age, reminder history and the bank lines. */
export function invoiceAdvice(inv: D.Invoice, s: HState): Advice {
  if (inv.status === "Paid") return { text: "Paid " + (inv.paid ? date(inv.paid, false) : ""), tone: "ok", kind: "paid" };
  const h = bankHints(inv, s);
  if (h.suggested) return { text: "Payment likely in: match " + h.suggested.id, tone: "ok", kind: "match" };
  if (h.named) return { text: "Check unreferenced credit " + h.named.id + " first", tone: "info", kind: "check" };
  if (h.sameAmount) return { text: "Possible payment " + h.sameAmount.id + ", no reference", tone: "info", kind: "check" };
  if (inv.status === "Open") {
    const d = daysUntil(inv.due);
    return { text: d <= 7 ? "Due in " + d + " day" + (d === 1 ? "" : "s") + ": no action yet" : "Not yet due", tone: "neutral", kind: "none" };
  }
  const since = inv.lastReminder ? daysAgo(inv.lastReminder) : 99;
  if (since < 7) return { text: since === 0 ? "Reminded today" : "Reminded " + since + " day" + (since === 1 ? "" : "s") + " ago: wait", tone: "neutral", kind: "wait" };
  if (inv.reminders === 0) return { text: "Send first reminder", tone: "warn", kind: "remind" };
  if (daysOver(inv) > 30 || inv.reminders >= 2) return { text: "Phone their accounts team", tone: "bad", kind: "call" };
  return { text: "Send reminder " + (inv.reminders + 1), tone: "warn", kind: "remind" };
}

/* ── Bank reconciliation ───────────────────────────────────────────────── */

export const BANK_ORDER: D.BankTxn["state"][] = ["Suggested match", "Unmatched", "Exception", "Matched"];
export function bankCounts(s: HState) {
  const by = (st: D.BankTxn["state"]) => s.bank.filter(t => t.state === st);
  const sug = by("Suggested match"), un = by("Unmatched"), ex = by("Exception"), m = by("Matched");
  return {
    suggested: sug, unmatched: un, exceptions: ex, matched: m, total: s.bank.length,
    suggestedValue: sum(sug.map(t => t.amount)), open: sug.length + un.length + ex.length,
    highConfidence: sug.filter(t => (t.confidence || 0) >= 90),
  };
}

const NAME_KEY = (n: string) => n.split(/[\s(]/)[0].toUpperCase();
export type Candidate = { kind: "invoice" | "bill"; id: string; amount: number; who: string; why: string; exact: boolean };

/** Possible counterparts for a bank line: the suggestion, a reference in the text, the same amount or the same customer. */
export function bankCandidates(t: D.BankTxn, s: HState): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate) => { if (!seen.has(c.id)) { seen.add(c.id); out.push(c); } };
  const desc = t.desc.toUpperCase();
  const rejected: string[] = /rejected/i.test(t.note || "") ? [...((t.note || "").match(/INV-\d+/g) || [])] : [];
  if (t.amount > 0) {
    const open = s.invoices.filter(i => unpaid(i) && !rejected.includes(i.id));
    const inv = (i: D.Invoice, why: string): Candidate => ({ kind: "invoice", id: i.id, amount: i.amount, who: accName(i.account), why, exact: i.amount === t.amount });
    if (t.suggest) { const i = s.invoices.find(x => x.id === t.suggest); if (i && unpaid(i)) push(inv(i, "Suggested" + (t.confidence ? " · " + t.confidence + "% confidence" : ""))); }
    open.filter(i => desc.includes(i.id.replace("-", ""))).forEach(i => push(inv(i, "Invoice number in bank reference")));
    open.filter(i => (t.note || "").includes(i.id)).forEach(i => push(inv(i, "Named in the bank note")));
    open.filter(i => i.amount === t.amount).forEach(i => push(inv(i, "Same amount")));
    open.filter(i => desc.includes(NAME_KEY(accName(i.account)))).sort((a, b) => b.amount - a.amount).forEach(i => push(inv(i, "Same customer")));
  } else {
    const sup = D.SUPPLIERS.find(x => desc.includes(NAME_KEY(x.name)));
    if (sup) s.bills.filter(b => b.supplier === sup.id && b.status !== "Paid").sort((a, b) => b.amount - a.amount)
      .forEach(b => push({ kind: "bill", id: b.id, amount: b.amount, who: sup.name, why: b.status, exact: b.amount === -t.amount }));
  }
  return out.slice(0, 4);
}

/* ── Payables and purchase costs ───────────────────────────────────────── */

export const isException = (b: D.Bill) => BILL_EXCEPTIONS.includes(b.status);
export function billVariance(b: D.Bill, s: HState): number {
  if (!b.invoicedQty || !b.expectedQty) return 0;
  const po = s.pos.find(p => p.id === b.po);
  const cost = po?.lines[0]?.cost || 0;
  return (b.invoicedQty - b.expectedQty) * cost;
}

export function apSummary(s: HState) {
  const open = s.bills.filter(b => b.status !== "Paid");
  const ex = open.filter(isException);
  const ready = open.filter(b => !isException(b));
  const in30 = open.filter(b => daysUntil(b.due) <= 30);
  const late = open.filter(b => daysUntil(b.due) < 0);
  return {
    late, lateNote: late.length ? late.length + " overdue" : "none overdue",
    open, openTotal: sum(open.map(b => b.amount)), ex, exTotal: sum(ex.map(b => b.amount)),
    ready, readyTotal: sum(ready.map(b => b.amount)), in30, in30Total: sum(in30.map(b => b.amount)),
  };
}

/** Monday of the week containing d. */
export function weekStart(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  return addDays(d, -((dow + 6) % 7));
}

export function billsByWeek(s: HState) {
  const map = new Map<string, D.Bill[]>();
  s.bills.filter(b => b.status !== "Paid").forEach(b => { const w = weekStart(b.due); map.set(w, (map.get(w) || []).concat([b])); });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([w, bills]) => ({ w, bills, amount: sum(bills.map(b => b.amount)) }));
}

export function purchaseCosts(s: HState) {
  const bills = s.bills.filter(b => b.date >= MONTH_START);
  const bySup = new Map<string, number>();
  bills.forEach(b => bySup.set(b.supplier, (bySup.get(b.supplier) || 0) + b.amount));
  const pos = s.pos.filter(p => p.created >= MONTH_START);
  const billedPos = new Set(s.bills.map(b => b.po).filter(Boolean));
  const committed = s.pos.filter(p => ["Awaiting approval", "Sent", "Confirmed", "Part received"].includes(p.status) && !billedPos.has(p.id));
  return {
    bills, billsTotal: sum(bills.map(b => b.amount)),
    bySupplier: [...bySup.entries()].map(([id, v]) => ({ id: id as D.SupplierId, name: D.supplierById(id)?.name || id, v })).sort((a, b) => b.v - a.v),
    pos, posTotal: sum(pos.map(D.poValue)), committed, committedTotal: sum(committed.map(D.poValue)),
    awaiting: s.pos.filter(p => p.status === "Awaiting approval"),
  };
}

/* ── Cash ──────────────────────────────────────────────────────────────── */

export function cashOutlook(s: HState) {
  let bal = FIN.bankBalance;
  const start = D.DEMO.nextWeekStart;
  return FIN.cashWeeks.map((w, i) => {
    const from = addDays(start, i * 7), to = addDays(from, 6);
    const invoiced = sum(s.invoices.filter(x => x.status === "Open" && x.due >= from && x.due <= to).map(x => x.amount));
    const net = w.inflow - w.outflow;
    const open = bal;
    bal += net;
    return { ...w, from, to, net, open, close: bal, invoiced, cover: w.inflow ? (invoiced / w.inflow) * 100 : 0 };
  });
}
export function cashLow(s: HState) {
  const rows = cashOutlook(s);
  return rows.reduce((lo, r) => (r.close < lo.close ? r : lo), rows[0]);
}

/* ── Sales ─────────────────────────────────────────────────────────────── */

/** Stage probabilities used across the demo (mirrors the opportunity seed in data.ts). */
export const STAGE_PROB: Record<string, number> = { Lead: 10, Qualified: 20, "Product Discussion": 35, "Clinical Evaluation": 50, Quotation: 65, Negotiation: 80 };

export function stageBreakdown(s: HState) {
  const open = openOpps(s);
  return D.STAGES.map(st => {
    const opps = open.filter(o => o.stage === st);
    return { stage: st, opps, count: opps.length, value: sum(opps.map(o => o.value)), prob: STAGE_PROB[st] ?? 0, weighted: sum(opps.map(o => (o.value * o.probability) / 100)) };
  });
}
export function weighted(s: HState) { return Math.round(sum(openOpps(s).map(o => (o.value * o.probability) / 100))); }

export function closedOpps(s: HState) {
  const all = D.CLOSED_OPPS.concat(s.opps.filter(o => o.stage === "Won" || o.stage === "Lost"));
  const won = all.filter(o => o.stage === "Won"), lost = all.filter(o => o.stage === "Lost");
  const wv = sum(won.map(o => o.value)), lv = sum(lost.map(o => o.value));
  return { all, won, lost, rate: all.length ? (won.length / all.length) * 100 : 0, wonValue: wv, lostValue: lv, valueRate: wv + lv ? (wv / (wv + lv)) * 100 : 0 };
}

export function repStats(s: HState) {
  const open = openOpps(s), od = overdueFollowups(s), closed = closedOpps(s);
  return D.SELLERS.map(id => {
    const mine = open.filter(o => o.owner === id);
    return {
      id, staff: D.staffById(id)!,
      accounts: D.ACCOUNTS.filter(a => a.owner === id),
      accountsRevenue: sum(D.ACCOUNTS.filter(a => a.owner === id).map(a => a.mtdRevenue)),
      pipeline: sum(mine.map(o => o.value)), pipelineCount: mine.length,
      overdue: od.filter(o => o.owner === id).length,
      won: closed.won.filter(o => o.owner === id).length, lost: closed.lost.filter(o => o.owner === id).length,
      weekRevenue: D.WEEK_REVENUE[id] || 0, weekTarget: D.WEEKLY_TARGETS[id]?.revenue || 0,
    };
  });
}

export function leadSources(s: HState) {
  const open = openOpps(s);
  return D.LEAD_SOURCES.map(l => {
    const opps = open.filter(o => o.source === l.source);
    return { ...l, conv: l.leads ? (l.won / l.leads) * 100 : 0, opps, live: sum(opps.map(o => o.value)) };
  });
}

export function quoteStats() {
  const open = D.QUOTES.filter(q => !["Accepted", "Declined"].includes(q.status));
  const decided = D.QUOTES.filter(q => ["Accepted", "Declined"].includes(q.status));
  const stale = open.filter(q => daysAgo(q.sent) > 7);
  return { open, openValue: sum(open.map(q => q.value)), decided, stale, staleValue: sum(stale.map(q => q.value)),
    accepted: decided.filter(q => q.status === "Accepted"), declined: decided.filter(q => q.status === "Declined") };
}

export function quietAccounts(s: HState, days = 14) {
  const open = openOpps(s);
  return D.ACCOUNTS.filter(a => daysAgo(a.lastVisit) >= days).map(a => ({
    a, days: daysAgo(a.lastVisit),
    overdue: s.invoices.filter(i => i.account === a.id && i.status === "Overdue"),
    pipeline: sum(open.filter(o => o.account === a.id).map(o => o.value)),
    opps: open.filter(o => o.account === a.id),
  })).sort((x, y) => y.days - x.days);
}

/* ── Stock ─────────────────────────────────────────────────────────────── */

export function stockByLocation(s: HState) {
  const t = locTotals(s);
  return D.LOCATIONS.map(l => ({
    loc: l, units: t[l.id], value: stockValue(s, l.id),
    low: lowSiteLines(s).filter(x => x.line.loc === l.id).length,
    lines: s.stock.filter(x => x.loc === l.id && x.qty > 0).length,
  }));
}

export const unitCost = (sku: string) => D.productBySku(sku)?.unitCost || 0;

export function stockAgeing(s: HState) {
  const B = [
    { k: "Under 3 months", lo: 0, hi: 90, color: "#7FB8C9" },
    { k: "3 to 6 months", lo: 91, hi: 182, color: "#9FB5D9" },
    { k: "6 to 12 months", lo: 183, hi: 365, color: "#D9C27A" },
    { k: "Over 12 months", lo: 366, hi: 99999, color: "#E0A98C" },
  ];
  const lines = s.stock.filter(l => l.qty > 0);
  return B.map(b => {
    const ls = lines.filter(l => { const d = daysAgo(l.received); return d >= b.lo && d <= b.hi; });
    return { ...b, lines: ls, units: sum(ls.map(l => l.qty)), value: sum(ls.map(l => l.qty * unitCost(l.sku))) };
  });
}

export function expiryExposure(s: HState, days = 90) {
  const lines = expiringLines(days, s);
  return { lines, units: sum(lines.map(l => l.qty)), value: sum(lines.map(l => l.qty * unitCost(l.sku))) };
}

export function stockRisk(s: HState) {
  const low = lowSiteLines(s);
  const exp = expiryExposure(s, 90);
  return {
    low, exp, reorder: reorderRecs(s),
    quarantine: s.stock.filter(l => l.qty > 0 && l.status === "Quarantine"),
    verify: s.stock.filter(l => l.qty > 0 && l.status === "Verify"),
  };
}

/* ── Operations ────────────────────────────────────────────────────────── */

export type OpsKey = keyof typeof D.OPS_TRENDS;
export const OPS_METRICS: { k: OpsKey; label: string; short: string; unit: string; better: "lower" | "higher"; def: string; source: string }[] = [
  { k: "handlingMins", label: "Average order handling time", short: "Order handling", unit: " min", better: "lower", def: "Minutes from order entry to packed, averaged per order.", source: "Order timestamps in the current ERP, plus Pulse scan times." },
  { k: "manualCorrections", label: "Orders needing manual correction", short: "Manual corrections", unit: "", better: "lower", def: "Orders edited after entry: wrong lot, price, quantity or missing PO number.", source: "ERP order edit history." },
  { k: "stockExceptions", label: "Stock exceptions raised", short: "Stock exceptions", unit: "", better: "lower", def: "Count variances, unrecorded usage, quarantine and expiry holds.", source: "Stock counts and scanning records." },
  { k: "followupCompletion", label: "Sales follow-ups completed on time", short: "Follow-ups on time", unit: "%", better: "higher", def: "Share of planned follow-ups done by their due date.", source: "Sales activity log." },
  { k: "onSchedule", label: "Orders dispatched on schedule", short: "Dispatched on time", unit: "%", better: "higher", def: "Orders that left by the required date.", source: "Dispatch records and courier bookings." },
  { k: "reconLines", label: "Bank lines reconciled by hand", short: "Manual reconciliation", unit: "", better: "lower", def: "Bank lines Margaret matched or coded manually in the week.", source: "Bank feed and accounting system, once connected." },
];

export function opsStats(k: OpsKey) {
  const v = D.OPS_TRENDS[k];
  const avg = sum(v) / v.length;
  const first = sum(v.slice(0, 6)) / 6, last = sum(v.slice(6)) / 6;
  return { values: v, now: v[v.length - 1], prev: v[v.length - 2], avg, max: Math.max(...v), min: Math.min(...v), first, last };
}

/** Live operational bottlenecks across modules. */
export function bottlenecks(s: HState) {
  const orders = openOrders(s);
  const so = orderById("SO-1047", s);
  const prog = so ? orderProgress(so) : { scanned: 0, total: 0 };
  const b = bankCounts(s);
  return {
    awaitingCourier: orders.filter(o => o.status === "Awaiting courier"),
    issues: orders.filter(o => o.status === "Issue"),
    confirmed: orders.filter(o => o.status === "Confirmed"),
    so1047Left: prog.total - prog.scanned, so1047: so,
    risk: stockRisk(s), bank: b, bills: s.bills.filter(isException), followups: overdueFollowups(s),
  };
}

export const ORDER_STAGES: D.OrderStatus[] = ["Confirmed", "Picking", "Packed", "Awaiting courier", "Issue", "Dispatched", "Delivered"];

