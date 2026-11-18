/* Inventory record drawers: product, lot, location, transfer, movement.
   Each one links onward so a record can be followed from alert to product to
   hospital to lot to movement to the transfer or order behind it. */

import type { CSSProperties, ReactNode } from "react";
import * as D from "../../data";
import { TODAY, date, eur, rel } from "../../fmt";
import { buildGs1 } from "../../gs1";
import { HBars } from "../../charts";
import {
  approveTransfer, decideApproval, nav, openRecord, productStock, proposeTransfer, rejectTransfer, reorderRecs, RESERVING, toast, useHogan, useUi,
} from "../../store";
import { Badge, Btn, Empty, I, Icon, KV, Notice, Person, RecLink, RecordHead, RecordSection, Row, Timeline, label } from "../../ui";
import { CatPill, Expiry, FlagCell, MOVE_ICON, MOVE_TONE, MoveTag, Ref, Where, dd, prettyNote } from "./bits";
import { lotKey, lotsOf, siteLows, siteStat, skuRow, splitLotKey, whereName } from "./model";
import { DOC_KEY, DOC_TONE, docsForProduct, qxForProduct, type DocState } from "../compliance/model";

const box: CSSProperties = { border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" };

function RowLine({ children, onClick, last }: { children: ReactNode; onClick?: () => void; last?: boolean }) {
  return (
    <div onClick={onClick} className={onClick ? "ix11" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: last ? undefined : "1px solid var(--border)", fontSize: 12.5, cursor: onClick ? "pointer" : undefined, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function moveTitle(m: D.Movement): string {
  if (m.type === "Receipt") return "Received from " + whereName(m.from);
  if (m.type === "Consumption") return "Used at " + whereName(m.from, true);
  if (m.type === "Dispatch") return "Dispatched to " + m.to;
  if (m.type === "Count adjustment") return "Count adjustment at " + whereName(m.from);
  return m.type + ": " + whereName(m.from) + " → " + whereName(m.to);
}

function moveItems(ms: D.Movement[]) {
  return ms.map(m => ({
    when: dd(m.date) + " · " + m.time + " · " + m.id + " · " + (D.staffById(m.by)?.name || m.by),
    title: <span>{moveTitle(m)}</span>,
    sub: <span>{m.qty} unit{Math.abs(m.qty) === 1 ? "" : "s"} · lot {m.lot}{m.serial ? " · SN " + m.serial : ""} · <Ref id={m.ref} />{m.finRef ? <> · <Ref id={m.finRef} /></> : null}</span>,
    tone: MOVE_TONE[m.type], icon: MOVE_ICON[m.type], onClick: () => openRecord("movement", m.id),
  }));
}

/* ── Product ────────────────────────────────────────────────────────────── */

export function ProductRecord({ id }: { id: string }) {
  const s = useHogan();
  const [docState] = useUi<DocState>(DOC_KEY, {});
  const row = skuRow(s, id);
  if (!row) return <Empty title="Product not found" sub={id} />;
  const { p, sup } = row;
  const ps = productStock(id, s);
  const locs = Object.entries(ps.byLoc).sort((a, b) => (a[0] === "DLM" ? -1 : b[0] === "DLM" ? 1 : b[1] - a[1]));
  const lines = s.stock.filter(l => l.sku === id && l.qty > 0).sort((a, b) => (a.loc === "DLM" ? -1 : 0) - (b.loc === "DLM" ? -1 : 0) || (a.expiry || "9999").localeCompare(b.expiry || "9999"));
  const moves = s.movements.filter(m => m.sku === id).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const orders = s.orders.filter(o => D.OPEN_STATUSES.includes(o.status) && o.status !== "Dispatched" && o.lines.some(l => l.sku === id));
  const transfers = s.transfers.filter(t => t.sku === id);
  const docs = docsForProduct(id, docState);
  const qx = qxForProduct(id, s.qx);
  const sites = locs.filter(([l]) => l !== "DLM");
  const rec = reorderRecs(s).find(r => r.product.sku === id);
  const firstLot = lotsOf(s, id)[0] || "";

  return (
    <div>
      <RecordHead kind={"Product · " + (D.catById(p.cat)?.short || "")} title={p.name}
        sub={<span>{p.subtitle ? p.subtitle + " · " : ""}<span style={{ fontFamily: "var(--mono)" }}>{p.sku}</span></span>}
        right={<FlagCell flags={row.flags} />} />
      <Row wrap gap={8} style={{ marginTop: 14 }}>
        <Btn size="sm" icon={I.route} onClick={() => nav("Inventory", "trace", { "inventory.trace.lot": lotKey(id, firstLot), "inventory.trace.view": "product" })}>Trace movements</Btn>
        {row.siteLow.length > 0 && <Btn size="sm" kind="primary" icon={I.route} onClick={() => nav("Inventory", "replenish", { "inventory.focus": id })}>Replenish</Btn>}
        <Btn size="sm" kind="ghost" icon={I.search} onClick={() => nav("Inventory", "live", { "inventory.live.q": id, "inventory.live.status": "all" })}>In Live Inventory</Btn>
      </Row>

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Manufacturer / supplier", sup ? <RecLink type="supplier" id={sup.id}>{sup.name}</RecLink> : "Not recorded"],
        ["Category", D.catById(p.cat)?.name || p.cat],
        ["MDR class (illustrative)", p.mdrClass],
        ["GTIN / UDI-DI (demo)", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.gtin}</span>],
        ["Sterile", p.sterile ? "Yes" : "No"],
        ["Tracked by", p.tracking === "serial" ? "Serial number" : "Lot / batch"],
        ["Unit cost", eur(p.unitCost)],
        ["Unit price", eur(p.unitPrice)],
        ["Margin", Math.round(((p.unitPrice - p.unitCost) / p.unitPrice) * 100) + "%"],
      ]} />
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>The GTIN is a demo identifier (company prefix 999), not a real manufacturer code. MDR class is illustrative only.</div>

      <RecordSection title={"Where it is · " + ps.total + " units"} right={<span style={{ fontSize: 11.5, color: "var(--faint)" }}>Click a location</span>}>
        <HBars data={locs.map(([l, n]) => ({ label: D.locById(l)?.name || l, value: n, color: l === "DLM" ? "var(--accent)" : "var(--info)", sub: l === "DLM" ? "Main stockroom" : "Consignment" }))}
          onRow={i => openRecord("location", locs[i][0])} />
        <KV cols={3} style={{ marginTop: 14 }} items={[
          ["Main stockroom", ps.central], ["At hospitals", ps.hospital], ["Reserved", ps.reserved],
          ["Available to pick", <span style={{ color: ps.available < p.minCentral ? "var(--warn)" : undefined }}>{ps.available}</span>], ["Reorder point", p.minCentral], ["On order", row.onOrder],
        ]} />
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
          {sites.length ? ps.hospital + " unit" + (ps.hospital === 1 ? "" : "s") + " on consignment at " + sites.length + " hospital" + (sites.length === 1 ? "" : "s") + ": still owned by Hogan until the hospital reports use. " : "No units on consignment. "}
          {ps.reserved ? ps.reserved + " of the " + ps.central + " in the main stockroom are reserved for open orders." : ""}
        </div>
        {rec && <Notice tone="warn" style={{ marginTop: 10 }} right={<Btn size="sm" onClick={() => nav("Purchasing", "reorder")}>Reorder</Btn>}>
          Below the reorder point: {rec.available} available plus {rec.onOrder} on order against {rec.min}. Suggested order {rec.suggested}.
        </Notice>}
      </RecordSection>

      <RecordSection title={(p.tracking === "serial" ? "Serials" : "Lots") + " · " + lines.length}>
        <div style={box}>
          {lines.map((l, i) => (
            <RowLine key={l.id} last={i === lines.length - 1} onClick={() => openRecord("lot", lotKey(l.sku, l.lot))}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)", minWidth: 96 }}>{l.serial || l.lot}</span>
              <span style={{ flex: 1, minWidth: 110 }}>{whereName(l.loc, true)}</span>
              <span style={{ fontSize: 12 }}><Expiry d={l.expiry} /></span>
              {l.status !== "Available" && <Badge tone={l.status === "Verify" ? "info" : "bad"}>{l.status}</Badge>}
              <b style={{ fontWeight: 600, minWidth: 20, textAlign: "right" }}>{l.qty}</b>
              <Icon d={I.chevron} size={12} color="var(--faint)" />
            </RowLine>
          ))}
        </div>
      </RecordSection>

      <RecordSection title={"Order allocation · " + orders.length + " open order" + (orders.length === 1 ? "" : "s")}>
        {orders.length ? (
          <div style={box}>
            {orders.map((o, i) => {
              const ls = o.lines.filter(l => l.sku === id);
              return (
                <RowLine key={o.id} last={i === orders.length - 1} onClick={() => openRecord("order", o.id)}>
                  <RecLink type="order" id={o.id} style={{ fontFamily: "var(--mono)", fontSize: 12 }} />
                  <span style={{ flex: 1, minWidth: 120 }}>{D.accountById(o.account)?.name}</span>
                  <span>{ls.reduce((a, l) => a + l.qty, 0)} units</span>
                  <Badge tone={RESERVING.includes(o.status) ? "warn" : "neutral"}>{o.status}</Badge>
                </RowLine>
              );
            })}
          </div>
        ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Not on any open order.</div>}
      </RecordSection>

      {transfers.length > 0 && (
        <RecordSection title="Transfers">
          <div style={box}>
            {transfers.map((t, i) => (
              <RowLine key={t.id} last={i === transfers.length - 1} onClick={() => openRecord("transfer", t.id)}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{t.id}</span>
                <span style={{ flex: 1, minWidth: 120 }}>{t.qty} to {whereName(t.to)}</span>
                <Badge tone={t.status === "Completed" ? "ok" : t.status === "Rejected" ? "bad" : "warn"}>{t.status}</Badge>
              </RowLine>
            ))}
          </div>
        </RecordSection>
      )}

      <RecordSection title={"Recent movements · " + moves.length + " in total"} right={<Btn size="sm" kind="ghost" onClick={() => nav("Inventory", "trace", { "inventory.trace.lot": lotKey(id, firstLot), "inventory.trace.view": "product" })}>All</Btn>}>
        <Timeline dense items={moveItems(moves.slice(0, 8))} />
      </RecordSection>

      <RecordSection title="Quality documents">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {docs.map(d => (
            <RowLine key={d.id} onClick={() => openRecord("doc", d.id)}>
              <Icon d={I.doc} size={14} color="var(--dim)" />
              <span style={{ flex: 1, minWidth: 160 }}>{d.title}</span>
              <Badge tone={DOC_TONE[d.status]}>{d.status}</Badge>
            </RowLine>
          ))}
          <div style={{ fontSize: 12, color: "var(--dim)" }}>Supplier documentation pack: <span style={{ fontFamily: "var(--mono)" }}>{p.docRef}</span> (demo reference).</div>
          {qx.map(q => (
            <Notice key={q.id} tone={q.severity === "High" ? "bad" : "warn"} right={<RecLink type="qx" id={q.id} style={{ fontSize: 12 }} />}>{q.title}</Notice>
          ))}
        </div>
      </RecordSection>
    </div>
  );
}

/* ── Lot ────────────────────────────────────────────────────────────────── */

export function LotRecord({ id }: { id: string }) {
  const s = useHogan();
  const { sku, lot } = splitLotKey(id);
  const p = D.productBySku(sku);
  const moves = s.movements.filter(m => m.sku === sku && m.lot === lot).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const lines = s.stock.filter(l => l.sku === sku && l.lot === lot && l.qty > 0);
  if (!p || (!moves.length && !lines.length)) return <Empty title="Lot not found" sub={id} />;
  const expiry = lines[0]?.expiry || s.stock.find(l => l.sku === sku && l.lot === lot)?.expiry;
  const serials = Array.from(new Set(lines.filter(l => l.serial).map(l => l.serial as string).concat(moves.filter(m => m.serial).map(m => m.serial as string))));
  const received = moves.filter(m => m.type === "Receipt");
  const sum = (t: D.MoveType) => moves.filter(m => m.type === t).reduce((a, m) => a + m.qty, 0);
  const held = lines.reduce((a, l) => a + l.qty, 0);
  const code = buildGs1({ gtin: p.gtin, expiry, lot, serial: serials.length === 1 ? serials[0] : undefined });

  return (
    <div>
      <RecordHead kind="Lot / batch" title={<span style={{ fontFamily: "var(--mono)" }}>{lot}</span>}
        sub={<span><RecLink type="product" id={sku}>{p.name}</RecLink> · <span style={{ fontFamily: "var(--mono)" }}>{sku}</span></span>}
        right={expiry ? <Badge tone="neutral">Exp {date(expiry)}</Badge> : undefined} />

      <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div style={{ ...label, fontSize: 9 }}>GS1 / UDI (human-readable, demo identifier)</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, marginTop: 6, wordBreak: "break-all", color: "var(--ink)" }}>{code}</div>
      </div>
      <KV cols={3} style={{ marginTop: 10 }} items={[
        ["(01) UDI-DI", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.gtin}</span>],
        ["(10) Lot", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{lot}</span>],
        ["(17) Expiry", expiry ? date(expiry) : "No expiry"],
        ["(21) Serial", serials.length ? serials.join(", ") : "Lot-tracked"],
        ["First received", received[0] ? dd(received[0].date) : "Not recorded"],
        ["Supplier", D.supplierById(p.supplier)?.name || p.supplier],
      ]} />

      <RecordSection title={"Where the units are now · " + held}>
        {lines.length ? (
          <div style={box}>
            {lines.map((l, i) => (
              <RowLine key={l.id} last={i === lines.length - 1} onClick={() => openRecord("location", l.loc)}>
                <Icon d={l.loc === "DLM" ? I.box : I.hospital} size={14} color="var(--accent)" />
                <span style={{ flex: 1, minWidth: 140 }}>{whereName(l.loc, true)}</span>
                {l.status !== "Available" && <Badge tone={l.status === "Verify" ? "info" : "bad"}>{l.status}</Badge>}
                <b style={{ fontWeight: 600 }}>{l.qty}</b>
              </RowLine>
            ))}
          </div>
        ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No units of this lot are held now: all used or dispatched.</div>}
        <KV cols={4} style={{ marginTop: 10 }} items={[["Received", sum("Receipt")], ["Transferred", sum("Transfer")], ["Used", sum("Consumption")], ["Dispatched", sum("Dispatch")]]} />
      </RecordSection>

      <RecordSection title={"Movement history · " + moves.length}
        right={<Btn size="sm" kind="ghost" icon={I.route} onClick={() => nav("Inventory", "trace", { "inventory.trace.lot": id, "inventory.trace.view": "chain" })}>Chain view</Btn>}>
        <Timeline items={moveItems(moves.slice().reverse())} />
      </RecordSection>

      <Row wrap gap={8} style={{ marginTop: 18 }}>
        <Btn icon={I.target} kind="accent" onClick={() => nav("Inventory", "trace", { "inventory.trace.lot": id, "inventory.drill": { sku, lot } })}>Simulated drill on this lot</Btn>
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Usage is recorded by date and site only. No patient data is held in Pulse.</span>
      </Row>
    </div>
  );
}

