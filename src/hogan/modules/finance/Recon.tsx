/* Finance · Reconciliation. Bank lines waiting to be matched, Pulse's suggested
   matches with confidence, unmatched payments, exceptions and the manual review
   panel. The bank feed and accounting integration are NOT YET VERIFIED. */

import * as D from "../../data";
import { matchBank, openRecord, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, I, Icon, Kpi, Notice, Page, PageHeader, RecLink, Seg, label } from "../../ui";
import { Spark } from "../../charts";
import { dayDate, eur } from "../../fmt";
import { BANK_ORDER, bankCandidates, bankCounts, opsStats, sum } from "./derive";
import { matchHighConfidence } from "./actions";
import { BankDetail, bankTone } from "./records";
import { Kit, Kpis, Meter, Split, Src } from "./kit";

type View = "todo" | "sug" | "un" | "ex" | "done" | "all";

function QuickAction({ t, onReview }: { t: D.BankTxn; onReview: () => void }) {
  const s = useHogan();
  if (t.state === "Matched") return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ok)" }}><Icon d={I.check} size={12} stroke={2.4} />Done</span>;
  if (t.state === "Suggested match" && t.suggest) {
    const inv = s.invoices.find(i => i.id === t.suggest);
    if (inv && inv.amount <= t.amount) return <Btn size="sm" kind="accent" onClick={e => { e.stopPropagation(); matchBank(t.id, inv.id); }} title="Margaret's action. Marks the invoice paid in the demo; nothing is posted.">Match</Btn>;
  }
  if (t.state === "Unmatched" && t.amount > 0) {
    const exact = bankCandidates(t, s).find(c => c.kind === "invoice" && c.exact);
    if (exact) return <Btn size="sm" kind="accent" onClick={e => { e.stopPropagation(); matchBank(t.id, exact.id); }} title={"Same amount as " + exact.id + ". Margaret's action: marks it paid in the demo."}>Match</Btn>;
  }
  return <Btn size="sm" kind="ghost" onClick={e => { e.stopPropagation(); onReview(); }}>Review</Btn>;
}

