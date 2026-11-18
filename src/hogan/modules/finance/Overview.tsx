/* Finance · Overview. Margaret's oversight and exception-management layer:
   the numbers Graham asked for, today's receivable, payable and bank exceptions,
   cash, the Finance Agent's observations and her open finance tasks. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { type HState, nav, openRecord, tasksFor, useHogan } from "../../store";
import { Avatar, Badge, Btn, Card, DemoBadge, I, Kpi, Notice, Page, PageHeader, RecLink, label } from "../../ui";
import { Spark } from "../../charts";
import { date, eur, eurK, pct } from "../../fmt";
import { FIN, MTD_LABEL, accName, accountInDesc, apSummary, bankCandidates, arSummary, bankCounts, billVariance, cashLow, cashOutlook, daysOver, invoiceAdvice, pnl, purchaseCosts } from "./derive";
import { Fig, Go, ItemRow, Kit, Kpis, Split, Src, Stat } from "./kit";

type Obs = { id: string; head: string; text: ReactNode; tone: "warn" | "bad" | "info" | "ok"; cta: string; go: () => void };

/** The Finance Agent's observations, derived from live state so they clear as Margaret works. */
function observations(s: HState): Obs[] {
  const out: Obs[] = [];
  const ar = arSummary(s), b = bankCounts(s);
  const inv = s.invoices.find(i => i.id === "INV-6128");
  const bt11 = s.bank.find(t => t.id === "BT-9911");
  if (inv && inv.status === "Overdue") {
    out.push({ id: "inv6128", tone: "warn", cta: "Open INV-6128", go: () => openRecord("invoice", inv.id),
      head: bt11 && bt11.state === "Unmatched" ? "Check Harbour's " + eur(bt11.amount) + " before chasing INV-6128" : "INV-6128 is " + daysOver(inv) + " days overdue",
      text: bt11 && bt11.state === "Unmatched"
        ? <>INV-6128 (Harbour, {eur(inv.amount)}) is {daysOver(inv)} days overdue. Harbour paid {eur(bt11.amount)} on {date(bt11.date, false)} with no reference ({bt11.id}). Confirm whether it is for INV-6128 before reminder {inv.reminders + 1}; the draft is ready.</>
        : <>INV-6128 (Harbour, {eur(inv.amount)}) is {daysOver(inv)} days overdue. {invoiceAdvice(inv, s).text}.</> });
  }
  if (b.suggested.length) out.push({ id: "sug", tone: "info", cta: "Review matches", go: () => nav("Finance", "recon", { "finance.bankView": "sug" }),
    head: b.suggested.length + " suggested bank matches to confirm",
    text: <>{b.suggested.length} bank lines have suggested matches worth {eur(b.suggestedValue)}. {b.highConfidence.length ? b.highConfidence.length + " score 90% or more, including " + b.highConfidence[0].id + " for " + b.highConfidence[0].suggest + "." : "None scores above 90%, so check each one."}</> });
  const ex15 = s.bank.find(t => t.id === "BT-9915" && t.state === "Exception");
  const rel15 = ex15 ? bankCandidates(ex15, s).find(c => c.kind === "bill") : undefined;
  if (ex15) out.push({ id: "bt15", tone: "bad", cta: "Open " + ex15.id, go: () => openRecord("bank", ex15.id),
    head: "Payment released on a bill that is on hold",
    text: <>{eur(-ex15.amount)} went to {rel15 ? rel15.who : "a supplier"} on {date(ex15.date, false)} while {rel15 ? rel15.id : "the bill"} is on hold. Someone released a payment the three-way match had stopped: check who.</> });
  const ex03 = s.bank.find(t => t.id === "BT-9903" && t.state === "Exception");
  if (ex03) out.push({ id: "bt03", tone: "warn", cta: "Open " + ex03.id, go: () => openRecord("bank", ex03.id),
    head: "Possible duplicate payment from " + (accountInDesc(ex03.desc)?.name.split(" ")[0] || "a customer"),
    text: <>{eur(ex03.amount)} from {accountInDesc(ex03.desc)?.name || "a customer"} on {date(ex03.date, false)}. {ex03.note} If confirmed, it is a refund owed, not income.</> });
  const b34 = s.bills.find(x => x.id === "BILL-2034");
  if (b34 && b34.status === "Quantity discrepancy") out.push({ id: "b34", tone: "warn", cta: "Open BILL-2034", go: () => openRecord("bill", b34.id),
    head: "BILL-2034 charges for anchors that never arrived",
    text: <>BILL-2034 from Aquila bills {b34.invoicedQty} anchors; PO-337 ordered {b34.expectedQty} and GRN-0419 received {b34.expectedQty}. {eur(billVariance(b34, s))} is in dispute. Suggest holding it and asking for a credit note.</> });
  if (ar.never.length) out.push({ id: "never", tone: "info", cta: "Review", go: () => nav("Finance", "ar", { "finance.arView": "overdue", "finance.arNever": true }),
    head: ar.never.length + " overdue invoices never chased",
    text: <>{ar.never.length} overdue invoices ({eur(ar.neverTotal)}) have had no reminder yet. First reminders are drafted and can be logged in one go.</> });
  const low = cashLow(s);
  out.push({ id: "cash", tone: "info", cta: "Cash outlook", go: () => nav("Finance", "forecast"),
    head: "Cash low point in " + low.w,
    text: <>Cash is projected to dip to {eur(low.close)} in {low.w}, when outflows of {eur(low.outflow)} exceed inflows of {eur(low.inflow)}. Illustrative only.</> });
  return out;
}

