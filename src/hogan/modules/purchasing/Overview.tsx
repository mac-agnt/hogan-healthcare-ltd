/* Purchasing · Overview: procurement joined up with stock and finance.
   Outstanding POs, deliveries due and late, shortages, spend and the
   PO → goods-in → invoice chain, all derived from live demo state. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays, dayDate, eur, eurK, plural } from "../../fmt";
import { HBars } from "../../charts";
import { billExceptions, nav, openRecord, pendingApprovals, reorderRecs, useHogan } from "../../store";
import { Badge, Btn, Card, I, Kpi, Page, PageHeader, Progress, Row, Status, Table, label, type Col } from "../../ui";
import { AgentLine, Stack, Two } from "../orders/kit";
import { RECEIVABLE, billsFor, chasePO, grnsFor, matchState, poLateDays, poOpen, poOrdered, poOutstandingValue, poReceived, supName } from "./common";

function DateChip({ d, tone }: { d: string; tone?: "bad" | "warn" | "accent" }) {
  const c = tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : tone === "accent" ? "var(--accent)" : "var(--ink)";
  return (
    <span style={{ width: 46, flex: "none", textAlign: "center", padding: "5px 0", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <span style={{ display: "block", ...label, fontSize: 8.5, color: c }}>{dayDate(d).slice(0, 3)}</span>
      <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: c, lineHeight: 1.15 }}>{Number(d.slice(8))}</span>
      <span style={{ display: "block", fontSize: 9.5, color: "var(--faint)" }}>{dayDate(d).slice(-3)}</span>
    </span>
  );
}

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ ...label, fontSize: 9, padding: "10px 10px 4px" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Overview() {
  const s = useHogan();
  const open = s.pos.filter(poOpen);
  const sentOpen = open.filter(p => RECEIVABLE.includes(p.status));
  const late = sentOpen.filter(p => poLateDays(p) > 0).sort((a, b) => poLateDays(b) - poLateDays(a));
  const today = sentOpen.filter(p => p.expected === TODAY);
  const week = sentOpen.filter(p => p.expected > TODAY && p.expected <= addDays(TODAY, 7));
  const later = sentOpen.filter(p => p.expected > addDays(TODAY, 7));
  const notSent = open.filter(p => p.status === "Draft" || p.status === "Awaiting approval");
  const awaitingAp = pendingApprovals(s).filter(a => a.ref.type === "po");
  const recs = reorderRecs(s);
  const recSuppliers = new Set(recs.map(r => r.supplier.id)).size;
  const exc = billExceptions(s);
  const excGrn = s.grns.filter(g => g.status !== "Passed");
  const outstanding = open.reduce((a, p) => a + poOutstandingValue(p), 0);
  const b2034 = s.bills.find(b => b.id === "BILL-2034");
  const found = s.events.slice().reverse().find(e => e.ref === "BILL-2034" && e.actor === "Purchasing Agent");

  const row = (p: D.PurchaseOrder, tone?: "bad" | "warn" | "accent") => {
    const lateBy = poLateDays(p);
    return (
      <div key={p.id} className="ix11" onClick={() => openRecord("po", p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", minWidth: 0 }}>
        <DateChip d={p.expected} tone={tone} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Two a={<><span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12.5 }}>{p.id}</span> · {supName(p.supplier)}</>}
            b={p.lines.map(l => (l.qty - l.received) + " × " + l.sku).filter(x => !x.startsWith("0 ")).join(" · ") + " · " + eur(poOutstandingValue(p)) + (lateBy ? " · " + lateBy + " days late" : "")} />
          {p.status === "Part received" && <Progress value={poReceived(p)} max={poOrdered(p)} h={4} tone="warn" style={{ marginTop: 6, maxWidth: 220 }} />}
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none" }} onClick={e => e.stopPropagation()}>
          {lateBy > 0 && <Btn size="sm" kind="secondary" onClick={() => chasePO(p)}>Chase</Btn>}
          {RECEIVABLE.includes(p.status) && <Btn size="sm" kind={tone === "accent" || lateBy ? "primary" : "accent"} icon={I.scan} onClick={() => nav("Purchasing", "receiving", { "purchasing.po": p.id })}>Receive</Btn>}
          {p.status === "Awaiting approval" && <Btn size="sm" kind="accent" onClick={() => openRecord("po", p.id)}>Approval</Btn>}
          {p.status === "Draft" && <Status s="Draft" />}
        </div>
      </div>
    );
  };

  const chain = s.pos.filter(p => p.status !== "Draft" && p.status !== "Awaiting approval").slice().sort((a, b) => (a.id < b.id ? 1 : -1));
  const cols: Col<D.PurchaseOrder>[] = [
    { key: "po", label: "PO", w: "74px", sort: p => p.id, render: p => <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12.5 }}>{p.id}</span> },
    { key: "sup", label: "Supplier", w: "minmax(130px,1.3fr)", sort: p => supName(p.supplier), render: p => supName(p.supplier) },
    { key: "rec", label: "Goods in", w: "minmax(110px,1fr)", render: p => {
      const g = grnsFor(p.id, s);
      return g.length ? <span>{g.map(x => x.id).join(", ")} <span style={{ color: g.some(x => x.status !== "Passed") ? "var(--bad)" : "var(--faint)" }}>{g.some(x => x.status !== "Passed") ? "exception" : poReceived(p) + "/" + poOrdered(p)}</span></span>
        : <span style={{ color: "var(--faint)" }}>{p.status === "Received" || p.status === "Closed" ? "Received " + poReceived(p) + "/" + poOrdered(p) : "Not yet"}</span>;
    } },
    { key: "bill", label: "Invoice", w: "minmax(100px,1fr)", render: p => {
      const b = billsFor(p.id, s);
      return b.length ? b.map(x => x.id).join(", ") : <span style={{ color: "var(--faint)" }}>None yet</span>;
    } },
    { key: "match", label: "Match", w: "128px", sort: p => matchState(p, s).label, render: p => { const m = matchState(p, s); return <Badge tone={m.tone}>{m.label}</Badge>; } },
  ];

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Purchasing"
          sub="Purchase orders, deliveries, shortages and supplier invoices in one place, joined to stock on the way in and to finance on the way out."
          right={<>
            <Btn kind="secondary" onClick={() => nav("Purchasing", "exceptions")}>Exceptions · {exc.length + excGrn.length}</Btn>
            <Btn kind="primary" icon={I.refresh} onClick={() => nav("Purchasing", "reorder")}>Reorder · {recs.length}</Btn>
          </>} />

        <div className="hk-kpis6">
          <Kpi label="Outstanding POs" value={open.length} sub={eur(outstanding) + " still to arrive"} onClick={() => nav("Purchasing", "pos", { "purchasing.poFilter": "open" })} demo />
          <Kpi label="Late deliveries" value={late.length} tone={late.length ? "bad" : "ok"} sub={late.length ? late.map(p => p.id).join(", ") : "Everything on time"} onClick={() => nav("Purchasing", "pos", { "purchasing.poFilter": "late" })} />
          <Kpi label="Due in 7 days" value={today.length + week.length} sub={[...today, ...week].map(p => p.id + " " + (p.expected === TODAY ? "today" : dayDate(p.expected).slice(0, 3))).join(", ") || "None due"} onClick={() => nav("Purchasing", "receiving")} />
          <Kpi label="Awaiting approval" value={awaitingAp.length} tone={awaitingAp.length ? "warn" : undefined} sub={awaitingAp.length ? eur(awaitingAp.reduce((a, x) => a + (x.value || 0), 0)) + " with Graham" : "Nothing waiting"} onClick={() => nav("Purchasing", "pos", { "purchasing.poFilter": "approval" })} />
          <Kpi label="Below reorder point" value={recs.length} tone={recs.length ? "warn" : "ok"} sub={recs.length ? plural(recSuppliers, "supplier") + " · " + eur(recs.reduce((a, r) => a + r.cost, 0)) : "All above"} onClick={() => nav("Purchasing", "reorder")} />
          <Kpi label="Invoice exceptions" value={exc.length} tone={exc.length ? "bad" : "ok"} sub={exc.length ? eur(exc.reduce((a, b) => a + b.amount, 0)) + " on hold" : "All matched"} onClick={() => nav("Purchasing", "exceptions")} />
        </div>

        <div className="hk-wide">
          <Card title="Deliveries" sub={plural(sentOpen.length, "PO") + " on order · " + plural(late.length, "late delivery", "late deliveries")} flush bodyStyle={{ padding: "0 8px 10px" }}>
            {late.length > 0 && <Group title={"Overdue · " + late.length}>{late.map(p => row(p, "bad"))}</Group>}
            {today.length > 0 && <Group title="Due today">{today.map(p => row(p, "accent"))}</Group>}
            {week.length > 0 && <Group title="Next 7 days">{week.map(p => row(p, "warn"))}</Group>}
            {later.length > 0 && <Group title="Later">{later.map(p => row(p))}</Group>}
            {notSent.length > 0 && <Group title="Not sent yet">{notSent.map(p => row(p))}</Group>}
          </Card>

          <Card title="Purchasing Agent" sub="Findings and suggestions. People decide; nothing is ordered, approved or paid automatically.">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b2034 && b2034.status === "Quantity discrepancy" && (
                <AgentLine agent="Purchasing Agent" when={found ? found.time + (found.date === TODAY ? " today" : "") : "Invoice"} tone="bad" right={<Btn size="sm" kind="primary" onClick={() => nav("Purchasing", "exceptions")}>Review</Btn>}>
                  BILL-2034 bills {b2034.invoicedQty} × HH-SM-140. PO-337 ordered {b2034.expectedQty} and GRN-0419 received {b2034.expectedQty}. Suggest Margaret investigates before anything is paid.
                </AgentLine>
              )}
              {late.slice(0, 2).map(p => (
                <AgentLine key={p.id} agent="Purchasing Agent" when="Delivery" tone="warn" right={<Btn size="sm" kind="secondary" onClick={() => chasePO(p)}>Chase</Btn>}>
                  {p.id} from {supName(p.supplier)} is {poLateDays(p)} days late ({poReceived(p)}/{poOrdered(p)} units in). {p.note || "No new date from the supplier yet."}
                </AgentLine>
              ))}
              {recs.length > 0 && (
                <AgentLine agent="Purchasing Agent" when="Stock" right={<Btn size="sm" kind="secondary" onClick={() => nav("Purchasing", "reorder")}>Review</Btn>}>
                  {plural(recs.length, "line")} below the reorder point across {plural(recSuppliers, "supplier")}, about {eur(recs.reduce((a, r) => a + r.cost, 0))} at cost. Lowest: {recs[0].product.sku}, {recs[0].available} free against {recs[0].min}.
                </AgentLine>
              )}
              {awaitingAp.map(a => (
                <AgentLine key={a.id} agent="Purchasing Agent" when="Approval" right={<Btn size="sm" kind="accent" onClick={() => openRecord("po", a.ref.id)}>Open</Btn>}>
                  {a.title} ({eur(a.value || 0)}) is waiting for Graham. Over the {eur(5000)} sign-off threshold.
                </AgentLine>
              ))}
              {s.agentNotes.filter(n => n.agent === "purchasing" || n.agent === "stock").slice(0, 3).map((n, i) => (
                <AgentLine key={i} agent={n.agent === "stock" ? "Stock & Traceability Agent" : "Purchasing Agent"} when={"Note · " + n.time}>{n.text}</AgentLine>
              ))}
            </div>
          </Card>
        </div>

        <div className="hk-wide">
          <Card title="Purchase order to invoice" sub="Each PO through goods-in to the supplier invoice. Mismatches stop here, before payment." flush>
            <Table cols={cols} rows={chain} rowKey={p => p.id} onRow={p => openRecord("po", p.id)} dense minWidth={560} highlight={p => matchState(p, s).label === "Exception"} />
          </Card>
          <Card title="Spend by supplier" sub={"Year to date · " + eur(D.SUPPLIERS.reduce((a, x) => a + x.ytdSpend, 0)) + " across " + D.SUPPLIERS.length + " suppliers"} right={<Btn size="sm" kind="ghost" onClick={() => nav("Purchasing", "suppliers")}>Suppliers</Btn>}>
            <HBars fmt={eurK} barH={6} onRow={i => openRecord("supplier", D.SUPPLIERS.slice().sort((a, b) => b.ytdSpend - a.ytdSpend)[i].id)}
              data={D.SUPPLIERS.slice().sort((a, b) => b.ytdSpend - a.ytdSpend).map(x => ({ label: x.name, value: x.ytdSpend, color: x.tier === "Key global partner" ? "var(--accent)" : "var(--info,#7FB8C9)", sub: x.fictional ? undefined : "real name" }))} />
            <Row gap={14} wrap style={{ marginTop: 12, fontSize: 11.5, color: "var(--dim)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 6, borderRadius: 3, background: "var(--accent)" }} />Key global partner</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 6, borderRadius: 3, background: "var(--info,#7FB8C9)" }} />Agency</span>
              <span>All spend figures are fictional.</span>
            </Row>
          </Card>
        </div>
      </Stack>
    </Page>
  );
}
