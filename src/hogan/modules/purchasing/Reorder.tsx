/* Purchasing · Reorder Recommendations: main-stockroom lines where free
   stock plus open POs is below the reorder point, grouped by supplier.
   The agent proposes; "Draft PO" is the human step. Drafts over €5,000 are
   routed to Graham by the store. */

import * as D from "../../data";
import { TODAY, date, eur, plural } from "../../fmt";
import { createPO, lowSiteLines, openRecord, productStock, reorderRecs, useHogan, useUi, type ReorderRec } from "../../store";
import { Badge, Btn, Card, Empty, I, Page, PageHeader, Progress, RecLink, Row, Status } from "../../ui";
import { AgentLine, MiniStat, Stack, Stepper, Two } from "../orders/kit";
import { POAction } from "./POs";
import { RealBadge } from "./Suppliers";
import { APPROVAL_LIMIT, supName } from "./common";

export default function Reorder() {
  const s = useHogan();
  const recs = reorderRecs(s);
  const [qty, setQty] = useUi<Record<string, number>>("purchasing.recQty", {});
  const q = (r: ReorderRec) => qty[r.product.sku] ?? r.suggested;

  const groups: { sup: D.Supplier; recs: ReorderRec[] }[] = [];
  recs.forEach(r => {
    const g = groups.find(x => x.sup.id === r.supplier.id);
    if (g) g.recs.push(r); else groups.push({ sup: r.supplier, recs: [r] });
  });
  const total = recs.reduce((a, r) => a + q(r) * r.product.unitCost, 0);
  const drafted = s.pos.filter(p => p.created === TODAY).sort((a, b) => (a.id < b.id ? 1 : -1));

  const p204 = D.productBySku("HH-OR-204")!;
  const ps204 = productStock("HH-OR-204", s);
  const har = lowSiteLines(s).find(x => x.line.sku === "HH-OR-204");
  const in204 = recs.some(r => r.product.sku === "HH-OR-204");

  const draft = (g: { sup: D.Supplier; recs: ReorderRec[] }) => {
    createPO(g.sup.id, g.recs.map(r => ({ sku: r.product.sku, qty: q(r) })), "SO");
    const next = { ...qty };
    g.recs.forEach(r => { delete next[r.product.sku]; });
    setQty(next);
  };

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Reorder recommendations"
          sub="Main-stockroom lines where free stock plus what is already on order sits below the reorder point. The suggestion tops each line up to twice its reorder point." />

        <AgentLine agent="Purchasing Agent" when="Proposal">
          {recs.length
            ? <>{plural(recs.length, "line")} across {plural(groups.length, "supplier")}, about {eur(total)} at cost. Built from free stock, open purchase orders and reorder points. Nothing is ordered until someone drafts the PO; drafts over {eur(APPROVAL_LIMIT)} go to Graham for approval.</>
            : <>Every main-stockroom line is at or above its reorder point once open purchase orders are counted.</>}
        </AgentLine>

        <div className="hk-kpis">
          <MiniStatCard k="Lines to reorder" v={recs.length} />
          <MiniStatCard k="Suppliers" v={groups.length} />
          <MiniStatCard k="Value at cost" v={eur(total)} />
          <MiniStatCard k="Need Graham's approval" v={groups.filter(g => g.recs.reduce((a, r) => a + q(r) * r.product.unitCost, 0) > APPROVAL_LIMIT).length} />
        </div>

        {!in204 && har && (
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55, padding: "0 2px" }}>
            Watching <RecLink type="product" id="HH-OR-204">HH-OR-204</RecLink>: {ps204.available} free in the main stockroom against a reorder point of {p204.minCentral}.
            Moving {har.suggested} to Harbour{har.pending ? " (" + har.pending.id + ", awaiting approval)" : ""} would leave {ps204.available - har.suggested}, and it would join this list.
          </div>
        )}

        {groups.length === 0 && <Card><Empty title="Nothing to reorder" sub="Free stock plus open POs covers every reorder point in the main stockroom." icon={I.check} /></Card>}

        {groups.map(g => {
          const value = g.recs.reduce((a, r) => a + q(r) * r.product.unitCost, 0);
          const needsAp = value > APPROVAL_LIMIT;
          return (
            <Card key={g.sup.id} flush
              title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><RecLink type="supplier" id={g.sup.id} style={{ color: "var(--ink)", textDecorationColor: "var(--border-strong)" }}>{g.sup.name}</RecLink><RealBadge x={g.sup} /></span>}
              sub={g.sup.tier + " · lead time " + g.sup.leadDays + " days · on time " + g.sup.onTime + "% · " + plural(g.recs.length, "line")}
              right={<Row gap={8} wrap>
                <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(value)}</span>
                <Btn kind="primary" icon={I.plus} onClick={() => draft(g)}>{needsAp ? "Draft PO for approval" : "Draft PO"}</Btn>
              </Row>}>
              {g.recs.map(r => {
                const cover = r.available + r.onOrder;
                const n = q(r);
                return (
                  <div key={r.product.sku} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 230px", minWidth: 0 }}>
                      <Two a={<><RecLink type="product" id={r.product.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.product.sku}</RecLink> {r.product.name}</>}
                        b={r.available + " free · " + (r.onOrder ? r.onOrder + " on order" : "none on order") + " · reorder point " + r.min} />
                    </div>
                    <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)", marginBottom: 4 }}><span>Cover</span><span>{cover} of {r.min}</span></div>
                      <Progress value={cover} max={r.min} h={6} tone={cover === 0 ? "bad" : "warn"} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>Order</span>
                      <Stepper value={n} min={1} onChange={v => setQty({ ...qty, [r.product.sku]: v })} />
                      {n !== r.suggested && <Btn size="sm" kind="ghost" title="Back to the suggested quantity" onClick={() => { const nx = { ...qty }; delete nx[r.product.sku]; setQty(nx); }}>Reset</Btn>}
                    </div>
                    <div style={{ width: 110, textAlign: "right", flex: "none" }}>
                      <div style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(n * r.product.unitCost)}</div>
                      <div style={{ fontSize: 11, color: "var(--faint)" }}>{eur(r.product.unitCost)} each</div>
                    </div>
                  </div>
                );
              })}
              {needsAp && <div style={{ padding: "10px 18px 14px", fontSize: 11.5, color: "var(--warn)", borderTop: "1px solid var(--border)" }}>Over {eur(APPROVAL_LIMIT)}: the draft goes to Graham for approval before it can be sent.</div>}
            </Card>
          );
        })}

        <Card title="Drafted today" sub={drafted.length ? plural(drafted.length, "purchase order") + " raised from this list" : "POs you draft here appear below with their next step."} flush bodyStyle={{ padding: "0 10px 10px" }}>
          {drafted.length ? drafted.map(p => (
            <div key={p.id} className="ix11" onClick={() => openRecord("po", p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12.5 }}>{p.id}</span>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}><Two a={supName(p.supplier)} b={p.lines.map(l => l.qty + " × " + l.sku).join(" · ") + " · expected " + date(p.expected, false)} /></div>
              <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{eur(D.poValue(p))}</span>
              <Status s={p.status} />
              <div onClick={e => e.stopPropagation()}><POAction p={p} /></div>
            </div>
          )) : <div style={{ padding: "6px 10px 8px", fontSize: 12.5, color: "var(--faint)" }}>Nothing drafted yet today.</div>}
        </Card>
        <Badge style={{ alignSelf: "flex-start" }}>Reorder points and costs are fictional demo values</Badge>
      </Stack>
    </Page>
  );
}

function MiniStatCard({ k, v }: { k: string; v: string | number }) {
  return (
    <div style={{ padding: "13px 15px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md,15px)" }}>
      <MiniStat k={k} v={v} />
    </div>
  );
}
