/* Finance · Forecast. Where November is heading on the current run-rate (with an
   illustrative low/base/high range), the next six weeks of cash, and the weighted
   sales pipeline. Projections are illustrative, never presented as results. */

import * as D from "../../data";
import { nav, openOpps, openRecord, pipelineValue, useHogan } from "../../store";
import { Avatar, Card, Notice, Page, PageHeader, Progress, label } from "../../ui";
import { Bars, Legend, Line } from "../../charts";
import { date, eur, eurK, pct } from "../../fmt";
import { FIN, MTD_LABEL, cashLow, cashOutlook, forecast, fullMonthAverages, months, pnl, stageBreakdown, sum, weighted } from "./derive";
import { Go, Kit, Reconciles, Split, Src, Stat, td, th } from "./kit";

function Projection() {
  const f = forecast(), p = pnl(), avg = fullMonthAverages();
  const oct = months().find(m => m.m.startsWith("Oct"))!;
  const bars = [
    { label: "To date", value: FIN.revenue, color: "var(--accent)", note: f.workingDaysDone + " working days" },
    { label: "Low", value: f.low, color: "#9FB5D9", note: "illustrative" },
    { label: "Run-rate", value: f.runRate, color: "#7FB8C9", note: "straight line" },
    { label: "Base", value: f.base, color: "#267985", note: "illustrative" },
    { label: "High", value: f.high, color: "#9FB5D9", note: "illustrative" },
    { label: "October", value: oct.rev, color: "#D9C27A", note: "illustrative history" },
    { label: avg.n + "-mo avg", value: Math.round(avg.rev), color: "#B9A9D9", note: "illustrative history" },
  ];
  return (
    <Card title="November revenue projection" sub={"Run-rate from " + MTD_LABEL + ", with an illustrative range. Not a forecast of the accounts."} right={<Src k="illustrative" />}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{f.workingDaysDone} of {f.workingDays} working days done</span>
        <Progress value={f.workingDaysDone} max={f.workingDays} h={5} style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{f.daysLeft} left</span>
      </div>
      <Bars height={190} fmt={eurK} data={bars} highlight={3} />
      <div className="hk-scroll" style={{ marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}>
            {["Scenario", "Revenue", "Gross profit", "EBITDA", "vs October"].map((h, i) => <th key={h} style={{ ...th, textAlign: i ? "right" : "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {f.scen.map(r => (
              <tr key={r.k} style={{ background: r.k === "Base" ? "var(--accent-faint)" : undefined }}>
                <td style={{ ...td, color: "var(--ink)", fontWeight: r.k === "Base" ? 600 : 400 }}>{r.k}</td>
                <td style={{ ...td, textAlign: "right" }}>{eur(r.rev)}</td>
                <td style={{ ...td, textAlign: "right" }}>{eur(r.gp)}</td>
                <td style={{ ...td, textAlign: "right", color: r.k === "Base" ? "var(--accent)" : undefined, fontWeight: r.k === "Base" ? 600 : 400 }}>{eur(r.ebitda)}</td>
                <td style={{ ...td, textAlign: "right", color: r.rev < oct.rev ? "var(--warn)" : "var(--ok)" }}>{r.rev >= oct.rev ? "+" : "−"}{pct((Math.abs(r.rev - oct.rev) / oct.rev) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Reconciles ok={f.runRate === Math.round((FIN.revenue / f.workingDaysDone) * f.workingDays)} style={{ marginTop: 12 }}>
        Run-rate: {eur(FIN.revenue)} ÷ {f.workingDaysDone} days × {f.workingDays} days = {eur(f.runRate)}. Gross profit and EBITDA assume the month-to-date margins hold ({pct(p.gm)} and {pct(p.em)}). The base case needs {eur(f.toGo)} more in {f.daysLeft} working days.
      </Reconciles>
    </Card>
  );
}

function Movers() {
  const s = useHogan();
  const late = openOpps(s).filter(o => o.stage === "Negotiation" || o.stage === "Quotation").sort((a, b) => b.value * b.probability - a.value * a.probability);
  const v = sum(late.map(o => o.value)), w = sum(late.map(o => (o.value * o.probability) / 100));
  return (
    <Card title="What could move November" sub={late.length + " opportunities in quotation or negotiation, worth " + eur(v) + " (" + eur(w) + " weighted)."} right={<Go onClick={() => nav("Sales", "pipeline")}>Pipeline</Go>}>
      <div className="hk-list">
        {late.slice(0, 6).map(o => (
          <div key={o.id} onClick={() => openRecord("opp", o.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderRadius: 8 }}>
            <Avatar id={o.owner} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{D.accountById(o.account)?.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.stage} · {o.title}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 78 }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(o.value)}</div>
              <div style={{ fontSize: 11, color: "var(--faint)" }}>{o.probability}% · {eurK((o.value * o.probability) / 100)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>
        Weighted value is a sizing aid, not revenue. Close dates and invoicing timing are not modelled, so none of this is added to the projection.
      </div>
    </Card>
  );
}

function Cash() {
  const s = useHogan();
  const rows = cashOutlook(s), low = cashLow(s);
  const net = sum(rows.map(r => r.net));
  const last = rows[rows.length - 1];
  return (
    <Card title="Cash outlook, next six weeks" sub={"Opening bank balance " + eur(FIN.bankBalance) + " on " + date(FIN.bankAsOf, false) + ". Weekly flows are illustrative."} right={<span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Src k="bank" /><Src k="illustrative" /></span>}>
      <Line height={170} fmt={eur} markLast labels={["Now", ...rows.map(r => r.w.replace("w/c ", ""))]}
        series={[{ name: "Closing balance", values: [FIN.bankBalance, ...rows.map(r => r.close)], color: "var(--accent)" }, { name: "Opening balance", values: [FIN.bankBalance, ...rows.map(() => FIN.bankBalance)], color: "#9FB5D9", dashed: true }]} />
      <Legend style={{ marginTop: 8 }} items={[{ label: "Projected closing balance", color: "var(--accent)" }, { label: "Today's balance", color: "#9FB5D9", dashed: true }]} />
      <div className="hk-scroll" style={{ marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}>
            {["Week", "In", "Out", "Net", "Closing", "Already invoiced"].map((h, i) => <th key={h} title={i === 5 ? "Customer invoices already raised and due that week, as a share of the expected inflow" : undefined} style={{ ...th, textAlign: i ? "right" : "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.w} style={{ background: r.w === low.w ? "var(--warn-soft)" : undefined }}>
                <td style={{ ...td, color: "var(--ink)", whiteSpace: "nowrap" }}>{r.w}</td>
                <td style={{ ...td, textAlign: "right" }}>{eur(r.inflow)}</td>
                <td style={{ ...td, textAlign: "right" }}>{eur(-r.outflow)}</td>
                <td style={{ ...td, textAlign: "right", color: r.net < 0 ? "var(--warn)" : "var(--ok)" }}>{r.net > 0 ? "+" : ""}{eur(r.net)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "var(--ink)" }}>{eur(r.close)}</td>
                <td style={{ ...td, textAlign: "right", color: "var(--dim)" }}>{r.invoiced ? eurK(r.invoiced) + " · " + Math.round(r.cover) + "%" : "None yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Reconciles ok={FIN.bankBalance + net === last.close} style={{ marginTop: 12 }}>
        {eur(FIN.bankBalance)} {net >= 0 ? "+" : "−"} {eur(Math.abs(net))} net over six weeks = {eur(last.close)}. Lowest point {eur(low.close)} in {low.w}, when outflows of {eur(low.outflow)} exceed inflows.
      </Reconciles>
    </Card>
  );
}

function Weighted() {
  const s = useHogan();
  const st = stageBreakdown(s);
  const total = sum(st.map(x => x.value)), w = sum(st.map(x => x.weighted));
  return (
    <Card title="Weighted pipeline" sub="Open opportunities multiplied by stage probability." right={<Src k="live" />}>
      <div className="hk-list">
        {st.map(x => (
          <div key={x.stage} onClick={() => nav("Sales", "pipeline")} className="ix11" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "9px 4px", cursor: "pointer", borderRadius: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink)" }}>{x.stage}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{x.count} opps · {eur(x.value)} · {x.prob}%</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(x.weighted))}</div>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "10px 4px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Total <span style={{ fontWeight: 400, color: "var(--dim)", fontSize: 11.5 }}>· {sum(st.map(x => x.count))} opps · {eur(total)}</span></div>
          <div style={{ textAlign: "right", fontSize: 14, fontWeight: 650, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(w))}</div>
        </div>
      </div>
      <Reconciles ok={total === pipelineValue(s) && Math.round(w) === weighted(s)} style={{ marginTop: 8 }}>Stages add up to the {eur(pipelineValue(s))} open pipeline; {pct((w / Math.max(1, total)) * 100, 0)} of it on a weighted basis.</Reconciles>
    </Card>
  );
}

export default function Forecast() {
  const s = useHogan();
  const f = forecast(), low = cashLow(s);
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Forecast" title="Forecast"
          sub="Where November is heading, the next six weeks of cash and the weighted pipeline. Every projection here is illustrative demo data, not a forecast of Hogan Healthcare's accounts." />
        <Notice tone="info" title="Projections, not results">
          The range and cash flows are built for the demo from the fictional dataset. Nothing on this page is a promise or a measured gain. In production the cash outlook would draw on the bank feed and the sales and purchase ledgers, none of which is connected yet.
        </Notice>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12 }}>
          <Stat big label="November, base case" value={eur(f.base)} sub={"Range " + eurK(f.low) + " to " + eurK(f.high) + " · illustrative"} />
          <Stat big label="Straight-line run-rate" value={eur(f.runRate)} sub={f.workingDaysDone + " of " + f.workingDays + " working days"} />
          <Stat big label="Cash low point" value={eur(low.close)} tone="warn" sub={low.w + " · illustrative"} />
          <Stat big label="Weighted pipeline" value={eur(weighted(s))} sub={openOpps(s).length + " open opportunities"} />
        </div>
        <Split k="21">
          <Projection />
          <Movers />
        </Split>
        <Split k="21">
          <Cash />
          <Weighted />
        </Split>
        <div style={{ ...label, fontSize: 9.5, textAlign: "center" }}>Illustrative projections · fictional demonstration data</div>
      </Kit>
    </Page>
  );
}
