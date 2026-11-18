/* Purchasing · Purchase Orders: every PO with status, value, expected date
   and goods received. POs over €5,000 wait for Graham: approving is an
   explicit click recorded against his name. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, date, eur, plural } from "../../fmt";
import { nav, openRecord, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Chip, I, Page, PageHeader, Progress, Row, SearchBox, Status, Table, match, type Col } from "../../ui";
import { Stack, Two } from "../orders/kit";
import {
  APPROVAL_LIMIT, RECEIVABLE, approvePO, closePO, confirmPO, matchState, poApproval, poLateDays, poOpen, poOrdered, poReceived, sendBackPO, submitPO, supName,
} from "./common";

/** The next step for a PO, shared by the table and the drawer. */
export function POAction({ p, size = "sm" }: { p: D.PurchaseOrder; size?: "sm" | "md" }) {
  if (p.status === "Draft") return <Btn size={size} kind="primary" onClick={() => submitPO(p)}>{D.poValue(p) > APPROVAL_LIMIT ? "Submit for approval" : "Mark sent"}</Btn>;
  if (p.status === "Awaiting approval") return <Btn size={size} kind="accent" icon={I.check} onClick={() => approvePO(p.id)}>Approve as Graham</Btn>;
  if (p.status === "Sent") return <Btn size={size} kind="secondary" title="Record the supplier's order confirmation" onClick={() => confirmPO(p.id)}>Mark confirmed</Btn>;
  if (RECEIVABLE.includes(p.status)) return <Btn size={size} kind="secondary" icon={I.scan} onClick={() => nav("Purchasing", "receiving", { "purchasing.po": p.id })}>Receive</Btn>;
  if (p.status === "Received") return <Btn size={size} kind="ghost" onClick={() => closePO(p.id)}>Close</Btn>;
  return null;
}