function Observations() {
  const s = useHogan();
  const obs = observations(s);
  const notes = s.agentNotes.filter(n => n.agent === "finance");
  return (
    <Card title="Finance Agent observations" sub="The agent reads the ledgers and bank lines and points at what needs a person. It never posts, pays or approves."
      right={<Badge tone="accent">{obs.length + notes.length} open</Badge>}>
      <div className="hk-list">
        {notes.map((n, i) => (
          <ItemRow key={"n" + i} tone="accent" icon={I.agent} title={"Recorded by the Finance Agent at " + n.time} sub={n.text}
            right={n.ref ? <Btn size="sm" onClick={() => openRecord(n.ref!.startsWith("BILL") ? "bill" : n.ref!.startsWith("INV") ? "invoice" : "bank", n.ref!)}>Open {n.ref}</Btn> : undefined} />
        ))}
        {obs.map(o => (
          <ItemRow key={o.id} tone={o.tone} icon={I.agent} title={o.head} sub={o.text} onClick={o.go}
            right={<Btn size="sm" kind="secondary" onClick={o.go}>{o.cta}</Btn>} />
        ))}
      </div>
    </Card>
  );
}

function Exceptions() {
  const s = useHogan();
  const ar = arSummary(s), ap = apSummary(s), b = bankCounts(s);
  return (
    <Split k="3" stretch>
      <Card title="Receivables" sub={ar.overdue.length + " invoices overdue"} right={<Src k="erp" />}>
        <Stat big label="Overdue" value={eur(ar.overdueTotal)} tone="warn" sub={eur(ar.total) + " owed in total"} onClick={() => nav("Finance", "ar")} />
        <div className="hk-list" style={{ marginTop: 8 }}>
          {ar.overdue.slice(0, 3).map(i => (
            <Fig key={i.id} label={<><RecLink type="invoice" id={i.id} /> · {accName(i.account)}</>} sub={daysOver(i) + " days · " + invoiceAdvice(i, s).text} value={eur(i.amount)} onClick={() => openRecord("invoice", i.id)} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}><Go onClick={() => nav("Finance", "ar")}>All receivables</Go></div>
      </Card>
      <Card title="Payables" sub={ap.ex.length + " supplier bills held"} right={<Src k="erp" />}>
        <Stat big label="On hold" value={eur(ap.exTotal)} tone={ap.ex.length ? "warn" : "ok"} sub={eur(ap.readyTotal) + " matched and ready to pay"} onClick={() => nav("Finance", "ap")} />
        <div className="hk-list" style={{ marginTop: 8 }}>
          {ap.ex.map(x => (
            <Fig key={x.id} label={<><RecLink type="bill" id={x.id} /> · {D.supplierById(x.supplier)?.name}</>} sub={x.status + (billVariance(x, s) ? ": " + eur(billVariance(x, s)) + " not delivered" : "")} value={eur(x.amount)} onClick={() => openRecord("bill", x.id)} />
          ))}
          {ap.ex.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "8px 0" }}>Every bill matches its order and receipt.</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}><Go onClick={() => nav("Finance", "ap")}>All payables</Go></div>
      </Card>
      <Card title="Bank reconciliation" sub={b.open + " of " + b.total + " lines to clear"} right={<Src k="bank" />}>
        <Stat big label="Suggested matches" value={b.suggested.length} sub={eur(b.suggestedValue) + " ready to confirm"} onClick={() => nav("Finance", "recon", { "finance.bankView": "sug" })} />
        <div style={{ marginTop: 8 }}>
          <Fig label="Unmatched" sub="No confident match: needs Margaret" value={b.unmatched.length} tone={b.unmatched.length ? "warn" : "ok"} onClick={() => nav("Finance", "recon", { "finance.bankView": "un" })} />
          <Fig label="Exceptions" sub="Possible duplicate, payment released early" value={b.exceptions.length} tone={b.exceptions.length ? "bad" : "ok"} onClick={() => nav("Finance", "recon", { "finance.bankView": "ex" })} />
          <Fig label="Reconciled" sub={pct((b.matched.length / b.total) * 100, 0) + " of imported lines"} value={b.matched.length} onClick={() => nav("Finance", "recon", { "finance.bankView": "done" })} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}><Go onClick={() => nav("Finance", "recon")}>Reconcile</Go></div>
      </Card>
    </Split>
  );
}