/* ── Location ───────────────────────────────────────────────────────────── */

export function LocationRecord({ id }: { id: string }) {
  const s = useHogan();
  const loc = D.locById(id);
  if (!loc) return <Empty title="Location not found" sub={id} />;
  const x = siteStat(s, loc, siteLows(s));
  const central = loc.kind === "central";
  const acc = x.account;
  const lowSkus = new Set(x.low.map(l => l.line.sku));
  const lines = x.lines.slice().sort((a, b) => (lowSkus.has(a.sku) ? -1 : 0) - (lowSkus.has(b.sku) ? -1 : 0) || a.sku.localeCompare(b.sku));
  const transfers = s.transfers.filter(t => t.to === id || t.from === id);
  const recs = central ? reorderRecs(s) : [];
  const quarantined = x.lines.filter(l => l.status === "Quarantine");

  return (
    <div>
      <RecordHead kind={central ? "Location · company stockroom" : "Location · consignment site"} title={loc.name}
        sub={loc.area + (loc.agreement ? " · consignment agreement " + loc.agreement : " · company-held stock")}
        right={central ? <Badge tone="accent">Company-held</Badge> : <Badge tone="info">Consignment</Badge>} />
      {!central && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Fictional demo account. Stock here stays on Hogan's books until the hospital reports use.</div>}

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Units", x.units], ["Value at cost", eur(x.value)], ["Lines", x.lines.length],
        ...(central ? [
          ["Quarantined", quarantined.reduce((a, l) => a + l.qty, 0)] as [ReactNode, ReactNode],
          ["Below reorder point", recs.length] as [ReactNode, ReactNode],
          ["Counted", "Weekly zones"] as [ReactNode, ReactNode],
        ] : [
          ["Below par", x.low.length] as [ReactNode, ReactNode],
          ["Used · 30 days", x.usedUnits] as [ReactNode, ReactNode],
          ["Last replenished", x.lastRepl ? dd(x.lastRepl, false) + " · " + rel(x.lastRepl) : "Not recorded"] as [ReactNode, ReactNode],
        ]),
      ]} />
      {acc && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5 }}>Account <RecLink type="account" id={acc.id}>{acc.name}</RecLink></span>
          <span style={{ flex: 1 }} />
          <Person id={acc.owner} sub="Account owner" size={24} />
        </div>
      )}
      <Row wrap gap={8} style={{ marginTop: 14 }}>
        {!central && <Btn size="sm" kind="primary" icon={I.hospital} onClick={() => nav("Inventory", "hospital", { "inventory.site": id })}>Open hospital stock view</Btn>}
        <Btn size="sm" icon={I.layers} onClick={() => nav("Inventory", "counts", { "inventory.countLoc": id })}>Count this location</Btn>
        <Btn size="sm" kind="ghost" icon={I.search} onClick={() => nav("Inventory", "live", { "inventory.live.loc": id, "inventory.live.status": "all" })}>Filter Live Inventory</Btn>
      </Row>

      {!central && (
        <RecordSection title={"Below par · " + x.low.length}>
          {x.low.length ? (
            <div style={box}>
              {x.low.map((lo, i) => (
                <RowLine key={lo.line.id} last={i === x.low.length - 1}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{lo.line.sku}</span>
                  <span style={{ flex: 1, minWidth: 110, color: "var(--dim)" }}>{lo.line.qty} on hand · par {lo.line.min}</span>
                  {lo.pending
                    ? <><RecLink type="transfer" id={lo.pending.id} style={{ fontSize: 12 }} /><Btn size="sm" kind="primary" onClick={() => approveTransfer(lo.pending!.id, "JC")}>Approve as John Culkin</Btn></>
                    : <Btn size="sm" kind="accent" icon={I.route} onClick={() => proposeTransfer({ sku: lo.line.sku, to: loc.id, qty: lo.suggested, by: "GH" })}>Replenish {lo.suggested}</Btn>}
                </RowLine>
              ))}
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Every line is at or above its par level.</div>}
        </RecordSection>
      )}

      {central && recs.length > 0 && (
        <RecordSection title={"Below reorder point · " + recs.length} right={<Btn size="sm" kind="ghost" onClick={() => nav("Purchasing", "reorder")}>Purchasing</Btn>}>
          <div style={box}>
            {recs.map((r, i) => (
              <RowLine key={r.product.sku} last={i === recs.length - 1} onClick={() => openRecord("product", r.product.sku)}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.product.sku}</span>
                <span style={{ flex: 1, minWidth: 120, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.product.name}</span>
                <span>{r.available} / {r.min}</span>
              </RowLine>
            ))}
          </div>
        </RecordSection>
      )}

      {(x.verify.length > 0 || quarantined.length > 0) && (
        <RecordSection title="Needs attention">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {x.verify.concat(quarantined).map(l => (
              <Notice key={l.id} tone={l.status === "Quarantine" ? "bad" : "warn"} title={l.sku + " · lot " + l.lot + " · " + l.status}>{prettyNote(l.note)}</Notice>
            ))}
          </div>
        </RecordSection>
      )}

      <RecordSection title="Categories held">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{x.cats.map(c => <CatPill key={c.cat.id} cat={c.cat.id} n={c.units + " units"} />)}</div>
      </RecordSection>

      <RecordSection title={"Stock lines · " + lines.length}>
        <div style={{ ...box, maxHeight: 320, overflowY: "auto" }}>
          {lines.map((l, i) => (
            <RowLine key={l.id} last={i === lines.length - 1} onClick={() => openRecord("lot", lotKey(l.sku, l.lot))}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, minWidth: 80 }}>{l.sku}</span>
              <span style={{ flex: 1, minWidth: 120, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{D.productBySku(l.sku)?.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{l.serial || l.lot}</span>
              {lowSkus.has(l.sku) && <Badge tone="warn">Below par</Badge>}
              <b style={{ fontWeight: 600, minWidth: 18, textAlign: "right" }}>{l.qty}</b>
            </RowLine>
          ))}
        </div>
      </RecordSection>

      {!central && (
        <RecordSection title={"Usage · last 30 days · " + x.usedUnits + " units"}>
          {x.used.length ? <Timeline dense items={moveItems(x.used.slice(0, 6))} /> : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No usage reported in the last 30 days.</div>}
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>By date and site only. No patient data is held in Pulse.</div>
        </RecordSection>
      )}

      <RecordSection title={"Transfers raised in Pulse · " + transfers.length}>
        {transfers.length ? (
          <div style={box}>
            {transfers.map((t, i) => (
              <RowLine key={t.id} last={i === transfers.length - 1} onClick={() => openRecord("transfer", t.id)}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{t.id}</span>
                <span style={{ flex: 1, minWidth: 120 }}>{t.qty} × {t.sku} · {whereName(t.from)} → {whereName(t.to)}</span>
                <Badge tone={t.status === "Completed" ? "ok" : t.status === "Rejected" ? "bad" : "warn"}>{t.status}</Badge>
              </RowLine>
            ))}
          </div>
        ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No transfer requests for this location.</div>}
      </RecordSection>
    </div>
  );
}

/* ── Transfer ───────────────────────────────────────────────────────────── */

export function TransferRecord({ id }: { id: string }) {
  const s = useHogan();
  const tr = s.transfers.find(t => t.id === id);
  const moves = s.movements.filter(m => m.ref === id);
  if (!tr && !moves.length) return <Empty title="Transfer not found" sub={id} />;

  if (!tr) {
    const m = moves[0];
    const p = D.productBySku(m.sku);
    return (
      <div>
        <RecordHead kind="Transfer · from movement history" title={id} status="Completed"
          sub={<span>{m.qty} × <RecLink type="product" id={m.sku}>{p?.name || m.sku}</RecLink> · {whereName(m.from)} → {whereName(m.to)}</span>} />
        <KV cols={3} style={{ marginTop: 16 }} items={[
          ["Product", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{m.sku}</span>],
          ["Lot", <RecLink type="lot" id={lotKey(m.sku, m.lot)} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{m.lot}</RecLink>],
          ["Quantity", moves.reduce((a, x) => a + x.qty, 0)],
          ["From", <Where x={m.from} long />], ["To", <Where x={m.to} long />], ["Date", dd(m.date) + " · " + m.time],
          ["Moved by", D.staffById(m.by)?.name || m.by], ["Movement", <RecLink type="movement" id={m.id} style={{ fontFamily: "var(--mono)", fontSize: 12 }} />], ["Source", m.ref.startsWith("TR-SCAN") ? "Handheld scan" : "Transfer history"],
        ]} />
        {m.note && <Notice style={{ marginTop: 12 }}>{m.note}</Notice>}
      </div>
    );
  }

  const p = D.productBySku(tr.sku);
  const ap = s.approvals.find(a => a.ref.type === "transfer" && a.ref.id === id);
  const awaiting = tr.status === "Awaiting approval" || tr.status === "Proposed";
  const central = s.stock.filter(l => l.sku === tr.sku && l.loc === tr.from).reduce((a, l) => a + l.qty, 0);
  const site = s.stock.filter(l => l.sku === tr.sku && l.loc === tr.to).reduce((a, l) => a + l.qty, 0);
  const par = s.stock.find(l => l.sku === tr.sku && l.loc === tr.to && l.min !== undefined)?.min;
  const reject = () => {
    if (ap && ap.status === "Awaiting") decideApproval(ap.id, false, "JC");
    else { rejectTransfer(tr.id, "JC"); toast(tr.id + " rejected. No stock moved.", "warn"); }
  };
  const proposer = tr.proposedBy.startsWith("agent") ? "Stock & Traceability Agent" : D.staffById(tr.proposedBy)?.name || tr.proposedBy;

  return (
    <div>
      <RecordHead kind="Stock transfer" title={tr.id} status={tr.status}
        sub={<span>{tr.qty} × <RecLink type="product" id={tr.sku}>{p?.name || tr.sku}</RecLink> · {whereName(tr.from, true)} → {whereName(tr.to, true)}</span>} />

      {awaiting && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "var(--accent-faint)", border: "1px solid var(--accent-line)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Waiting for John Culkin</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
            If approved: {whereName(tr.from)} {central} → {central - tr.qty} · {whereName(tr.to)} {site} → {site + tr.qty}{par !== undefined ? " (par " + par + ")" : ""}. A traceable movement is written at the same time.
          </div>
          <Row gap={8} wrap style={{ marginTop: 12 }}>
            <Btn kind="primary" icon={I.check} onClick={() => approveTransfer(tr.id, "JC")}>Approve as John Culkin</Btn>
            <Btn kind="danger" icon={I.x} onClick={reject}>Reject</Btn>
          </Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Human approval required. Pulse and its agents can propose a transfer, never approve one.</div>
        </div>
      )}

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Lot", tr.lot ? <RecLink type="lot" id={lotKey(tr.sku, tr.lot)} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{tr.lot}</RecLink> : "Chosen at approval (FEFO)"],
        ["Quantity", tr.qty], ["Reason", tr.reason],
        ["Requested by", proposer], ["Approver", D.staffById(tr.approver)?.name || tr.approver], ["Raised", dd(tr.created)],
        ["From", <Where x={tr.from} long />], ["To", <Where x={tr.to} long />], ["Completed", tr.completed ? dd(tr.completed) : tr.status === "Rejected" ? "Rejected" : "Not yet"],
      ]} />

      {ap && (
        <RecordSection title="Approval">
          <RowLine onClick={() => openRecord("approval", ap.id)} last>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{ap.id}</span>
            <span style={{ flex: 1, minWidth: 140 }}>{ap.title}</span>
            <Badge tone={ap.status === "Approved" ? "ok" : ap.status === "Rejected" ? "bad" : "warn"}>{ap.status}</Badge>
            {ap.decidedAt && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{ap.decidedAt.slice(11)} · {D.staffById(ap.decidedBy || "")?.name}</span>}
          </RowLine>
        </RecordSection>
      )}

      <RecordSection title={"Movement · " + moves.length}>
        {moves.length ? <Timeline items={moveItems(moves)} /> : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{tr.status === "Rejected" ? "Rejected: no stock moved." : "No movement yet. Stock moves when the transfer is approved."}</div>}
      </RecordSection>
    </div>
  );
}

