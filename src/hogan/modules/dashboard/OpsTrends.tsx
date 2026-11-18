/* Dashboard · Operational Trends. A twelve-week operating baseline (illustrative),
   one measure at a time, next to the live bottlenecks across the business. The
   baseline is a starting point: improvement would only be measured after go-live. */

import * as D from "../../data";
import { nav, useHogan, useUi } from "../../store";
import { Card, I, Notice, Page, PageHeader, TONE, label } from "../../ui";
import { HBars, Legend, Line, Spark } from "../../charts";
import { date } from "../../fmt";
import { OPS_METRICS, ORDER_STAGES, bottlenecks, opsStats, sum, type OpsKey } from "../finance/derive";
import { ItemRow, Kit, Split, Src, Stat, td, th } from "../finance/kit";

const WEEK_LABELS = D.WEEKS.map(w => w.replace("w/c ", ""));
const fmtV = (k: OpsKey, v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)) + (OPS_METRICS.find(m => m.k === k)?.unit || "");

function Tiles({ sel, onSel }: { sel: OpsKey; onSel: (k: OpsKey) => void }) {
  return (
    <div className="hk-kpis">
      {OPS_METRICS.map(m => {
        const st = opsStats(m.k);
        const on = sel === m.k;
        const worse = m.better === "lower" ? st.now > st.avg : st.now < st.avg;
        return (
          <button key={m.k} onClick={() => onSel(m.k)} className={on ? undefined : "ixx"}
            style={{ textAlign: "left", minWidth: 0, padding: "13px 14px", borderRadius: "var(--r-md,15px)", cursor: "pointer", font: "inherit", color: "inherit",
              background: on ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), transition: "transform .2s var(--ease),border-color .2s var(--ease)" }}>
            <div style={{ ...label, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.short}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 7 }}>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmtV(m.k, st.now)}</span>
              <span style={{ marginLeft: "auto" }}><Spark values={st.values} w={64} h={22} color={on ? "var(--accent)" : "#9FB5D9"} /></span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>
              <span style={{ color: worse ? TONE.warn.fg : "var(--dim)" }}>{worse ? "Worse" : "Better"} than avg</span> · avg {fmtV(m.k, +st.avg.toFixed(1))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Detail({ k }: { k: OpsKey }) {
  const m = OPS_METRICS.find(x => x.k === k)!;
  const st = opsStats(k);
  const lowerBetter = m.better === "lower";
  const bestV = lowerBetter ? st.min : st.max, worstV = lowerBetter ? st.max : st.min;
  const wk = (v: number) => WEEK_LABELS[st.values.indexOf(v)];
  const diff = st.last - st.first;
  const flat = Math.abs(diff) / Math.max(1, st.avg) < 0.04;
  const drift = flat ? "Broadly flat across the twelve weeks." : (diff < 0) === lowerBetter ? "The last six weeks ran slightly better than the first six." : "The last six weeks ran slightly worse than the first six.";
  return (
    <Card title={m.label} sub={m.def + " " + (lowerBetter ? "Lower is better." : "Higher is better.")} right={<Src k="illustrative" />}>
      <Line height={210} fmt={v => fmtV(k, v)} labels={WEEK_LABELS} markLast
        series={[{ name: m.short, values: st.values, color: "var(--accent)" }, { name: "12-week average", values: st.values.map(() => +st.avg.toFixed(1)), color: "#9FB5D9", dashed: true }]} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <Legend items={[{ label: m.short, color: "var(--accent)" }, { label: "12-week average", color: "#9FB5D9", dashed: true }]} />
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>Scale runs {fmtV(k, Math.floor(st.min * 0.9))} to {fmtV(k, Math.ceil(st.max * 1.04))}, not from zero</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(130px,100%),1fr))", gap: 8, marginTop: 14 }}>
        <Stat label="Latest week" value={fmtV(k, st.now)} sub={"Previous " + fmtV(k, st.prev)} />
        <Stat label="12-week average" value={fmtV(k, +st.avg.toFixed(1))} sub={"Range " + fmtV(k, st.min) + " to " + fmtV(k, st.max)} />
        <Stat label="Best week" value={fmtV(k, bestV)} sub={"w/c " + wk(bestV)} />
        <Stat label="Weakest week" value={fmtV(k, worstV)} sub={"w/c " + wk(worstV)} />
      </div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.55 }}>
        {drift} Once connected, this measure would come from: {m.source.charAt(0).toLowerCase() + m.source.slice(1)}
      </div>
    </Card>
  );
}

