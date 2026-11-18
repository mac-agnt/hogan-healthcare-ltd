/* Finance · Receivables. Every customer invoice with age, owner, reminder
   history and a suggested next step. The focus panel shows the selected
   invoice with an AI-drafted reminder that Margaret checks and sends. */

import { useState } from "react";
import * as D from "../../data";
import { matchBank, openRecord, sendReminder, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Chip, I, Kpi, Notice, Page, PageHeader, RecLink, SearchBox, Seg, Table, TONE, match, type Col } from "../../ui";
import { TODAY, date, daysUntil, eur, eurK } from "../../fmt";
import { AGE_BUCKETS, accName, arAgeing, arSummary, bankHints, daysOver, invoiceAdvice, partPayments, sum } from "./derive";
import { sendReminders } from "./actions";
import { InvoiceDetail } from "./records";
import { DaysBadge, Kit, Kpis, Reconciles, Split, Src } from "./kit";

type View = "overdue" | "soon" | "open" | "paid" | "all";

function Ageing({ onPick }: { onPick: (v: View) => void }) {
  const s = useHogan();
  const b = arAgeing(s).filter(x => x.amount > 0 || x.k === "current" || x.k === "1-30");
  const total = sum(b.map(x => x.amount));
  return (
    <Card title="Ageing" sub="Outstanding customer invoices by days past due. Click a band to filter the list." right={<Src k="erp" />}>
      <div style={{ display: "flex", height: 14, borderRadius: 14, overflow: "hidden", gap: 2, background: "var(--track)" }}>
        {b.filter(x => x.amount > 0).map((x, i) => (
          <div key={x.k} title={x.label + ": " + eur(x.amount)} style={{ width: (x.amount / total) * 100 + "%", background: x.color, transformOrigin: "left", animation: "sweep .7s var(--ease) both", animationDelay: i * 60 + "ms" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(140px,100%),1fr))", gap: 8, marginTop: 12 }}>
        {b.map(x => (
          <button key={x.k} onClick={() => onPick(x.k === "current" ? "open" : "overdue")} className="ixx"
            style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,11px)", transition: "transform .2s var(--ease),border-color .2s var(--ease)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--dim)" }}><span style={{ width: 8, height: 8, borderRadius: 3, background: x.color }} />{x.label}</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{eur(x.amount)}</div>
            <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{x.count} invoice{x.count === 1 ? "" : "s"}</div>
          </button>
        ))}
      </div>
      <Reconciles ok={total === arSummary(s).total} style={{ marginTop: 10 }}>Bands add up to {eur(total)} outstanding: {eur(arSummary(s).overdueTotal)} overdue and {eur(arSummary(s).openTotal)} not yet due.</Reconciles>
    </Card>
  );
}

export default function Receivables() {
  const s = useHogan();
  const ar = arSummary(s);
  const [focus, setFocus] = useUi<string>("finance.arFocus", ar.overdue[0]?.id || "INV-6128");
  const [view, setView] = useUi<View>("finance.arView", "overdue");
  const [never, setNever] = useUi<boolean>("finance.arNever", false);
  const [q, setQ] = useState("");

  const base = s.invoices.filter(i =>
    view === "overdue" ? i.status === "Overdue" : view === "soon" ? i.status === "Open" && daysUntil(i.due) <= 7
      : view === "open" ? i.status === "Open" : view === "paid" ? i.status === "Paid" : true);
  const rows = base.filter(i => (!never || (i.status === "Overdue" && i.reminders === 0)) && match(q, i.id, accName(i.account), i.amount));
  const neverRows = rows.filter(i => i.status === "Overdue" && i.reminders === 0);
  const fi = s.invoices.find(i => i.id === focus) || ar.overdue[0];

  const cols: Col<D.Invoice>[] = [
    { key: "id", label: "Invoice", title: "Invoice number and owner", w: "100px", sort: r => r.id, render: r => <>
      <RecLink type="invoice" id={r.id} />
      <div title={"Owner: " + (D.staffById(r.owner)?.name || r.owner)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11, color: "var(--faint)" }}><Avatar id={r.owner} size={14} />{D.staffById(r.owner)?.first}</div>
    </> },
    { key: "acc", label: "Customer", w: "minmax(140px,1.6fr)", sort: r => accName(r.account), render: r => (
      <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }} title={accName(r.account)}>{accName(r.account)}</div>
        <div style={{ fontSize: 11, color: "var(--faint)" }}>Issued {date(r.issued, false)} · due {date(r.due, false)}</div></div>) },
    { key: "amt", label: "Amount", w: "92px", align: "right", sort: r => r.amount, render: r => {
      const pp = partPayments(r, s);
      return <><b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(r.amount)}</b>{pp.length > 0 && <div style={{ fontSize: 10.5, color: "var(--ok)" }}>{eurK(sum(pp.map(t => t.amount)))} part paid</div>}</>;
    } },
    { key: "due", label: "Overdue", w: "94px", align: "center", sort: r => (r.status === "Paid" ? -999 : r.status === "Open" ? -daysUntil(r.due) : daysOver(r)), render: r =>
      r.status === "Overdue" ? <DaysBadge days={daysOver(r)} suffix=" days" /> : r.status === "Paid" ? <Badge tone="ok">Paid</Badge> : <span style={{ fontSize: 11.5, color: "var(--dim)" }}>in {daysUntil(r.due)}d</span> },
    { key: "adv", label: "Next step", w: "minmax(150px,1.4fr)", sort: r => r.reminders, render: r => {
      const a = invoiceAdvice(r, s);
      return <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: a.tone === "neutral" ? "var(--dim)" : TONE[a.tone].fg, lineHeight: 1.35 }}>{a.text}</div>
        {r.status !== "Paid" && <div style={{ fontSize: 11, color: r.status === "Overdue" && !r.reminders ? "var(--warn)" : "var(--faint)", marginTop: 2 }}>{r.reminders ? r.reminders + " sent · last " + (r.lastReminder === TODAY ? "today" : date(r.lastReminder || "", false)) : "No reminder yet"}</div>}
      </div>;
    } },
    { key: "act", label: "", w: "100px", align: "right", render: r => {
      const a = invoiceAdvice(r, s);
      const h = bankHints(r, s);
      if (a.kind === "match" && h.suggested) return <Btn size="sm" kind="accent" onClick={e => { e.stopPropagation(); matchBank(h.suggested!.id, r.id); }} title="Margaret's action. Marks the invoice paid in the demo.">Match</Btn>;
      if (r.status !== "Overdue") return null;
      const today = r.lastReminder === TODAY;
      return <Btn size="sm" kind={a.kind === "remind" ? "secondary" : "ghost"} disabled={today}
        onClick={e => { e.stopPropagation(); sendReminder(r.id, "MD"); }} title="Margaret's action. Logs a reminder; the demo sends nothing.">{today ? "Sent" : "Remind"}</Btn>;
    } },
  ];

  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Receivables" title="Receivables"
          sub="Customer invoices, ageing and reminders. Pulse drafts reminders and suggests the next step; Margaret decides and sends. In this demo nothing is emailed."
          right={<Src k="erp" />} />
        <Kpis>
          <Kpi label="Overdue" value={eur(ar.overdueTotal)} tone="warn" sub={ar.overdue.length + " invoices · oldest " + (ar.oldest ? daysOver(ar.oldest) + " days" : "none")} onClick={() => { setView("overdue"); setNever(false); }} />
          <Kpi label="Not yet due" value={eur(ar.openTotal)} sub={ar.open.length + " invoices · " + ar.dueSoon.length + " due in 7 days"} onClick={() => { setView("open"); setNever(false); }} />
          <Kpi label="Total receivables" value={eur(ar.total)} sub={(ar.overdue.length + ar.open.length) + " open invoices"} onClick={() => { setView("all"); setNever(false); }} />
          <Kpi label="Collected this month" value={eur(ar.paidMonthTotal)} tone="ok" sub={ar.paidMonth.length + " invoices paid since 1 Nov"} onClick={() => { setView("paid"); setNever(false); }} />
          <Kpi label="No reminder yet" value={ar.never.length} tone={ar.never.length ? "warn" : "ok"} sub={eur(ar.neverTotal) + " overdue, never chased"} onClick={() => { setView("overdue"); setNever(true); }} />
        </Kpis>
        <Ageing onPick={v => { setView(v); setNever(false); }} />
        <Split k="side">
          <Card flush title="Invoices" sub="Click a row to show it in the invoice panel. The invoice number opens the full record.">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "0 16px 12px" }}>
              <SearchBox value={q} onChange={setQ} placeholder="Invoice or customer" style={{ minWidth: 0, width: 190, flex: "1 1 160px", maxWidth: 240 }} />
              <Seg size="sm" value={view} onChange={setView} items={[
                ["overdue", "Overdue", ar.overdue.length], ["soon", "Due in 7 days", ar.dueSoon.length], ["open", "Not yet due", ar.open.length],
                ["paid", "Paid", s.invoices.filter(i => i.status === "Paid").length], ["all", "All", s.invoices.length]]} />
              <Chip active={never} onClick={() => setNever(!never)} count={ar.never.length}>No reminder yet</Chip>
            </div>
            {never && neverRows.length > 0 && (
              <div style={{ padding: "0 16px 12px" }}>
                <Notice tone="warn" title={neverRows.length + " overdue invoices have had no reminder (" + eur(sum(neverRows.map(i => i.amount))) + ")"}
                  right={<Btn size="sm" kind="primary" icon={I.mail} onClick={() => sendReminders(neverRows.map(i => i.id))} title="Margaret's action. Logs a first reminder on each invoice; nothing is emailed in the demo.">Send {neverRows.length} first reminders</Btn>}>
                  One click logs a first reminder against each, using the Finance Agent's standard draft. Margaret's decision; nothing is emailed in the demo.
                </Notice>
              </div>
            )}
            <Table cols={cols} rows={rows} rowKey={r => r.id} onRow={r => setFocus(r.id)} highlight={r => r.id === fi?.id} minWidth={672}
              initialSort={{ key: "amt", dir: -1 }}
              footer={<>{rows.length} invoices · {eur(sum(rows.map(r => r.amount)))}</>}
              empty={<div style={{ padding: 20, fontSize: 12.5, color: "var(--dim)" }}>No invoices match. Try another filter.</div>} />
          </Card>
          {fi ? (
            <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>{fi.id}<Badge tone={fi.status === "Overdue" ? "warn" : fi.status === "Paid" ? "ok" : "neutral"}>{fi.status === "Overdue" ? daysOver(fi) + " days overdue" : fi.status}</Badge></span>}
              sub={accName(fi.account) + " · " + eur(fi.amount)} style={{ position: "sticky", top: 12 }}
              right={<Btn size="sm" kind="ghost" icon={I.external} onClick={() => openRecord("invoice", fi.id)} title="Open the full record" />}>
              <InvoiceDetail id={fi.id} variant="panel" />
            </Card>
          ) : <Card title="No invoice selected">Pick an invoice from the list.</Card>}
        </Split>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
          Ageing bands: {AGE_BUCKETS.map(b => b.label).join(", ")}. Invoice data would come from the current ERP or Xero; the connection is not yet verified.
        </div>
      </Kit>
    </Page>
  );
}