/* ── Movement ───────────────────────────────────────────────────────────── */

export function MovementRecord({ id }: { id: string }) {
  const s = useHogan();
  const m = s.movements.find(x => x.id === id);
  if (!m) return <Empty title="Movement not found" sub={id} />;
  const p = D.productBySku(m.sku);
  const same = s.movements.filter(x => x.sku === m.sku && x.lot === m.lot).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return (
    <div>
      <RecordHead kind="Stock movement" title={<span>{moveTitle(m)}</span>} sub={<span style={{ fontFamily: "var(--mono)" }}>{m.id} · {dd(m.date)} · {m.time}</span>}
        right={<MoveTag type={m.type} />} />
      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Product", <RecLink type="product" id={m.sku}>{p?.name || m.sku}</RecLink>],
        ["Lot", <RecLink type="lot" id={lotKey(m.sku, m.lot)} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{m.lot}</RecLink>],
        ["Serial", m.serial || "Lot-tracked"],
        ["Quantity", m.qty], ["From", <Where x={m.from} long />], ["To", <Where x={m.to} long />],
        ["Reference", <Ref id={m.ref} />], ["Financial record", m.finRef ? <Ref id={m.finRef} /> : "None"], ["Recorded by", D.staffById(m.by)?.name || m.by],
      ]} />
      {m.note && <Notice style={{ marginTop: 12 }}>{prettyNote(m.note)}</Notice>}
      {m.type === "Consumption" && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Usage is recorded by date and site only. No patient data is held in Pulse.</div>}
      <RecordSection title={"Other movements of lot " + m.lot}>
        <Timeline dense items={moveItems(same.filter(x => x.id !== m.id).slice(0, 8))} />
        {same.length <= 1 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>This is the only movement of this lot.</div>}
      </RecordSection>
      {m.date === TODAY && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Recorded today in the demo. Demo state only: nothing is sent to the ERP.</div>}
    </div>
  );
}