function Bottlenecks() {
  const s = useHogan();
  const b = bottlenecks(s);
  const ids = (xs: { id: string }[]) => xs.map(x => x.id).join(", ");
  const rows = [
    { n: b.awaitingCourier.length, title: "packed orders waiting for a courier", sub: ids(b.awaitingCourier), icon: I.truck, go: () => nav("Orders", "dispatch") },
    { n: b.issues.length, title: "orders on hold with an issue", sub: b.issues.map(o => o.id + ": " + (o.issue || "").split(".")[0]).join(" · "), icon: I.alert, go: () => nav("Orders", "overview") },
    { n: b.so1047Left, title: "lines on SO-1047 still to scan", sub: "Courier cut-off 16:00 · Sharon", icon: I.scan, go: () => nav("Orders", "picking", { "orders.pick": "SO-1047" }) },
    { n: b.risk.low.length, title: "hospital lines below par", sub: b.risk.low.map(x => (D.locById(x.line.loc)?.short || x.line.loc) + " " + x.line.sku).join(" · "), icon: I.hospital, go: () => nav("Inventory", "replenish") },
    { n: b.risk.quarantine.length + b.risk.verify.length, title: "stock lines held back or unverified", sub: b.risk.verify.map(l => l.sku + " at " + (D.locById(l.loc)?.short || l.loc)).join(" · "), icon: I.box, go: () => nav("Inventory", "counts") },
    { n: b.bank.open, title: "bank lines waiting to be reconciled", sub: b.bank.suggested.length + " suggested · " + b.bank.unmatched.length + " unmatched · " + b.bank.exceptions.length + " exceptions", icon: I.euro, go: () => nav("Finance", "recon") },
    { n: b.bills.length, title: "supplier bills on hold", sub: ids(b.bills), icon: I.doc, go: () => nav("Purchasing", "exceptions") },
    { n: b.followups.length, title: "sales follow-ups overdue", sub: b.followups.slice(0, 3).map(o => D.accountById(o.account)?.name).join(" · "), icon: I.users, go: () => nav("Sales", "followups") },
  ].sort((x, y) => (y.n > 0 ? 1 : 0) - (x.n > 0 ? 1 : 0));
  const total = sum(rows.map(r => r.n));
  return (
    <Card title="Bottlenecks right now" sub={total + " items are holding work up across orders, stock, finance and sales. Live demo records."} right={<Src k="live" />}>
      <div className="hk-list">
        {rows.map(r => (
          <ItemRow key={r.title} done={r.n === 0} tone={r.n >= 5 ? "bad" : "warn"} icon={r.icon} onClick={r.go}
            title={<><b style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{r.n}</b> {r.title}</>} sub={r.n ? r.sub : "Clear"} />
        ))}
      </div>
    </Card>
  );
}

function OrderFlow() {
  const s = useHogan();
  const rows = ORDER_STAGES.map(st => ({ st, n: s.orders.filter(o => o.status === st).length }));
  const first = s.orders.reduce((m, o) => (o.created < m ? o.created : m), s.orders[0]?.created || "");
  const colour: Record<string, string> = { Confirmed: "#9FB5D9", Picking: "#7FB8C9", Packed: "#267985", "Awaiting courier": "#D9C27A", Issue: "var(--bad)", Dispatched: "var(--accent)", Delivered: "#B9A9D9" };
  return (
    <Card title="Orders by stage today" sub={s.orders.length + " sales orders raised since " + (first ? date(first, false) : "late October") + ". Click to open Orders."} right={<Src k="live" />}>
      <HBars onRow={() => nav("Orders", "overview")} fmt={n => String(n)} data={rows.map(r => ({ label: r.st, value: r.n, color: colour[r.st], right: r.n + " orders" }))} />
    </Card>
  );
}

function Definitions() {
  return (
    <Card title="How each measure is defined" sub="So the baseline and any later comparison measure the same thing." flush>
      <div className="hk-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}><th style={{ ...th, textAlign: "left" }}>Measure</th><th style={{ ...th, textAlign: "left" }}>Definition</th><th style={{ ...th, textAlign: "left" }}>Captured from</th></tr></thead>
          <tbody>
            {OPS_METRICS.map(m => (
              <tr key={m.k}>
                <td style={{ ...td, color: "var(--ink)", fontSize: 12.5, whiteSpace: "nowrap" }}>{m.short}</td>
                <td style={{ ...td, fontSize: 12, color: "var(--dim)" }}>{m.def}</td>
                <td style={{ ...td, fontSize: 12, color: "var(--dim)" }}>{m.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function OpsTrends() {
  const [sel, setSel] = useUi<OpsKey>("dash.opsMetric", "handlingMins");
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Dashboard · Operational trends" title="How the business runs today"
          sub={"Twelve weeks of operating measures, " + D.WEEKS[0] + " to w/c " + D.WEEKS[D.WEEKS.length - 1] + ", next to what is holding work up today. Pick a measure to see its weekly detail."} />
        <Notice tone="info" title="This is a baseline, not a result">
          These measures describe how the business runs today, before Pulse. Any improvement would only be measured after go-live, against this baseline. Nothing on this page shows or implies a gain. The weekly history is illustrative demo data.
        </Notice>
        <Tiles sel={sel} onSel={setSel} />
        <Split k="21">
          <Detail k={sel} />
          <Bottlenecks />
        </Split>
        <Split k="12">
          <OrderFlow />
          <Definitions />
        </Split>
      </Kit>
    </Page>
  );
}
