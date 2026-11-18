/* Purchasing · Exceptions (Story E, Interaction 5).
   BILL-2034 from Aquila Sports Medicine: €4,280, quantity discrepancy against
   PO-337. Ordered 12, received 12 on GRN-0419, invoiced 14 at €290 plus €220
   freight: 2 units, €580, billed but never delivered. The Purchasing Agent
   finds it; Margaret Duff investigates; Graham approves the hold. Nothing is
   approved, paid or posted automatically. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { TODAY, date, eur, plural } from "../../fmt";
import { billExceptions, decideApproval, nav, openRecord, setBillStatus, useHogan } from "../../store";
import { Badge, Btn, Card, I, Icon, Notice, Page, PageHeader, Person, RecLink, Row, Status, label, type Tone } from "../../ui";
import { AgentLine, CheckMark, FlowStrip, KVGrid, Stack } from "../orders/kit";
import { whenDecided } from "../orders/common";
import {
  askSupplier, billApproval, billReviewTask, chasePO, isException, poLateDays, poOrdered, poReceived, recordCreditNote, resolveGrnCheck, settleBill, startReview, supName, threeWay,
} from "./common";

/** Fix-it wording for each goods-in check, with the note recorded when it is resolved. */
export const GRN_FIX: Record<string, [string, string]> = {
  "Quantity matches PO": ["Accept part delivery", "Part delivery accepted. The balance stays open on the PO."],
  "UDI / GS1 label scanned": ["Second-person check done", "Lots keyed by hand checked against the box labels by John Culkin."],
  "Documentation present": ["Paperwork received", "Missing paperwork received and filed."],
  "Packaging intact": ["Packaging accepted", "Outer damage only. Sterile barrier checked and intact."],
  "Storage conditions met": ["Storage confirmed", "Storage conditions confirmed after the delivery was put away."],
  "Lot and expiry captured": ["Lot captured", "Lot and expiry captured by hand and verified."],
};

function MatchCol({ head, refEl, lines, total, tone, foot }: { head: string; refEl: ReactNode; lines: ReactNode[]; total: string; tone?: Tone; foot?: ReactNode }) {
  return (
    <div style={{ flex: "1 1 148px", minWidth: 0, padding: "13px 14px", borderRadius: "var(--r-md,14px)", background: tone === "bad" ? "var(--bad-soft)" : "var(--surface-2)", border: "1px solid " + (tone === "bad" ? "var(--bad-soft)" : "var(--border)") }}>
      <div style={{ ...label, fontSize: 9 }}>{head}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 5 }}>{refEl}</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
        {lines.map((l, i) => <div key={i} style={{ fontSize: 12.5, color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>{l}</div>)}
      </div>
      <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", color: tone === "bad" ? "var(--bad)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{total}</div>
      {foot && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>{foot}</div>}
    </div>
  );
}

function Link({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ flex: "0 0 auto", alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 2px", minWidth: 50 }}>
      <CheckMark ok={ok} size={24} />
      <span style={{ fontSize: 10.5, color: ok ? "var(--ok)" : "var(--bad)", textAlign: "center", lineHeight: 1.3 }}>{text}</span>
    </div>
  );
}