export default function POs() {
  const s = useHogan();
  const [f, setF] = useUi<string>("purchasing.poFilter", "all");
  const [q, setQ] = useState("");
  const awaiting = s.pos.filter(p => p.status === "Awaiting approval");
  const sets: Record<string, (p: D.PurchaseOrder) => boolean> = {
    all: () => true,
    open: poOpen,
    approval: p => p.status === "Awaiting approval" || p.status === "Draft",
    late: p => poLateDays(p) > 0,
    receiving: p => RECEIVABLE.includes(p.status),
    done: p => p.status === "Received" || p.status === "Closed",
  };
  const pick = sets[f] || sets.all;
  const rows = s.pos.filter(pick).filter(p => match(q, p.id, supName(p.supplier), p.status, ...p.lines.map(l => l.sku)));
  const openValue = s.pos.filter(poOpen).reduce((a, p) => a + D.poValue(p), 0);

  const cols: Col<D.PurchaseOrder>[] = [
    { key: "id", label: "PO", w: "74px", sort: p => p.id, render: p => <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12.5 }}>{p.id}</span> },
    { key: "sup", label: "Supplier", w: "minmax(170px,1.5fr)", sort: p => supName(p.supplier), render: p => <Two a={supName(p.supplier)} b={p.lines.map(l => l.qty + " × " + l.sku).join(" · ") + " · by " + (D.staffById(p.raisedBy)?.first || p.raisedBy)} /> },
    { key: "status", label: "Status", w: "128px", sort: p => p.status, render: p => <Status s={p.status} /> },
    { key: "value", label: "Value", w: "88px", align: "right", sort: p => D.poValue(p), render: p => <span style={{ color: "var(--ink)" }}>{eur(D.poValue(p))}</span> },
    { key: "created", label: "Raised", w: "72px", sort: p => p.created, render: p => date(p.created, false) },
    { key: "exp", label: "Expected", w: "112px", sort: p => p.expected, render: p => {
      const late = poLateDays(p);
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{p.expected === TODAY && poOpen(p) ? "Today" : date(p.expected, false)}{late > 0 && <Badge tone="bad" style={{ height: 19, padding: "0 7px", fontSize: 10.5 }}>{late}d late</Badge>}</span>;
    } },
    { key: "rec", label: "Received", w: "104px", sort: p => poReceived(p) / Math.max(1, poOrdered(p)), render: p => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Progress value={poReceived(p)} max={poOrdered(p)} h={5} tone={poReceived(p) >= poOrdered(p) ? "ok" : poReceived(p) ? "warn" : "accent"} style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{poReceived(p)}/{poOrdered(p)}</span>
      </div>
    ) },
    { key: "match", label: "Invoice", w: "120px", sort: p => matchState(p, s).label, render: p => { const m = matchState(p, s); return <Badge tone={m.tone}>{m.label}</Badge>; } },
    { key: "act", label: "", w: "180px", align: "right", render: p => <div onClick={e => e.stopPropagation()} style={{ display: "inline-flex" }}><POAction p={p} /></div> },
  ];

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Purchase orders"
          sub={plural(s.pos.filter(poOpen).length, "open PO") + " worth " + eur(openValue) + " including freight. Orders over " + eur(APPROVAL_LIMIT) + " need Graham's sign-off."}
          right={<Btn kind="primary" icon={I.plus} onClick={() => nav("Purchasing", "reorder")}>Draft from reorder list</Btn>} />

        {awaiting.map(p => {
          const ap = poApproval(p.id, s);
          return (
            <Card key={p.id} tone="accent">
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 360px", minWidth: 0 }}>
                  <Row gap={8} wrap>
                    <Badge tone="warn">Awaiting Graham's approval</Badge>
                    <span style={{ fontSize: 15, fontWeight: 600 }}><span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{p.id}</span> · {supName(p.supplier)}</span>
                  </Row>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>
                    {plural(p.lines.length, "line")} · {eur(D.poValue(p))} incl. {eur(p.freight)} freight · raised by {D.staffById(p.raisedBy)?.name} {date(p.created, false)} · expected {date(p.expected, false)}. {ap?.detail || p.note}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {p.lines.map(l => <Badge key={l.sku}>{l.qty} × {l.sku} · {D.productBySku(l.sku)?.name} · {eur(l.qty * l.cost)}</Badge>)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
                  <Btn kind="primary" icon={I.check} onClick={() => approvePO(p.id)}>Approve as Graham</Btn>
                  <Row gap={8}>
                    <Btn kind="secondary" size="sm" onClick={() => sendBackPO(p.id)}>Send back</Btn>
                    <Btn kind="ghost" size="sm" onClick={() => openRecord("po", p.id)}>Details</Btn>
                  </Row>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Approving records Graham's decision in Pulse and marks the PO as sent. Pulse does not transmit POs to suppliers; that link is not connected.</div>
            </Card>
          );
        })}

        <Card title="All purchase orders" sub={rows.length + " of " + s.pos.length + " shown"} flush
          right={<SearchBox value={q} onChange={setQ} placeholder="PO, supplier or SKU" style={{ minWidth: 0, width: 220 }} />}>
          <Row gap={6} wrap style={{ padding: "0 18px 12px" }}>
            {([["all", "All"], ["open", "Open"], ["approval", "Drafts and approvals"], ["late", "Late"], ["receiving", "To receive"], ["done", "Received and closed"]] as [string, string][]).map(([k, lbl]) => (
              <Chip key={k} active={f === k} onClick={() => setF(k)} count={s.pos.filter(sets[k]).length}>{lbl}</Chip>
            ))}
          </Row>
          <Table cols={cols} rows={rows} rowKey={p => p.id} onRow={p => openRecord("po", p.id)} minWidth={1040} dense initialSort={{ key: "id", dir: -1 }}
            highlight={p => poLateDays(p) > 0 || p.status === "Awaiting approval"}
            footer="Fictional demo purchase orders. Supplier systems and the ERP are not connected: statuses here are updated by hand in the demo." />
        </Card>
      </Stack>
    </Page>
  );
}
