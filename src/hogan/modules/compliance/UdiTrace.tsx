/* Compliance · UDI & Lot Trace: look up a device by UDI, lot or serial and
   read its custody chain, goods-in checks and current custody. Reuses the
   Simulated Traceability Drill from Inventory. */

import { useState } from "react";
import * as D from "../../data";
import { buildGs1, type Gs1 } from "../../gs1";
import { ScanPanel } from "../../scan";
import { openRecord, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, I, Icon, KV, Page, PageHeader, RecLink, Row, Table, TextInput, Timeline, label, type Col } from "../../ui";
import { MOVE_ICON, MOVE_TONE, Ref, dd } from "../inventory/bits";
import { TraceDrill } from "../inventory/drill";
import { lotKey, whereName } from "../inventory/model";
import { CheckIcon, RegNotice, useDocState } from "./common";
import { DOC_TONE, productDocStatus, qxForProduct } from "./model";

type Sel = { sku: string; lot: string; serial?: string };

export default function UdiTrace() {
  const s = useHogan();
  const [sel, setSel] = useUi<Sel>("compliance.udi", { sku: "HH-OR-204", lot: "L2603-204A" });
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const pick = (sku: string, lot: string, serial?: string) => { setSel({ sku, lot, serial }); setErr(""); };
  const samples = [
    ["HH-OR-204", "L2603-204A"], ["HH-SM-140", "AQ-2611-140"], ["HH-AC-305", "L2401-305A"], ["HH-SM-114", "L2606-114A"],
  ].map(([sku, lot]) => {
    const p = D.productBySku(sku)!; const l = s.stock.find(x => x.sku === sku && x.lot === lot);
    return { label: sku + " · " + lot, code: buildGs1({ gtin: p.gtin, expiry: l?.expiry, lot }) };
  }).concat(s.stock.filter(l => l.serial).slice(0, 1).map(l => ({ label: l.sku + " · " + l.serial, code: buildGs1({ gtin: D.productBySku(l.sku)!.gtin, lot: l.lot, serial: l.serial }) })));

  const onScan = (g: Gs1): string | void => {
    if (!g.sku) return "Device not recognised.";
    if (g.serial) {
      const l = s.stock.find(x => x.serial === g.serial) || undefined;
      const m = s.movements.find(x => x.serial === g.serial);
      if (!l && !m) return "Serial " + g.serial + " has no custody record.";
      pick(g.sku, (l || m)!.lot, g.serial); return;
    }
    if (g.lot) {
      if (!s.movements.some(m => m.sku === g.sku && m.lot === g.lot) && !s.stock.some(l => l.sku === g.sku && l.lot === g.lot)) return "Lot " + g.lot + " has no custody record for " + g.sku + ".";
      pick(g.sku, g.lot); return;
    }
    const first = s.stock.find(l => l.sku === g.sku && l.qty > 0);
    if (!first) return "No stock of " + g.sku + " to trace.";
    pick(g.sku, first.lot, first.serial);
  };
  const search = () => {
    const t = text.trim().toUpperCase();
    if (!t) return;
    const l = s.stock.find(x => x.serial?.toUpperCase() === t || x.lot.toUpperCase() === t);
    const m = l ? undefined : s.movements.find(x => x.serial?.toUpperCase() === t || x.lot.toUpperCase() === t);
    const hit = l || m;
    if (!hit) { setErr("No lot or serial " + text.trim() + " in the custody records."); return; }
    pick(hit.sku, hit.lot, hit.serial);
    setText("");
  };

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="UDI & Lot Trace"
        sub="Scan or type a UDI, lot or serial to read the device's custody chain: who supplied it, the goods-in checks, every hand it passed through and where it is now."
        right={<Btn kind="accent" icon={I.target} onClick={() => document.getElementById("hh-cdrill")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Simulated drill</Btn>} />
      <RegNotice compact />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 330px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card pad={14} title="UDI lookup" sub="GS1 human-readable format. Demo identifiers only.">
            <ScanPanel compact onScan={onScan} samples={samples} simulate={() => samples[0]?.code} />
            <div style={{ marginTop: 12 }}>
              <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Or search a lot or serial</div>
              <Row gap={8}>
                <TextInput value={text} onChange={setText} placeholder="e.g. L2609-204B or SN-415-2611" onEnter={search} style={{ flex: 1 }} />
                <Btn onClick={search} disabled={!text.trim()}>Find</Btn>
              </Row>
              {err && <div style={{ fontSize: 12, color: "var(--bad)", marginTop: 6 }}>{err}</div>}
            </div>
          </Card>
          <SerialRegister onPick={pick} />
        </div>
        <div style={{ flex: "2 1 520px", minWidth: 0 }}>
          <Custody sel={sel} />
        </div>
      </div>

      <TraceDrill uiKey="compliance.drill" id="hh-cdrill" />
    </Page>
  );
}