/** Story E: the three-way match and Margaret's review, start to finish. */
export function BillMatch({ b, compact }: { b: D.Bill; compact?: boolean }) {
  const s = useHogan();
  const tw = threeWay(b, s);
  const task = billReviewTask(b.id, s);
  const ap = billApproval(b.id, s);
  const owner = D.staffById(b.owner);
  const resolved = !isException(b);
  const found = s.events.slice().reverse().find(e => e.ref === b.id && e.actor === "Purchasing Agent");
  const foundAt = found ? "Found " + found.time + (found.date === TODAY ? " today" : " " + date(found.date, false)) : "Finding";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!compact && (
        <KVGrid items={[
          ["Supplier invoice", <><RecLink type="bill" id={b.id}>{b.id}</RecLink> · {eur(b.amount)}</>],
          ["Status", <Status s={b.status} />],
          ["Related PO", tw.po ? <RecLink type="po" id={tw.po.id}>{tw.po.id}</RecLink> : "None"],
          ["Expected quantity", b.expectedQty ?? tw.ordered],
          ["Invoiced quantity", <span style={{ color: "var(--bad)", fontWeight: 600 }}>{b.invoicedQty}</span>],
          ["Next action", resolved ? "None: matched" : (owner?.name || b.owner) + " to investigate"],
        ]} />
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
        <MatchCol head="Purchase order · ordered" refEl={tw.po ? <RecLink type="po" id={tw.po.id}>{tw.po.id}</RecLink> : "No PO"}
          lines={[tw.ordered + " × " + tw.sku + " at " + eur(tw.unit), "Freight " + eur(tw.freight)]} total={eur(tw.poTotal)} foot={"Raised " + (tw.po ? date(tw.po.created, false) : "")} />
        <Link ok={tw.ordered === tw.received} text={tw.ordered === tw.received ? "Matches" : "Differs"} />
        <MatchCol head="Goods received" refEl={tw.grn ? <RecLink type="grn" id={tw.grn.id}>{tw.grn.id}</RecLink> : "No GRN"}
          lines={[tw.received + " units counted and scanned", tw.grn ? "Lot " + tw.grn.lines[0]?.lot : ""]} total={tw.received + " units"}
          foot={tw.grn ? date(tw.grn.date, false) + " · " + tw.grn.checks.filter(c => c.ok).length + "/" + tw.grn.checks.length + " checks passed" : ""} />
        <Link ok={!tw.varianceUnits} text={tw.varianceUnits ? "+" + tw.varianceUnits + " units" : "Matches"} />
        <MatchCol head="Supplier invoice · billed" refEl={<RecLink type="bill" id={b.id}>{b.id}</RecLink>} tone={tw.varianceUnits ? "bad" : undefined}
          lines={[tw.invoiced + " × " + tw.sku + " at " + eur(tw.unit), "Freight " + eur(tw.freight)]} total={eur(tw.invoiceTotal)} foot={"Dated " + date(b.date, false) + " · due " + date(b.due, false)} />
      </div>

      {tw.varianceUnits !== 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md,14px)", background: resolved ? "var(--ok-soft)" : "var(--bad-soft)", flexWrap: "wrap" }}>
          <Icon d={resolved ? I.check : I.alert} size={18} color={resolved ? "var(--ok)" : "var(--bad)"} />
          <div style={{ flex: "1 1 260px", fontSize: 13.5, color: "var(--ink)" }}>
            Variance: <b>{plural(tw.varianceUnits, "unit")} = {eur(tw.varianceValue)}</b> billed but never delivered.
            <span style={{ color: "var(--dim)" }}> The matched amount is {eur(tw.matchedValue)}.</span>
          </div>
          {resolved && <Badge tone="ok">Credit note recorded</Badge>}
        </div>
      )}

      {!compact && (
        <AgentLine agent="Purchasing Agent" when={foundAt} tone={resolved ? "ok" : "accent"}>
          Billed {tw.invoiced}, ordered and received {tw.received}. Suggested next action: Margaret asks {supName(b.supplier)} for a credit note of {eur(tw.varianceValue)} or a corrected invoice, and the matched {eur(tw.matchedValue)} is paid only after approval.
        </AgentLine>
      )}

      {b.status === "Quantity discrepancy" && !task && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px", borderRadius: "var(--r-md,14px)", border: "1px dashed var(--accent-line)", background: "var(--accent-faint)" }}>
          <Person id={b.owner} sub="Next action: investigate" />
          <div style={{ flex: "1 1 240px", fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
            Creates a task for {owner?.first}, holds the bill, records the agent's suggested next action and asks Graham to approve the hold. <b style={{ color: "var(--ink)", fontWeight: 600 }}>Nothing is approved or posted automatically.</b>
          </div>
          <Btn kind="primary" size="lg" icon={I.plus} onClick={() => startReview(b.id)}>Create review task</Btn>
        </div>
      )}

      {task && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Notice tone={resolved ? "ok" : "info"} icon={I.check} title={"Review task " + task.id + " for " + (D.staffById(task.owner)?.name || task.owner)}
            right={<RecLink type="task" id={task.id} style={{ fontSize: 12.5 }}>Open task</RecLink>}>
            {task.title}. Due {date(task.due, false)} · {task.status}. {task.note}
          </Notice>
          {ap && (
            <Notice tone={ap.status === "Awaiting" ? "warn" : ap.status === "Approved" ? "ok" : "bad"} title={ap.id + ": " + ap.title}
              right={ap.status === "Awaiting" ? <Row gap={6} wrap><Btn size="sm" kind="primary" icon={I.check} onClick={() => decideApproval(ap.id, true, "GH")}>Approve as Graham</Btn><Btn size="sm" kind="ghost" onClick={() => decideApproval(ap.id, false, "GH")}>Reject</Btn></Row> : <Status s={ap.status} />}>
              {ap.detail}{ap.decidedAt ? " Decided " + whenDecided(ap.decidedAt) + " by " + (D.staffById(ap.decidedBy || "")?.name || "Graham Hogan") + "." : ""}
            </Notice>
          )}
          {!resolved && (
            <Row gap={10} wrap style={{ paddingTop: 4 }}>
              <Btn kind="secondary" icon={I.doc} onClick={() => recordCreditNote(b.id)}>Credit note received (Margaret)</Btn>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>Bill held at <b style={{ color: "var(--ink)", fontWeight: 500 }}>{b.status}</b>. No payment or posting happens from Pulse.</span>
            </Row>
          )}
        </div>
      )}
      {resolved && b.status !== "Matched" && (
        <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Now {b.status.toLowerCase()}: Margaret pays it in the accounts system. Pulse does not pay or post.</div>
      )}
    </div>
  );
}

