/* Inventory · Barcode Scanning: a simulated handheld scanner.
   Scan (or simulate) a GS1 label, check the proposed transaction, confirm it.
   Nothing is recorded until a person confirms. Works at handheld width. */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays, nowTime } from "../../fmt";
import { buildGs1, type Gs1 } from "../../gs1";
import { ScanPanel } from "../../scan";
import { getState, moveStock, nav, openRecord, receivePO, recordCount, scanOrderLine, scanTargetFor, toast, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, I, Icon, Notice, Page, PageHeader, RecLink, Row, SelectBox, TextInput, label } from "../../ui";
import { Stepper, dd } from "./bits";
import { whereName } from "./model";

type Mode = "receive" | "pick" | "transfer" | "use" | "return" | "count";

const MODES: { id: Mode; label: string; sub: string; icon: string }[] = [
  { id: "receive", label: "Receive", sub: "Goods in against a PO", icon: I.download },
  { id: "pick", label: "Pick", sub: "Issue out on an order", icon: I.box },
  { id: "transfer", label: "Transfer", sub: "Between locations", icon: I.route },
  { id: "use", label: "Record use", sub: "Used at a hospital", icon: I.hospital },
  { id: "return", label: "Return", sub: "Back to the stockroom", icon: I.refresh },
  { id: "count", label: "Cycle count", sub: "Confirm the shelf", icon: I.layers },
];
const MODE_NAME: Record<Mode, string> = { receive: "Receipt", pick: "Pick", transfer: "Transfer", use: "Usage", return: "Return", count: "Count" };
const OPERATORS: D.StaffId[] = ["JC", "SO", "GH", "AC", "RW", "CB", "ET"];
const SHELF_YEARS: Record<D.CatId, number> = { OR: 5, SM: 4, AC: 3, PT: 3, AR: 2, IN: 0 };

type Pending = {
  mode: Mode; sku: string; lot: string; serial?: string; expiry?: string; qty: number; max: number;
  from: string; to: string; poId?: string; orderId?: string; lineId?: string; stockLineId?: string; system?: number;
};
type LogEntry = { n: number; time: string; mode: Mode; sku: string; lot: string; serial?: string; qty: number; from: string; to: string; ref?: string; mv?: string; by: string; result: string };

/** Lot printed on an incoming delivery for a PO line (demo label). */
function incomingLot(sku: string): { lot: string; expiry?: string } {
  const p = D.productBySku(sku);
  const yrs = p ? SHELF_YEARS[p.cat] : 0;
  return { lot: "L2611-" + sku.slice(-3) + "R", expiry: yrs ? addDays(TODAY, yrs * 365) : undefined };
}

function linesAt(s: ReturnType<typeof getState>, loc: string): D.StockLine[] {
  const story = ["HH-OR-204", "HH-SM-114", "HH-OR-238", "HH-SM-140", "HH-AC-305"];
  const rank = (l: D.StockLine) => (l.status === "Verify" ? -1 : story.includes(l.sku) ? story.indexOf(l.sku) : 99);
  return s.stock.filter(l => l.loc === loc && l.qty > 0).sort((a, b) => rank(a) - rank(b) || a.sku.localeCompare(b.sku) || a.lot.localeCompare(b.lot));
}