function CashAndTasks() {
  const s = useHogan();
  const out = cashOutlook(s), low = cashLow(s);
  const tasks = tasksFor("MD", s).filter(t => t.status !== "Done" && (t.dept === "Finance" || t.related?.type === "invoice" || t.related?.type === "bill"));
  const openRel = (t: D.Task) => {
    const r = t.related;
    if (!r) return openRecord("task", t.id);
    if (r.type === "page") { const [pg, tab] = r.id.split(":"); return nav(pg, tab); }
    openRecord(r.type, r.id);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <Card title="Cash" right={<Src k="bank" />}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...label, fontSize: 9 }}>Bank balance · {date(FIN.bankAsOf, false)}</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.7px", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{eur(FIN.bankBalance)}</div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>Low point {eur(low.close)}, {low.w}</div>
          </div>
          <Spark values={[FIN.bankBalance, ...out.map(r => r.close)]} w={120} h={36} />
        </div>
      </Card>
      <Card title="Margaret's finance tasks" sub={tasks.length + " open"} right={<Btn size="sm" kind="ghost" onClick={() => nav("Work", "tasks")}>My tasks</Btn>}>
        <div className="hk-list">
          {tasks.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>Nothing open.</div>}
          {tasks.map(t => (
            <ItemRow key={t.id} tone={t.priority === "High" ? "warn" : "info"} icon={I.check} onClick={() => openRel(t)}
              title={t.title} sub={(t.related?.label || t.dept) + " · due " + date(t.due, false)} meta={<><Badge>{t.status}</Badge>{t.createdBy?.startsWith("agent") && <Badge tone="accent">Suggested by agent</Badge>}</>}
              right={<Avatar id={t.owner} size={20} />} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function Overview() {
  const s = useHogan();
  const p = pnl(), pc = purchaseCosts(s);
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Overview" title="Finance overview"
          sub="What needs attention today. Pulse reads, matches and drafts; posting, payments and approvals stay with people and the accounting system."
          right={<><Btn size="sm" icon={I.mail} onClick={() => nav("Finance", "ar")}>Receivables</Btn><Btn size="sm" kind="primary" icon={I.check} onClick={() => nav("Finance", "recon")}>Reconcile bank</Btn></>} />
        <Notice tone="warn" title="Integrations not yet verified" right={<span className="hk-hide-s" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Src k="accounts" /><Src k="bank" /></span>}>
          Xero, the current ERP and the bank feed are not connected in this build. Every figure here is fictional demonstration data, not Hogan Healthcare's actual performance.
        </Notice>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", flex: 1 }}>The numbers Graham asked for</div>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>{MTD_LABEL}</span>
            <DemoBadge text="Fictional figures" />
          </div>
          <Kpis>
            <Kpi label="EBITDA" value={eur(p.ebitda)} tone="accent" sub={pct(p.em) + " of revenue"} onClick={() => nav("Finance", "profit", { "finance.pnlLine": "ebitda" })} />
            <Kpi label="Gross margin" value={pct(p.gm)} sub={eur(p.gp) + " gross profit"} onClick={() => nav("Finance", "profit", { "finance.pnlLine": "gp" })} />
            <Kpi label="Cost of sales" value={eur(p.cogs)} sub={pct(p.cogsPct) + " of " + eurK(p.revenue) + " revenue"} onClick={() => nav("Finance", "profit", { "finance.pnlLine": "cogs" })} />
            <Kpi label="Purchase costs" value={eur(pc.billsTotal)} sub={pc.bills.length + " supplier bills received"} onClick={() => nav("Finance", "ap")} />
            <Kpi label="Selling costs" value={eur(p.selling)} sub="Travel and marketing" onClick={() => nav("Finance", "profit", { "finance.pnlLine": "opex" })} />
            <Kpi label="Operating costs" value={eur(p.opex)} sub={pct(p.opexPct) + " of revenue"} onClick={() => nav("Finance", "profit", { "finance.pnlLine": "opex" })} />
          </Kpis>
        </div>
        <Exceptions />
        <Split k="21">
          <Observations />
          <CashAndTasks />
        </Split>
      </Kit>
    </Page>
  );
}
