/* Inventory · Locations: the main stockroom and eight consignment sites. */

import { useMemo } from "react";
import * as D from "../../data";
import { TODAY, addDays, eur, num, rel } from "../../fmt";
import { centralUnits, hospitalUnits, nav, openRecord, productStock, RESERVING, stockValue, totalUnits, useHogan } from "../../store";
import { Badge, Btn, Card, Grid, I, Icon, Kpi, Notice, Page, PageHeader, Table, label, type Col } from "../../ui";
import { SplitBar } from "../../charts";
import { dd, Stat } from "./bits";
import { siteLows, siteStat, type SiteStat } from "./model";


export default function Locations() {
  const s = useHogan();
  const low = useMemo(() => siteLows(s), [s]);
  const all = useMemo(() => D.LOCATIONS.map(l => siteStat(s, l, low)), [s, low]);
  const central = all[0];
  const sites = all.slice(1);
  const total = totalUnits(s), cu = centralUnits(s), hu = hospitalUnits(s);
  const value = stockValue(s), cv = stockValue(s, "DLM");
  const reserved = D.PRODUCTS.reduce((a, p) => a + productStock(p.sku, s).reserved, 0);
  const reservingOrders = s.orders.filter(o => RESERVING.includes(o.status)).length;
  const since = addDays(TODAY, -30);
  const used = s.movements.filter(m => m.type === "Consumption" && m.date > since).reduce((a, m) => a + m.qty, 0);
  const dispatched = s.movements.filter(m => m.type === "Dispatch" && m.date > since).reduce((a, m) => a + m.qty, 0);
  const openReturns = s.returns.filter(r => r.status !== "Restocked");
  const returnUnits = openReturns.reduce((a, r) => a + r.qty, 0);
  const attention = sites.filter(x => x.low.length || x.verify.length);

  const cols: Col<SiteStat>[] = [
    { key: "loc", label: "Location", w: "minmax(190px,2fr)", sort: r => r.loc.name, render: r => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.loc.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{r.loc.area}</div>
      </div>) },
    { key: "kind", label: "Holding", w: "1fr", render: r => r.loc.kind === "central" ? <Badge tone="accent">Company-held</Badge> : <Badge tone="info">Consignment</Badge> },
    { key: "units", label: "Units", w: "0.6fr", align: "right", sort: r => r.units, render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{r.units}</b> },
    { key: "share", label: "Share", w: "0.6fr", align: "right", sort: r => r.units, render: r => <span>{((r.units / Math.max(1, total)) * 100).toFixed(1)}%</span> },
    { key: "lines", label: "Lines", w: "0.5fr", align: "right", sort: r => r.lines.length, render: r => r.lines.length },
    { key: "value", label: "Value at cost", w: "0.9fr", align: "right", sort: r => r.value, render: r => eur(r.value) },
    { key: "low", label: "Below par", w: "0.8fr", align: "right", sort: r => r.low.length, render: r => r.loc.kind === "central" ? <span style={{ color: "var(--faint)" }}>n/a</span> : r.low.length ? <Badge tone="warn">{r.low.length}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
    { key: "verify", label: "To verify", w: "0.7fr", align: "right", sort: r => r.verify.length, render: r => r.verify.length ? <Badge tone="info">{r.verify.length}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
    { key: "repl", label: "Replenished", title: "Last replenished", w: "1fr", sort: r => r.lastRepl || "", render: r => r.loc.kind === "central" ? <span style={{ color: "var(--faint)" }}>Supplier receipts</span> : <span title={rel(r.lastRepl || TODAY)}>{dd(r.lastRepl, false)}</span> },
    { key: "agr", label: "Agreement", w: "0.9fr", mono: true, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{r.loc.agreement || "Own stock"}</span> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Locations"
        sub={"Where the " + num(total) + " units sit: " + num(cu) + " in the Dún Laoghaire main stockroom and " + num(hu) + " on consignment at eight hospital sites."}
        right={<Btn kind="primary" icon={I.hospital} onClick={() => nav("Inventory", "hospital")}>Hospital stock</Btn>} />

      <Notice tone="info" title="The eight hospital sites are fictional demo accounts">
        They were created for this walkthrough and are not Hogan Healthcare customers. Quantities, values and agreements shown are demonstration data.
      </Notice>

      <Grid min={150} gap={12}>
        <Kpi label="Company-held · main stockroom" value={num(cu)} sub={eur(cv) + " at cost · " + central.lines.length + " lines"} onClick={() => openRecord("location", "DLM")} />
        <Kpi label="Held at hospitals · consignment" value={num(hu)} sub={eur(value - cv) + " at cost · still company-owned"} tone="accent" />
        <Kpi label="Reserved for orders" value={num(reserved)} sub={reservingOrders + " orders awaiting dispatch"} onClick={() => nav("Orders", "overview")} />
        <Kpi label="Sites needing attention" value={attention.length + " of " + sites.length} tone={attention.length ? "warn" : "ok"}
          sub={attention.map(x => x.loc.short).join(" · ") || "All sites at par"} onClick={() => nav("Inventory", "hospital")} />
      </Grid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
        <Card style={{ flex: "1.75 1 600px" }} title="Where stock sits" sub="Line weight shows units held at each consignment site. Amber lines have a product below its par level. Click any location for its record.">
          <div className="hhinv-flow">
            <button onClick={() => openRecord("location", "DLM")} className="ixz"
              style={{ textAlign: "left", cursor: "pointer", color: "inherit", padding: "18px 18px", background: "var(--accent-faint)", border: "1px solid var(--accent-line)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={I.box} size={15} /></span>
                <span style={{ ...label, fontSize: 9.5, color: "var(--accent)" }}>Company-held</span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>Dún Laoghaire main stockroom</span>
              <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{num(cu)}<span style={{ fontSize: 13, fontWeight: 500, color: "var(--dim)", marginLeft: 6, letterSpacing: 0 }}>units</span></span>
              <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stat k="Value" v={eur(cv)} />
                <Stat k="Lines" v={central.lines.length} />
                <Stat k="Reserved" v={num(reserved)} tone="warn" />
                <Stat k="Quarantined" v={central.lines.filter(l => l.status === "Quarantine").reduce((a, l) => a + l.qty, 0)} tone="bad" />
              </span>
            </button>
            <FlowLines sites={sites} />
            <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {sites.map(x => <SiteRow key={x.loc.id} x={x} max={Math.max(1, ...sites.map(y => y.units))} />)}
            </div>
          </div>
        </Card>

        <Card style={{ flex: "1 1 300px" }} title="Ownership and status" sub="What each number means, live from the demo state.">
          <SplitBar height={10} parts={[
            { label: "Main stockroom, free", value: Math.max(0, cu - reserved), color: "var(--accent)" },
            { label: "Reserved", value: reserved, color: "var(--warn)" },
            { label: "At hospitals", value: hu, color: "var(--info)" },
          ]} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
            <LegendRow color="var(--accent)" k="Company-held, main stockroom" v={num(cu) + " units"} sub={eur(cv) + " at cost"}
              body="In Hogan's own stockroom. Free to pick unless reserved for an order or quarantined." />
            <LegendRow color="var(--info)" k="Physically held at a hospital" v={num(hu) + " units"} sub={eur(value - cv) + " at cost"}
              body="On the hospital's shelf under a consignment agreement. Still owned by Hogan until the hospital reports use." />
            <LegendRow color="var(--warn)" k="Reserved" v={num(reserved) + " units"} sub={reservingOrders + " orders"}
              body="Allocated to confirmed orders and still in the main stockroom. Leaves stock when the order is dispatched." />
            <LegendRow color="var(--ok)" k="Consumed or sold, last 30 days" v={num(used + dispatched) + " units"} sub={used + " used at hospitals · " + dispatched + " dispatched"}
              body="Ownership passes when a hospital uses a unit or a delivery is made, and the sale is invoiced." />
            <LegendRow color="var(--mid)" k="Returned" v={num(returnUnits) + " units"} sub={openReturns.length + " returns open"}
              body="Back from a customer or site. Inspected before it is restocked or sent back to the supplier." go={() => nav("Orders", "returns")} />
          </div>
        </Card>
      </div>

      <Card flush pad={14} title="Location register" sub={"Units, value at cost and open issues per location. Total " + num(total) + " units, " + eur(value) + "."}>
        <Table<SiteStat> cols={cols} rows={all} rowKey={r => r.loc.id} onRow={r => openRecord("location", r.loc.id)} minWidth={980} dense
          footer={<span>Consignment stock is counted on each replenishment visit. Agreement references are demo references.</span>} />
      </Card>
    </Page>
  );
}

const ROW = 48, GAP = 8;


function FlowLines({ sites }: { sites: SiteStat[] }) {
  const n = sites.length;
  const H = n * ROW + (n - 1) * GAP;
  const max = Math.max(1, ...sites.map(x => x.units));
  return (
    <svg className="hhinv-flow-svg" viewBox={"0 0 100 " + H} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block" }} aria-hidden>
      {sites.map((x, i) => {
        const y1 = i * (ROW + GAP) + ROW / 2;
        const y0 = H / 2 + (i - (n - 1) / 2) * 9;
        return (
          <path key={x.loc.id} d={"M0," + y0 + " C55," + y0 + " 45," + y1 + " 100," + y1} vectorEffect="non-scaling-stroke"
            style={{ fill: "none", stroke: x.low.length ? "var(--warn)" : "var(--accent)", strokeOpacity: 0.5, strokeWidth: 1.5 + (x.units / max) * 8, strokeLinecap: "round",
              animation: "fadeIn .8s var(--ease) both", animationDelay: i * 50 + "ms" }} />
        );
      })}
    </svg>
  );
}

function SiteRow({ x, max }: { x: SiteStat; max: number }) {
  const warn = x.low.length > 0;
  return (
    <button onClick={() => openRecord("location", x.loc.id)} className="ixz"
      style={{ height: ROW, display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(40px,1fr) auto", alignItems: "center", gap: 12, padding: "0 12px",
        background: "var(--surface-2)", border: "1px solid " + (warn ? "var(--warn-soft)" : "var(--border)"), borderRadius: 12, cursor: "pointer", textAlign: "left", color: "inherit" }}>
      <span style={{ minWidth: 0 }}>
        <span title={x.loc.name} style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.loc.short}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.loc.area} · {eur(x.value)}</span>
      </span>
      <span style={{ height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: (x.units / max) * 100 + "%", borderRadius: 6, background: warn ? "var(--warn)" : "var(--accent)", transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {warn && <Badge tone="warn">{x.low.length} low</Badge>}
        {x.verify.length > 0 && <Badge tone="info">Verify</Badge>}
        <span style={{ fontSize: 15, fontWeight: 600, minWidth: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{x.units}</span>
      </span>
    </button>
  );
}

function LegendRow({ color, k, v, sub, body, go }: { color: string; k: string; v: string; sub: string; body: string; go?: () => void }) {
  return (
    <div onClick={go} className={go ? "ix11" : undefined} style={{ display: "flex", gap: 11, padding: "9px 8px", borderRadius: 10, cursor: go ? "pointer" : undefined }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, marginTop: 4, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 140 }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 1 }}>{sub}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}
