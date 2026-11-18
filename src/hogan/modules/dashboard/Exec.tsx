/* Dashboard · Executive Overview. Graham's one page: what needs a decision this
   week, how November is tracking (a bridge that reconciles), cash, pipeline
   against target and stock risk. Sits below the Pulse KPI band. */

import type { ReactNode } from "react";
import * as D from "../../data";
import {
  type HState, alerts, billExceptions, decideApproval, nav, openRecord, overdueFollowups, overdueInvoices, openOpps,
  pendingApprovals, pipelineValue, useHogan,
} from "../../store";
import { Avatar, Badge, Btn, Card, I, Page, PageHeader, Progress, RecLink, label } from "../../ui";
import { Spark, StackBars } from "../../charts";
import { TODAY, date, eur, eurK, pct } from "../../fmt";
import { FIN, MTD_LABEL, apSummary, arSummary, cashLow, cashOutlook, forecast, fullMonthAverages, months, pnl, repStats, stockRisk, sum, weighted } from "../finance/derive";
import { Fig, Go, ItemRow, Kit, Reconciles, Split, Src, Stat, Waterfall, td, th } from "../finance/kit";

type Decision = { id: string; title: string; sub: string; tone: "bad" | "warn" | "info" | "ok"; done: boolean; owner: D.StaffId; icon: string; cta: string; go: () => void; alt?: { label: string; go: () => void } };

/** "Decisions this week": the live alerts, each wired to the record or screen that resolves it. */
function decisions(s: HState): Decision[] {
  const al = Object.fromEntries(alerts(s).map(a => [a.id, a]));
  const topInv = overdueInvoices(s)[0];
  const ex = billExceptions(s);
  const topBill = ex.find(b => b.id === "BILL-2034") || ex[0];
  const pin = overdueFollowups(s).find(o => o.id === "OPP-301");
  const list: Decision[] = [
    { ...al.harbour, owner: "JC", icon: I.hospital, cta: al.harbour.done ? "View" : "Replenish",
      go: () => nav("Inventory", "replenish", { "inventory.focus": "HH-OR-204" }) },
    { ...al.so1047, owner: "SO", icon: I.scan, cta: "Open picking", go: () => nav("Orders", "picking", { "orders.pick": "SO-1047" }) },
    { ...al.followups, owner: "AC", icon: I.users, cta: pin ? "Pinewood follow-up" : "Review follow-ups",
      sub: pin ? "Largest: Pinewood Orthopaedics, " + eur(pin.value) + ", quiet since " + date(pin.lastActivity, false) : al.followups.sub,
      go: () => nav("Sales", "followups") },
    { ...al.invoices, owner: "MD", icon: I.euro, cta: topInv ? "Open " + topInv.id : "Receivables",
      go: () => (topInv ? openRecord("invoice", topInv.id) : nav("Finance", "ar")), alt: { label: "All overdue", go: () => nav("Finance", "ar") } },
    { ...al.bills, owner: "MD", icon: I.doc, cta: topBill ? "Open " + topBill.id : "Purchasing",
      go: () => (topBill ? openRecord("bill", topBill.id) : nav("Purchasing", "exceptions")), alt: { label: "Exceptions", go: () => nav("Purchasing", "exceptions") } },
  ];
  return list.filter(d => !d.done).concat(list.filter(d => d.done));
}

