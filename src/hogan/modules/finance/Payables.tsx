/* Finance · Payables. Supplier bills, the three exceptions that need Margaret
   (with the three-way match laid out), what is ready for the payment run, and
   supplier spend. Bills are held or queried here; payments happen in the bank. */

import * as D from "../../data";
import { createBillReviewTask, nav, openRecord, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Grid, I, Icon, Kpi, Page, PageHeader, RecLink, Seg, Status, Table, label, type Col } from "../../ui";
import { HBars } from "../../charts";
import { date, daysUntil, eur, eurK } from "../../fmt";
import { MONTH_START, apSummary, billVariance, billsByWeek, isException, purchaseCosts, sum } from "./derive";
import { raiseTask, requestCreditNote } from "./actions";
import { DaysBadge, Kit, Kpis, Reconciles, Split, Src } from "./kit";

const supName = (id: string) => D.supplierById(id)?.name || id;

function MatchStrip({ b }: { b: D.Bill }) {
  const s = useHogan();
  const variance = billVariance(b, s);
  const extra = (b.invoicedQty || 0) - (b.expectedQty || 0);
  const cell = (k: string, ref: { type: string; id: string } | null, qty: number | undefined, warn?: boolean) => (
    <div style={{ flex: 1, minWidth: 0, padding: "9px 10px", borderRadius: "var(--r-sm,10px)", background: warn ? "var(--warn-soft)" : "var(--surface-2)", border: "1px solid " + (warn ? "var(--warn-soft)" : "var(--border)") }}>
      <div style={{ ...label, fontSize: 8.5 }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 3, color: warn ? "var(--warn)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{qty ?? "?"}</div>
      {ref ? <RecLink type={ref.type} id={ref.id} style={{ fontSize: 11.5 }} /> : <span style={{ fontSize: 11.5, color: "var(--faint)" }}>None</span>}
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        {cell("Ordered", b.po ? { type: "po", id: b.po } : null, b.expectedQty)}
        {cell("Received", b.grn ? { type: "grn", id: b.grn } : null, b.expectedQty)}
        {cell("Billed", { type: "bill", id: b.id }, b.invoicedQty, true)}
      </div>
      {variance > 0 && extra > 0 && <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 9 }}>
        {extra} units × {eur(variance / extra)} = <b style={{ color: "var(--warn)", fontWeight: 600 }}>{eur(variance)}</b> billed but never delivered. Undisputed: {eur(b.amount - variance)}.
      </div>}
    </div>
  );
}

function ExceptionCard({ b }: { b: D.Bill }) {
  const s = useHogan();
  const tasks = s.tasks.filter(t => t.related?.id === b.id && t.status !== "Done");
  const notes = s.agentNotes.filter(n => n.ref === b.id).slice(0, 2);
  const reviewing = b.status === "Under review";
  const qty = !!(b.invoicedQty && b.expectedQty);
  return (
    <Card tone="warn" title={<span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><RecLink type="bill" id={b.id} style={{ fontSize: 14.5, fontWeight: 600 }} /><Status s={b.status} /></span>}
      sub={<><RecLink type="supplier" id={b.supplier}>{supName(b.supplier)}</RecLink> · {eur(b.amount)} · due {date(b.due, false)}</>}
      right={<Avatar id={b.owner} size={22} />}>
      {qty ? <MatchStrip b={b} /> : <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>{b.detail}</div>}
      {qty && b.detail && <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5, marginTop: 8 }}>{b.detail}</div>}
      {notes.map((n, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 12, color: "var(--body)", lineHeight: 1.5 }}>
          <Avatar id={"agent:" + n.agent} size={20} />
          <span><b style={{ fontWeight: 600 }}>{n.agent === "finance" ? "Finance Agent" : "Purchasing Agent"}</b> · {n.time}: {n.text}</span>
        </div>
      ))}
      {tasks.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {tasks.map(t => (
            <button key={t.id} onClick={() => openRecord("task", t.id)} className="ixa" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 11.5, cursor: "pointer" }}>
              <Icon d={I.check} size={11} />{t.id} · {D.staffById(t.owner)?.first} · {t.status}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {b.status === "Quantity discrepancy" && <Btn size="sm" kind="primary" icon={I.check} onClick={() => createBillReviewTask(b.id)} title="Margaret's action. Holds the bill, creates her review task and asks Graham to approve holding the disputed amount. Nothing is paid or posted.">Start review and hold</Btn>}
        {b.status === "Price variance" && <Btn size="sm" kind="primary" onClick={() => requestCreditNote(b.id)} title="Margaret's action. Holds the bill and creates a task to chase the credit note.">Request credit note</Btn>}
        {b.status === "No matching receipt" && (tasks.some(t => t.owner === "JC")
          ? <Badge tone="warn">Waiting on John for the PO</Badge>
          : <Btn size="sm" kind="primary" onClick={() => raiseTask({ title: "Find the PO or goods receipt for " + b.id, owner: "JC", dueIn: 2, ref: { type: "bill", id: b.id, label: b.id + " · " + supName(b.supplier) }, note: b.detail })} title="Creates a task for John. The bill stays held until it matches.">Ask John for the PO</Btn>)}
        {reviewing && <Badge tone="warn">Held from the payment run</Badge>}
        <Btn size="sm" kind="ghost" onClick={() => openRecord("bill", b.id)}>Open bill</Btn>
        <Btn size="sm" kind="ghost" onClick={() => nav("Purchasing", "exceptions")}>In Purchasing</Btn>
      </div>
    </Card>
  );
}