/** Next steps for a non-story bill exception, shared by the card and the drawer. */
export function BillActions({ b, size = "sm" }: { b: D.Bill; size?: "sm" | "md" }) {
  const sup = supName(b.supplier);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {b.status === "Price variance" && <>
        <Btn size={size} kind="primary" onClick={() => askSupplier(b, "MD", "Ask " + sup + " for a credit note on " + b.id, "Billed above the agreed price list. Ask for a credit note or a corrected invoice.")}>Ask for credit note</Btn>
        <Btn size={size} kind="secondary" onClick={() => settleBill(b.id, "Matched", "Billed price accepted by Margaret Duff. Price list to be updated.")}>Accept billed price (Margaret)</Btn>
      </>}
      {b.status === "No matching receipt" && <>
        <Btn size={size} kind="primary" onClick={() => askSupplier(b, "JC", "Confirm the phone order behind " + b.id, "Did the order behind " + b.id + " arrive? A receipt or PO is needed to match it.")}>Ask John to confirm</Btn>
        <Btn size={size} kind="secondary" onClick={() => setBillStatus(b.id, "Under review", "Held until a receipt or PO is found.")}>Hold for review</Btn>
      </>}
      {b.status === "Under review" && !b.invoicedQty && <Btn size={size} kind="primary" onClick={() => settleBill(b.id, "Matched", "Receipt confirmed and matched by Margaret Duff.")}>Receipt found: match (Margaret)</Btn>}
      {b.status === "Quantity discrepancy" && <Btn size={size} kind="primary" onClick={() => startReview(b.id)}>Create review task</Btn>}
    </div>
  );
}

function OtherBill({ b }: { b: D.Bill }) {
  const s = useHogan();
  const po = b.po ? s.pos.find(p => p.id === b.po) : undefined;
  const sup = supName(b.supplier);
  const tasks = s.tasks.filter(t => t.related?.id === b.id && t.status !== "Done");
  return (
    <Card onClick={() => openRecord("bill", b.id)} title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 13 }}>{b.id}</span>{sup}</span>}
      sub={"Invoice " + eur(b.amount) + " · dated " + date(b.date, false) + " · due " + date(b.due, false)} right={<Status s={b.status} />}>
      <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>{b.detail}</div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
        {po ? <>Against <RecLink type="po" id={po.id}>{po.id}</RecLink>: {po.lines.map(l => l.qty + " × " + l.sku + " at " + eur(l.cost)).join(" · ")}{b.grn ? <> · goods in <RecLink type="grn" id={b.grn}>{b.grn}</RecLink></> : null}</> : "No PO reference and no goods-in record to match against."}
      </div>
      {tasks.length > 0 && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>Open: {tasks.map(t => <span key={t.id}><RecLink type="task" id={t.id} /> {t.title}. </span>)}</div>}
      <div onClick={e => e.stopPropagation()} style={{ marginTop: 12 }}><BillActions b={b} /></div>
    </Card>
  );
}

