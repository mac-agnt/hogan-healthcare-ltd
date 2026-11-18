/* Purchasing · record drawer views: purchase order, goods received note,
   supplier bill and supplier. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { TODAY, date, eur, plural } from "../../fmt";
import { productStock, useHogan } from "../../store";
import { Badge, Btn, Empty, I, Notice, Person, RecLink, RecordHead, RecordSection, Row, Status, Timeline, label } from "../../ui";
import { AgentLine, CheckMark, KVGrid } from "../orders/kit";
import { whenDecided } from "../orders/common";
import { BillActions, BillMatch, GRN_FIX } from "./Exceptions";
import { POAction } from "./POs";
import { RealBadge } from "./Suppliers";
import {
  RECEIVABLE, billsFor, chasePO, grnsFor, isException, matchState, openBills, poApproval, poLateDays, poOpen, poOrdered, poOutstandingValue, poReceived, resolveGrnCheck, sendBackPO, supName,
} from "./common";

function History({ refId }: { refId: string }) {
  const s = useHogan();
  const ev = s.events.filter(e => e.ref === refId).slice(0, 10);
  if (!ev.length) return <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No activity recorded yet.</div>;
  return <Timeline dense items={ev.map(e => ({ when: (e.date === TODAY ? "Today" : date(e.date, false)) + " · " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: e.stream === "ai" ? "accent" : e.status === "completed" ? "ok" : "warn", icon: e.stream === "ai" ? I.agent : undefined }))} />;
}

function Box({ children }: { children: ReactNode }) {
  return <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", overflow: "hidden" }}>{children}</div>;
}
function Line({ first, children }: { first?: boolean; children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: first ? undefined : "1px solid var(--border)", fontSize: 12.5, flexWrap: "wrap" }}>{children}</div>;
}

export function PORecord({ id }: { id: string }) {
  const s = useHogan();
  const p = s.pos.find(x => x.id === id);
  if (!p) return <Empty title={"Purchase order " + id + " not found"} />;
  const ap = poApproval(id, s);
  const grns = grnsFor(id, s);
  const bills = billsFor(id, s);
  const m = matchState(p, s);
  const late = poLateDays(p);
  return (
    <div>
      <RecordHead kind="Purchase order" title={<>{p.id} · {supName(p.supplier)}</>} status={p.status}
        sub={"Raised " + date(p.created) + " by " + (D.staffById(p.raisedBy)?.name || p.raisedBy) + " · expected " + date(p.expected) + (late ? " (" + late + " days late)" : "")} />
      <Row gap={8} wrap style={{ marginTop: 16 }}>
        <POAction p={p} size="md" />
        {p.status === "Awaiting approval" && <Btn kind="secondary" onClick={() => sendBackPO(p.id)}>Send back</Btn>}
        {late > 0 && <Btn kind="secondary" onClick={() => chasePO(p)}>Chase supplier</Btn>}
      </Row>
      {ap && (
        <Notice tone={ap.status === "Awaiting" ? "warn" : ap.status === "Approved" ? "ok" : "bad"} title={ap.id + " · " + ap.kind + " · " + (ap.status === "Awaiting" ? "waiting for Graham" : ap.status.toLowerCase())} style={{ marginTop: 16 }}>
          {ap.detail} {ap.decidedAt ? "Decided " + whenDecided(ap.decidedAt) + "." : ""} Approval is recorded in Pulse only; the PO is not transmitted to the supplier.
        </Notice>
      )}
      <KVGrid style={{ marginTop: 16 }} items={[
        ["Supplier", <RecLink type="supplier" id={p.supplier}>{supName(p.supplier)}</RecLink>],
        ["Value", eur(D.poValue(p))],
        ["Freight", eur(p.freight)],
        ["Received", poReceived(p) + " of " + poOrdered(p) + " units"],
        ["Still to come", eur(poOutstandingValue(p))],
        ["Invoice match", <Badge tone={m.tone}>{m.label}</Badge>],
      ]} />
      {p.note && <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 12 }}>{p.note}</div>}
      <RecordSection title={"Lines · " + p.lines.length}>
        <Box>
          {p.lines.map((l, i) => (
            <Line key={l.sku} first={i === 0}>
              <CheckMark ok={l.received >= l.qty ? true : null} />
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div><RecLink type="product" id={l.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.sku}</RecLink> <span style={{ color: "var(--ink)" }}>{D.productBySku(l.sku)?.name}</span></div>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>Received {l.received} of {l.qty} · main stockroom now {productStock(l.sku, s).central}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{l.qty} × {eur(l.cost)}</div>
                <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{eur(l.qty * l.cost)}</div>
              </div>
            </Line>
          ))}
        </Box>
      </RecordSection>
      <RecordSection title="Goods received">
        {grns.length ? grns.map(g => (
          <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5, flexWrap: "wrap" }}>
            <RecLink type="grn" id={g.id} /> <span style={{ color: "var(--dim)" }}>{date(g.date, false)} · {g.lines.map(l => l.qty + " × " + l.sku).join(", ")}</span> <Status s={g.status} />
          </div>
        )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{RECEIVABLE.includes(p.status) ? "Nothing booked in yet." : p.status === "Closed" || p.status === "Received" ? "Received before goods-in notes were kept in Pulse." : "Not sent yet."}</div>}
      </RecordSection>
      <RecordSection title="Supplier invoices">
        {bills.length ? bills.map(b => (
          <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5 }}>
            <RecLink type="bill" id={b.id} /> <span style={{ color: "var(--dim)" }}>{eur(b.amount)} · due {date(b.due, false)}</span> <Status s={b.status} />
          </div>
        )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No invoice received yet.</div>}
      </RecordSection>
      <RecordSection title="History"><History refId={p.id} /></RecordSection>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 18 }}>Fictional demo PO. Pulse does not send POs to suppliers; that link is not connected.</div>
    </div>
  );
}

export function GRNRecord({ id }: { id: string }) {
  const s = useHogan();
  const g = s.grns.find(x => x.id === id);
  if (!g) return <Empty title={"Goods received note " + id + " not found"} />;
  const po = s.pos.find(p => p.id === g.po);
  const bills = s.bills.filter(b => b.grn === g.id);
  const qx = s.qx.filter(q => q.ref === g.id);
  return (
    <div>
      <RecordHead kind="Goods received note" title={<>{g.id}{po ? " · " + supName(po.supplier) : ""}</>} status={g.status}
        sub={<>Against <RecLink type="po" id={g.po}>{g.po}</RecLink> · received {date(g.date)} by {D.staffById(g.by)?.name || g.by}</>} />
      <RecordSection title={"Checks · " + g.checks.filter(c => c.ok).length + "/" + g.checks.length + " passed"}>
        <Box>
          {g.checks.map((c, i) => (
            <Line key={c.k} first={i === 0}>
              <CheckMark ok={c.ok} />
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ color: "var(--ink)" }}>{c.k}</div>
                {c.note && <div style={{ fontSize: 11.5, color: c.ok ? "var(--dim)" : c.ok === false ? "var(--bad)" : "var(--warn)", marginTop: 2 }}>{c.note}</div>}
              </div>
              {c.ok !== true && <Btn size="sm" kind="secondary" onClick={() => resolveGrnCheck(g.id, c.k, GRN_FIX[c.k]?.[1] || "Resolved.")}>{GRN_FIX[c.k]?.[0] || "Resolve"}</Btn>}
            </Line>
          ))}
        </Box>
      </RecordSection>
      <RecordSection title={"Lines · " + plural(g.lines.reduce((a, l) => a + l.qty, 0), "unit")}>
        <Box>
          {g.lines.map((l, i) => (
            <Line key={l.sku + l.lot} first={i === 0}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <RecLink type="product" id={l.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.sku}</RecLink> <span style={{ color: "var(--ink)" }}>{D.productBySku(l.sku)?.name}</span>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>Lot <RecLink type="lot" id={l.sku + "|" + l.lot}>{l.lot}</RecLink>{l.expiry ? " · exp " + date(l.expiry) : ""}</div>
              </div>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>× {l.qty}</span>
            </Line>
          ))}
        </Box>
      </RecordSection>
      {(bills.length > 0 || qx.length > 0) && (
        <RecordSection title="Linked records">
          {bills.map(b => <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12.5 }}><RecLink type="bill" id={b.id} /> {eur(b.amount)} <Status s={b.status} /></div>)}
          {qx.map(q => <div key={q.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12.5 }}><RecLink type="qx" id={q.id} /> {q.title} <Status s={q.status} /></div>)}
        </RecordSection>
      )}
      <RecordSection title="History"><History refId={g.id} /></RecordSection>
    </div>
  );
}

export function BillRecord({ id }: { id: string }) {
  const s = useHogan();
  const b = s.bills.find(x => x.id === id);
  if (!b) return <Empty title={"Bill " + id + " not found"} />;
  const bank = s.bank.filter(t => t.suggest === b.id || (t.note || "").includes(b.id) || t.desc.includes(b.id));
  const notes = s.agentNotes.filter(n => n.ref === b.id);
  const tasks = s.tasks.filter(t => t.related?.id === b.id);
  return (
    <div>
      <RecordHead kind="Supplier bill" title={<>{b.id} · {supName(b.supplier)}</>} status={b.status}
        sub={eur(b.amount) + " · dated " + date(b.date) + " · due " + date(b.due) + " · owner " + (D.staffById(b.owner)?.name || b.owner)} />
      <div style={{ marginTop: 18 }}>
        {b.invoicedQty ? <BillMatch b={b} /> : (
          <>
            <KVGrid items={[
              ["Supplier", <RecLink type="supplier" id={b.supplier}>{supName(b.supplier)}</RecLink>],
              ["Purchase order", b.po ? <RecLink type="po" id={b.po}>{b.po}</RecLink> : "None quoted"],
              ["Goods received", b.grn ? <RecLink type="grn" id={b.grn}>{b.grn}</RecLink> : "No record"],
            ]} />
            {b.detail && <Notice tone={isException(b) ? "bad" : "info"} style={{ marginTop: 12 }}>{b.detail}</Notice>}
            {isException(b) && <div style={{ marginTop: 12 }}><BillActions b={b} size="md" /></div>}
          </>
        )}
      </div>
      {notes.length > 0 && (
        <RecordSection title="Agent notes">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n, i) => <AgentLine key={i} agent={n.agent === "finance" ? "Finance Agent" : "Purchasing Agent"} when={n.time}>{n.text}</AgentLine>)}
          </div>
        </RecordSection>
      )}
      {tasks.length > 0 && (
        <RecordSection title="Tasks">
          {tasks.map(t => <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12.5, flexWrap: "wrap" }}><RecLink type="task" id={t.id} /> {t.title} <Status s={t.status} /></div>)}
        </RecordSection>
      )}
      {bank.length > 0 && (
        <RecordSection title="Bank lines that mention this bill">
          {bank.map(t => <div key={t.id} style={{ padding: "4px 0", fontSize: 12.5, color: "var(--body)" }}><RecLink type="bank" id={t.id} /> · {date(t.date, false)} · {eur(t.amount, 2)} · <Status s={t.state} /> <span style={{ color: "var(--dim)" }}>{t.note}</span></div>)}
        </RecordSection>
      )}
      <RecordSection title="History"><History refId={b.id} /></RecordSection>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 18, lineHeight: 1.5 }}>Pulse never pays or posts. Payment runs happen in the accounts system, which is not connected in this demo.</div>
    </div>
  );
}

export function SupplierRecord({ id }: { id: string }) {
  const s = useHogan();
  const x = D.supplierById(id);
  if (!x) return <Empty title={"Supplier " + id + " not found"} />;
  const pos = s.pos.filter(p => p.supplier === id).sort((a, b) => (a.id < b.id ? 1 : -1));
  const bills = s.bills.filter(b => b.supplier === id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const products = D.PRODUCTS.filter(p => p.supplier === id);
  const docs = D.QUALITY_DOCS.filter(d => d.supplier === id);
  const top = products.map(p => ({ p, v: productStock(p.sku, s).value })).sort((a, b) => b.v - a.v).slice(0, 6);
  const open = pos.filter(poOpen);
  return (
    <div>
      <RecordHead kind="Supplier" title={<span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{x.name}<RealBadge x={x} /></span>}
        sub={x.tier + " · " + x.country + " · " + x.categories} />
      {x.note && <Notice tone="info" style={{ marginTop: 14 }}>{x.note}</Notice>}
      <KVGrid style={{ marginTop: 16 }} items={[
        ["Spend this year", eur(x.ytdSpend)],
        ["Lead time", x.leadDays + " days"],
        ["On time", x.onTime + "%"],
        ["Terms", x.terms],
        ["Open POs", open.length ? open.length + " · " + eur(open.reduce((a, p) => a + poOutstandingValue(p), 0)) : "None"],
        ["Open bills", openBills(id, s).length ? eur(openBills(id, s).reduce((a, b) => a + b.amount, 0)) : "None"],
      ]} />
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>Agreement: {x.agreement} · {plural(products.length, "product")} in the range</div>
      <RecordSection title={"Purchase orders · " + pos.length}>
        {pos.length ? pos.map(p => (
          <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5, flexWrap: "wrap" }}>
            <RecLink type="po" id={p.id} /> <span style={{ color: "var(--dim)" }}>{date(p.created, false)} · {eur(D.poValue(p))} · {poReceived(p)}/{poOrdered(p)} in</span> <Status s={p.status} />
            {poLateDays(p) > 0 && <Badge tone="bad">{poLateDays(p)}d late</Badge>}
          </div>
        )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No purchase orders in the demo period.</div>}
      </RecordSection>
      <RecordSection title={"Bills · " + bills.length}>
        {bills.length ? bills.map(b => (
          <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5 }}>
            <RecLink type="bill" id={b.id} /> <span style={{ color: "var(--dim)" }}>{eur(b.amount)} · due {date(b.due, false)}</span> <Status s={b.status} />
          </div>
        )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No bills in the demo period.</div>}
      </RecordSection>
      <RecordSection title="Highest-value stock from this supplier">
        {top.map(({ p, v }) => (
          <div key={p.sku} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "4px 0", fontSize: 12.5 }}>
            <RecLink type="product" id={p.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.sku}</RecLink>
            <span style={{ flex: 1, minWidth: 0, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{eur(v)}</span>
          </div>
        ))}
      </RecordSection>
      {docs.length > 0 && (
        <RecordSection title="Quality documents">
          {docs.map(d => <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12.5, flexWrap: "wrap" }}><RecLink type="doc" id={d.id} /> {d.title} <Status s={d.status} /></div>)}
        </RecordSection>
      )}
      <RecordSection title="Contact"><Person id="SO" sub="Places orders with this supplier" /></RecordSection>
      <div style={{ ...label, fontSize: 9, marginTop: 18 }}>All figures fictional demo data</div>
    </div>
  );
}