function RunPlanner() {
  const s = useHogan();
  const weeks = billsByWeek(s);
  return (
    <Card title="Payment run planner" sub="Unpaid bills by the week they fall due. Held bills stay out of the run until resolved." right={<Src k="erp" />}>
      <div className="hk-list">
        {weeks.map(w => {
          const held = w.bills.filter(isException);
          return (
            <div key={w.w} style={{ padding: "10px 2px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>w/c {date(w.w, false)}</span>
                <span style={{ fontSize: 11.5, color: "var(--faint)", flex: 1 }}>in {Math.max(0, daysUntil(w.w))} days</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(w.amount)}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {w.bills.map(b => (
                  <button key={b.id} onClick={() => openRecord("bill", b.id)} className="ixa" title={supName(b.supplier) + " · " + b.status}
                    style={{ height: 24, padding: "0 9px", borderRadius: 999, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                      border: "1px solid " + (isException(b) ? "var(--warn-soft)" : "var(--border)"), background: isException(b) ? "var(--warn-soft)" : "var(--surface-2)", color: isException(b) ? "var(--warn)" : "var(--body)" }}>
                    {b.id} · {eurK(b.amount)}
                  </button>
                ))}
              </div>
              {held.length > 0 && <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 6 }}>{eur(sum(held.map(b => b.amount)))} held pending resolution</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SupplierSpend() {
  const sup = D.SUPPLIERS.slice().sort((a, b) => b.ytdSpend - a.ytdSpend);
  return (
    <Card title="Supplier spend this year" sub="Year-to-date purchases, payment terms and on-time delivery by supplier." right={<Src k="erp" />}>
      <HBars fmt={eur} onRow={i => openRecord("supplier", sup[i].id)}
        data={sup.map((x, i) => ({ label: x.name, value: x.ytdSpend, color: i < 3 ? "#267985" : "#9FB5D9", sub: x.terms + " · " + x.onTime + "% on time", right: eurK(x.ytdSpend) }))} />
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>{sup.filter(x => !x.fictional).map(x => x.name.split(" ")[0]).join(", ")} are real names; every figure shown is fictional. Other suppliers are invented for the demo.</div>
    </Card>
  );
}

export default function Payables() {
  const s = useHogan();
  const ap = apSummary(s);
  const pc = purchaseCosts(s);
  const [view, setView] = useUi<"all" | "ex" | "ready" | "paid">("finance.apView", "all");
  const exAll = s.bills.filter(isException);
  const rows = s.bills.filter(b => view === "ex" ? isException(b) : view === "ready" ? b.status !== "Paid" && !isException(b) : view === "paid" ? b.status === "Paid" : true);
  const cols: Col<D.Bill>[] = [
    { key: "id", label: "Bill", title: "Bill, owner and date received", w: "100px", sort: b => b.date, render: b => <><RecLink type="bill" id={b.id} /><div title={"Received " + date(b.date) + ". Owner: " + (D.staffById(b.owner)?.name || b.owner)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11, color: "var(--faint)" }}><Avatar id={b.owner} size={14} />{date(b.date, false)}</div></> },
    { key: "sup", label: "Supplier", w: "minmax(120px,1.4fr)", sort: b => supName(b.supplier), render: b => <span style={{ display: "block", lineHeight: 1.35, color: "var(--ink)" }}>{supName(b.supplier)}</span> },
    { key: "po", label: "PO", title: "Purchase order and goods receipt", w: "minmax(100px,1fr)", render: b => b.po ? <span style={{ lineHeight: 1.4 }}><RecLink type="po" id={b.po} />{b.grn && <> · <RecLink type="grn" id={b.grn} /></>}</span> : <span style={{ color: isException(b) ? "var(--warn)" : "var(--faint)", fontSize: 12 }}>{isException(b) ? "No PO" : "None"}</span> },
    { key: "due", label: "Due", w: "104px", sort: b => b.due, render: b => b.status === "Paid" ? <span style={{ fontSize: 12.5, color: "var(--faint)" }}>{date(b.due, false)}</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12.5 }}>{date(b.due, false)}</span><DaysBadge days={daysUntil(b.due)} mode="due" /></span> },
    { key: "amt", label: "Amount", w: "88px", align: "right", sort: b => b.amount, render: b => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(b.amount)}</b> },
    { key: "st", label: "Status", w: "164px", sort: b => b.status, render: b => <Status s={b.status} style={{ fontSize: 11, padding: "0 8px" }} /> },
  ];
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Payables" title="Payables"
          sub="Supplier bills checked against purchase orders and goods receipts. Pulse flags mismatches; Margaret resolves them. Payments are made in the bank, never from Pulse."
          right={<Btn size="sm" icon={I.box} onClick={() => nav("Purchasing", "exceptions")}>Purchasing exceptions</Btn>} />
        <Kpis>
          <Kpi label="Bills outstanding" value={eur(ap.openTotal)} sub={ap.open.length + " bills · " + ap.lateNote} onClick={() => setView("all")} />
          <Kpi label="Exceptions" value={eur(ap.exTotal)} tone={ap.ex.length ? "warn" : "ok"} sub={ap.ex.length + " bills held for Margaret"} onClick={() => setView("ex")} />
          <Kpi label="Ready to pay" value={eur(ap.readyTotal)} sub={ap.ready.length + " bills matched or approved"} onClick={() => setView("ready")} />
          <Kpi label="Purchases in Nov" value={eur(pc.billsTotal)} sub={pc.bills.length + " bills received since " + date(MONTH_START, false)} />
          <Kpi label="Due in 30 days" value={eur(ap.in30Total)} sub={ap.in30.length + " bills"} />
        </Kpis>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", flex: 1 }}>Needs Margaret</div>
          <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{exAll.length ? exAll.length + " bills, " + eur(sum(exAll.map(b => b.amount))) + " held" : "No bills on hold"}</span>
        </div>
        {exAll.length > 0 ? (
          <Grid min={320}>{exAll.map(b => <ExceptionCard key={b.id} b={b} />)}</Grid>
        ) : (
          <Card><div style={{ fontSize: 13, color: "var(--dim)" }}>Every bill matches its purchase order and receipt.</div></Card>
        )}
        <Split k="21">
          <Card flush title="All supplier bills" sub="Click a bill to open it."
            right={<Seg size="sm" value={view} onChange={setView} items={[["all", "All", s.bills.length], ["ex", "Exceptions", exAll.length], ["ready", "Ready", ap.ready.length], ["paid", "Paid", s.bills.filter(b => b.status === "Paid").length]]} />}>
            <Table cols={cols} rows={rows} rowKey={b => b.id} onRow={b => openRecord("bill", b.id)} highlight={b => isException(b)} dense minWidth={650} initialSort={{ key: "due", dir: 1 }}
              footer={<>{rows.length} bills · {eur(sum(rows.map(b => b.amount)))} · second line shows the owner and the date the bill was received</>} />
            <div style={{ padding: "10px 16px" }}>
              <Reconciles ok={ap.exTotal + ap.readyTotal === ap.openTotal}>{eur(ap.exTotal)} held + {eur(ap.readyTotal)} ready = {eur(ap.openTotal)} outstanding.</Reconciles>
            </div>
          </Card>
          <RunPlanner />
        </Split>
        <SupplierSpend />
      </Kit>
    </Page>
  );
}