export default function Recon() {
  const s = useHogan();
  const b = bankCounts(s);
  const [view, setView] = useUi<View>("finance.bankView", "todo");
  const firstTodo = s.bank.find(t => t.state !== "Matched");
  const [sel, setSel] = useUi<string>("finance.bank", firstTodo?.id || s.bank[0].id);
  const want: Record<View, (t: D.BankTxn) => boolean> = {
    todo: t => t.state !== "Matched", sug: t => t.state === "Suggested match", un: t => t.state === "Unmatched", ex: t => t.state === "Exception", done: t => t.state === "Matched", all: () => true,
  };
  const rows = s.bank.filter(want[view]).slice().sort((x, y) => BANK_ORDER.indexOf(x.state) - BANK_ORDER.indexOf(y.state) || (x.date < y.date ? 1 : -1));
  const selected = s.bank.find(t => t.id === sel) || rows[0];
  const work = opsStats("reconLines");
  const moneyIn = sum(s.bank.filter(t => t.state !== "Matched" && t.amount > 0).map(t => t.amount));
  const moneyOut = sum(s.bank.filter(t => t.state !== "Matched" && t.amount < 0).map(t => t.amount));
  const tpl = "62px minmax(160px,2.2fr) 92px minmax(124px,1.2fr) 96px";

  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Finance · Reconciliation" title="Bank reconciliation"
          sub="Bank lines waiting to be matched to customer invoices, supplier bills or cost codes. Pulse suggests; Margaret confirms each match."
          right={<Src k="bank" />} />
        <Notice tone="warn" title="Bank feed and accounting integration not yet verified">
          These {b.total} bank lines are fictional demo data. In production they would arrive from the bank feed and every match would be confirmed in Xero or the current ERP. Matching here changes the demo only: Pulse never posts to the ledger or moves money.
        </Notice>
        <Kpis>
          <Kpi label="Suggested matches" value={b.suggested.length} tone="accent" sub={eur(b.suggestedValue) + " · " + b.highConfidence.length + " at 90% or above"} onClick={() => setView("sug")} />
          <Kpi label="Unmatched" value={b.unmatched.length} tone={b.unmatched.length ? "warn" : "ok"} sub="No confident match yet" onClick={() => setView("un")} />
          <Kpi label="Exceptions" value={b.exceptions.length} tone={b.exceptions.length ? "bad" : "ok"} sub="Need a person to decide" onClick={() => setView("ex")} />
          <Kpi label="Reconciled" value={b.matched.length + " of " + b.total} tone="ok" sub={Math.round((b.matched.length / b.total) * 100) + "% of lines cleared"} onClick={() => setView("done")} />
          <Kpi label="Still to clear" value={eur(moneyIn)} sub={"coming in · " + eur(-moneyOut, 2) + " going out"} />
        </Kpis>
        <Split k="side">
          <Card flush title="Bank lines" sub={rows.length + " shown. Click a line to review it in the panel."}
            right={b.highConfidence.length > 0 ? <Btn size="sm" kind="primary" icon={I.check} onClick={() => matchHighConfidence(90)} title="Margaret's action. Matches each line whose suggestion scores 90% or more. Nothing is posted.">Match {b.highConfidence.length} at 90%+</Btn> : <Badge tone="ok">No confident matches left</Badge>}>
            <div style={{ padding: "0 16px 12px" }}>
              <Seg size="sm" value={view} onChange={setView} items={[["todo", "To do", b.open], ["sug", "Suggested", b.suggested.length], ["un", "Unmatched", b.unmatched.length], ["ex", "Exceptions", b.exceptions.length], ["done", "Matched", b.matched.length], ["all", "All", b.total]]} />
            </div>
            <div className="hk-scroll">
              <div style={{ minWidth: 640 }}>
                <div style={{ display: "grid", gridTemplateColumns: tpl, background: "var(--surface-faint)", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
                  {["Date", "Bank reference", "Amount", "Match", ""].map((h, i) => <div key={i} style={{ ...label, fontSize: 9.5, padding: "9px 12px", textAlign: i === 2 ? "right" : "left" }}>{h}</div>)}
                </div>
                {rows.length === 0 && <div style={{ padding: 22, fontSize: 12.5, color: "var(--dim)" }}>Nothing in this view.</div>}
                {rows.map(t => {
                  const on = selected?.id === t.id;
                  const tone = bankTone(t.state);
                  return (
                    <div key={t.id} onClick={() => setSel(t.id)} className="ix11"
                      style={{ display: "grid", gridTemplateColumns: tpl, alignItems: "center", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background .15s var(--ease)",
                        background: on ? "var(--accent-faint)" : undefined, boxShadow: on ? "inset 2px 0 0 var(--accent)" : undefined, opacity: t.state === "Matched" ? 0.7 : 1 }}>
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap" }}>{dayDate(t.date).replace(/^\w+ /, "")}</div>
                      <div style={{ padding: "10px 12px", minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
                        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.id} · {t.note || t.state}</div>
                      </div>
                      <div style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: t.amount > 0 ? "var(--ok)" : "var(--ink)", whiteSpace: "nowrap" }}>{eur(t.amount, Number.isInteger(t.amount) ? 0 : 2)}</div>
                      <div style={{ padding: "10px 12px", minWidth: 0 }}>
                        {t.suggest ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <RecLink type="invoice" id={t.suggest} style={{ fontSize: 12.5 }} />
                            {t.confidence && t.state === "Suggested match" && <><Meter value={t.confidence} max={100} w={34} color={t.confidence >= 90 ? "var(--ok)" : "var(--warn)"} /><span style={{ fontSize: 11, color: "var(--dim)" }}>{t.confidence}%</span></>}
                          </div>
                        ) : <Badge tone={tone}>{t.state}</Badge>}
                      </div>
                      <div style={{ padding: "8px 12px", textAlign: "right" }}><QuickAction t={t} onReview={() => setSel(t.id)} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 12, minWidth: 0 }}>
            {selected && (
              <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>{selected.id}<Badge tone={bankTone(selected.state)}>{selected.state}</Badge></span>}
                sub={dayDate(selected.date) + " · " + eur(selected.amount, Number.isInteger(selected.amount) ? 0 : 2) + (selected.amount > 0 ? " in" : " out")}
                right={<Btn size="sm" kind="ghost" icon={I.external} onClick={() => openRecord("bank", selected.id)} title="Open the full record" />}>
                <BankDetail key={selected.id} id={selected.id} variant="panel" />
              </Card>
            )}
            <Card title="Weekly workload" sub="Bank lines matched or coded by hand each week (illustrative baseline)." right={<Src k="illustrative" />}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px" }}>{Math.round(work.avg)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>lines a week on average</div>
                </div>
                <span style={{ flex: 1 }} />
                <Spark values={work.values} w={150} h={34} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>A baseline only. Any change in this workload would be measured after go-live, once the bank feed is connected.</div>
            </Card>
          </div>
        </Split>
      </Kit>
    </Page>
  );
}
