/* Purchasing · Goods Receiving: scan supplier labels against an open PO.
   Lot, expiry and UDI are captured once at the door; booking in adds stock to
   the main stockroom, writes receipt movements and a GRN with its checks. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, date, eur, plural } from "../../fmt";
import type { Gs1 } from "../../gs1";
import { ScanPanel } from "../../scan";
import { openRecord, productStock, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, I, Icon, Notice, Page, PageHeader, RecLink, Row, Status, Toggle, label } from "../../ui";
import { CheckMark, Stack, Stepper, Two } from "../orders/kit";
import { RECEIVABLE, bookIn, poLateDays, poOrdered, poReceived, supName, supplierLabel, type DoorChecks, type Staged } from "./common";

function Station({ po, onBooked }: { po: D.PurchaseOrder; onBooked: (id: string) => void }) {
  const s = useHogan();
  const [staged, setStaged] = useState<Record<string, Staged>>({});
  const [door, setDoor] = useState<DoorChecks>({ packaging: true, docs: true, storage: true });
  const outstanding = (sku: string) => po.lines.filter(l => l.sku === sku).reduce((a, l) => a + Math.max(0, l.qty - l.received), 0);
  const open = po.lines.filter(l => l.qty > l.received);
  const nextLine = open.find(l => !staged[l.sku]);
  const list = Object.values(staged);
  const units = list.reduce((a, x) => a + x.qty, 0);
  const totalOut = open.reduce((a, l) => a + (l.qty - l.received), 0);
  const complete = units >= totalOut;
  const notOnPo = D.PRODUCTS.find(p => p.supplier === po.supplier && !po.lines.some(l => l.sku === p.sku)) || D.PRODUCTS.find(p => !po.lines.some(l => l.sku === p.sku))!;

  const onScan = (g: Gs1): string | void => {
    const sku = g.sku || "";
    const p = D.productBySku(sku);
    if (!po.lines.some(l => l.sku === sku)) return "Not on " + po.id + ": " + sku + " " + (p?.name || "") + ". Set it aside and tell " + supName(po.supplier) + ".";
    if (g.expiry && g.expiry < TODAY) return "Expired on arrival: lot " + (g.lot || "") + " expired " + date(g.expiry) + ". Do not receive; return it to the supplier.";
    if (!outstanding(sku)) return sku + " is already received in full on " + po.id + ".";
    if (staged[sku]) return sku + " is already scanned in this delivery. Adjust the quantity instead.";
    if (!g.lot) return "No lot on that label. Capture it by hand and flag it for a second check.";
    if (p?.sterile && !g.expiry) return "No expiry on that label for a sterile product. Check the outer box.";
    setStaged(st => ({ ...st, [sku]: { sku, qty: outstanding(sku), lot: g.lot!, expiry: g.expiry } }));
  };

  const book = () => {
    const id = bookIn(po.id, list, door);
    setStaged({});
    onBooked(id);
  };
  const late = poLateDays(po);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <Row gap={8} wrap>
              <RecLink type="po" id={po.id} style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{po.id}</RecLink>
              <Status s={po.status} />
              {late > 0 ? <Badge tone="bad">{late} days late</Badge> : po.expected === TODAY ? <Badge tone="accent">Due today</Badge> : null}
            </Row>
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px", marginTop: 7 }}><RecLink type="supplier" id={po.supplier} style={{ color: "var(--ink)", textDecorationColor: "var(--border-strong)" }}>{supName(po.supplier)}</RecLink></div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>Expected {date(po.expected)} · {poReceived(po)}/{poOrdered(po)} units in so far · {plural(totalOut, "unit")} outstanding{po.note ? " · " + po.note : ""}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", overflow: "hidden" }}>
          {po.lines.map((l, i) => {
            const p = D.productBySku(l.sku);
            const st = staged[l.sku];
            const left = l.qty - l.received;
            return (
              <div key={l.sku} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: i ? "1px solid var(--border)" : undefined, flexWrap: "wrap", background: st ? "var(--accent-faint)" : undefined }}>
                <CheckMark ok={left <= 0 || st ? true : null} />
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <Two a={<><RecLink type="product" id={l.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.sku}</RecLink> {p?.name}</>}
                    b={"Ordered " + l.qty + " · received " + l.received + " · " + (left > 0 ? left + " to come" : "complete") + " · " + eur(l.cost) + " each"} />
                </div>
                {st ? (
                  <Row gap={8} wrap>
                    <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Lot <b style={{ color: "var(--ink)", fontWeight: 500 }}>{st.lot}</b>{st.expiry ? " · exp " + date(st.expiry) : ""}</span>
                    <Stepper value={st.qty} min={1} max={left} onChange={v => setStaged(x => ({ ...x, [l.sku]: { ...st, qty: v } }))} />
                    <Btn size="sm" kind="ghost" icon={I.x} title="Remove from this delivery" onClick={() => setStaged(x => { const n = { ...x }; delete n[l.sku]; return n; })} />
                  </Row>
                ) : left > 0 ? <span style={{ fontSize: 11.5, color: "var(--warn)" }}>Scan the label to add</span> : <Badge tone="ok">Received</Badge>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="hk-two">
        <Card title="Scan supplier labels" sub={nextLine ? "Next: " + nextLine.sku + " · " + D.productBySku(nextLine.sku)?.name : open.length ? "Every outstanding line is scanned." : "Nothing left to receive."}>
          <ScanPanel key={po.id} compact onScan={onScan} placeholder="Scan the GS1 label on the box"
            simulate={() => (nextLine ? supplierLabel(nextLine.sku) : open[0] ? supplierLabel(open[0].sku) : undefined)}
            samples={[
              ...(nextLine ? [{ label: "Next line: " + nextLine.sku, code: supplierLabel(nextLine.sku) }] : []),
              { label: "Not on this PO", code: supplierLabel(notOnPo.sku) },
              ...(open[0] ? [{ label: "Expired label", code: supplierLabel(open[0].sku, true) }] : []),
            ]}
            hint="Each label is checked against the PO, its expiry and what is still outstanding before it is added." />
        </Card>

        <Card title="Goods-in checks" sub="Ticked checks are recorded on the GRN. A failed check books the delivery in as an exception.">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {([
              ["Packaging intact", door.packaging, "packaging"],
              ["Quantity matches PO", list.length ? complete : null, null],
              ["UDI / GS1 label scanned", list.length ? true : null, null],
              ["Lot and expiry captured", list.length ? true : null, null],
              ["Documentation present", door.docs, "docs"],
              ["Storage conditions met", door.storage, "storage"],
            ] as [string, boolean | null, keyof DoorChecks | null][]).map(([k, ok, key]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
                <CheckMark ok={ok} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{k}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
                    {key ? "Confirmed by Sharon at the door"
                      : k.startsWith("Quantity") ? (list.length ? units + " of " + totalOut + " outstanding" + (complete ? "" : ": part delivery") : "From the scans")
                      : k.startsWith("UDI") ? (list.length ? plural(list.length, "label") + " scanned" : "From the scans") : "From the labels"}
                  </div>
                </div>
                {key && <Toggle on={!!ok} onChange={v => setDoor(d => ({ ...d, [key]: v }))} title={k} />}
              </div>
            ))}
          </div>
          <Btn kind="primary" size="lg" full icon={I.box} disabled={!list.length} onClick={book} style={{ marginTop: 14 }}>
            {list.length ? "Book in " + plural(units, "unit") + " against " + po.id : "Scan a label to start"}
          </Btn>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, lineHeight: 1.5 }}>Stock goes into the main stockroom straight away with its lot and expiry. A receipt movement is written for traceability.</div>
        </Card>
      </div>
    </div>
  );
}

export default function Receiving() {
  const s = useHogan();
  const receivable = s.pos.filter(p => RECEIVABLE.includes(p.status)).sort((a, b) => (a.expected < b.expected ? -1 : 1));
  const [sel, setSel] = useUi<string>("purchasing.po", "PO-338");
  const [last, setLast] = useUi<string>("purchasing.lastGrn", "");
  const po = receivable.find(p => p.id === sel) || receivable[0];
  const lastGrn = last ? s.grns.find(g => g.id === last) : undefined;
  const grns = s.grns.slice().sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Goods receiving"
          sub="Scan supplier labels against the purchase order. Quantity, lot, expiry and UDI are checked at the door, so the stock is traceable from the moment it arrives." />

        {lastGrn && (
          <Notice tone={lastGrn.status === "Passed" ? "ok" : "warn"} icon={lastGrn.status === "Passed" ? I.check : I.alert} title={lastGrn.id + " booked in against " + lastGrn.po + " · " + lastGrn.status}
            right={<Row gap={6}><Btn size="sm" kind="secondary" onClick={() => openRecord("grn", lastGrn.id)}>Open GRN</Btn><Btn size="sm" kind="ghost" icon={I.x} onClick={() => setLast("")} /></Row>}>
            {lastGrn.lines.map(l => l.qty + " × " + l.sku + " (lot " + l.lot + ")").join(" · ")}. Main stockroom now holds {lastGrn.lines.map(l => productStock(l.sku, s).central + " × " + l.sku).join(", ")}.
          </Notice>
        )}

        <div className="hk-side">
          <Card title="Expected in" sub={plural(receivable.length, "open PO") + " to receive"} flush bodyStyle={{ padding: "0 8px 10px" }}>
            {receivable.map(p => {
              const on = po?.id === p.id;
              const late = poLateDays(p);
              const left = poOrdered(p) - poReceived(p);
              return (
                <div key={p.id} onClick={() => setSel(p.id)} className={on ? undefined : "ix11"}
                  style={{ padding: "9px 10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", background: on ? "var(--accent-faint)" : undefined, border: "1px solid " + (on ? "var(--accent-line)" : "transparent") }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: on ? "var(--ink)" : "var(--accent)", fontWeight: on ? 600 : 500 }}>{p.id}</span>
                    {late > 0 ? <Badge tone="bad" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>{late}d late</Badge> : p.expected === TODAY ? <Badge tone="accent" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>Today</Badge> : null}
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--dim)" }}>{date(p.expected, false)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--body)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{supName(p.supplier)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 1 }}>{plural(left, "unit")} outstanding · {p.status}</div>
                </div>
              );
            })}
            {!receivable.length && <Empty title="Nothing expected" sub="Every sent PO has been received." />}
          </Card>
          <div className="hk-first-sm" style={{ minWidth: 0 }}>
            {po ? <Station key={po.id} po={po} onBooked={id => setLast(id)} /> : <Card><Empty title="No open deliveries" sub="Draft and send a PO from the reorder list to receive against it." icon={I.box} /></Card>}
          </div>
        </div>

        <Card title="Recent goods-in" sub={plural(grns.length, "goods received note") + " · " + plural(grns.filter(g => g.status !== "Passed").length, "with an open check")} flush bodyStyle={{ padding: "0 10px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(300px,100%),1fr))", gap: 8 }}>
            {grns.map(g => {
              const po2 = s.pos.find(p => p.id === g.po);
              return (
                <div key={g.id} onClick={() => openRecord("grn", g.id)} className="ixz"
                  style={{ padding: "11px 12px", borderRadius: "var(--r-md,14px)", background: "var(--surface-2)", border: "1px solid " + (g.status === "Passed" ? "var(--border)" : "var(--bad-soft)"), cursor: "pointer", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--accent)" }}>{g.id}</span>
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>{g.po} · {date(g.date, false)}</span>
                    <span style={{ marginLeft: "auto" }}><Status s={g.status} /></span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{po2 ? supName(po2.supplier) : ""} · {g.lines.map(l => l.qty + " × " + l.sku).join(", ")}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
                    {g.checks.map(c => <span key={c.k} title={c.k + (c.note ? ": " + c.note : "")}><CheckMark ok={c.ok} size={18} /></span>)}
                    <span style={{ ...label, fontSize: 8.5, marginLeft: 6 }}>{g.checks.filter(c => c.ok).length}/{g.checks.length} checks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "0 4px" }}>
          <Icon d={I.info} size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />Demo labels use the 999 company prefix; they are not real manufacturer GTINs.
        </div>
      </Stack>
    </Page>
  );
}