function Decisions() {
  const s = useHogan();
  const list = decisions(s);
  const open = list.filter(d => !d.done).length;
  const appr = pendingApprovals(s, "GH");
  const decided = s.approvals.filter(a => a.decidedBy === "GH" && (a.decidedAt || "").startsWith(TODAY));
  const who = (id: string) => D.staffById(id)?.first || id;
  return (
    <Card title="Decisions this week" sub="Live from today's exceptions. Each one opens the record or screen where it gets resolved."
      right={<Badge tone={open ? "warn" : "ok"}>{open ? open + " open" : "All clear"}</Badge>}>
      <div className="hk-list">
        {list.map(d => (
          <ItemRow key={d.id} tone={d.tone} icon={d.icon} done={d.done} title={d.title} sub={d.sub} onClick={d.go}
            right={<>
              <span className="hk-hide-s"><Avatar id={d.owner} size={22} /></span>
              {d.alt && !d.done && <Btn kind="ghost" size="sm" onClick={d.alt.go}>{d.alt.label}</Btn>}
              <Btn kind={d.done ? "ghost" : "secondary"} size="sm" onClick={d.go}>{d.cta}</Btn>
            </>} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 4px" }}>
        <span style={{ ...label, flex: 1 }}>Waiting for your approval</span>
        <Btn kind="ghost" size="sm" onClick={() => nav("Work", "approvals")}>All approvals</Btn>
      </div>
      <div className="hk-list">
        {appr.length === 0 && decided.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "8px 4px" }}>Nothing waiting for Graham.</div>}
        {appr.map(a => (
          <ItemRow key={a.id} tone="info" icon={a.kind === "Purchase order" ? I.box : a.kind === "Discount" ? I.target : I.doc}
            title={<>{a.title}{a.value ? <span style={{ color: "var(--dim)", fontWeight: 400 }}> · {eur(a.value)}</span> : null}</>}
            sub={a.detail}
            meta={<><Badge>{a.kind}</Badge><span style={{ fontSize: 11.5, color: "var(--faint)" }}>Raised by {who(a.requestedBy)} on {date(a.raised, false)}</span><RecLink type={a.ref.type} id={a.ref.id} style={{ fontSize: 11.5 }}>{a.ref.id}</RecLink></>}
            right={<>
              <Btn kind="ghost" size="sm" onClick={() => decideApproval(a.id, false, "GH")} title="Records Graham's decision in the audit log">Decline</Btn>
              <Btn kind="accent" size="sm" icon={I.check} onClick={() => decideApproval(a.id, true, "GH")} title="Records Graham's approval in the audit log. A person makes this decision, not an agent.">Approve</Btn>
            </>} />
        ))}
        {decided.map(a => (
          <ItemRow key={a.id} done title={(a.status === "Approved" ? "Approved: " : "Declined: ") + a.title} sub={"Recorded at " + (a.decidedAt || "").slice(11) + " by Graham Hogan"} />
        ))}
      </div>
    </Card>
  );
}

function Bridge() {
  const p = pnl();
  const avg = fullMonthAverages();
  const oct = months().find(m => m.m.startsWith("Oct"));
  return (
    <Card title="November to date" sub={MTD_LABEL + ". Fictional demonstration figures."} right={<Src k="accounts" />}>
      <Waterfall height={196} steps={[
        { label: "Revenue", value: p.revenue, total: true, color: "#7FB8C9" },
        { label: "Cost of sales", value: -p.cogs, color: "#E0A98C" },
        { label: "Gross profit", value: p.gp, total: true, color: "#267985" },
        { label: "Operating costs", value: -p.opex, color: "#D9C27A" },
        { label: "EBITDA", value: p.ebitda, total: true, color: "var(--accent)" },
      ]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        <Stat label="Gross margin" value={pct(p.gm)} sub={"Oct " + pct(oct?.gm || 0) + " · avg " + pct(avg.gm)} />
        <Stat label="EBITDA margin" value={pct(p.em)} sub={"Oct " + pct(oct?.em || 0) + " · avg " + pct(avg.em)} />
      </div>
      <Reconciles ok={p.reconciles} style={{ marginTop: 12 }}>
        {eur(p.revenue)} − {eur(p.cogs)} = {eur(p.gp)} gross profit. {eur(p.gp)} − {eur(p.opex)} = {eur(p.ebitda)} EBITDA.
      </Reconciles>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <Go onClick={() => nav("Dashboard", "finance")}>Full P&amp;L and margins</Go>
      </div>
    </Card>
  );
}

function Cash() {
  const s = useHogan();
  const ar = arSummary(s), ap = apSummary(s), low = cashLow(s), out = cashOutlook(s);
  return (
    <Card title="Cash position" right={<Src k="bank" />}>
      <Stat big label={"Bank balance · " + date(FIN.bankAsOf, false)} value={eur(FIN.bankBalance)} sub="Demo balance. The bank feed is not yet verified." />
      <div style={{ marginTop: 8 }}>
        <Fig label="Overdue from customers" sub={ar.overdue.length + " invoices · largest " + (ar.overdue[0]?.id || "none")} value={eur(ar.overdueTotal)} tone="warn" onClick={() => nav("Finance", "ar")} />
        <Fig label="Supplier bills due in 30 days" sub={ap.in30.length + " bills · " + ap.lateNote} value={eur(ap.in30Total)} onClick={() => nav("Finance", "ap")} />
        <Fig label="Lowest point, next 6 weeks" sub={low.w + " · illustrative"} value={eur(low.close)} onClick={() => nav("Finance", "forecast")} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <span style={{ ...label, fontSize: 9 }}>Projected balance</span>
        <span style={{ flex: 1 }} />
        <Spark values={[FIN.bankBalance, ...out.map(r => r.close)]} w={150} h={28} />
      </div>
    </Card>
  );
}

function Pipeline() {
  const s = useHogan();
  const reps = repStats(s);
  const wk = sum(reps.map(r => r.weekRevenue)), tgt = sum(reps.map(r => r.weekTarget));
  const dow = new Date(TODAY + "T00:00:00Z").getUTCDay();
  const left = Math.max(0, 5 - dow);
  return (
    <Card title="Pipeline and sales target" right={<Src k="live" />}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.6px", fontVariantNumeric: "tabular-nums" }}>{eur(wk)}</span>
        <span style={{ fontSize: 12.5, color: "var(--dim)" }}>of {eur(tgt)} weekly target · {Math.round((wk / tgt) * 100)}%</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>This week to date, {left === 1 ? "one selling day left" : left + " selling days left"}</div>
      <Progress value={wk} max={tgt} h={7} style={{ marginTop: 9 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
        {reps.map(r => (
          <div key={r.id} onClick={() => openRecord("staff", r.id)} className="ix11" style={{ display: "grid", gridTemplateColumns: "22px minmax(0,1fr) 64px 40px", alignItems: "center", gap: 8, cursor: "pointer", borderRadius: 7, padding: "2px 4px", margin: "0 -4px" }}>
            <Avatar id={r.id} size={20} />
            <Progress value={r.weekRevenue} max={r.weekTarget} h={5} tone={r.weekRevenue / r.weekTarget < 0.7 ? "warn" : "accent"} />
            <span style={{ fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eurK(r.weekRevenue)}</span>
            <span style={{ fontSize: 11, color: "var(--faint)", textAlign: "right" }}>{Math.round((r.weekRevenue / r.weekTarget) * 100)}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <Stat label="Open pipeline" value={eurK(pipelineValue(s))} sub={openOpps(s).length + " opportunities · weighted " + eurK(weighted(s))} onClick={() => nav("Dashboard", "sales")} />
        <Stat label="Overdue follow-ups" value={overdueFollowups(s).length} tone="warn" sub={"of " + openOpps(s).length + " open opportunities"} onClick={() => nav("Sales", "followups")} />
      </div>
    </Card>
  );
}

function StockRisk() {
  const s = useHogan();
  const r = stockRisk(s);
  const first = r.low[0];
  const loc = (id: string) => D.locById(id)?.short || id;
  return (
    <Card title="Stock risk" right={<Src k="live" />}>
      <Fig label={r.low.length + " hospital stock line" + (r.low.length === 1 ? "" : "s") + " below par"} tone={r.low.length ? "warn" : "ok"}
        sub={r.low.slice(0, 2).map(x => loc(x.line.loc) + " " + x.line.sku + ": " + x.line.qty + " of " + x.line.min).join(" · ") || "Every site is at or above par"}
        value={r.low.length} onClick={() => nav("Inventory", "replenish", first ? { "inventory.focus": first.line.sku } : undefined)} />
      <Fig label="Expiring within 90 days" sub={r.exp.lines.length + " lines · " + r.exp.units + " units at cost"} value={eur(r.exp.value)} tone="warn" onClick={() => nav("Dashboard", "inventory")} />
      <Fig label="Held back from picking" sub={r.quarantine.length + " quarantined · " + r.verify.length + " to verify after counts"} value={r.quarantine.length + r.verify.length} onClick={() => nav("Inventory", "counts")} />
      <Fig label="Main stockroom below reorder point" sub={r.reorder.slice(0, 2).map(x => x.product.sku).join(" · ") || "Nothing to reorder"} value={r.reorder.length + " SKUs"} onClick={() => nav("Purchasing", "reorder")} />
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, lineHeight: 1.5 }}>
        Consignment stock at hospitals stays Hogan's until it is used, so it counts here.
      </div>
    </Card>
  );
}

function Composition() {
  const m = months();
  return (
    <Card title="Where each month's revenue went" sub="Cost of sales, operating costs and EBITDA stack to revenue. Dec to Oct are illustrative history; Nov* is month to date."
      right={<Src k="illustrative" />}>
      <StackBars height={200} fmt={eurK} labels={m.map(x => x.m.replace(/ \d\d/, ""))}
        series={[
          { name: "Cost of sales", values: m.map(x => x.cogs), color: "#E0A98C" },
          { name: "Operating costs", values: m.map(x => x.opex), color: "#D9C27A" },
          { name: "EBITDA", values: m.map(x => x.ebitda), color: "var(--accent)" },
        ]} />
    </Card>
  );
}

function Compare() {
  const p = pnl(), f = forecast(), avg = fullMonthAverages();
  const oct = months().find(m => m.m.startsWith("Oct"))!;
  const avgEbitda = (avg.rev * avg.em) / 100;
  const rows: [string, ReactNode, string, string][] = [
    ["Revenue", <>{eur(p.revenue)}<div style={{ fontSize: 11, color: "var(--faint)" }}>{eur(f.base)} projected</div></>, eur(oct.rev), eur(Math.round(avg.rev))],
    ["Gross margin", pct(p.gm), pct(oct.gm), pct(avg.gm)],
    ["EBITDA", <>{eur(p.ebitda)}<div style={{ fontSize: 11, color: "var(--faint)" }}>{eur(f.scen[1].ebitda)} projected</div></>, eur(oct.ebitda), eur(Math.round(avgEbitda))],
    ["EBITDA margin", pct(p.em), pct(oct.em), pct(avg.em)],
  ];
  return (
    <Card title="How November is tracking" sub={f.workingDaysDone + " of " + f.workingDays + " working days done. Projections are illustrative."} flush>
      <div className="hk-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}>
            <th style={{ ...th, textAlign: "left" }}></th><th style={{ ...th, textAlign: "right" }}>Nov to date</th><th style={{ ...th, textAlign: "right" }}>October</th><th style={{ ...th, textAlign: "right" }}>{avg.n}-month avg</th>
          </tr></thead>
          <tbody>
            {rows.map(([k, a, b, c]) => (
              <tr key={k}>
                <td style={{ ...td, color: "var(--ink)" }}>{k}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "var(--ink)" }}>{a}</td>
                <td style={{ ...td, textAlign: "right" }}>{b}</td>
                <td style={{ ...td, textAlign: "right" }}>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 16px 14px" }}>
        <Progress value={f.workingDaysDone} max={f.workingDays} h={5} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Run-rate {eur(f.runRate)}</span>
          <Go onClick={() => nav("Finance", "forecast")}>Forecast</Go>
        </div>
      </div>
    </Card>
  );
}

export default function Exec() {
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Dashboard · Executive overview" title="This week at Hogan Healthcare"
          sub={"What needs a decision, and how November is tracking (" + MTD_LABEL + "). Every figure is fictional demonstration data."}
          right={<><Btn size="sm" icon={I.euro} onClick={() => nav("Finance", "overview")}>Finance</Btn><Btn size="sm" icon={I.trend} onClick={() => nav("Dashboard", "ops")}>Bottlenecks</Btn></>} />
        <Split k="21">
          <Decisions />
          <Bridge />
        </Split>
        <Split k="3" stretch>
          <Cash />
          <Pipeline />
          <StockRisk />
        </Split>
        <Split k="21">
          <Composition />
          <Compare />
        </Split>
      </Kit>
    </Page>
  );
}
