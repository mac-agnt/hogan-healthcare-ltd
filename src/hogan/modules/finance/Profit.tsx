/* Finance · Profitability. Drill from each P&L line into its parts, and compare
   margin by product category, supplier portfolio and customer account. Totals
   reconcile back to the month-to-date P&L. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { nav, openRecord, pendingApprovals, useHogan, useUi } from "../../store";
import { Avatar, Card, I, Icon, Notice, Page, PageHeader, RecLink, Seg, Table, label, type Col } from "../../ui";
import { Bars, HBars } from "../../charts";
import { eur, eurK, pct } from "../../fmt";
import { CHART, FIN, MTD_LABEL, months, pnl, sum } from "./derive";
import { Kit, Meter, Reconciles, Split, Src, Stat } from "./kit";

type LineK = "revenue" | "cogs" | "gp" | "opex" | "ebitda";
type Dim = "cat" | "sup" | "acc";
type Row = { k: string; rev: number; cogs: number; gp: number; gm: number; share: number; ref?: { type: string; id: string }; owner?: D.StaffId };

const supRef = (k: string) => {
  const sp = D.SUPPLIERS.find(x => k.toLowerCase().startsWith(x.name.split(" ")[0].toLowerCase()));
  return sp ? { type: "supplier", id: sp.id } : undefined;
};
const isService = (k: string) => /service|rental/i.test(k);

function rowsFor(dim: Dim): Row[] {
  const gpAll = FIN.revenue - FIN.cogs;
  if (dim === "cat") return FIN.byCategory.map(c => ({ k: c.k, rev: c.rev, cogs: c.cogs, gp: c.rev - c.cogs, gm: ((c.rev - c.cogs) / c.rev) * 100, share: ((c.rev - c.cogs) / gpAll) * 100 }));
  if (dim === "sup") return FIN.bySupplier.map(c => ({ k: c.k, rev: c.rev, cogs: c.rev - c.gp, gp: c.gp, gm: (c.gp / c.rev) * 100, share: (c.gp / gpAll) * 100, ref: supRef(c.k) }));
  return D.ACCOUNTS.map(a => ({ k: a.name, rev: a.mtdRevenue, cogs: a.mtdRevenue - a.mtdGP, gp: a.mtdGP, gm: (a.mtdGP / a.mtdRevenue) * 100, share: (a.mtdGP / gpAll) * 100, ref: { type: "account", id: a.id }, owner: a.owner }));
}

function Drill({ line }: { line: LineK }) {
  const p = pnl();
  const cats = FIN.byCategory;
  if (line === "revenue") {
    const acc = sum(D.ACCOUNTS.map(a => a.mtdRevenue));
    return (
      <>
        <HBars fmt={eur} data={cats.map((c, i) => ({ label: c.k, value: c.rev, color: CHART[i % CHART.length], sub: pct((c.rev / p.revenue) * 100), right: eurK(c.rev) }))} />
        <Reconciles ok={acc + (cats.find(c => /NICE1/.test(c.k))?.rev || 0) === p.revenue} style={{ marginTop: 14 }}>
          By customer: {D.ACCOUNTS.length} accounts {eur(acc)} + NICE1 rentals to private customers {eur(cats.find(c => /NICE1/.test(c.k))?.rev || 0)} = {eur(p.revenue)}.
        </Reconciles>
      </>
    );
  }
  if (line === "cogs") return (
    <>
      <HBars fmt={eur} data={cats.map((c, i) => ({ label: c.k, value: c.cogs, color: CHART[i % CHART.length], sub: pct((c.cogs / c.rev) * 100) + " of its sales", right: eurK(c.cogs) }))} />
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>Cost of sales is the landed cost of stock sold, including freight in. It is {pct(p.cogsPct)} of revenue this month.</div>
    </>
  );
  if (line === "gp") {
    const prod = cats.filter(c => !isService(c.k));
    return (
      <>
        <HBars fmt={v => pct(v)} max={70} data={cats.map((c, i) => ({ label: c.k, value: ((c.rev - c.cogs) / c.rev) * 100, color: CHART[i % CHART.length], sub: eur(c.rev - c.cogs) + " GP", right: pct(((c.rev - c.cogs) / c.rev) * 100) }))} />
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
          Service lines (loan sets, NICE1 rentals) earn the highest margins but are small. Among product categories the range is {pct(Math.min(...prod.map(c => ((c.rev - c.cogs) / c.rev) * 100)))} to {pct(Math.max(...prod.map(c => ((c.rev - c.cogs) / c.rev) * 100)))}.
        </div>
      </>
    );
  }
  if (line === "opex") return (
    <>
      <HBars fmt={eur} data={FIN.opexLines.map((l, i) => ({ label: l.k, value: l.v, color: i === 0 ? "#D9C27A" : "#E0A98C", sub: pct((l.v / p.revenue) * 100) + " of revenue", right: eur(l.v) }))} />
      <Reconciles ok={sum(FIN.opexLines.map(l => l.v)) === p.opex} style={{ marginTop: 14 }}>
        Seven lines add up to {eur(p.opex)}. Field and selling costs ({p.sellingLines.map(l => l.k.toLowerCase()).join(", ")}) are {eur(p.selling)}; salaries are not split by team in this dataset.
      </Reconciles>
    </>
  );
  const m = months();
  return (
    <>
      <Bars height={170} fmt={eurK} highlight={m.length - 1} data={m.map(x => ({ label: x.m.replace(/ \d\d/, ""), value: x.ebitda, color: x.mtd ? "var(--accent)" : "#7FB8C9", note: pct(x.em) + " margin" }))} />
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
        EBITDA by month. Nov* is {MTD_LABEL} only, so it reads low against full months. Margin to date is {pct(p.em)}.
      </div>
    </>
  );
}

function MarginTable({ dim }: { dim: Dim }) {
  const rows = rowsFor(dim);
  const tot = { rev: sum(rows.map(r => r.rev)), gp: sum(rows.map(r => r.gp)) };
  const p = pnl();
  const cols: Col<Row>[] = [
    { key: "k", label: dim === "cat" ? "Category" : dim === "sup" ? "Supplier portfolio" : "Account", w: "minmax(180px,2fr)", sort: r => r.k,
      render: r => <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>{r.owner && <Avatar id={r.owner} size={18} />}{r.ref ? <RecLink type={r.ref.type} id={r.ref.id}>{r.k}</RecLink> : <span style={{ color: "var(--ink)" }}>{r.k}</span>}{isService(r.k) && <span style={{ fontSize: 10.5, color: "var(--faint)" }}>service</span>}</span> },
    { key: "rev", label: "Revenue", w: "1fr", align: "right", sort: r => r.rev, render: r => eur(r.rev) },
    { key: "cogs", label: "Cost of sales", w: "1fr", align: "right", sort: r => r.cogs, render: r => <span style={{ color: "var(--dim)" }}>{eur(r.cogs)}</span> },
    { key: "gp", label: "Gross profit", w: "1fr", align: "right", sort: r => r.gp, render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(r.gp)}</b> },
    { key: "gm", label: "Margin", w: "0.9fr", align: "right", sort: r => r.gm, render: r => <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: r.gm < p.gm - 2 ? "var(--warn)" : "var(--body)" }}><Meter value={r.gm} max={70} w={34} color={r.gm < p.gm - 2 ? "var(--warn)" : "var(--accent)"} />{pct(r.gm)}</span> },
    { key: "share", label: "Share of GP", w: "0.8fr", align: "right", sort: r => r.share, render: r => pct(r.share) },
  ];
  const nice = FIN.byCategory.find(c => /NICE1/.test(c.k));
  const niceGp = nice ? nice.rev - nice.cogs : 0;
  const unalloc = tot.gp + niceGp - p.gp;
  const footer: ReactNode = dim === "acc"
    ? <Reconciles ok={tot.rev + (nice?.rev || 0) === p.revenue}>
        Accounts: {eur(tot.rev)} revenue, {eur(tot.gp)} gross profit. Plus NICE1 rentals to private customers ({eur(nice?.rev || 0)} revenue, {eur(niceGp)} GP), {unalloc >= 0 ? "less" : "plus"} {eur(Math.abs(unalloc))} of cost of sales held at company level and not allocated to accounts, gives {eur(p.revenue)} and {eur(p.gp)}.
      </Reconciles>
    : <Reconciles ok={tot.rev === p.revenue && tot.gp === p.gp}>Rows add up to {eur(tot.rev)} revenue and {eur(tot.gp)} gross profit, the month's totals ({pct(p.gm)} margin).</Reconciles>;
  return (
    <>
      <Table cols={cols} rows={rows} rowKey={r => r.k} dense minWidth={720} maxHeight={dim === "acc" ? 460 : undefined} initialSort={{ key: "gp", dir: -1 }}
        onRow={dim === "cat" ? undefined : r => (r.ref ? openRecord(r.ref.type, r.ref.id) : /loan set/i.test(r.k) ? nav("Orders", "loansets") : nav("Purchasing", "suppliers"))}
        highlight={r => r.gm < p.gm - 2} />
      <div style={{ padding: "12px 16px" }}>{footer}</div>
    </>
  );
}

export default function Profit() {
  const s = useHogan();
  const p = pnl();
  const [line, setLine] = useUi<LineK>("finance.pnlLine", "gp");
  const [dim, setDim] = useUi<Dim>("finance.marginDim", "cat");
  const lines: { k: LineK; label: string; v: number; sub: string; tone?: string }[] = [
    { k: "revenue", label: "Revenue", v: p.revenue, sub: "100% · by category and customer" },
    { k: "cogs", label: "Cost of sales", v: -p.cogs, sub: pct(p.cogsPct) + " of revenue" },
    { k: "gp", label: "Gross profit", v: p.gp, sub: pct(p.gm) + " gross margin" },
    { k: "opex", label: "Operating expenses", v: -p.opex, sub: pct(p.opexPct) + " of revenue · 7 lines" },
    { k: "ebitda", label: "EBITDA", v: p.ebitda, sub: pct(p.em) + " EBITDA margin" },
  ];
  const cur = lines.find(l => l.k === line)!;
  const prod = FIN.byCategory.filter(c => !isService(c.k)).map(c => ({ k: c.k, gm: ((c.rev - c.cogs) / c.rev) * 100, gp: c.rev - c.cogs }));
  const best = prod.reduce((a, b) => (b.gm > a.gm ? b : a)), worst = prod.reduce((a, b) => (b.gm < a.gm ? b : a)), big = prod.reduce((a, b) => (b.gp > a.gp ? b : a));
  const disc = pendingApprovals(s).find(a => a.kind === "Discount");
  const discM = disc ? Number((disc.detail.match(/Margin after discount ([\d.]+)%/) || [])[1]) : NaN;
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Profitability" title="Profitability"
          sub={"Revenue, cost of sales and margin, " + MTD_LABEL + ", by product category, supplier portfolio and customer. Pick a P&L line to see what is behind it."}
          right={<Src k="accounts" />} />
        <Notice tone="info" title="EBITDA needs complete accounts">
          In production, EBITDA must come from complete, posted accounts in Xero or the current ERP. Pulse should not estimate it from partial or unreconciled data. This demo uses its own internally consistent, fictional dataset.
        </Notice>
        <Split k="12">
          <Card title="P&L, November to date" sub="Click a line to drill in." flush>
            <div style={{ padding: "0 10px 10px" }}>
              {lines.map(l => {
                const on = l.k === line;
                const strong = l.k === "gp" || l.k === "ebitda" || l.k === "revenue";
                return (
                  <button key={l.k} onClick={() => setLine(l.k)} className={on ? undefined : "ix11"}
                    style={{ width: "100%", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", marginTop: 2, borderRadius: 10,
                      border: "1px solid " + (on ? "var(--accent-line)" : "transparent"), background: on ? "var(--accent-faint)" : "none", transition: "background .15s var(--ease)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: strong ? 600 : 500, color: "var(--ink)" }}>{l.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{l.sub}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: l.k === "ebitda" ? "var(--accent)" : l.v < 0 ? "var(--body)" : "var(--ink)" }}>{eur(l.v)}</span>
                    <Icon d={I.chevron} size={12} color={on ? "var(--accent)" : "var(--faint)"} />
                  </button>
                );
              })}
            </div>
            <div style={{ padding: "4px 16px 14px" }}>
              <Reconciles ok={p.reconciles}>{eur(p.revenue)} − {eur(p.cogs)} = {eur(p.gp)}; {eur(p.gp)} − {eur(p.opex)} = {eur(p.ebitda)}.</Reconciles>
            </div>
          </Card>
          <Card title={cur.label + ": what is behind it"} sub={eur(Math.abs(cur.v)) + " · " + cur.sub} right={<Src k={line === "ebitda" ? "illustrative" : "accounts"} />}>
            <Drill line={line} />
          </Card>
        </Split>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(250px,100%),1fr))", gap: 12 }}>
          <Stat label="Best product margin" value={pct(best.gm)} sub={best.k} />
          <Stat label="Weakest product margin" value={pct(worst.gm)} tone="warn" sub={worst.k} />
          <Stat label="Largest gross profit" value={eur(big.gp)} sub={big.k + " · " + pct((big.gp / p.gp) * 100) + " of the total"} />
          {disc && !Number.isNaN(discM) && (
            <Stat label={"Pending: " + disc.id + " discount"} value={pct(discM)} tone="warn" onClick={() => openRecord(disc.ref.type, disc.ref.id)}
              sub={disc.title + ". " + (p.gm - discM).toFixed(1) + " points below November's margin; Graham to decide."} />
          )}
        </div>
        <Card flush title="Margin by dimension" sub="Sorted by gross profit. Rows more than two points below the month's margin are highlighted."
          right={<Seg size="sm" value={dim} onChange={setDim} items={[["cat", "Product category"], ["sup", "Supplier portfolio"], ["acc", "Customer account"]]} />}>
          <MarginTable dim={dim} />
        </Card>
        <div style={{ ...label, fontSize: 9.5, textAlign: "center" }}>Fictional demonstration data · not Hogan Healthcare's actual performance</div>
      </Kit>
    </Page>
  );
}
