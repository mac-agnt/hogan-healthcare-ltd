/* Dashboard · Inventory Performance. Where stock sits (main stockroom and the
   eight consignment sites), what it is worth, what needs replenishing, what is
   ageing or close to expiry, and how stock has moved over twelve weeks. */

import * as D from "../../data";
import { centralUnits, hospitalUnits, lowSiteLines, nav, openRecord, stockValue, totalUnits, useHogan, type SiteLow } from "../../store";
import { Badge, Btn, Card, I, Kpi, Page, PageHeader, RecLink, Status, Table, type Col } from "../../ui";
import { HBars, SplitBar, StackBars } from "../../charts";
import { daysUntil, date, eur, eurK, num } from "../../fmt";
import { expiryExposure, stockAgeing, stockByLocation, stockRisk, sum, unitCost } from "../finance/derive";
import { Go, Kit, Kpis, Meter, Reconciles, Split, Src, Stat } from "../finance/kit";

const short = (id: string) => D.locById(id)?.short || id;
const pname = (sku: string) => D.productBySku(sku)?.name || sku;

function Held() {
  const s = useHogan();
  const cu = centralUnits(s), hu = hospitalUnits(s), cv = stockValue(s, "DLM"), all = stockValue(s);
  return (
    <Card title="Company-held and hospital-held" sub="Consignment stock stays Hogan's until a hospital uses it, so it is on the balance sheet but not on Hogan's shelves." right={<Src k="live" />}>
      <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>Units</div>
      <SplitBar parts={[{ label: "Main stockroom " + num(cu), value: cu, color: "#267985" }, { label: "At " + D.SITES.length + " hospital sites " + num(hu), value: hu, color: "#7FB8C9" }]} />
      <div style={{ fontSize: 12, color: "var(--dim)", margin: "14px 0 6px" }}>Value at cost</div>
      <SplitBar parts={[{ label: "Main stockroom " + eurK(cv), value: cv, color: "#267985" }, { label: "Hospital sites " + eurK(all - cv), value: all - cv, color: "#7FB8C9" }]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        <Stat label="Hospital share of units" value={Math.round((hu / (cu + hu)) * 100) + "%"} sub={num(hu) + " of " + num(cu + hu) + " units"} />
        <Stat label="Hospital share of value" value={Math.round(((all - cv) / all) * 100) + "%"} sub={eur(all - cv) + " at cost"} />
      </div>
      <Reconciles ok={cu + hu === totalUnits(s)} style={{ marginTop: 12 }}>{num(cu)} central + {num(hu)} at hospitals = {num(totalUnits(s))} units on hand.</Reconciles>
    </Card>
  );
}

function ByLocation() {
  const s = useHogan();
  const rows = stockByLocation(s);
  type R = (typeof rows)[number];
  const cols: Col<R>[] = [
    { key: "loc", label: "Location", w: "minmax(170px,1.8fr)", render: r => <><RecLink type="location" id={r.loc.id}>{r.loc.name}</RecLink><div style={{ fontSize: 11, color: "var(--faint)" }}>{r.loc.kind === "central" ? "Company stockroom" : "Consignment · " + r.loc.area}</div></> },
    { key: "units", label: "Units", w: "70px", align: "right", sort: r => r.units, render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{num(r.units)}</b> },
    { key: "vs", label: "vs target", w: "112px", sort: r => r.units / r.loc.target, render: r => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Meter value={r.units} max={r.loc.target} w={52} color={r.units < r.loc.target ? "var(--warn)" : "var(--accent)"} /><span style={{ fontSize: 11.5, color: "var(--dim)" }}>{num(r.loc.target)}</span></span>) },
    { key: "value", label: "Value", w: "96px", align: "right", sort: r => r.value, render: r => eur(r.value) },
    { key: "rep", label: "Last top-up", w: "96px", render: r => r.loc.lastReplenished ? <span style={{ fontSize: 12.5 }}>{date(r.loc.lastReplenished, false)}</span> : <span style={{ color: "var(--faint)", fontSize: 12 }}>Receipts</span> },
    { key: "low", label: "Below par", w: "96px", align: "center", sort: r => r.low, render: r => r.low ? <Badge tone="warn">{r.low}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
  ];
  return (
    <Card title="Stock by location" sub="Units, value at cost and lines below par. Click a location to open it." right={<Src k="erp" />} flush>
      <Table cols={cols} rows={rows} rowKey={r => r.loc.id} onRow={r => openRecord("location", r.loc.id)} dense minWidth={630} />
      <div style={{ padding: "10px 16px" }}>
        <Reconciles ok={sum(rows.map(r => r.units)) === totalUnits(s)}>Nine locations hold {num(sum(rows.map(r => r.units)))} units worth {eur(sum(rows.map(r => r.value)))} at cost. Unit costs would come from the ERP item file.</Reconciles>
      </div>
    </Card>
  );
}

function Replenish() {
  const s = useHogan();
  const rows = lowSiteLines(s);
  const cols: Col<SiteLow>[] = [
    { key: "sku", label: "Product at site", w: "minmax(170px,2fr)", render: r => <><span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}><RecLink type="product" id={r.line.sku} /><RecLink type="location" id={r.line.loc} style={{ fontSize: 11.5, color: "var(--dim)" }}>{short(r.line.loc)}</RecLink></span><div style={{ fontSize: 11, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pname(r.line.sku)}>{pname(r.line.sku)}</div></> },
    { key: "oh", label: "Have / par", w: "96px", align: "center", sort: r => r.line.qty - (r.line.min || 0), render: r => <span><b style={{ color: "var(--warn)", fontWeight: 600 }}>{r.line.qty}</b> / {r.line.min}</span> },
    { key: "sug", label: "Top-up", w: "76px", align: "center", render: r => r.suggested },
    { key: "cen", label: "Central", w: "82px", align: "center", title: "Available in the main stockroom", render: r => <span style={{ color: r.centralAvail >= r.suggested ? "var(--body)" : "var(--bad)" }}>{r.centralAvail}</span> },
    { key: "tr", label: "Transfer", w: "minmax(104px,1fr)", align: "right", render: r => r.pending ? <Status s={r.pending.status} /> : <Btn size="sm" kind="accent" onClick={() => nav("Inventory", "replenish", { "inventory.focus": r.line.sku })}>Replenish</Btn> },
  ];
  return (
    <Card title="Replenishment exceptions" sub={rows.length ? rows.length + " hospital lines are below their agreed par level." : "Every hospital line is at or above par."}
      right={<Go onClick={() => nav("Inventory", "replenish")}>Replenishment</Go>} flush>
      <Table cols={cols} rows={rows} rowKey={r => r.line.id} dense minWidth={520}
        empty={<div style={{ padding: 18, fontSize: 12.5, color: "var(--dim)" }}>No site is below par.</div>} />
    </Card>
  );
}

function Expiry() {
  const s = useHogan();
  const e = expiryExposure(s, 90);
  const cols: Col<D.StockLine>[] = [
    { key: "sku", label: "Product · lot", w: "minmax(128px,1.5fr)", render: l => <><RecLink type="lot" id={l.sku + "|" + l.lot}>{l.sku}</RecLink><div style={{ fontSize: 11, color: "var(--faint)" }}>Lot {l.lot}</div></> },
    { key: "loc", label: "Where", w: "minmax(78px,1fr)", render: l => <span style={{ fontSize: 12.5, lineHeight: 1.35 }}>{short(l.loc)}</span> },
    { key: "exp", label: "Expires", w: "88px", sort: l => l.expiry || "", render: l => <><div style={{ fontSize: 12.5 }}>{date(l.expiry || "", false)}</div><div style={{ fontSize: 11, color: daysUntil(l.expiry || "") <= 45 ? "var(--bad)" : "var(--warn)" }}>in {daysUntil(l.expiry || "")} days</div></> },
    { key: "qty", label: "Units", w: "58px", align: "right", render: l => l.qty },
    { key: "val", label: "Value", w: "74px", align: "right", sort: l => l.qty * unitCost(l.sku), render: l => eur(l.qty * unitCost(l.sku)) },
    { key: "st", label: "Status", w: "102px", render: l => <Status s={l.status} /> },
  ];
  return (
    <Card title="Expiry exposure, next 90 days" sub={e.lines.length + " lines, " + e.units + " units, " + eur(e.value) + " at cost. Earliest first."} right={<Go onClick={() => nav("Compliance", "exceptions")}>Exceptions</Go>} flush>
      <Table cols={cols} rows={e.lines} rowKey={l => l.id} dense onRow={l => openRecord("product", l.sku)} minWidth={528} initialSort={{ key: "exp", dir: 1 }} />
    </Card>
  );
}

function Ageing() {
  const s = useHogan();
  const b = stockAgeing(s);
  const units = sum(b.map(x => x.units));
  const oldest = s.stock.filter(l => l.qty > 0).slice().sort((x, y) => (x.received < y.received ? -1 : 1)).slice(0, 3);
  return (
    <Card title="Inventory age" sub="Units and value by date received. Older consignment lines are worth reviewing with the hospital." right={<Src k="live" />}>
      <HBars fmt={num} data={b.map(x => ({ label: x.k, value: x.units, color: x.color, sub: eurK(x.value), right: num(x.units) + " units" }))} />
      <div style={{ fontSize: 11.5, color: "var(--faint)", margin: "14px 0 6px" }}>Oldest lines on hand</div>
      {oldest.map(l => (
        <div key={l.id} onClick={() => openRecord("product", l.sku)} className="ix11" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, padding: "5px 6px", margin: "0 -6px", borderRadius: 7, cursor: "pointer" }}>
          <span style={{ color: "var(--accent)" }}>{l.sku}</span>
          <span style={{ flex: 1, minWidth: 0, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{short(l.loc)} · {l.qty} units · received {date(l.received)}</span>
          {l.expiry && daysUntil(l.expiry) <= 90 && <Badge tone="warn">Expiring</Badge>}
        </div>
      ))}
      <Reconciles ok={units === totalUnits(s)} style={{ marginTop: 10 }}>The four age bands add up to {num(units)} units.</Reconciles>
    </Card>
  );
}

function Usage() {
  const cats = D.CATEGORY_USAGE_90D.slice().sort((a, b) => b.v - a.v);
  const colour = (k: string) => D.CATEGORIES.find(c => c.short === k)?.color || "var(--accent)";
  const byValue = D.FIN.byCategory.slice().sort((a, b) => b.rev - a.rev);
  const top2 = byValue[0].rev + byValue[1].rev;
  return (
    <Card title="Most-used categories, last 90 days" sub="Units used or dispatched, across hospitals and direct orders (demo history)." right={<Src k="illustrative" />}>
      <HBars fmt={num} data={cats.map(c => ({ label: c.k, value: c.v, color: colour(c.k), right: num(c.v) + " units" }))} />
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
        {cats[0].k} moves fastest ({num(cats[0].v)} units), so it sets the pace for replenishment runs. By value, {byValue[0].k.toLowerCase()} and {byValue[1].k.toLowerCase()} bring in {Math.round((top2 / D.FIN.revenue) * 100)}% of November's revenue.
      </div>
    </Card>
  );
}

function Movements() {
  const t = D.MOVE_TRENDS;
  const last = (a: number[]) => a[a.length - 1];
  const avg = (a: number[]) => Math.round(sum(a) / a.length);
  return (
    <Card title="Stock movements, last 12 weeks" sub={"Receipts, transfers to hospitals, hospital usage and dispatches per week, " + D.WEEKS[0] + " to w/c " + D.WEEKS[D.WEEKS.length - 1] + "."} right={<Src k="illustrative" />}>
      <Split k="21" style={{ alignItems: "end" }}>
        <StackBars height={190} labels={D.WEEKS.map(w => w.replace("w/c ", ""))}
          series={[
            { name: "Receipts", values: t.receipts, color: "#267985" },
            { name: "Transfers", values: t.transfers, color: "#7FB8C9" },
            { name: "Usage", values: t.consumption, color: "#D9C27A" },
            { name: "Dispatches", values: t.dispatches, color: "#E0A98C" },
          ]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([["Receipts", t.receipts], ["Transfers", t.transfers], ["Usage", t.consumption], ["Dispatches", t.dispatches]] as [string, number[]][]).map(([k, v]) => (
            <Stat key={k} label={k + " this week"} value={last(v)} sub={"12-week avg " + avg(v)} />
          ))}
        </div>
      </Split>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>The latest week (w/c {D.WEEKS[D.WEEKS.length - 1]}) is still in progress, so it reads lower than a full week.</div>
    </Card>
  );
}

export default function InventoryPerf() {
  const s = useHogan();
  const r = stockRisk(s);
  const all = stockValue(s), cv = stockValue(s, "DLM");
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Dashboard · Inventory performance" title="Where the stock is and what it is worth"
          sub="The Dún Laoghaire main stockroom and consignment stock at eight hospital sites. Live demo stock records, valued at cost."
          right={<Btn size="sm" icon={I.box} onClick={() => nav("Inventory", "live")}>Open Inventory</Btn>} />
        <Kpis>
          <Kpi label="Units on hand" value={num(totalUnits(s))} sub={num(centralUnits(s)) + " central · " + num(hospitalUnits(s)) + " sites"} onClick={() => nav("Inventory", "locations")} />
          <Kpi label="Stock value" value={eurK(all)} sub={eurK(all - cv) + " held at hospitals"} />
          <Kpi label="Below par" value={r.low.length + " lines"} tone={r.low.length ? "warn" : "ok"} sub={"at " + new Set(r.low.map(x => x.line.loc)).size + " hospital sites"} onClick={() => nav("Inventory", "replenish")} />
          <Kpi label="Expiring soon" value={r.exp.units + " units"} tone="warn" sub={"90 days · " + eurK(r.exp.value)} />
          <Kpi label="Held back" value={r.quarantine.length + r.verify.length + " lines"} sub={r.quarantine.length + " quarantine · " + r.verify.length + " verify"} onClick={() => nav("Inventory", "counts")} />
          <Kpi label="Reorder needed" value={r.reorder.length + " SKUs"} sub="Main stockroom" onClick={() => nav("Purchasing", "reorder")} />
        </Kpis>
        <Split k="12">
          <Held />
          <ByLocation />
        </Split>
        <Split k="11">
          <Replenish />
          <Expiry />
        </Split>
        <Split k="11">
          <Ageing />
          <Usage />
        </Split>
        <Movements />
      </Kit>
    </Page>
  );
}