export default function Exceptions() {
  const s = useHogan();
  const story = s.bills.find(b => b.id === "BILL-2034");
  const others = billExceptions(s).filter(b => b.id !== "BILL-2034");
  const grns = s.grns.filter(g => g.status !== "Passed");
  const late = s.pos.filter(p => poLateDays(p) > 0).sort((a, b) => poLateDays(b) - poLateDays(a));
  const count = (st: D.BillStatus) => s.bills.filter(b => b.status === st).length;

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Exceptions"
          sub="Supplier invoices that do not match what was ordered and received, and deliveries that failed a check. The Purchasing Agent finds them; people decide. Nothing is approved, paid or posted automatically." />

        <FlowStrip arrows={false} min={150} stages={[
          { key: "q", label: "Quantity discrepancy", count: count("Quantity discrepancy"), tone: "bad" },
          { key: "p", label: "Price variance", count: count("Price variance"), tone: "bad" },
          { key: "n", label: "No matching receipt", count: count("No matching receipt"), tone: "bad" },
          { key: "u", label: "Under review", count: count("Under review"), tone: "warn" },
          { key: "g", label: "Goods-in checks", count: grns.length, tone: "warn" },
          { key: "l", label: "Late deliveries", count: late.length, tone: "warn" },
        ]} />

        {story && (
          <Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{story.id}</span>{supName(story.supplier)}<Status s={story.status} />
            </span>}
            sub={"Supplier invoice " + eur(story.amount) + " · three-way match against " + (story.po || "") + " and " + (story.grn || "")}
            right={<Btn size="sm" kind="ghost" icon={I.external} onClick={() => openRecord("bill", story.id)}>Open bill</Btn>}>
            <BillMatch b={story} />
          </Card>
        )}

        {others.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...label, padding: "0 4px" }}>Other invoice exceptions · {others.length}</div>
            <div className="hk-two">{others.map(b => <OtherBill key={b.id} b={b} />)}</div>
          </div>
        )}

        <div className="hk-two">
          <Card title="Goods-in exceptions" sub={grns.length ? plural(grns.length, "delivery", "deliveries") + " with an open check" : "Every goods-in check has passed"}>
            {grns.length ? grns.map((g, gi) => {
              const po = s.pos.find(p => p.id === g.po);
              const qx = s.qx.filter(q => q.ref === g.id);
              return (
                <div key={g.id} style={{ marginTop: gi ? 18 : 0 }}>
                  <Row gap={8} wrap>
                    <RecLink type="grn" id={g.id} style={{ fontFamily: "var(--mono)" }}>{g.id}</RecLink>
                    <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{po ? supName(po.supplier) + " · " : ""}{g.po} · {date(g.date, false)}</span>
                    <Status s={g.status} />
                    {qx.map(q => <Badge key={q.id} tone={q.status === "Closed" ? "ok" : "warn"}><RecLink type="qx" id={q.id} style={{ color: "inherit" }}>{q.id}</RecLink> {q.status.toLowerCase()}</Badge>)}
                  </Row>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
                    {g.checks.map(c => (
                      <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                        <CheckMark ok={c.ok} />
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--ink)" }}>{c.k}</div>
                          {c.note && <div style={{ fontSize: 11.5, color: c.ok ? "var(--dim)" : c.ok === false ? "var(--bad)" : "var(--warn)" }}>{c.note}</div>}
                        </div>
                        {c.ok !== true && <Btn size="sm" kind="secondary" onClick={() => resolveGrnCheck(g.id, c.k, GRN_FIX[c.k]?.[1] || "Resolved.")}>{GRN_FIX[c.k]?.[0] || "Resolve"}</Btn>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing open. New deliveries are checked at the door in Goods receiving.</div>}
          </Card>

          <Card title="Late deliveries" sub={late.length ? plural(late.length, "PO") + " past the expected date" : "No PO is late"} flush bodyStyle={{ padding: "0 8px 10px" }}>
            {late.map(p => (
              <div key={p.id} className="ix11" onClick={() => openRecord("po", p.id)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}><span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{p.id}</span> · {supName(p.supplier)} <Badge tone="bad" style={{ height: 19, marginLeft: 4 }}>{poLateDays(p)} days late</Badge></div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>Expected {date(p.expected, false)} · {poReceived(p)}/{poOrdered(p)} units in{p.note ? " · " + p.note : ""}</div>
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" kind="secondary" onClick={() => chasePO(p)}>Chase</Btn>
                  <Btn size="sm" kind="accent" icon={I.scan} onClick={() => nav("Purchasing", "receiving", { "purchasing.po": p.id })}>Receive</Btn>
                </div>
              </div>
            ))}
            {!late.length && <div style={{ padding: 10, fontSize: 12.5, color: "var(--dim)" }}>Every open PO is within its expected date.</div>}
          </Card>
        </div>
      </Stack>
    </Page>
  );
}
