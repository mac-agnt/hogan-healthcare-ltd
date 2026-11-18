/* The Home "Ask Pulse" assistant for Hogan Healthcare OS.
   Answers are written from live demo state, so they change as the demo moves
   (after the Harbour transfer, the stock answer says so). Read tools answer;
   anything with an effect is proposed and waits for a person. */

import * as D from "./data";
import * as S from "./store";
import { eur, daysAgo, date } from "./fmt";

export type Act =
  | { page: string; tab?: string; ui?: Record<string, any> }
  | { record: [string, string] }
  | { run: "reviewBill" | "proposeHarbour" | "confirmReminder" };

export type Answer = {
  tool: string; effect: "read" | "write"; text: string;
  cols?: string[]; rows?: string[][];
  actions: [string, number, Act?][];
  confirm?: boolean; confirmSummary?: string;
};

export function runAct(a: Act) {
  if ("page" in a) S.nav(a.page, a.tab, a.ui);
  else if ("record" in a) S.openRecord(a.record[0], a.record[1]);
  else if (a.run === "reviewBill") S.createBillReviewTask("BILL-2034");
  else if (a.run === "proposeHarbour") {
    const s = S.getState();
    const pending = s.transfers.find(t => t.sku === "HH-OR-204" && t.to === "HAR" && t.status === "Awaiting approval");
    if (pending) S.toast(pending.id + " is already waiting for John Culkin.", "info");
    else S.proposeTransfer({ sku: "HH-OR-204", to: "HAR", qty: 3, by: "GH" });
  } else if (a.run === "confirmReminder") S.sendReminder("INV-6128");
}

const acc = (id: string) => D.accountById(id)?.name || id;