function Custody({ sel }: { sel: Sel }) {
  const s = useHogan();
  const [docState] = useDocState();
  const p = D.productBySku(sel.sku);
  if (!p) return <Card><Empty title="Pick a device" sub="Scan a UDI or choose a sample." icon={I.scan} /></Card>;
  const moves = s.movements.filter(m => m.sku === sel.sku && m.lot === sel.lot && (!sel.serial || !m.serial || m.serial === sel.serial))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const held = s.stock.filter(l => l.sku === sel.sku && l.lot === sel.lot && l.qty > 0 && (!sel.serial || l.serial === sel.serial));
  const anyLine = s.stock.find(l => l.sku === sel.sku && l.lot === sel.lot);
  const expiry = anyLine?.expiry;
  const grn = s.grns.find(g => g.lines.some(l => l.sku === sel.sku && l.lot === sel.lot));
  const receipt = moves.find(m => m.type === "Receipt");
  const doc = productDocStatus(sel.sku, docState);
  const qx = qxForProduct(sel.sku, s.qx);
  const sup = D.supplierById(p.supplier);
  const code = buildGs1({ gtin: p.gtin, expiry, lot: sel.lot, serial: sel.serial });

  const custodyTitle = (m: D.Movement) => {
    if (m.type === "Receipt") return "Custody: " + whereName(m.from) + " → Hogan main stockroom";
    if (m.type === "Transfer") return "Custody: " + whereName(m.from, true) + " → " + whereName(m.to, true) + (D.locById(m.to)?.kind === "consignment" ? " (consignment, still Hogan-owned)" : "");
    if (m.type === "Consumption") return "Used in a procedure at " + whereName(m.from, true);
    if (m.type === "Dispatch") return "Delivered to " + m.to + " (ownership passes)";
    if (m.type === "Return") return "Returned: " + whereName(m.from, true) + " → " + whereName(m.to, true);
    return m.type + " at " + whereName(m.from);
  };

  return (
    <Card pad={18} title={<span>{p.name} <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)", fontWeight: 500, marginLeft: 6 }}>{p.sku}</span></span>}
      sub={(sup?.name || "") + " · " + (sel.serial ? "serial " + sel.serial : "lot " + sel.lot)}
      right={<Row gap={6}><Btn size="sm" icon={I.external} onClick={() => openRecord("lot", lotKey(sel.sku, sel.lot))}>Lot record</Btn><Btn size="sm" kind="ghost" onClick={() => openRecord("product", sel.sku)}>Device</Btn></Row>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div style={{ ...label, fontSize: 9 }}>UDI (GS1 human-readable, demo identifier)</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13.5, marginTop: 6, wordBreak: "break-all", color: "var(--ink)" }}>{code}</div>
        </div>
        <KV cols={3} items={[
          ["UDI-DI (01)", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.gtin}</span>],
          ["Lot (10)", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{sel.lot}</span>],
          ["Expiry (17)", expiry ? dd(expiry) : "No expiry"],
          ["Serial (21)", sel.serial || (p.tracking === "serial" ? "Serial-tracked" : "Lot-tracked")],
          ["MDR class (illustrative)", p.mdrClass],
          ["Sterile", p.sterile ? "Yes" : "No"],
          ["Manufacturer", sup ? <RecLink type="supplier" id={sup.id}>{sup.name}</RecLink> : "Not recorded"],
          ["CE / documents", <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Badge tone={DOC_TONE[doc.status]}>{doc.status}</Badge>{doc.docs[0] && <RecLink type="doc" id={doc.docs[0].id} style={{ fontSize: 12 }} />}</span>],
          ["Pack reference", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.docRef}</span>],
        ]} />

        <div>
          <div style={{ ...label, marginBottom: 8 }}>Goods-receiving checks</div>
          {grn ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div onClick={() => openRecord("grn", grn.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5 }}>
                <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{grn.id}</span>
                <span style={{ flex: 1 }}>against <Ref id={grn.po} /> · {dd(grn.date)} · {D.staffById(grn.by)?.name}</span>
                <Badge tone={grn.status === "Passed" ? "ok" : "warn"}>{grn.status}</Badge>
              </div>
              {grn.checks.map(c => (
                <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", fontSize: 12.5, borderTop: "1px solid var(--border)" }}>
                  <CheckIcon ok={c.ok} /><span style={{ flex: 1 }}>{c.k}</span>{c.note && <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.note}</span>}
                </div>
              ))}
            </div>
          ) : receipt ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", fontSize: 12.5 }}>
              <CheckIcon ok={true} />
              <div style={{ flex: 1 }}>
                Received {dd(receipt.date)} against <Ref id={receipt.ref} /> by {D.staffById(receipt.by)?.name || receipt.by}. {receipt.note || "Lot and expiry captured on receipt."}
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>A detailed goods-in checklist is held for receipts booked through Pulse (for example GRN-0419).</div>
              </div>
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No receipt recorded for this lot.</div>}
        </div>

        <div>
          <div style={{ ...label, marginBottom: 8 }}>Custody chain · {moves.length} movement{moves.length === 1 ? "" : "s"}</div>
          {moves.length ? (
            <Timeline items={moves.map(m => ({
              when: dd(m.date) + " · " + m.time + " · " + (D.staffById(m.by)?.name || m.by) + " · " + m.id,
              title: <span>{custodyTitle(m)}</span>,
              sub: <span>{m.qty} unit{m.qty === 1 ? "" : "s"}{m.serial ? " · SN " + m.serial : ""} · <Ref id={m.ref} />{m.finRef ? <> · <Ref id={m.finRef} /></> : null}</span>,
              tone: MOVE_TONE[m.type], icon: MOVE_ICON[m.type], onClick: () => openRecord("movement", m.id),
            }))} />
          ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No movements recorded.</div>}
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>Usage is recorded by date and hospital only. No patient-level data is held in Pulse.</div>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 8 }}>Current custody</div>
          {held.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {held.map(l => (
                <button key={l.id} onClick={() => openRecord("location", l.loc)} className="ixz"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "inherit" }}>
                  <Icon d={l.loc === "DLM" ? I.box : I.hospital} size={14} color="var(--accent)" />
                  <span style={{ fontSize: 12.5 }}>{whereName(l.loc, true)}</span>
                  <b style={{ fontWeight: 600 }}>{l.qty}</b>
                  {l.status !== "Available" && <Badge tone={l.status === "Verify" ? "info" : "bad"}>{l.status}</Badge>}
                </button>
              ))}
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Not held anywhere now: every unit has been used or delivered.</div>}
        </div>

        {qx.length > 0 && (
          <div>
            <div style={{ ...label, marginBottom: 8 }}>Open exceptions for this device</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {qx.map(x => (
                <div key={x.id} onClick={() => openRecord("qx", x.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5 }}>
                  <Badge tone={x.severity === "High" ? "bad" : x.severity === "Medium" ? "warn" : "neutral"}>{x.severity}</Badge>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{x.id}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{x.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

type SerialRow = { line: D.StockLine; order?: D.SalesOrder };

function SerialRegister({ onPick }: { onPick: (sku: string, lot: string, serial?: string) => void }) {
  const s = useHogan();
  const rows: SerialRow[] = s.stock.filter(l => l.serial).map(line => ({
    line, order: s.orders.find(o => o.lines.some(x => x.serial === line.serial)),
  }));
  const cols: Col<SerialRow>[] = [
    { key: "sn", label: "Serial", w: "1.15fr", sort: r => r.line.serial || "", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{r.line.serial}</span> },
    { key: "p", label: "Device", w: "1.3fr", sort: r => r.line.sku, render: r => <span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{D.productBySku(r.line.sku)?.name}</span> },
    { key: "w", label: "Where", w: "0.9fr", render: r => r.line.qty > 0 ? <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{r.line.loc === "DLM" ? "Stockroom" : whereName(r.line.loc)}</span> : <span style={{ fontSize: 12.5, color: "var(--faint)" }}>Delivered</span> },
    { key: "o", label: "Order", w: "0.75fr", render: r => r.order ? <RecLink type="order" id={r.order.id} style={{ fontFamily: "var(--mono)", fontSize: 12 }} /> : <span style={{ color: "var(--faint)", fontSize: 12 }}>Free</span> },
  ];
  return (
    <Card flush pad={14} title={"Serial register · " + rows.length} sub="Serial-tracked devices (power handpieces and batteries).">
      <Table<SerialRow> cols={cols} rows={rows} rowKey={r => r.line.id} dense minWidth={330} onRow={r => onPick(r.line.sku, r.line.lot, r.line.serial)} />
    </Card>
  );
}