export default function Scanning() {
  const s = useHogan();
  const [mode, setModeRaw] = useUi<Mode>("inventory.scan.mode", "receive");
  const [op, setOp] = useUi<D.StaffId>("inventory.scan.op", "JC");
  const [po, setPo] = useUi("inventory.scan.po", "PO-339");
  const [order, setOrder] = useUi("inventory.scan.order", "SO-1047");
  const [from, setFrom] = useUi("inventory.scan.from", "DLM");
  const [to, setTo] = useUi("inventory.scan.to", "HAR");
  const [site, setSite] = useUi("inventory.scan.site", "HAR");
  const [countLoc, setCountLoc] = useUi("inventory.scan.countLoc", "EAS");
  const [log, setLog] = useUi<LogEntry[]>("inventory.scan.log", []);
  const [pending, setPending] = useState<Pending | null>(null);
  const [counted, setCounted] = useState("");

  const opName = D.staffById(op)?.name || op;
  const opFirst = D.staffById(op)?.first || op;
  const setMode = (m: Mode) => { setModeRaw(m); setPending(null); };

  const openPOs = s.pos.filter(p => ["Sent", "Confirmed", "Part received"].includes(p.status) && p.lines.some(l => l.received < l.qty));
  const P = openPOs.find(p => p.id === po) || openPOs[0];
  const openOrds = s.orders.filter(o => (o.status === "Confirmed" || o.status === "Picking") && o.lines.some(l => !l.scanned));
  const O = openOrds.find(o => o.id === order) || openOrds[0];
  const scanLoc = mode === "transfer" ? from : mode === "count" ? countLoc : site;

  /* Sample labels built from real lines in the demo state. */
  const samples: { label: string; code: string }[] = (() => {
    if (mode === "receive") return P ? P.lines.filter(l => l.received < l.qty).map(l => {
      const p = D.productBySku(l.sku)!; const inc = incomingLot(l.sku);
      return { label: l.sku + " · " + inc.lot, code: buildGs1({ gtin: p.gtin, expiry: inc.expiry, lot: inc.lot }) };
    }) : [];
    if (mode === "pick") return O ? O.lines.filter(l => !l.scanned).map(l => ({ label: l.id + " · " + l.sku, code: scanTargetFor(O.id, l.id) })).filter(x => x.code) : [];
    return linesAt(s, scanLoc).slice(0, 4).map(l => {
      const p = D.productBySku(l.sku)!;
      return { label: l.sku + " · " + (l.serial || l.lot), code: buildGs1({ gtin: p.gtin, expiry: l.expiry, lot: l.lot, serial: l.serial }) };
    });
  })();

  const onScan = (g: Gs1): string | void => {
    setPending(null);
    const p = g.sku ? D.productBySku(g.sku) : undefined;
    if (!p) return "Product not recognised.";
    if (g.expiry && g.expiry < TODAY) return "Label shows expiry " + dd(g.expiry) + ". Expired stock cannot be moved or used: quarantine it and raise a quality exception.";
    if (mode === "receive") {
      if (!P) return "No open purchase order to receive against.";
      const line = P.lines.find(l => l.sku === p.sku);
      if (!line) return p.sku + " is not on " + P.id + ". Check the delivery note before booking it in.";
      const out = line.qty - line.received;
      if (out <= 0) return p.sku + " on " + P.id + " is already fully received.";
      if (!g.lot) return "No lot on this label. Scan the full GS1 label so the lot (10) is captured.";
      setPending({ mode, sku: p.sku, lot: g.lot, serial: g.serial, expiry: g.expiry, qty: out, max: out, from: P.supplier, to: "DLM", poId: P.id });
      return;
    }
    if (mode === "pick") {
      if (!O) return "No open order to pick.";
      const ln = O.lines.find(l => !l.scanned && l.sku === p.sku);
      if (!ln) return p.sku + " is not an outstanding line on " + O.id + ".";
      if (ln.lot && g.lot && ln.lot !== g.lot) return "Wrong lot for " + O.id + " line " + ln.id + ": the order needs " + ln.lot + ", this label is " + g.lot + ".";
      if (p.tracking === "serial" && !g.serial) return "Serial number needed for " + p.sku + ". Scan the label with the (21) serial.";
      if (g.serial && s.orders.some(o => o.lines.some(l => l.serial === g.serial && l.scanned))) return "Serial " + g.serial + " is already allocated to another order.";
      if (g.serial && !s.stock.some(l => l.serial === g.serial && l.loc === "DLM" && l.qty > 0)) return "Serial " + g.serial + " is not in the main stockroom.";
      setPending({ mode, sku: p.sku, lot: g.lot || ln.lot || "", serial: g.serial, expiry: g.expiry, qty: ln.qty, max: ln.qty, from: "DLM", to: D.accountById(O.account)?.name || O.account, orderId: O.id, lineId: ln.id });
      return;
    }
    const loc = scanLoc;
    if (mode === "transfer" && to === from) return "Choose a destination different from the source.";
    const cands = s.stock.filter(l => l.loc === loc && l.sku === p.sku && (l.qty > 0 || mode === "count") && (!g.serial || l.serial === g.serial) && (!g.lot || l.lot === g.lot));
    if (!cands.length) {
      const elsewhere = s.stock.filter(l => l.sku === p.sku && (!g.lot || l.lot === g.lot) && l.qty > 0).map(l => whereName(l.loc) + " (" + l.qty + ")");
      return "No " + p.sku + (g.lot ? " lot " + g.lot : "") + " recorded at " + whereName(loc) + "." + (elsewhere.length ? " Held at: " + elsewhere.join(", ") + "." : "");
    }
    if (cands.length > 1 && !g.lot && !g.serial) return "Several lots of " + p.sku + " at " + whereName(loc) + ". Scan the full GS1 label to identify the lot.";
    const line = cands[0];
    if (mode === "count") {
      setCounted(String(line.qty));
      setPending({ mode, sku: p.sku, lot: line.lot, serial: line.serial, expiry: line.expiry, qty: line.qty, max: 999, from: loc, to: loc, stockLineId: line.id, system: line.qty });
      return;
    }
    if (line.status === "Quarantine" && mode !== "return") return "Lot " + line.lot + " is quarantined. It cannot be moved or used until it is released.";
    setPending({ mode, sku: p.sku, lot: line.lot, serial: line.serial, expiry: line.expiry, qty: 1, max: line.qty, from: loc,
      to: mode === "transfer" ? to : mode === "use" ? "Used in procedure" : "DLM", stockLineId: line.id });
  };

  const confirm = () => {
    const x = pending;
    if (!x) return;
    const before = getState().movements.length;
    let ok = true, ref: string | undefined, result = "";
    if (x.mode === "receive" && x.poId) {
      ref = receivePO(x.poId, [{ sku: x.sku, qty: x.qty, lot: x.lot, expiry: x.expiry }], op);
      result = "Booked in on " + ref;
    } else if (x.mode === "pick" && x.orderId && x.lineId) {
      scanOrderLine(x.orderId, x.lineId, { lot: x.lot, serial: x.serial, expiry: x.expiry }, op);
      ref = x.orderId; result = "Line " + x.lineId + " validated. Stock leaves when the order is dispatched.";
    } else if (x.mode === "count" && x.stockLineId) {
      const n = Number(counted);
      if (!Number.isFinite(n) || n < 0 || counted.trim() === "") { toast("Enter the counted quantity first.", "warn"); return; }
      recordCount(x.stockLineId, n, op);
      result = n === x.system ? "Count matches the system" : "Variance " + (n - (x.system || 0)) + " recorded";
    } else {
      const type: D.MoveType = x.mode === "transfer" ? "Transfer" : x.mode === "use" ? "Consumption" : "Return";
      ok = moveStock({ type, sku: x.sku, lot: x.lot, serial: x.serial, expiry: x.expiry, qty: x.qty, from: x.from, to: x.to, by: op,
        note: x.mode === "use" ? "Usage scanned at " + whereName(x.from, true) + ". No patient data held in Pulse." : x.mode === "transfer" ? "Scanned transfer confirmed by " + opName + "." : "Returned to the main stockroom by scan. Inspect before restocking." });
      result = x.mode === "use" ? "Usage recorded" : x.mode === "transfer" ? "Moved to " + whereName(x.to) : "Back in the main stockroom";
      if (ok) toast(MODE_NAME[x.mode] + " recorded: " + x.qty + " × " + x.sku + " · " + whereName(x.from) + " to " + whereName(x.to) + ".");
    }
    if (!ok) return;
    const st = getState();
    const mv = st.movements.length > before ? st.movements[st.movements.length - 1] : undefined;
    setLog([{ n: (log[0]?.n || 0) + 1, time: nowTime(), mode: x.mode, sku: x.sku, lot: x.lot, serial: x.serial, qty: x.mode === "count" ? Number(counted) : x.qty,
      from: x.from, to: x.to, ref: ref || mv?.ref, mv: mv?.id, by: op, result }, ...log].slice(0, 40));
    setPending(null);
  };

  const locOpts = D.LOCATIONS.map(l => [l.id, l.short] as [string, string]);
  const siteOpts = D.SITES.map(l => [l.id, l.short] as [string, string]);

  const context: ReactNode = (() => {
    if (mode === "receive") return P
      ? <Ctx k="Purchase order"><SelectBox value={P.id} onChange={v => { setPo(v); setPending(null); }} options={openPOs.map(p => [p.id, p.id + " · " + (D.supplierById(p.supplier)?.name || "")] as [string, string])} style={{ width: "100%" }} /></Ctx>
      : <Ctx k="Purchase order"><span style={{ fontSize: 13, color: "var(--dim)" }}>No open purchase orders</span></Ctx>;
    if (mode === "pick") return O
      ? <Ctx k="Order"><SelectBox value={O.id} onChange={v => { setOrder(v); setPending(null); }} options={openOrds.map(o => [o.id, o.id + " · " + (D.accountById(o.account)?.name || "")] as [string, string])} style={{ width: "100%" }} /></Ctx>
      : <Ctx k="Order"><span style={{ fontSize: 13, color: "var(--dim)" }}>Every open order is fully scanned</span></Ctx>;
    if (mode === "transfer") return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(140px,100%),1fr))", gap: 8 }}>
        <Ctx k="From"><SelectBox value={from} onChange={v => { setFrom(v); setPending(null); }} options={locOpts} style={{ width: "100%" }} /></Ctx>
        <Ctx k="To"><SelectBox value={to} onChange={v => { setTo(v); setPending(null); }} options={locOpts.filter(o => o[0] !== from)} style={{ width: "100%" }} /></Ctx>
      </div>);
    if (mode === "count") return <Ctx k="Location"><SelectBox value={countLoc} onChange={v => { setCountLoc(v); setPending(null); }} options={locOpts} style={{ width: "100%" }} /></Ctx>;
    return <Ctx k={mode === "use" ? "Hospital site" : "Returning from"}><SelectBox value={site} onChange={v => { setSite(v); setPending(null); }} options={siteOpts} style={{ width: "100%" }} /></Ctx>;
  })();

  const hint = {
    receive: P ? "Scan each carton on " + P.id + " from " + (D.supplierById(P.supplier)?.name || "") + ". Pulse checks it against the PO and books a goods-received note." : "",
    pick: O ? "Scan items for " + O.id + ". Pulse checks product, lot and serial against the order line." : "",
    transfer: "Scan stock leaving " + whereName(from) + ". Pulse checks the lot is there before proposing the move.",
    use: "Scan a unit used in theatre at " + whereName(site) + ". Recorded by date and site only; no patient data.",
    return: "Scan stock coming back from " + whereName(site) + " to the main stockroom.",
    count: "Scan each line on the shelf at " + whereName(countLoc) + " and enter what you count.",
  }[mode];

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Barcode Scanning"
        sub="A simulated handheld. Scan a GS1 / UDI label (or use a sample), check what Pulse proposes, then confirm. Every confirmed scan writes a traceable movement."
        right={<Row gap={8}><span style={{ ...label, fontSize: 9.5 }}>Operator</span><SelectBox value={op} onChange={setOp} options={OPERATORS.map(id => [id, D.staffById(id)?.name || id] as [D.StaffId, string])} /></Row>} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: "1.3 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card pad={14} title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon d={I.scan} size={15} color="var(--accent)" />Handheld scanner</span>}
            sub={opName + " · " + whereName(mode === "receive" || mode === "pick" ? "DLM" : scanLoc, true)}
            right={<Badge tone="ok" dot>Ready</Badge>}>
            <div className="hhinv-modes">
              {MODES.map(m => {
                const on = m.id === mode;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)} className={on ? undefined : "ixz"}
                    style={{ minWidth: 0, textAlign: "left", padding: "10px 10px", borderRadius: 12, cursor: "pointer", color: "inherit",
                      background: on ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, color: on ? "var(--accent)" : "var(--body)" }}>
                      <Icon d={m.icon} size={14} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</span>
                    </span>
                    <span style={{ display: "block", fontSize: 10.5, color: "var(--faint)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.sub}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12 }}>{context}</div>
            <div style={{ marginTop: 12 }}>
              <ScanPanel key={mode + scanLoc + (P?.id || "") + (O?.id || "")} compact onScan={onScan} samples={samples}
                simulate={() => samples[0]?.code} hint={hint} placeholder="Scan or paste a GS1 label, e.g. (01)…(17)…(10)…" />
            </div>
          </Card>

          {pending ? (
            <ProposedCard x={pending} opFirst={opFirst} counted={counted} setCounted={setCounted}
              setQty={n => setPending({ ...pending, qty: n })} onConfirm={confirm} onDiscard={() => setPending(null)} />
          ) : (
            <Card pad={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--dim)", fontSize: 12.5 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={I.scan} size={15} /></span>
                <span>Scan a label to see the proposed transaction here. Pulse validates it against live stock before anything is recorded.</span>
              </div>
            </Card>
          )}
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card flush pad={14} title={"Session log · " + log.length + " confirmed"} sub="Scans confirmed on this handheld today."
            right={log.length ? <Btn size="sm" kind="ghost" icon={I.x} onClick={() => { setLog([]); toast("Session log cleared. Movements stay in the audit history.", "info"); }}>Clear</Btn> : undefined}>
            {log.length ? (
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {log.map(e => (
                  <div key={e.n} onClick={e.mv ? () => openRecord("movement", e.mv!) : undefined} className={e.mv ? "ix11" : undefined}
                    style={{ display: "flex", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--border)", cursor: e.mv ? "pointer" : undefined, animation: "fadeUp .3s var(--ease) both" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", paddingTop: 2, width: 38, flex: "none" }}>{e.time}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Badge tone={e.mode === "count" ? "warn" : e.mode === "use" ? "info" : e.mode === "receive" ? "ok" : "accent"}>{MODE_NAME[e.mode]}</Badge>
                        <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{e.qty} × {e.sku}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
                        {e.serial ? "Serial " + e.serial : "Lot " + e.lot} · {whereName(e.from)} → {whereName(e.to)} · {D.staffById(e.by)?.first || e.by}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{e.result}{e.mv ? " · " + e.mv : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty title="No scans confirmed yet" sub="Confirmed scans appear here and in the audit history." icon={I.scan} />}
          </Card>

          <Expected mode={mode} s={s} P={P} O={O} loc={scanLoc} />
        </div>
      </div>
    </Page>
  );
}

function Ctx({ k, children }: { k: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ ...label, fontSize: 9 }}>{k}</span>
      {children}
    </label>
  );
}

function Place({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: "accent" }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 0, padding: "10px 12px", borderRadius: 12, background: tone ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (tone ? "var(--accent-line)" : "var(--border)") }}>
      <div style={{ ...label, fontSize: 9 }}>{k}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProposedCard({ x, opFirst, counted, setCounted, setQty, onConfirm, onDiscard }: {
  x: Pending; opFirst: string; counted: string; setCounted: (v: string) => void; setQty: (n: number) => void; onConfirm: () => void; onDiscard: () => void;
}) {
  const p = D.productBySku(x.sku);
  const n = Number(counted);
  const variance = x.mode === "count" && counted.trim() !== "" && Number.isFinite(n) ? n - (x.system || 0) : null;
  const verb = { receive: "Book in", pick: "Confirm pick", transfer: "Confirm transfer", use: "Record use", return: "Confirm return", count: "Record count" }[x.mode];
  return (
    <Card pad={14} tone="accent" style={{ animation: "popIn .25s var(--ease) both" }}
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Proposed {MODE_NAME[x.mode].toLowerCase()}<Badge tone="warn">Not recorded yet</Badge></span>}
      sub={x.mode === "pick" ? "Validates the order line. Stock leaves the main stockroom when the order is dispatched." : "Check the details, then confirm. Nothing changes until you do."}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{p?.name}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>{x.sku}</span><span>{x.serial ? "SN " + x.serial : "Lot " + x.lot}</span>{x.expiry && <span>Exp {dd(x.expiry)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Place k={x.mode === "count" ? "Location" : "From"} v={whereName(x.from)} sub={x.mode === "receive" ? "Supplier" : D.locById(x.from)?.kind === "consignment" ? "Consignment site" : x.mode === "count" ? "Counting here" : "Main stockroom"} />
          {x.mode !== "count" && <Icon d={I.arrow} size={16} color="var(--accent)" />}
          {x.mode !== "count" && <Place k="To" tone="accent" v={x.mode === "pick" ? x.to : whereName(x.to)} sub={x.mode === "use" ? "Ownership passes on use" : x.mode === "pick" ? x.orderId + " · line " + x.lineId : D.locById(x.to)?.kind === "consignment" ? "Consignment, still Hogan's" : "Main stockroom"} />}
        </div>
        {x.mode === "count" ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div><div style={{ ...label, fontSize: 9 }}>On the system</div><div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{x.system}</div></div>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ ...label, fontSize: 9 }}>Counted</span>
              <TextInput type="number" value={counted} onChange={setCounted} style={{ width: 96 }} onEnter={onConfirm} />
            </label>
            {variance !== null && <Badge tone={variance === 0 ? "ok" : "warn"} style={{ height: 26 }}>{variance === 0 ? "Matches" : "Variance " + (variance > 0 ? "+" : "") + variance}</Badge>}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ ...label, fontSize: 9 }}>Quantity</span>
            {x.mode === "pick" ? <span style={{ fontSize: 15, fontWeight: 600 }}>{x.qty} <span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 400 }}>as ordered</span></span>
              : <Stepper value={x.qty} onChange={setQty} min={1} max={x.max} />}
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{x.mode === "receive" ? x.max + " outstanding on " + x.poId : x.mode === "pick" ? "" : x.max + " held at " + whereName(x.from)}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="primary" icon={I.check} onClick={onConfirm}>{verb} as {opFirst}</Btn>
          <Btn kind="ghost" onClick={onDiscard}>Discard</Btn>
        </div>
      </div>
    </Card>
  );
}