export function answer(q: string): Answer {
  const s = S.getState();
  const t = q.toLowerCase();

  if (/brief|today|attention|morning|what needs|priorit/.test(t)) {
    const al = S.alerts(s);
    return { tool: "pulse_briefing", effect: "read", text: S.briefing(s),
      cols: ["Item", "Detail", "State"], rows: al.map(a => [a.title, a.sub, a.done ? "handled" : "open"]),
      actions: [["Open Harbour replenishment", 1, { page: "Inventory", tab: "replenish", ui: { "inventory.focus": "HH-OR-204" } }], ["Open SO-1047", 0, { page: "Orders", tab: "picking", ui: { "orders.pick": "SO-1047" } }]] };
  }

  if (/hh-or-204|harbour|par level|replenish|below par|low stock|hospital stock|where is/.test(t)) {
    const ps = S.productStock("HH-OR-204", s);
    const har = ps.byLoc.HAR || 0, central = ps.byLoc.DLM || 0, sds = ps.byLoc.SDS || 0;
    const tr = s.transfers.find(x => x.sku === "HH-OR-204" && x.to === "HAR" && x.status !== "Rejected");
    const lows = S.lowSiteLines(s);
    const text = har < 6
      ? "HH-OR-204 (cannulated fixation screw 7.3 mm) is held in three places: " + central + " in the main stockroom, " + har + " at Harbour Orthopaedic Clinic and " + sds + " at South Dublin Surgical Centre, " + ps.total + " in all. Harbour's par level is 6, so it is short. Moving 3 from the main stockroom (lot " + (S.fefoLot("HH-OR-204", s)?.lot || "") + ") takes Harbour to " + (har + 3) + "." + (tr && tr.status === "Awaiting approval" ? " " + tr.id + " is already raised and waiting for John Culkin." : "")
      : "Harbour now holds " + har + " units of HH-OR-204 after " + (tr?.id || "the transfer") + ". The main stockroom is down to " + central + ", below its reorder point of 6, so it is on the Purchasing reorder list. " + (lows.length ? lows.length + " other consignment lines are below par." : "No other site is below par.");
    return { tool: "inventory_where", effect: "read", text,
      cols: ["Location", "On hand", "Par", "Lot"],
      rows: ps.lines.map(l => [D.locById(l.loc)?.short || l.loc, String(l.qty), l.min !== undefined ? String(l.min) : "n/a", l.lot]),
      actions: har < 6
        ? [["Raise the 3-unit transfer", 1, { run: "proposeHarbour" }], ["Open product record", 0, { record: ["product", "HH-OR-204"] }]]
        : [["Open product record", 1, { record: ["product", "HH-OR-204"] }], ["Open reorder list", 0, { page: "Purchasing", tab: "reorder" }]] };
  }

  if (/so-1047|scan|picking|dispatch|order/.test(t)) {
    const o = S.orderById("SO-1047", s)!;
    const p = S.orderProgress(o);
    const left = o.lines.filter(l => !l.scanned);
    return { tool: "orders_status", effect: "read",
      text: "SO-1047 for South Dublin Surgical Centre has " + p.scanned + " of " + p.total + " lines scanned" + (left.length ? ". Still to validate: " + left.map(l => l.sku + (l.needs === "serial" ? " (serial)" : " (lot and expiry)")).join(" and ") + ". Sharon owns it and the courier cut-off is 16:00." : " and is " + (o.status === "Dispatched" ? "dispatched." : "ready for dispatch.")) + " Across the business " + S.openOrders(s).length + " orders are open.",
      cols: ["Line", "Product", "Qty", "Scanned"],
      rows: o.lines.map(l => [l.id, l.sku + " · " + (D.productBySku(l.sku)?.name || ""), String(l.qty), l.scanned ? "yes" : "no"]),
      actions: [["Open picking for SO-1047", 1, { page: "Orders", tab: "picking", ui: { "orders.pick": "SO-1047" } }], ["Dispatch board", 0, { page: "Orders", tab: "dispatch" }]] };
  }

  if (/follow|pipeline|pinewood|opportunit|sales|quiet|neglect/.test(t)) {
    const fu = S.overdueFollowups(s);
    return { tool: "sales_followups", effect: "read",
      text: fu.length + " of " + S.openOpps(s).length + " open opportunities have an overdue follow-up, " + eur(fu.reduce((a, o) => a + o.value, 0)) + " of the " + eur(S.pipelineValue(s)) + " pipeline. " + (fu[0] ? "The biggest is " + acc(fu[0].account) + " at " + eur(fu[0].value) + ", quiet for " + daysAgo(fu[0].lastActivity) + " days." : ""),
      cols: ["Account", "Value", "Owner", "Quiet"],
      rows: fu.slice(0, 5).map(o => [acc(o.account), eur(o.value), D.staffById(o.owner)?.first || o.owner, daysAgo(o.lastActivity) + "d"]),
      actions: [["Plan the week", 1, { page: "Sales", tab: "planner" }], ["Open follow-ups", 0, { page: "Sales", tab: "followups" }]] };
  }

  if (/chase|remind|draft/.test(t)) {
    const inv = s.invoices.find(i => i.id === "INV-6128")!;
    return { tool: "finance_reminder_draft", effect: "write", confirm: true,
      confirmSummary: "Log a reminder from Margaret Duff to Harbour Orthopaedic Clinic for INV-6128 (" + eur(inv.amount) + ", due " + date(inv.due) + "). In this demo nothing is emailed.",
      text: "Drafted. Sending is Margaret's call, so it waits here for a person to confirm. Nothing leaves Pulse without that yes.",
      actions: [["Confirm as Margaret", 1, { run: "confirmReminder" }], ["Open receivables", 0, { page: "Finance", tab: "ar" }]] };
  }

  if (/invoice|overdue|owe|receivable|debtor|inv-6128|cash/.test(t)) {
    const ov = S.overdueInvoices(s);
    return { tool: "finance_receivables", effect: "read",
      text: ov.length + " customer invoices are overdue, " + eur(S.overdueTotal(s)) + " in all. INV-6128 from Harbour Orthopaedic Clinic is the largest at " + eur(8750) + ", 21 days late. Bank balance in the demo ledger is " + eur(D.FIN.bankBalance) + "; the bank feed is not yet verified.",
      cols: ["Invoice", "Customer", "Amount", "Days late"],
      rows: ov.slice(0, 5).map(i => [i.id, acc(i.account), eur(i.amount), String(daysAgo(i.due))]),
      actions: [["Open receivables", 1, { page: "Finance", tab: "ar" }], ["Draft a reminder for INV-6128", 0]] };
  }

  if (/ebitda|margin|revenue|profit|p&l|performance|numbers/.test(t)) {
    const F = D.FIN;
    return { tool: "finance_summary", effect: "read",
      text: "November to date (fictional demo figures): revenue " + eur(F.revenue) + ", cost of goods " + eur(F.cogs) + ", gross profit " + eur(F.grossProfit) + " (" + F.grossMargin + "%), operating costs " + eur(F.opex) + ", EBITDA " + eur(F.ebitda) + " (" + F.ebitdaMargin + "%). In production these would come from the accounting integration, which is not yet verified.",
      cols: ["Line", "Nov to date", "Share"],
      rows: [["Revenue", eur(F.revenue), "100%"], ["Cost of goods sold", eur(F.cogs), "61.2%"], ["Gross profit", eur(F.grossProfit), F.grossMargin + "%"], ["Operating expenses", eur(F.opex), "23.3%"], ["EBITDA", eur(F.ebitda), F.ebitdaMargin + "%"]],
      actions: [["Executive overview", 1, { page: "Dashboard", tab: "exec" }], ["Profitability", 0, { page: "Finance", tab: "profit" }]] };
  }

  if (/bill|supplier invoice|discrepancy|bill-2034|aquila|po-337/.test(t)) {
    const b = s.bills.find(x => x.id === "BILL-2034")!;
    return { tool: "purchasing_match", effect: "read",
      text: "BILL-2034 from Aquila Sports Medicine is " + eur(b.amount) + " for 14 knotless anchors plus freight. PO-337 ordered 12 and GRN-0419 received 12, so 2 units (" + eur(580) + ") were billed but never delivered. Status: " + b.status + ". I can open a review task for Margaret; nothing gets approved or posted.",
      cols: ["Check", "Quantity", "Value"],
      rows: [["PO-337 ordered", "12", eur(3700)], ["GRN-0419 received", "12", eur(3700)], ["BILL-2034 invoiced", "14", eur(4280)], ["Variance", "2", eur(580)]],
      actions: [["Create review task for Margaret", 1, { run: "reviewBill" }], ["Open the bill", 0, { record: ["bill", "BILL-2034"] }]] };
  }

  if (/rent|nice1|rn-0208|n1-018|cold/.test(t)) {
    const b = s.bookings.find(x => x.id === "RN-0208")!;
    const onHire = s.assets.filter(a => a.status === "On hire").length;
    return { tool: "rentals_status", effect: "read",
      text: "NICE1 rentals: " + onHire + " of " + s.assets.length + " systems on hire. RN-0208 is " + b.pkg.toLowerCase() + " on " + b.asset + " at " + eur(b.price) + ", " + date(b.start) + " to " + date(b.end) + ", status " + b.status.toLowerCase() + ". Customer details are anonymised.",
      cols: ["Unit", "Status", "Booking"],
      rows: s.assets.map(a => [a.id, a.status, a.booking || "n/a"]),
      actions: [["Open RN-0208", 1, { record: ["booking", "RN-0208"] }], ["Rentals overview", 0, { page: "Rentals", tab: "overview" }]] };
  }

  if (/trace|lot|recall|udi|serial|batch/.test(t)) {
    const mv = S.traceLot("HH-OR-204", "L2603-204A", s);
    return { tool: "trace_lot", effect: "read",
      text: "Lot L2603-204A of HH-OR-204 came in on PO-301 (8 units). 6 went to Harbour and 2 to South Dublin; Harbour has used 2. Every movement is linked to its order and financial record. A simulated drill is available; no recall exists.",
      cols: ["Date", "Movement", "Qty", "Ref"],
      rows: mv.map(m => [date(m.date, false), m.type + " " + (D.locById(m.from)?.short || m.from) + " → " + (D.locById(m.to)?.short || m.to), String(m.qty), m.ref]),
      actions: [["Open traceability", 1, { page: "Inventory", tab: "trace" }], ["Open the lot", 0, { record: ["lot", "HH-OR-204|L2603-204A"] }]] };
  }

  if (/erp|xero|integration|sync|enterpryze|connect/.test(t)) {
    return { tool: "systems_status", effect: "read",
      text: "Pulse is sitting above the current ERP in this demo, not replacing it. The ERP connection (probably Enterpryze, to be confirmed), Xero and the bank feed are all shown as demo or to-be-verified; no live data has been read. The NICE1 website is not connected.",
      actions: [["Open Settings → Systems", 1, { page: "Settings" }]] };
  }

  return { tool: "pulse_search", effect: "read",
    text: "I can answer from every record in this demo: hospital stock and lots, orders and scans, the sales pipeline and weekly plans, receivables and supplier bills, rentals and quality records. Anything with an effect is proposed and waits for a person.",
    actions: [["What needs my attention?", 1], ["Where is HH-OR-204?", 0]] };
}

export const SUGGESTIONS = [
  "What needs my attention today?",
  "Where is HH-OR-204 right now?",
  "What's holding up SO-1047?",
  "Which follow-ups are overdue?",
  "What is our EBITDA this month?",
  "Why doesn't BILL-2034 match?",
];
