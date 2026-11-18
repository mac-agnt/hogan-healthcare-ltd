/* Orders · record drawer views: sales order, return, loan set. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, eur, plural } from "../../fmt";
import { nav, openRecord, orderById, orderProgress, useHogan, useUi } from "../../store";
import { Badge, Btn, Empty, I, Notice, Person, RecLink, RecordHead, RecordSection, Row, Status, Steps, TextInput, Timeline, label } from "../../ui";
import { CheckMark, KVGrid } from "./kit";
import { COURIERS, accName, bookCourier, clean, whenDecided, confirmDelivery, createdOf, daysLate, dispatchNow, followUpIssue, orderMargin, poMissing, releaseIssue, requiredLabel, stockFor } from "./common";
import { ReturnActions, creditApproval, returnFrom, returnSteps, returnValue } from "./Returns";
import { SetAction, hospitalOf, setFlags, whereIs } from "./LoanSets";

function History({ refId }: { refId: string }) {
  const s = useHogan();
  const ev = s.events.filter(e => e.ref === refId).slice(0, 10);
  if (!ev.length) return <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No activity recorded yet.</div>;
  return <Timeline dense items={ev.map(e => ({ when: (e.date === TODAY ? "Today" : date(e.date, false)) + " · " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: e.stream === "ai" ? "accent" : e.status === "completed" ? "ok" : "warn", icon: e.stream === "ai" ? I.agent : undefined }))} />;
}

const ORDER_STEPS: D.OrderStatus[] = ["Confirmed", "Picking", "Packed", "Awaiting courier", "Dispatched", "Delivered"];

export function OrderRecord({ id }: { id: string }) {
  const s = useHogan();
  const [courier] = useUi<string>("orders.courier", COURIERS[0]);
  const [po, setPo] = useState("");
  const o = orderById(id, s);
  if (!o) return <Empty title={"Order " + id + " not found"} />;
  const acc = D.accountById(o.account);
  const prog = orderProgress(o);
  const m = orderMargin(o);
  const idx = ORDER_STEPS.indexOf(o.status);
  const poIssue = poMissing(o);
  const late = daysLate(o);

  return (
    <div>
      <RecordHead kind="Sales order" title={<>{o.id} · {acc?.name || o.account}</>} status={o.status}
        sub={<>Created {date(createdOf(o))} · required {requiredLabel(o).toLowerCase() === "today" ? "today" : requiredLabel(o)}{late ? " (" + late + " days past)" : ""} · {poIssue ? "hospital PO not received" : "hospital PO " + o.poRef}</>} />

      <Row gap={8} wrap style={{ marginTop: 16 }}>
        {(o.status === "Confirmed" || o.status === "Picking") && <Btn kind="primary" icon={I.scan} onClick={() => nav("Orders", "picking", { "orders.pick": o.id })}>Open in Picking · {prog.scanned}/{prog.total}</Btn>}
        {o.status === "Packed" && <><Btn kind="primary" icon={I.truck} onClick={() => dispatchNow(o.id, courier)}>Dispatch · {o.courier || courier}</Btn><Btn kind="secondary" onClick={() => bookCourier(o.id, o.courier || courier)}>Book courier</Btn></>}
        {o.status === "Awaiting courier" && <Btn kind="primary" icon={I.truck} onClick={() => dispatchNow(o.id, courier)}>Collected · dispatch</Btn>}
        {o.status === "Dispatched" && <Btn kind="primary" icon={I.check} onClick={() => confirmDelivery(o.id)}>Confirm delivery</Btn>}
        <Btn kind="ghost" icon={I.hospital} onClick={() => openRecord("account", o.account)}>Account</Btn>
      </Row>

      {o.status === "Issue" && (
        <Notice tone="bad" title="On hold" style={{ marginTop: 16 }}>
          {o.issue}
          {poIssue && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <TextInput value={po} onChange={setPo} placeholder="Hospital PO number, e.g. HPO-80312" style={{ flex: "1 1 200px" }} onEnter={() => po.trim() && releaseIssue(o.id, "Hospital PO " + po.trim() + " received. Released for dispatch.", po.trim())} />
              <Btn kind="primary" disabled={!po.trim()} onClick={() => releaseIssue(o.id, "Hospital PO " + po.trim() + " received. Released for dispatch.", po.trim())}>Record PO and release</Btn>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {!poIssue && <Btn size="sm" kind="primary" onClick={() => releaseIssue(o.id, "Customer accepted the short line. Released for dispatch.")}>Customer accepts: release</Btn>}
            <Btn size="sm" kind="secondary" onClick={() => followUpIssue(o.id)}>Keep on hold, follow up tomorrow</Btn>
          </div>
        </Notice>
      )}

      <KVGrid style={{ marginTop: 16 }} items={[
        ["Customer", <RecLink type="account" id={o.account}>{acc?.name}</RecLink>],
        ["Value ex VAT", eur(m.value)],
        ["Est. margin", m.pct.toFixed(1) + "%"],
        ["Owner", D.staffById(o.owner)?.name || o.owner],
        ["Courier", o.courier || "Not booked"],
        ["Tracking", o.tracking || (o.status === "Awaiting courier" ? "On collection" : "None yet")],
      ]} />

      <RecordSection title="Status">
        {o.status === "Issue" ? <Badge tone="bad">On hold: progress paused at {o.lines.every(l => l.scanned) ? "Packed" : "Picking"}</Badge>
          : <div style={{ overflowX: "auto", paddingBottom: 4 }}><Steps steps={ORDER_STEPS.map((st, i) => ({ label: st, done: i < idx || o.status === "Delivered", active: i === idx && o.status !== "Delivered" }))} /></div>}
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
          {o.dispatched ? "Dispatched " + date(o.dispatched) + (o.courier ? " with " + o.courier : "") + ". " : ""}
          {o.delivered ? "Delivered " + date(o.delivered) + ". " : ""}
          {o.note || ""}
        </div>
      </RecordSection>

      <RecordSection title={"Lines · " + prog.scanned + "/" + prog.total + " scanned"} right={<span style={{ ...label, fontSize: 9 }}>{plural(o.lines.reduce((a, l) => a + l.qty, 0), "unit")}</span>}>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", overflow: "hidden" }}>
          {o.lines.map((l, i) => {
            const p = D.productBySku(l.sku);
            const sl = stockFor(l, s);
            return (
              <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderTop: i ? "1px solid var(--border)" : undefined }}>
                <CheckMark ok={l.scanned ? true : null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <RecLink type="product" id={l.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.sku}</RecLink> <span style={{ color: "var(--ink)" }}>{p?.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
                    {l.serial ? <>Serial {l.serial}</> : l.lot ? <>Lot <RecLink type="lot" id={l.sku + "|" + l.lot}>{l.lot}</RecLink></> : (l.needs === "serial" || p?.tracking === "serial") ? "Serial captured at picking" : "Lot captured at picking"}
                    {sl?.expiry ? " · exp " + date(sl.expiry) : ""}{!l.scanned ? " · not scanned" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{l.qty} × {eur(l.price)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{eur(l.qty * l.price)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </RecordSection>

      <RecordSection title="History"><History refId={o.id} /></RecordSection>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 18, lineHeight: 1.5 }}>Fictional demo order. Tracking numbers are demo references; courier and ERP connections are not verified.</div>
    </div>
  );
}

export function ReturnRecord({ id }: { id: string }) {
  const s = useHogan();
  const r = s.returns.find(x => x.id === id);
  if (!r) return <Empty title={"Return " + id + " not found"} />;
  const p = D.productBySku(r.sku);
  const ap = creditApproval(r, s);
  const lotLine = s.stock.find(l => l.sku === r.sku && l.lot === r.lot && l.expiry);
  const moves = s.movements.filter(m => m.ref === r.id);
  return (
    <div>
      <RecordHead kind="Return" title={<>{r.id} · {returnFrom(r)}</>} status={r.status} sub={r.reason + " · raised " + date(r.raised)} />
      <div style={{ marginTop: 16 }}><ReturnActions r={r} s={s} size="md" /></div>
      <KVGrid style={{ marginTop: 16 }} items={[
        ["Product", <><RecLink type="product" id={r.sku}>{r.sku}</RecLink> {p?.name}</>],
        ["Quantity", plural(r.qty, "unit")],
        ["Lot", <RecLink type="lot" id={r.sku + "|" + r.lot}>{r.lot}</RecLink>],
        ["Expiry", lotLine?.expiry ? date(lotLine.expiry) : "Not on file"],
        ["From", r.account === "DLM" ? "Main stockroom" : <RecLink type="account" id={r.account}>{accName(r.account)}</RecLink>],
        ["Value at list", eur(returnValue(r))],
      ]} />
      <RecordSection title="Flow"><div style={{ overflowX: "auto" }}><Steps steps={returnSteps(r)} /></div></RecordSection>
      <RecordSection title="Credit note">
        {ap ? (
          <Notice tone={ap.status === "Awaiting" ? "warn" : ap.status === "Approved" ? "ok" : "bad"} title={ap.title}>
            {ap.detail} {ap.status === "Awaiting" ? "Waiting for Graham." : ap.status + (ap.decidedAt ? " " + whenDecided(ap.decidedAt) : "") + "."} Value {eur(ap.value || 0)}.
            <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--dim)" }}>Approval is recorded in Pulse only. The credit note itself is raised in the accounts system, which is not connected.</div>
          </Notice>
        ) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{r.credit ? "Credit " + r.credit + "." : r.account === "DLM" ? "Internal return: no customer credit." : "No credit note requested yet."}</div>}
      </RecordSection>
      {moves.length > 0 && (
        <RecordSection title="Stock movements">
          {moves.map(m => <div key={m.id} style={{ fontSize: 12.5, color: "var(--body)", padding: "4px 0" }}><RecLink type="movement" id={m.id}>{m.id}</RecLink> · {m.type} · {m.qty} × {m.sku} · {m.from} to {whereIs(m.to)} · {date(m.date, false)} {m.time}</div>)}
        </RecordSection>
      )}
      <RecordSection title="History"><History refId={r.id} /></RecordSection>
    </div>
  );
}

export function LoanSetRecord({ id }: { id: string }) {
  const s = useHogan();
  const l = s.loanSets.find(x => x.id === id);
  if (!l) return <Empty title={"Loan set " + id + " not found"} />;
  const f = setFlags(l);
  const tasks = s.tasks.filter(t => t.related?.id === l.id);
  const qx = s.qx.filter(q => q.ref === l.id);
  return (
    <div>
      <RecordHead kind="Loan set" title={<>{l.id} · {l.name}</>} status={l.status} sub={(hospitalOf(l) ? hospitalOf(l) + " · " : "") + "now at " + whereIs(l.location) + " · " + l.inspection} />
      <Row gap={8} wrap style={{ marginTop: 16 }}>
        <SetAction l={l} size="md" onAllocate={() => nav("Orders", "loansets", { "orders.loanForm": { account: "A-HAR", date: addDays(TODAY, 6), ...(s.ui["orders.loanForm"] || {}), set: l.id } })} />
        {f && <Badge tone={f.tone}>{f.text}</Badge>}
      </Row>
      <KVGrid style={{ marginTop: 16 }} items={[
        ["Hospital", l.requestedBy ? <RecLink type="account" id={l.requestedBy}>{hospitalOf(l)}</RecLink> : "Not allocated"],
        ["Procedure date", l.procedureDate ? date(l.procedureDate) : "None"],
        ["Dispatch by", l.dispatchBy ? date(l.dispatchBy) : "None"],
        ["Return by", l.returnBy ? date(l.returnBy) : "None"],
        ["Location", whereIs(l.location)],
        ["Inspection", l.inspection],
      ]} />
      <RecordSection title={"Contents · " + plural(l.components.reduce((a, c) => a + c.n, 0), "item")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
          {l.components.map(c => (
            <div key={c.k} style={{ padding: "9px 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.n}</span>
              <span style={{ fontSize: 12.5, color: "var(--body)" }}>{clean(c.k)}</span>
            </div>
          ))}
        </div>
      </RecordSection>
      {(tasks.length > 0 || qx.length > 0) && (
        <RecordSection title="Linked work">
          {tasks.map(t => <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5 }}><RecLink type="task" id={t.id} /> {t.title} <Status s={t.status} /></div>)}
          {qx.map(q => <div key={q.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5 }}><RecLink type="qx" id={q.id} /> {q.title} <Status s={q.status} /></div>)}
        </RecordSection>
      )}
      <RecordSection title="Owner"><Person id={l.owner} /></RecordSection>
      <RecordSection title="History"><History refId={l.id} /></RecordSection>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 18, lineHeight: 1.5 }}>Hospital and procedure date only. Pulse holds no patient details for loan sets.</div>
    </div>
  );
}
