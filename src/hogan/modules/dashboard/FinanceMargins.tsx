/* Dashboard · Finance & Margins. Graham's management-accounts view: the P&L to
   EBITDA, margin trend, purchase costs, receivables ageing, payables, cash, and
   which figures would depend on Xero, the ERP or the bank feed. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { nav, openRecord, useHogan } from "../../store";
import { Badge, Btn, Card, I, Icon, Page, PageHeader, RecLink, label } from "../../ui";
import { Bars, HBars, Legend, Line } from "../../charts";
import { date, eur, eurK, pct } from "../../fmt";
import {
  FIN, MTD_LABEL, apSummary, arAgeing, arSummary, billsByWeek, cashLow, cashOutlook, daysOver, months, pnl, purchaseCosts, sum,
} from "../finance/derive";
import { Fig, Go, Kit, Reconciles, Split, Src, Stat, td, th } from "../finance/kit";

function Statement() {
  const p = pnl();
  type L = { k: string; v: number; strong?: boolean; indent?: boolean; accent?: boolean; muted?: boolean };
  const lines: L[] = [
    { k: "Sales revenue", v: p.revenue, strong: true },
    { k: "Cost of sales", v: -p.cogs },
    { k: "Gross profit", v: p.gp, strong: true },
    ...FIN.opexLines.map(l => ({ k: l.k, v: -l.v, indent: true, muted: true })),
    { k: "Operating expenses", v: -p.opex },
    { k: "EBITDA", v: p.ebitda, strong: true, accent: true },
  ];
  return (
    <Card title="Profit and loss to EBITDA" sub={MTD_LABEL + ". Each line as a share of revenue."} right={<Src k="accounts" />} flush>
      <div className="hk-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}>
            <th style={{ ...th, textAlign: "left" }}>Line</th><th style={{ ...th, textAlign: "right" }}>Nov to date</th><th style={{ ...th, textAlign: "right" }}>% of revenue</th><th style={{ ...th, width: "28%" }}></th>
          </tr></thead>
          <tbody>
            {lines.map(l => {
              const share = Math.abs(l.v) / p.revenue;
              return (
                <tr key={l.k} style={{ background: l.accent ? "var(--accent-faint)" : undefined }}>
                  <td style={{ ...td, paddingLeft: l.indent ? 28 : 16, color: l.strong ? "var(--ink)" : l.muted ? "var(--dim)" : "var(--body)", fontWeight: l.strong ? 600 : 400, fontSize: l.indent ? 12.5 : 13 }}>{l.k}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: l.strong ? 600 : 400, color: l.accent ? "var(--accent)" : l.strong ? "var(--ink)" : "var(--body)", fontSize: l.indent ? 12.5 : 13 }}>{eur(l.v)}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--dim)", fontSize: 12.5 }}>{pct(share * 100)}</td>
                  <td style={{ ...td, paddingRight: 16 }}>
                    <div style={{ height: 6, borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "100%", transformOrigin: "left", transform: "scaleX(" + Math.max(0.01, share) + ")", borderRadius: 6,
                        background: l.accent ? "var(--accent)" : l.v < 0 ? (l.indent ? "#D9C27A" : "#E0A98C") : "#7FB8C9", transition: "transform .6s var(--ease)" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <Reconciles ok={p.reconciles}>{eur(p.revenue)} − {eur(p.cogs)} − {eur(p.opex)} = {eur(p.ebitda)} EBITDA. The seven expense lines add up to {eur(p.opex)}.</Reconciles>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Go onClick={() => nav("Finance", "profit")}>Drill into profitability</Go>
        </div>
      </div>
    </Card>
  );
}

function MarginTrend() {
  const m = months();
  return (
    <Card title="Margin trend" sub="Gross and EBITDA margin by month. Nov* is month to date; earlier months are illustrative history." right={<Src k="illustrative" />}>
      <Line height={200} yMin={0} fmt={v => pct(v)} labels={m.map(x => x.m.replace(/ \d\d/, ""))}
        series={[{ name: "Gross margin", values: m.map(x => +x.gm.toFixed(1)), color: "var(--accent)" }, { name: "EBITDA margin", values: m.map(x => +x.em.toFixed(1)), color: "#D9C27A" }]} />
      <Legend style={{ marginTop: 10 }} items={[{ label: "Gross margin", color: "var(--accent)" }, { label: "EBITDA margin", color: "#D9C27A" }]} />
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
        Gross margin holds between {pct(Math.min(...m.map(x => x.gm)))} and {pct(Math.max(...m.map(x => x.gm)))}. EBITDA margin moves more, because operating costs are largely fixed while revenue swings month to month.
      </div>
    </Card>
  );
}

function Purchases() {
  const s = useHogan();
  const pc = purchaseCosts(s);
  return (
    <Card title="Purchase costs" sub={"Supplier bills received, " + MTD_LABEL + "."} right={<Src k="erp" />}>
      <Stat big label="Supplier bills received" value={eur(pc.billsTotal)} sub={pc.bills.length + " bills from " + pc.bySupplier.length + " suppliers"} />
      <div style={{ marginTop: 12 }}>
        <HBars barH={6} fmt={eur} onRow={i => openRecord("supplier", pc.bySupplier[i].id)}
          data={pc.bySupplier.slice(0, 5).map((x, i) => ({ label: x.name, value: x.v, color: ["#267985", "#7FB8C9", "#9FB5D9", "#D9C27A", "#E0A98C"][i], right: eurK(x.v) }))} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Fig label="Purchase orders raised this month" sub={pc.pos.length + " orders"} value={eur(pc.posTotal)} onClick={() => nav("Purchasing", "pos")} />
        <Fig label="Committed, not yet billed" sub={pc.committed.map(p => p.id).join(" · ")} value={eur(pc.committedTotal)} onClick={() => nav("Purchasing", "pos")} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, lineHeight: 1.5 }}>
        Purchases differ from cost of sales ({eurK(FIN.cogs)}): stock bought this month is not all sold this month.
      </div>
    </Card>
  );
}

function Receivables() {
  const s = useHogan();
  const ar = arSummary(s);
  const b = arAgeing(s);
  return (
    <Card title="Receivables ageing" sub={"What customers owe, by days past due. " + ar.overdue.length + " invoices are overdue."} right={<Src k="erp" />}>
      <Stat big label="Total receivables" value={eur(ar.total)} sub={eur(ar.overdueTotal) + " overdue · " + eur(ar.openTotal) + " not yet due"} />
      <div style={{ marginTop: 12 }}>
        <HBars barH={6} fmt={eur} onRow={() => nav("Finance", "ar")}
          data={b.filter(x => x.amount > 0 || x.k === "current" || x.k === "1-30").map(x => ({ label: x.label, value: x.amount, color: x.color, sub: x.count + " inv", right: eurK(x.amount) }))} />
      </div>
      {ar.overdue[0] && (
        <div style={{ marginTop: 12 }}>
          <Fig label={<>Largest overdue: <RecLink type="invoice" id={ar.overdue[0].id} /></>} sub={(D.accountById(ar.overdue[0].account)?.name || "") + " · " + daysOver(ar.overdue[0]) + " days past due"} value={eur(ar.overdue[0].amount)} tone="warn" onClick={() => openRecord("invoice", ar.overdue[0].id)} />
        </div>
      )}
      <Reconciles ok={sum(b.map(x => x.amount)) === ar.total} style={{ marginTop: 8 }}>Ageing bands add up to {eur(sum(b.map(x => x.amount)))}.</Reconciles>
    </Card>
  );
}

function Payables() {
  const s = useHogan();
  const ap = apSummary(s);
  const wk = billsByWeek(s);
  return (
    <Card title="Payables" sub="Supplier bills not yet paid, by due week." right={<Src k="erp" />}>
      <Stat big label="Bills outstanding" value={eur(ap.openTotal)} sub={ap.open.length + " bills · " + ap.lateNote} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <Stat label="Exceptions" value={eur(ap.exTotal)} tone={ap.ex.length ? "warn" : "ok"} sub={ap.ex.length + " bills held"} onClick={() => nav("Finance", "ap")} />
        <Stat label="Ready to pay" value={eur(ap.readyTotal)} sub={ap.ready.length + " bills matched"} onClick={() => nav("Finance", "ap")} />
      </div>
      <div style={{ marginTop: 12 }}>
        <Bars height={130} fmt={eurK} data={wk.map(w => ({ label: date(w.w, false), value: w.amount, note: w.bills.map(b => b.id).join(", "), color: w.bills.some(b => ap.ex.includes(b)) ? "#E0A98C" : "#9FB5D9" }))} />
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>Week commencing. Amber weeks include a bill on hold.</div>
      </div>
      <Reconciles ok={sum(wk.map(w => w.amount)) === ap.openTotal} style={{ marginTop: 8 }}>Due weeks add up to {eur(ap.openTotal)}.</Reconciles>
    </Card>
  );
}

function CashCard() {
  const s = useHogan();
  const out = cashOutlook(s), low = cashLow(s);
  return (
    <Card title="Cash visibility" sub="Bank balance and an illustrative six-week outlook." right={<Src k="bank" />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Stat label={"Bank · " + date(FIN.bankAsOf, false)} value={eurK(FIN.bankBalance)} sub="Demo balance" />
        <Stat label="Lowest point" value={eurK(low.close)} sub={low.w} tone="warn" />
        <Stat label="In six weeks" value={eurK(out[out.length - 1].close)} sub={"Net " + (out[out.length - 1].close >= FIN.bankBalance ? "+" : "") + eurK(out[out.length - 1].close - FIN.bankBalance)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <Bars height={150} fmt={eurK} highlight={out.findIndex(r => r.w === low.w) + 1}
          data={[{ label: "Now", value: FIN.bankBalance, color: "#9FB5D9", note: "Bank, " + date(FIN.bankAsOf, false) }, ...out.map(r => ({ label: r.w.replace("w/c ", ""), value: r.close, color: r.w === low.w ? "#E0A98C" : "#7FB8C9", note: "Net " + eur(r.net) }))]} />
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>Projected closing balance by week commencing. The low week is shaded.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}><Go onClick={() => nav("Finance", "forecast")}>Cash outlook</Go></div>
    </Card>
  );
}

function Sources() {
  const rows: [string, ReactNode, string, string][] = [
    ["Revenue, cost of sales, operating costs, EBITDA", <Src k="accounts" />, "Xero or the current ERP general ledger", "Read only. Pulse never posts journals."],
    ["Customer invoices, receipts, ageing", <Src k="erp" />, "ERP or Xero sales ledger", "Pulse drafts reminders; Margaret sends them."],
    ["Supplier bills, purchase orders, purchase costs", <Src k="erp" />, "ERP purchase ledger", "Pulse flags mismatches; people resolve and pay."],
    ["Bank balance and bank lines", <Src k="bank" />, "Bank feed", "Pulse suggests matches; Margaret confirms."],
    ["Stock, movements, orders, pipeline", <Src k="live" />, "Pulse records (scanning, orders, sales)", "Demo records in this build."],
    ["History and projections", <Src k="illustrative" />, "Built for the demo", "Not actual performance and not a forecast."],
  ];
  return (
    <Card title="Where these figures would come from" sub="None of these connections has been verified. Every figure in this build is fictional demonstration data." flush>
      <div className="hk-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr style={{ background: "var(--surface-faint)" }}>
            <th style={{ ...th, textAlign: "left" }}>Figures</th><th style={{ ...th, textAlign: "left" }}>Source and status</th><th style={{ ...th, textAlign: "left" }}>What Pulse does with them</th>
          </tr></thead>
          <tbody>
            {rows.map(([k, tag, src, does]) => (
              <tr key={k}>
                <td style={{ ...td, color: "var(--ink)", fontSize: 12.5 }}>{k}</td>
                <td style={td}><div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>{src}</div>{tag}</td>
                <td style={{ ...td, fontSize: 12, color: "var(--dim)" }}>{does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--dim)" }}>
        <Icon d={I.shield} size={14} color="var(--accent)" />
        Pulse sits above the accounts as a reading, matching and workflow layer. It does not replace Xero or the ERP.
      </div>
    </Card>
  );
}

export default function FinanceMargins() {
  const p = pnl();
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Dashboard · Finance and margins" title="November to date, from revenue to EBITDA"
          sub={"Management view, " + MTD_LABEL + ". Figures with a source tag would come from Xero, the current ERP or the bank feed. Those connections are not yet verified, so everything here is fictional demonstration data."}
          right={<><Badge tone="accent">EBITDA {eur(p.ebitda)} · {pct(p.em)}</Badge><Btn size="sm" icon={I.euro} onClick={() => nav("Finance", "overview")}>Open Finance</Btn></>} />
        <Split k="11">
          <Statement />
          <MarginTrend />
        </Split>
        <Split k="3">
          <Purchases />
          <Receivables />
          <Payables />
        </Split>
        <Split k="12">
          <CashCard />
          <Sources />
        </Split>
        <div style={{ ...label, fontSize: 9.5, textAlign: "center", padding: "4px 0 0" }}>Fictional demonstration data · not Hogan Healthcare's actual performance</div>
      </Kit>
    </Page>
  );
}
