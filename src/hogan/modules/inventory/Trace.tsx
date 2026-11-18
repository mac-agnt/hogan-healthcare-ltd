/* Inventory · Traceability: search any product, lot, serial, location,
   supplier or order and follow the chain from supplier to financial record. */

import { useMemo, type ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays } from "../../fmt";
import { openRecord, useHogan, useUi, type HState } from "../../store";
import { Badge, Btn, Card, Chip, Empty, I, Icon, Page, PageHeader, RecLink, Row, SearchBox, Seg, Table, Timeline, label, match, type Col } from "../../ui";
import { MOVE_ICON, MOVE_TONE, MoveTag, Ref, Where, dd } from "./bits";
import { TraceDrill } from "./drill";
import { drillFor, lotKey, splitLotKey, whereName } from "./model";

type Entry = { key: string; sku: string; lot: string; p?: D.Product; moves: D.Movement[]; last: string; held: D.StockLine[]; terms: string[] };

function buildIndex(s: HState): Entry[] {
  const map = new Map<string, Entry>();
  const get = (sku: string, lot: string) => {
    const k = lotKey(sku, lot);
    let e = map.get(k);
    if (!e) { e = { key: k, sku, lot, p: D.productBySku(sku), moves: [], last: "", held: [], terms: [] }; map.set(k, e); }
    return e;
  };
  for (const m of s.movements) { const e = get(m.sku, m.lot); e.moves.push(m); if (m.date > e.last) e.last = m.date; }
  for (const l of s.stock) if (l.qty > 0) get(l.sku, l.lot).held.push(l);
  for (const e of map.values()) {
    const t = new Set<string>([e.sku, e.lot, e.p?.name || "", D.supplierById(e.p?.supplier || "")?.name || "", e.p?.gtin || ""]);
    e.moves.forEach(m => { t.add(m.ref); if (m.finRef) t.add(m.finRef); if (m.serial) t.add(m.serial); t.add(whereName(m.from, true)); t.add(whereName(m.to, true)); t.add(whereName(m.from)); t.add(whereName(m.to)); });
    e.held.forEach(l => { if (l.serial) t.add(l.serial); t.add(whereName(l.loc, true)); t.add(whereName(l.loc)); });
    e.terms = Array.from(t);
    e.moves.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  return Array.from(map.values());
}

const QUICK = ["HH-OR-204", "L2603-204A", "SN-415-2611", "Harbour", "PO-337", "SO-1013", "Halcyon"];
type View = "chain" | "product";

export default function Trace() {
  const s = useHogan();
  const [q, setQ] = useUi("inventory.trace.q", "");
  const [selKey, setSelKey] = useUi("inventory.trace.lot", "HH-OR-204|L2603-204A");
  const [view, setView] = useUi<View>("inventory.trace.view", "chain");
  const index = useMemo(() => buildIndex(s), [s]);
  const recent = addDays(TODAY, -30);
  const results = useMemo(() => {
    const list = q.trim() ? index.filter(e => match(q, ...e.terms)) : index.filter(e => e.last > recent || e.sku === "HH-OR-204");
    return list.sort((a, b) => (b.sku === "HH-OR-204" ? 1 : 0) - (a.sku === "HH-OR-204" ? 1 : 0) || b.last.localeCompare(a.last)).slice(0, 40);
  }, [index, q, recent]);
  const { sku, lot } = splitLotKey(selKey);
  const sel = index.find(e => e.key === selKey);
  const p = D.productBySku(sku);

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Traceability"
        sub="Every unit, from the supplier to the hospital shelf to the invoice. Search by product code, lot, serial, location, supplier or order number."
        right={<Btn kind="accent" icon={I.target} onClick={() => document.getElementById("hh-drill")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Simulated drill</Btn>} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <Card flush pad={14} style={{ flex: "1 1 300px", minWidth: 0 }} title="Find a lot" sub={q ? results.length + " match" + (results.length === 1 ? "" : "es") + (results.length === 40 ? " (first 40)" : "") : "Recently moved lots. Type to search all " + index.length + "."}>
          <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Product, lot, serial, site, supplier, PO or SO" />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {QUICK.map(k => <Chip key={k} active={q === k} onClick={() => setQ(q === k ? "" : k)}>{k}</Chip>)}
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto", borderTop: "1px solid var(--border)" }}>
            {results.length ? results.map(e => {
              const on = e.key === selKey;
              const held = e.held.reduce((a, l) => a + l.qty, 0);
              return (
                <div key={e.key} onClick={() => { setSelKey(e.key); setView("chain"); }} className={on ? undefined : "ix11"}
                  style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: on ? "var(--accent-faint)" : undefined, boxShadow: on ? "inset 2px 0 0 var(--accent)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.p?.name}</span>
                    <span style={{ fontSize: 11, color: "var(--faint)" }}>{dd(e.last, false)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{e.sku} · {e.lot}</span>
                    <span style={{ fontSize: 11, color: "var(--faint)" }}>{e.moves.length} moves · {held} held</span>
                    <span style={{ flex: 1 }} />
                    <button onClick={ev => { ev.stopPropagation(); setSelKey(e.key); setView("product"); }} className="ix3"
                      style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--accent)" }}>All lots</button>
                  </div>
                </div>
              );
            }) : <Empty title="No matching lots" sub="Try a product code such as HH-OR-204, a lot, a serial, a site or a PO / SO number." icon={I.search} />}
          </div>
        </Card>

        <div style={{ flex: "2.4 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card pad={16}
            title={<span>{p?.name || sku} <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)", fontWeight: 500, marginLeft: 6 }}>{sku}</span></span>}
            sub={view === "chain" ? <span>Lot <b style={{ fontFamily: "var(--mono)", color: "var(--ink)", fontWeight: 500 }}>{lot}</b> · {sel?.moves.length || 0} movements · {(p && D.supplierById(p.supplier)?.name) || ""}</span> : "Every movement of this product, across all lots"}
            right={<Row gap={6} wrap>
              <Seg<View> size="sm" value={view} onChange={setView} items={[["chain", "Lot chain"], ["product", "All movements"]]} />
              <Btn size="sm" icon={I.external} onClick={() => openRecord(view === "chain" ? "lot" : "product", view === "chain" ? selKey : sku)}>{view === "chain" ? "Lot record" : "Product record"}</Btn>
            </Row>}>
            {view === "chain" ? (sel ? <Chain e={sel} /> : <Empty title="Pick a lot" sub="Choose a lot on the left to see its chain." icon={I.route} />) : <ProductMoves sku={sku} />}
          </Card>
        </div>
      </div>

      <TraceDrill uiKey="inventory.drill" id="hh-drill" />
    </Page>
  );
}

/* ── The chain: supplier → stockroom → hospital → held → used → financial ── */

function Chain({ e }: { e: Entry }) {
  const s = useHogan();
  const d = drillFor(s, e.sku, e.lot);
  const receipts = e.moves.filter(m => m.type === "Receipt");
  const transfers = e.moves.filter(m => m.type === "Transfer" && D.locById(m.to)?.kind === "consignment");
  const out = e.moves.filter(m => m.type === "Consumption" || m.type === "Dispatch");
  const bills = Array.from(new Set(e.moves.filter(m => m.finRef?.startsWith("BILL")).map(m => m.finRef as string)));
  const invs = Array.from(new Set(e.moves.filter(m => m.finRef?.startsWith("INV")).map(m => m.finRef as string)));
  const sup = d.sup;

  const stages: { title: string; head: ReactNode; body: ReactNode[]; on: boolean; icon: string }[] = [
    { title: "Supplier", icon: I.box, on: receipts.length > 0, head: sup?.name || "Supplier",
      body: [<span key="c">{sup?.country}</span>, ...receipts.map(m => <span key={m.id}>Ordered on <Ref id={m.ref} /></span>)] },
    { title: "Received at main stockroom", icon: I.download, on: receipts.length > 0, head: d.received + " units",
      body: receipts.map(m => <span key={m.id}>{dd(m.date, false)} · by {D.staffById(m.by)?.first || m.by}</span>) },
    { title: "Transferred to hospital", icon: I.route, on: transfers.length > 0, head: transfers.reduce((a, m) => a + m.qty, 0) + " units",
      body: transfers.length ? transfers.map(m => <span key={m.id}><Ref id={m.ref} /> · {m.qty} to {whereName(m.to)}</span>) : [<span key="n">No transfers for this lot</span>] },
    { title: "Held now", icon: I.hospital, on: d.heldUnits > 0, head: d.heldUnits + " units",
      body: d.held.length ? d.held.map(l => <span key={l.id}><RecLink type="location" id={l.loc}>{whereName(l.loc)}</RecLink> · {l.qty}{l.status !== "Available" ? " · " + l.status : ""}</span>) : [<span key="n">Nothing held</span>] },
    { title: "Issued or used", icon: I.check, on: out.length > 0, head: out.reduce((a, m) => a + m.qty, 0) + " units",
      body: out.length ? out.map(m => <span key={m.id}>{m.type === "Consumption" ? "Used at " + whereName(m.from) : "To " + m.to} · <Ref id={m.ref} /></span>) : [<span key="n">None yet</span>] },
    { title: "Financial record", icon: I.euro, on: bills.length + invs.length > 0, head: (bills.length + invs.length) + " documents",
      body: [...bills.map(b => <span key={b}>Supplier bill <Ref id={b} /></span>), ...invs.map(i => <span key={i}>Invoice <Ref id={i} /></span>)].concat(bills.length + invs.length ? [] : [<span key="n">None yet</span>]) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 8 }}>
        {stages.map((st, i) => (
          <div key={st.title} style={{ position: "relative", padding: "12px 12px 12px", borderRadius: 14, background: st.on ? "var(--surface-2)" : "var(--surface-faint)", border: "1px solid " + (st.on ? "var(--accent-line)" : "var(--border)"),
            minWidth: 0, animation: "fadeUp .35s var(--ease) both", animationDelay: i * 45 + "ms" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600,
                background: st.on ? "var(--accent)" : "var(--track)", color: st.on ? "var(--on-accent)" : "var(--dim)" }}>{i + 1}</span>
              <span style={{ ...label, fontSize: 9, flex: 1, minWidth: 0, color: st.on ? "var(--body)" : "var(--faint)" }}>{st.title}</span>
              {i < stages.length - 1 && <Icon d={I.chevron} size={12} color="var(--faint)" />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
              <Icon d={st.icon} size={14} color={st.on ? "var(--accent)" : "var(--faint)"} />
              <span style={{ fontSize: 14, fontWeight: 600, color: st.on ? "var(--ink)" : "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.head}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>
              {st.body.slice(0, 4)}
              {st.body.length > 4 && <span style={{ color: "var(--faint)" }}>+{st.body.length - 4} more</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
        Financial references point to the accounting system. In this demo they are references only: Xero and the current ERP are not connected.
      </div>
      <div>
        <div style={{ ...label, marginBottom: 6 }}>Movement timeline</div>
        <Timeline items={e.moves.slice().reverse().map(m => ({
          when: dd(m.date) + " · " + m.time + " · " + m.id + " · " + (D.staffById(m.by)?.name || m.by),
          title: <span>{m.type === "Consumption" ? "Used at " + whereName(m.from, true) : m.type === "Receipt" ? "Received from " + whereName(m.from) : m.type + ": " + whereName(m.from) + " → " + whereName(m.to)}</span>,
          sub: <span>{m.qty} unit{m.qty === 1 ? "" : "s"}{m.serial ? " · serial " + m.serial : ""} · <Ref id={m.ref} />{m.finRef ? <> · <Ref id={m.finRef} /></> : null}{m.note ? " · " + m.note : ""}</span>,
          tone: MOVE_TONE[m.type], icon: MOVE_ICON[m.type], tag: <MoveTag type={m.type} />,
          onClick: () => openRecord("movement", m.id),
        }))} />
      </div>
    </div>
  );
}

function ProductMoves({ sku }: { sku: string }) {
  const s = useHogan();
  const rows = s.movements.filter(m => m.sku === sku).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const cols: Col<D.Movement>[] = [
    { key: "date", label: "Date", w: "0.9fr", sort: m => m.date + m.time, render: m => <span style={{ fontSize: 12.5 }}>{dd(m.date, false)} <span style={{ color: "var(--faint)", fontSize: 11 }}>{m.time}</span></span> },
    { key: "type", label: "Movement", w: "1fr", sort: m => m.type, render: m => <MoveTag type={m.type} /> },
    { key: "lot", label: "Lot / serial", w: "1.1fr", sort: m => m.lot, render: m => <RecLink type="lot" id={lotKey(m.sku, m.lot)} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{m.serial || m.lot}</RecLink> },
    { key: "qty", label: "Qty", w: "0.45fr", align: "right", sort: m => m.qty, render: m => m.qty },
    { key: "route", label: "From → to", w: "1.8fr", render: m => <span style={{ fontSize: 12.5 }}><Where x={m.from} /> → <Where x={m.to} /></span> },
    { key: "ref", label: "Reference", w: "0.9fr", render: m => <Ref id={m.ref} /> },
    { key: "fin", label: "Financial", w: "0.9fr", render: m => m.finRef ? <Ref id={m.finRef} /> : <span style={{ color: "var(--faint)" }}>n/a</span> },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Row gap={8} wrap>
        <Badge>{rows.length} movements</Badge>
        <Badge tone="accent">{new Set(rows.map(m => m.lot)).size} lots</Badge>
        <span style={{ fontSize: 12, color: "var(--dim)" }}>Click a row for the movement record.</span>
      </Row>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <Table<D.Movement> cols={cols} rows={rows} rowKey={m => m.id} dense minWidth={760} maxHeight={460} onRow={m => openRecord("movement", m.id)} />
      </div>
    </div>
  );
}