function Expected({ mode, s, P, O, loc }: { mode: Mode; s: ReturnType<typeof getState>; P?: D.PurchaseOrder; O?: D.SalesOrder; loc: string }) {
  if (mode === "receive") {
    if (!P) return null;
    return (
      <Card pad={14} title={"Expected on " + P.id} sub={(D.supplierById(P.supplier)?.name || "") + " · due " + dd(P.expected) + " · " + P.status}
        right={<RecLink type="po" id={P.id} style={{ fontSize: 12 }}>Open PO</RecLink>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {P.lines.map(l => {
            const p = D.productBySku(l.sku);
            const done = l.received >= l.qty;
            return (
              <div key={l.sku} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--ok-soft)" : "var(--surface-2)", color: done ? "var(--ok)" : "var(--faint)", border: "1px solid var(--border)" }}>
                  <Icon d={done ? I.check : I.box} size={11} stroke={2.2} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{l.sku}</span>
                </span>
                <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}><b>{l.received}</b><span style={{ color: "var(--faint)" }}> / {l.qty}</span></span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }
  if (mode === "pick") {
    if (!O) return <Card pad={14} title="Orders"><Empty title="Nothing left to pick" sub="Every confirmed order is fully scanned." /></Card>;
    return (
      <Card pad={14} title={"Lines on " + O.id} sub={(D.accountById(O.account)?.name || "") + " · required " + dd(O.required)}
        right={<Btn size="sm" kind="ghost" icon={I.external} onClick={() => nav("Orders", "picking", { "orders.pick": O.id })}>Picking</Btn>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {O.lines.map(l => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: l.scanned ? "var(--ok-soft)" : "var(--warn-soft)", color: l.scanned ? "var(--ok)" : "var(--warn)" }}>
                <Icon d={l.scanned ? I.check : I.scan} size={11} stroke={2.2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.id} · {D.productBySku(l.sku)?.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{l.sku}{l.lot ? " · " + l.lot : ""}{l.serial ? " · " + l.serial : ""}{l.needs ? " · needs " + l.needs : ""}</span>
              </span>
              <span style={{ fontSize: 12.5 }}>× {l.qty}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  const lines = linesAt(s, loc);
  return (
    <Card pad={14} title={"On the system at " + whereName(loc)} sub={lines.length + " lines · " + lines.reduce((a, l) => a + l.qty, 0) + " units"}
      right={<RecLink type="location" id={loc} style={{ fontSize: 12 }}>Location</RecLink>}>
      {mode === "count" && lines.some(l => l.status === "Verify") && (
        <Notice tone="warn" style={{ marginBottom: 10 }}>{lines.filter(l => l.status === "Verify").map(l => l.sku + ": " + l.note).join(" ")}</Notice>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
        {lines.map(l => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, width: 82, flex: "none" }}>{l.sku}</span>
            <span style={{ flex: 1, minWidth: 0, color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.serial || l.lot}</span>
            {l.status !== "Available" && <Badge tone={l.status === "Verify" ? "info" : "bad"}>{l.status}</Badge>}
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{l.qty}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
