/* Compliance · Device Register: every device Hogan distributes, with its
   identifiers, documentation status, custody and goods-in evidence. */

import { useMemo, type ReactNode } from "react";
import * as D from "../../data";
import { num } from "../../fmt";
import { expiringLines, nav, openRecord, useHogan, useUi } from "../../store";
import { Donut } from "../../charts";
import { Badge, Btn, Card, Grid, I, Kpi, Page, PageHeader, Row, SearchBox, SelectBox, Table, match, type Col } from "../../ui";
import { SkuCell, dd } from "../inventory/bits";
import { CheckIcon, RegNotice, useDocState } from "./common";
import { DOC_TONE, docProducts, productDocStatus, qxForProduct, type DevDocStatus, type DocView } from "./model";

type RegRow = { p: D.Product; sup?: D.Supplier; doc: { status: DevDocStatus; docs: DocView[] }; units: number; locs: number; lastIn?: D.Movement; qx: D.QualityException[] };

const CLASS_COLOR: Record<string, string> = { III: "var(--bad)", IIb: "var(--accent)", IIa: "var(--info)", Ir: "var(--warn)", Is: "var(--ok)", I: "var(--mid)" };

export default function Register() {
  const s = useHogan();
  const [docState] = useDocState();
  const [q, setQ] = useUi("compliance.reg.q", "");
  const [cls, setCls] = useUi("compliance.reg.class", "all");
  const [docF, setDocF] = useUi("compliance.reg.doc", "all");
  const [sup, setSup] = useUi("compliance.reg.sup", "all");

  const rows: RegRow[] = useMemo(() => {
    const lastIn: Record<string, D.Movement> = {};
    for (const m of s.movements) if (m.type === "Receipt" && (!lastIn[m.sku] || m.date > lastIn[m.sku].date)) lastIn[m.sku] = m;
    return D.PRODUCTS.map(p => {
      const lines = s.stock.filter(l => l.sku === p.sku && l.qty > 0);
      return { p, sup: D.supplierById(p.supplier), doc: productDocStatus(p.sku, docState), units: lines.reduce((a, l) => a + l.qty, 0), locs: new Set(lines.map(l => l.loc)).size, lastIn: lastIn[p.sku], qx: qxForProduct(p.sku, s.qx) };
    });
  }, [s, docState]);

  const shown = rows.filter(r => (cls === "all" || r.p.mdrClass === cls) && (sup === "all" || r.p.supplier === sup) && (docF === "all" || r.doc.status === docF)
    && match(q, r.p.sku, r.p.name, r.sup?.name, r.p.gtin, ...r.doc.docs.map(d => d.id)));
  const classes = Array.from(new Set(D.PRODUCTS.map(p => p.mdrClass)));
  const classCounts = classes.map(c => ({ label: "Class " + c, value: D.PRODUCTS.filter(p => p.mdrClass === c).length, color: CLASS_COLOR[c] || "var(--mid)" })).sort((a, b) => b.value - a.value);
  const gaps = rows.filter(r => r.doc.status === "Missing" || r.doc.status === "Expiring");
  const missing = rows.filter(r => r.doc.status === "Missing");
  const expiringCert = rows.filter(r => r.doc.status === "Expiring");
  const openQx = s.qx.filter(x => x.status !== "Closed");
  const grnScanned = s.grns.filter(g => g.checks.find(c => c.k.startsWith("UDI"))?.ok === true).length;
  const grnLot = s.grns.filter(g => g.checks.find(c => c.k.startsWith("Lot"))?.ok === true).length;
  const grnStorage = s.grns.filter(g => g.checks.find(c => c.k.startsWith("Storage"))?.ok === true).length;
  const handKeyed = s.grns.filter(g => g.checks.find(c => c.k.startsWith("UDI"))?.ok === false);
  const traced = s.stock.filter(l => l.qty > 0 && s.movements.some(m => m.type === "Receipt" && m.sku === l.sku && m.lot === l.lot)).length;
  const live = s.stock.filter(l => l.qty > 0).length;
  const ifuDevices = new Set(D.QUALITY_DOCS.filter(d => d.kind === "IFU").flatMap(d => docProducts(d.id).map(p => p.sku))).size;
  const exp90 = expiringLines(90, s);
  const quarantined = s.stock.filter(l => l.qty > 0 && l.status === "Quarantine");
  const complaints = openQx.filter(x => x.kind === "Complaint" || x.kind === "Traceability");

  const checks: { ok: boolean | null; k: string; ev: ReactNode; go?: () => void; goLabel?: string }[] = [
    { ok: gaps.length ? null : true, k: "CE marking and declaration of conformity on file",
      ev: (rows.length - gaps.length) + " of " + rows.length + " devices clear · " + missing.length + " missing a declaration · " + expiringCert.length + " under a certificate that is expiring",
      go: () => nav("Compliance", "docs"), goLabel: "Documents" },
    { ok: true, k: "Labelling and instructions for use available", ev: "IFU packs on file for " + ifuDevices + " devices; the rest are held under supplier documentation pack references (demo)." },
    { ok: rows.every(r => !!r.p.gtin), k: "UDI-DI recorded for every device", ev: rows.filter(r => r.p.gtin).length + " of " + rows.length + " devices carry a GTIN / UDI-DI (demo identifiers, prefix 999)." },
    { ok: handKeyed.length ? null : true, k: "UDI label scanned and lot or serial captured at goods-in",
      ev: grnScanned + " of " + s.grns.length + " recent receipts fully scanned · lot captured on " + grnLot + " of " + s.grns.length + (handKeyed.length ? " · " + handKeyed.map(g => g.id).join(", ") + " keyed by hand" : ""),
      go: () => nav("Purchasing", "receiving"), goLabel: "Goods receiving" },
    { ok: grnStorage === s.grns.length, k: "Storage and transport conditions checked", ev: grnStorage + " of " + s.grns.length + " recent receipts recorded storage conditions as met." },
    { ok: traced === live, k: "Supplier and customer recorded for every unit", ev: traced + " of " + live + " stock lines trace back to a supplier receipt; every hospital use and dispatch is a movement with an order reference.",
      go: () => nav("Compliance", "udi"), goLabel: "UDI trace" },
    { ok: quarantined.length || exp90.length ? null : true, k: "Expired and short-dated stock withheld", ev: exp90.length + " lines expire within 90 days · " + quarantined.length + " line quarantined and held back from picking.",
      go: () => nav("Inventory", "live", { "inventory.live.status": "Expiring" }), goLabel: "Expiring stock" },
    { ok: complaints.length ? null : true, k: "Non-conformities and complaints recorded and followed up", ev: complaints.length + " open traceability or complaint exceptions, each with a named owner.",
      go: () => nav("Compliance", "exceptions"), goLabel: "Exceptions" },
  ];

  const cols: Col<RegRow>[] = [
    { key: "p", label: "Device", w: "minmax(180px,1.8fr)", sort: r => r.p.name, render: r => <SkuCell p={r.p} /> },
    { key: "sup", label: "Manufacturer", title: "Manufacturer / supplier", w: "1.15fr", sort: r => r.sup?.name || "", render: r => <span title={r.sup?.fictional ? "Fictional demo supplier" : r.sup?.note} style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{r.sup?.name}</span> },
    { key: "gtin", label: "GTIN / UDI-DI", title: "Demo identifiers, not real manufacturer codes", w: "1.1fr", sort: r => r.p.gtin, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{r.p.gtin}</span> },
    { key: "cls", label: "Class", title: "MDR class (illustrative)", w: "0.5fr", sort: r => r.p.mdrClass, render: r => <Badge style={{ fontFamily: "var(--mono)" }}>{r.p.mdrClass}</Badge> },
    { key: "ster", label: "Sterile", w: "0.62fr", sort: r => (r.p.sterile ? 1 : 0), render: r => <span style={{ fontSize: 12.5, color: r.p.sterile ? "var(--body)" : "var(--faint)" }}>{r.p.sterile ? "Yes" : "No"}</span> },
    { key: "trk", label: "UDI-PI", title: "Production identifier tracked: lot and expiry, or serial", w: "0.62fr", sort: r => r.p.tracking, render: r => <span style={{ fontSize: 12.5 }}>{r.p.tracking === "serial" ? "Serial" : "Lot"}</span> },
    { key: "doc", label: "CE / documents", w: "1.25fr", sort: r => r.doc.status, render: r => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }} title={r.doc.docs.map(d => d.id + " " + d.title).join("\n") || "Supplier pack " + r.p.docRef}>
        <Badge tone={DOC_TONE[r.doc.status]}>{r.doc.status === "Pack reference" ? "Pack ref." : r.doc.status}</Badge>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.doc.docs[0]?.id || r.p.docRef}</span>
      </span>) },
    { key: "cust", label: "In custody", w: "0.85fr", align: "right", sort: r => r.units, render: r => <span style={{ fontSize: 12.5 }}><b style={{ fontWeight: 600, color: "var(--ink)" }}>{r.units}</b><span style={{ color: "var(--faint)" }}> · {r.locs} loc</span></span> },
    { key: "gin", label: "Goods-in", title: "Last goods-in receipt", w: "0.8fr", sort: r => r.lastIn?.date || "", render: r => <span style={{ fontSize: 12.5 }}>{r.lastIn ? dd(r.lastIn.date, false) : "Not recorded"}</span> },
    { key: "qx", label: "Issues", title: "Open quality exceptions", w: "0.6fr", align: "right", sort: r => r.qx.length, render: r => r.qx.length ? <Badge tone="warn">{r.qx.length}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Device Register"
        sub="Every device Hogan distributes: identifiers, illustrative MDR class, documentation status, where units are now and the goods-in evidence behind them."
        right={<Btn icon={I.route} onClick={() => nav("Compliance", "udi")}>Trace a UDI</Btn>} />
      <RegNotice />

      <Grid min={150} gap={12}>
        <Kpi label="Devices on register" value={rows.length} sub={rows.filter(r => r.p.sterile).length + " sterile · " + rows.filter(r => r.p.tracking === "serial").length + " serial-tracked"} />
        <Kpi label="Documentation gaps" value={gaps.length + " devices"} tone={gaps.length ? "warn" : "ok"} sub={missing.length + " missing DoC · " + expiringCert.length + " cert expiring"} onClick={() => setDocF(missing.length ? "Missing" : "Expiring")} />
        <Kpi label="Units in custody" value={num(rows.reduce((a, r) => a + r.units, 0))} sub={"Across " + D.LOCATIONS.length + " locations"} onClick={() => nav("Inventory", "locations")} />
        <Kpi label="Open quality exceptions" value={openQx.length} tone={openQx.some(x => x.severity === "High") ? "bad" : openQx.length ? "warn" : "ok"} sub={openQx.filter(x => x.severity === "High").length + " high severity"} onClick={() => nav("Compliance", "exceptions")} />
      </Grid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
        <Card style={{ flex: "2 1 520px" }} title="Distributor checks" sub="Design inputs drawn from EU MDR Article 14 and HPRA guidance for distributors, evidenced from live demo data. Not a compliance assessment.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {checks.map((c, i) => (
              <div key={c.k} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 2px", borderTop: i ? "1px solid var(--border)" : undefined }}>
                <CheckIcon ok={c.ok} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.k}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{c.ev}</div>
                </div>
                {c.go && <Btn size="sm" kind="ghost" onClick={c.go}>{c.goLabel}</Btn>}
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ flex: "1 1 280px" }} title="Devices by MDR class" sub="Illustrative classification for the demo catalogue.">
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "center", paddingTop: 6 }}>
            <Donut data={classCounts} size={150} thickness={18} center={<><div style={{ fontSize: 22, fontWeight: 600 }}>{rows.length}</div><div style={{ fontSize: 10.5, color: "var(--dim)" }}>devices</div></>}
              onSlice={i => setCls(classCounts[i].label.replace("Class ", ""))} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {classCounts.map(c => (
                <button key={c.label} onClick={() => setCls(cls === c.label.replace("Class ", "") ? "all" : c.label.replace("Class ", ""))} className="ix3"
                  style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "none", cursor: "pointer", color: "var(--body)", fontSize: 12.5, padding: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.label}<b style={{ fontWeight: 600, color: "var(--ink)" }}>{c.value}</b>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--faint)", textAlign: "center" }}>{cls === "all" ? "Click a class to filter the register." : "Showing class " + cls + ". Click again to clear."}</div>
        </Card>
      </div>

      <Card flush pad={14} title={"Register · " + shown.length + " of " + rows.length + " devices"} sub="Click a device for its product record, lots, custody and documents."
        right={(q || cls !== "all" || docF !== "all" || sup !== "all") ? <Btn size="sm" kind="ghost" icon={I.x} onClick={() => { setQ(""); setCls("all"); setDocF("all"); setSup("all"); }}>Clear filters</Btn> : undefined}>
        <div style={{ padding: "0 14px 12px" }}>
          <Row wrap gap={8}>
            <SearchBox value={q} onChange={setQ} placeholder="Search device, SKU, GTIN, supplier or document" style={{ flex: "1 1 260px" }} />
            <SelectBox value={cls} onChange={setCls} title="MDR class" options={[["all", "All classes"], ...classes.map(c => [c, "Class " + c] as [string, string])]} />
            <SelectBox value={docF} onChange={setDocF} title="Documentation" options={[["all", "All documentation"], ["Missing", "Missing"], ["Expiring", "Expiring"], ["Review due", "Review due"], ["Current", "Current"], ["Pack reference", "Pack reference"]]} />
            <SelectBox value={sup} onChange={setSup} title="Supplier" options={[["all", "All suppliers"], ...D.SUPPLIERS.filter(x => D.PRODUCTS.some(p => p.supplier === x.id)).map(x => [x.id, x.name] as [string, string])]} />
          </Row>
        </div>
        <Table<RegRow> cols={cols} rows={shown} rowKey={r => r.p.sku} dense maxHeight={520} minWidth={1040} onRow={r => openRecord("product", r.p.sku)}
          highlight={r => r.doc.status === "Missing"}
          footer={<span>GTIN / UDI-DI values are demo identifiers. MDR classes are illustrative. "Pack ref." means the device is covered by a supplier documentation pack reference rather than a separately tracked document.</span>} />
      </Card>
    </Page>
  );
}
