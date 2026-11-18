/* Inventory · Live Inventory: one row per SKU across every location. */

import { useMemo } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, eur, eurK, num } from "../../fmt";
import { activeSkus, centralUnits, expiringLines, hospitalUnits, nav, openRecord, stockValue, totalUnits, useHogan, useUi } from "../../store";
import { Btn, Card, Grid, I, Kpi, Page, PageHeader, Row, SearchBox, Seg, SelectBox, Table, match, type Col } from "../../ui";
import { Expiry, FlagCell, SkuCell } from "./bits";
import { EXPIRY_WINDOW, FLAGS, skuRows, type SkuRow } from "./model";

type StatusFilter = "all" | "OK" | "Low" | "Expiring" | "Verify" | "Quarantine";

export default function LiveInventory() {
  const s = useHogan();
  const rows = useMemo(() => skuRows(s), [s]);
  const [q, setQ] = useUi("inventory.live.q", "");
  const [cat, setCat] = useUi("inventory.live.cat", "all");
  const [loc, setLoc] = useUi("inventory.live.loc", "all");
  const [sup, setSup] = useUi("inventory.live.sup", "all");
  const [st, setSt] = useUi<StatusFilter>("inventory.live.status", "all");
  const [focus] = useUi("inventory.focus", "");

  const base = rows.filter(r =>
    (cat === "all" || r.p.cat === cat) &&
    (sup === "all" || r.p.supplier === sup) &&
    (loc === "all" || (r.byLoc[loc] || 0) > 0) &&
    match(q, r.p.sku, r.p.name, r.p.subtitle, r.sup?.name, r.cat?.name, r.p.gtin, ...r.lots, ...r.serials));
  const counts: Record<StatusFilter, number> = { all: base.length, OK: 0, Low: 0, Expiring: 0, Verify: 0, Quarantine: 0 };
  base.forEach(r => { if (!r.flags.length) counts.OK++; r.flags.forEach(f => { counts[f]++; }); });
  const shown = base.filter(r => st === "all" || (st === "OK" ? r.flags.length === 0 : r.flags.includes(st)));

  const total = totalUnits(s), central = centralUnits(s), hospital = hospitalUnits(s);
  const value = stockValue(s), centralValue = stockValue(s, "DLM");
  const exp = expiringLines(EXPIRY_WINDOW, s);
  const verify = s.stock.filter(l => l.qty > 0 && l.status === "Verify");
  const quarantine = s.stock.filter(l => l.qty > 0 && l.status === "Quarantine");
  const filtered = q || cat !== "all" || loc !== "all" || sup !== "all" || st !== "all";
  const site = loc !== "all" ? D.locById(loc) : undefined;

  const cols: Col<SkuRow>[] = [
    { key: "p", label: "Product", w: "minmax(190px,2fr)", sort: r => r.p.name, render: r => <SkuCell p={r.p} sub={r.p.subtitle ? "Demo product" : undefined} /> },
    { key: "sup", label: "Supplier · category", w: "1.35fr", sort: r => (r.sup?.name || "") + r.p.cat, render: r => (
      <div style={{ minWidth: 0 }}>
        <div title={r.sup?.name} style={{ fontSize: 12.5, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sup?.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: r.cat?.color, flex: "none" }} />{r.cat?.short}
        </div>
      </div>) },
    { key: "lots", label: "Lots", title: "Lots or serial numbers held", w: "0.65fr", sort: r => r.lots.length, render: r => (
      <span title={(r.p.tracking === "serial" ? r.serials : r.lots).join(", ")} style={{ fontSize: 12.5 }}>
        {r.p.tracking === "serial" ? r.serials.length + " serial" + (r.serials.length === 1 ? "" : "s") : r.lots.length + " lot" + (r.lots.length === 1 ? "" : "s")}
      </span>) },
    { key: "gtin", label: "GTIN / UDI-DI", title: "Demo identifiers: company prefix 999 is not a real manufacturer GTIN", w: "1.15fr", mono: true, sort: r => r.p.gtin,
      render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{r.p.gtin}</span> },
    { key: "exp", label: "Next expiry", title: "Nearest expiry across all lots", w: "1fr", sort: r => r.nearest || "9999", render: r => <span style={{ fontSize: 12.5 }}><Expiry d={r.nearest} window={EXPIRY_WINDOW} /></span> },
    ...(site ? [{ key: "here", label: "At " + site.short, w: "0.8fr", align: "right" as const, sort: (r: SkuRow) => r.byLoc[loc] || 0,
      render: (r: SkuRow) => <b style={{ color: "var(--accent)", fontWeight: 600 }}>{r.byLoc[loc] || 0}</b> }] : []),
    { key: "central", label: "Central", title: "Units in the Dún Laoghaire main stockroom", w: "0.72fr", align: "right", sort: r => r.central, render: r => <span style={{ color: "var(--ink)" }}>{r.central}</span> },
    { key: "hospital", label: "Hospital", title: "Consignment units held at hospital sites (still company-owned)", w: "0.8fr", align: "right", sort: r => r.hospital, render: r => <span>{r.hospital || <span style={{ color: "var(--faint)" }}>0</span>}</span> },
    { key: "reserved", label: "Reserved", title: "Allocated to confirmed orders", w: "0.8fr", align: "right", sort: r => r.reserved, render: r => <span style={{ color: r.reserved ? "var(--warn)" : "var(--faint)" }}>{r.reserved}</span> },
    { key: "available", label: "Available", title: "Main stockroom less reserved and quarantined", w: "0.85fr", align: "right", sort: r => r.available,
      render: r => <span style={{ color: r.available < r.p.minCentral ? "var(--warn)" : "var(--ink)", fontWeight: 600 }}>{r.available}</span> },
    { key: "status", label: "Status", w: "0.8fr", sort: r => (r.flags.length ? FLAGS.indexOf(r.flags[0]) : 9), render: r => <FlagCell flags={r.flags} /> },
  ];

  const clear = () => { setQ(""); setCat("all"); setLoc("all"); setSup("all"); setSt("all"); };

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Live Inventory"
        sub={"Every SKU across the main stockroom and eight hospital consignment sites, read from the shared demo dataset. Stock held at a hospital stays on Hogan's books until the hospital reports use."}
        right={<>
          <Btn icon={I.scan} onClick={() => nav("Inventory", "scanning")}>Scan stock</Btn>
          <Btn kind="primary" icon={I.route} onClick={() => nav("Inventory", "replenish")}>Replenishment</Btn>
        </>} />

      <Grid min={145} gap={12}>
        <Kpi label="Active SKUs" value={activeSkus(s)} sub={s.stock.filter(l => l.qty > 0).length + " stock lines"} />
        <Kpi label="Total units" value={num(total)} sub={D.LOCATIONS.length + " locations"} onClick={() => nav("Inventory", "locations")} />
        <Kpi label="Central · hospitals" value={<span>{num(central)}<span style={{ color: "var(--faint)", fontWeight: 500 }}> · </span>{num(hospital)}</span>}
          sub={Math.round((hospital / Math.max(1, total)) * 100) + "% on consignment"} onClick={() => nav("Inventory", "locations")} />
        <Kpi label="Stock value at cost" value={eur(value)} sub={eurK(value - centralValue) + " at hospitals"} />
        <Kpi label={"Expiring in " + EXPIRY_WINDOW + " days"} value={exp.length + " lines"} tone={exp.length ? "warn" : undefined}
          sub={exp.reduce((a, l) => a + l.qty, 0) + " units" + (exp[0]?.expiry ? " · from " + date(exp[0].expiry, false) : "")}
          onClick={() => setSt("Expiring")} />
        <Kpi label="Lines to verify" value={verify.length} tone={verify.length ? "warn" : "ok"} sub={quarantine.length ? quarantine.length + " line quarantined" : "None quarantined"}
          onClick={() => setSt("Verify")} />
      </Grid>

      <Card flush pad={14}
        title={<span>Stock by SKU <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", fontWeight: 500, marginLeft: 6 }}>{shown.length} of {rows.length}</span></span>}
        sub={"As at " + D.DEMO.todayLabel + ". Click a row for the product record: where it is, lots, movements and orders."}
        right={filtered ? <Btn size="sm" kind="ghost" icon={I.x} onClick={clear}>Clear filters</Btn> : undefined}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px 12px" }}>
          <Row wrap gap={8}>
            <SearchBox value={q} onChange={setQ} placeholder="Search name, SKU, lot, serial, GTIN or supplier" style={{ flex: "1 1 260px" }} />
            <SelectBox value={cat} onChange={setCat} title="Category" options={[["all", "All categories"], ...D.CATEGORIES.map(c => [c.id, c.short] as [string, string])]} />
            <SelectBox value={loc} onChange={setLoc} title="Location" options={[["all", "All locations"], ...D.LOCATIONS.map(l => [l.id, l.short] as [string, string])]} />
            <SelectBox value={sup} onChange={setSup} title="Supplier" options={[["all", "All suppliers"], ...D.SUPPLIERS.filter(x => D.PRODUCTS.some(p => p.supplier === x.id)).map(x => [x.id, x.name] as [string, string])]} />
          </Row>
          <Seg<StatusFilter> size="sm" value={st} onChange={setSt}
            items={[["all", "All", counts.all], ["OK", "OK", counts.OK], ["Low", "Low", counts.Low], ["Expiring", "Expiring", counts.Expiring], ["Verify", "Verify", counts.Verify], ["Quarantine", "Quarantine", counts.Quarantine]]} />
        </div>
        <Table<SkuRow> cols={cols} rows={shown} rowKey={r => r.p.sku} dense maxHeight={560} minWidth={1020}
          onRow={r => openRecord("product", r.p.sku)} highlight={r => r.p.sku === focus}
          footer={<span>{shown.length} SKUs · {num(shown.reduce((a, r) => a + r.total, 0))} units · {eur(shown.reduce((a, r) => a + r.value, 0))} at cost. GTIN / UDI-DI values are demo identifiers (company prefix 999), not real manufacturer codes. Expiring means on or before {date(addDays(TODAY, EXPIRY_WINDOW))}.</span>} />
      </Card>
    </Page>
  );
}
