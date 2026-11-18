/* Orders · Returns: requested → received → inspected → restocked or returned
   to the supplier. Restocking writes a traceable "Return" movement into the
   main stockroom. Credit notes are approved by Graham; Pulse does not raise
   them in the accounts system (not connected). */

import * as D from "../../data";
import { TODAY, addDays, date, eur, plural } from "../../fmt";
import { decideApproval, getState, log, moveStock, nextId, openRecord, patch, setReturnStatus, toast, useHogan, useUi, type HState } from "../../store";
import { Badge, Btn, Card, I, Icon, Notice, Page, PageHeader, RecLink, Row, Status } from "../../ui";
import { FlowStrip, MiniSteps, MiniStat, Stack } from "./kit";
import { accName } from "./common";

export const RETURN_FLOW: D.ReturnRec["status"][] = ["Requested", "Received", "Inspected", "Restocked", "Return to supplier"];
export const returnFrom = (r: D.ReturnRec) => (r.account === "DLM" ? "Main stockroom (internal)" : accName(r.account));
export const returnValue = (r: D.ReturnRec) => r.qty * (D.productBySku(r.sku)?.unitPrice || 0);
export const creditApproval = (r: D.ReturnRec, s: HState) => s.approvals.find(a => a.ref.type === "return" && a.ref.id === r.id);
const closed = (r: D.ReturnRec) => r.status === "Restocked" || r.status === "Return to supplier";

export function advanceReturn(r: D.ReturnRec, to: D.ReturnRec["status"]) {
  if (to === "Restocked") {
    const s = getState();
    const acc = D.accountById(r.account);
    const loc = acc?.locId;
    const fromLoc = loc && s.stock.some(l => l.loc === loc && l.sku === r.sku && l.lot === r.lot && l.qty >= r.qty) ? loc : acc?.name || r.account;
    const lotLine = s.stock.find(l => l.sku === r.sku && l.lot === r.lot);
    const ok = moveStock({ type: "Return", sku: r.sku, lot: r.lot, expiry: lotLine?.expiry, qty: r.qty, from: fromLoc, to: "DLM", ref: r.id, by: "SO", note: r.id + ": inspected and restocked." });
    if (!ok) return;
  }
  setReturnStatus(r.id, to);
  toast(r.id + ": " + (to === "Restocked" ? "restocked. " + r.qty + " × " + r.sku + " back in the main stockroom." : to === "Return to supplier" ? "held for return to the supplier." : to.toLowerCase() + "."));
}

export function approveCredit(r: D.ReturnRec, apId: string) {
  decideApproval(apId, true, "GH");
  patch(s => ({ returns: s.returns.map(x => (x.id === r.id && x.credit ? { ...x, credit: x.credit.replace(" (pending approval)", " (approved)") } : x)) }));
}

function nextCn(s: HState): string {
  let max = 0;
  s.returns.forEach(r => { const m = r.credit?.match(/CN-(\d+)/); if (m) max = Math.max(max, Number(m[1])); });
  return "CN-" + String(max + 1).padStart(4, "0");
}

export function requestCredit(r: D.ReturnRec) {
  const s = getState();
  const cn = nextCn(s);
  const value = returnValue(r);
  const apId = nextId("AP-", s.approvals, 2, 74);
  const ap: D.Approval = { id: apId, kind: "Credit note", title: cn + " for " + accName(r.account) + " return " + r.id, requestedBy: "SO", approver: "GH", value, raised: TODAY, status: "Awaiting",
    ref: { type: "return", id: r.id }, detail: r.qty + " × " + r.sku + " returned: " + r.reason + ". Credit at list price." };
  patch(st => ({ returns: st.returns.map(x => (x.id === r.id ? { ...x, credit: cn + " (pending approval)" } : x)), approvals: [ap, ...st.approvals] }));
  log({ stream: "people", actor: "Sharon O'Mongain", title: "Requested credit note " + cn, note: r.id + " · " + eur(value) + " · waiting for Graham", status: "awaiting", ref: r.id, refType: "return" });
  toast(cn + " requested. Waiting for Graham's approval.", "info");
}

/** Next step button(s) for a return, shared by the card and the drawer. */
export function ReturnActions({ r, s, size = "sm" }: { r: D.ReturnRec; s: HState; size?: "sm" | "md" }) {
  const ap = creditApproval(r, s);
  const lotLine = s.stock.find(l => l.sku === r.sku && l.lot === r.lot && l.expiry);
  const shortDated = !!lotLine?.expiry && lotLine.expiry < addDays(TODAY, 90);
  return (
    <Row gap={6} wrap>
      {r.status === "Requested" && <Btn size={size} kind="primary" icon={I.box} onClick={() => advanceReturn(r, "Received")}>Mark received</Btn>}
      {r.status === "Received" && <Btn size={size} kind="primary" icon={I.shield} onClick={() => advanceReturn(r, "Inspected")}>Record inspection</Btn>}
      {r.status === "Inspected" && (
        <>
          <Btn size={size} kind={shortDated ? "secondary" : "primary"} icon={I.refresh} onClick={() => advanceReturn(r, "Restocked")}>Restock</Btn>
          <Btn size={size} kind={shortDated ? "primary" : "secondary"} icon={I.truck} onClick={() => advanceReturn(r, "Return to supplier")}>Return to supplier</Btn>
        </>
      )}
      {ap?.status === "Awaiting" && <Btn size={size} kind="accent" icon={I.check} onClick={() => approveCredit(r, ap.id)}>Approve credit as Graham</Btn>}
      {!r.credit && !ap && r.account !== "DLM" && r.status !== "Requested" && <Btn size={size} kind="secondary" icon={I.euro} onClick={() => requestCredit(r)}>Request credit note</Btn>}
    </Row>
  );
}

export function returnSteps(r: D.ReturnRec) {
  const i = RETURN_FLOW.indexOf(r.status);
  const end = r.status === "Return to supplier" ? "Return to supplier" : r.status === "Restocked" ? "Restocked" : "Outcome";
  return [
    { label: "Requested", done: i >= 1, active: i === 0 },
    { label: "Received", done: i >= 2, active: i === 1 },
    { label: "Inspected", done: i >= 3, active: i === 2 },
    { label: end, done: i >= 3, active: false },
  ];
}

export default function Returns() {
  const s = useHogan();
  const [filter, setFilter] = useUi<string>("orders.retFilter", "");
  const list = s.returns.filter(r => !filter || r.status === filter).slice().sort((a, b) => RETURN_FLOW.indexOf(a.status) - RETURN_FLOW.indexOf(b.status) || (a.raised < b.raised ? 1 : -1));
  const open = s.returns.filter(r => !closed(r));
  const credits = s.approvals.filter(a => a.ref.type === "return");
  const pending = credits.filter(a => a.status === "Awaiting");
  const qx = s.qx.filter(q => q.refType === "return");

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="Returns"
          sub="Requested, received, inspected, then restocked or sent back to the supplier. Restocked units go back into the main stockroom with their lot, so traceability holds." />

        <FlowStrip stages={RETURN_FLOW.map(st => ({ key: st, label: st, count: s.returns.filter(r => r.status === st).length, sub: plural(s.returns.filter(r => r.status === st).reduce((a, r) => a + r.qty, 0), "unit") }))}
          active={filter} onPick={setFilter} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(340px,100%),1fr))", gap: 12, minWidth: 0 }}>
          {list.map(r => {
            const p = D.productBySku(r.sku);
            const ap = creditApproval(r, s);
            const lotLine = s.stock.find(l => l.sku === r.sku && l.lot === r.lot && l.expiry);
            return (
              <Card key={r.id} onClick={() => openRecord("return", r.id)} pad={16}
                title={<span style={{ display: "flex", gap: 8, alignItems: "baseline", minWidth: 0 }}><span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--accent)", whiteSpace: "nowrap" }}>{r.id}</span><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{returnFrom(r)}</span></span>}
                right={<Status s={r.status} />}>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>{r.qty} × <RecLink type="product" id={r.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.sku}</RecLink> {p?.name}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
                  Lot <RecLink type="lot" id={r.sku + "|" + r.lot}>{r.lot}</RecLink>{lotLine?.expiry ? " · exp " + date(lotLine.expiry) : ""} · raised {date(r.raised, false)}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 8 }}>{r.reason}</div>
                <div style={{ marginTop: 12 }}><MiniSteps steps={returnSteps(r)} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--dim)", flexWrap: "wrap" }}>
                  <Icon d={I.euro} size={13} color="var(--faint)" />
                  <span>{r.credit ? "Credit " + r.credit : r.account === "DLM" ? "Internal: no customer credit" : "No credit note yet"} · {eur(returnValue(r))} at list</span>
                  {ap && <Badge tone={ap.status === "Awaiting" ? "warn" : ap.status === "Approved" ? "ok" : "bad"}>{ap.id} {ap.status === "Awaiting" ? "with Graham" : ap.status.toLowerCase()}</Badge>}
                </div>
                <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}><ReturnActions r={r} s={s} /></div>
              </Card>
            );
          })}
        </div>

        <div className="hk-three">
          <Card title="Open returns" sub={plural(open.length, "return") + " still moving"}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <MiniStat k="Units" v={open.reduce((a, r) => a + r.qty, 0)} />
              <MiniStat k="Value at list" v={eur(open.reduce((a, r) => a + returnValue(r), 0))} />
              <MiniStat k="Credits with Graham" v={pending.length} tone={pending.length ? "warn" : undefined} sub={pending.length ? eur(pending.reduce((a, x) => a + (x.value || 0), 0)) : "none waiting"} />
              <MiniStat k="Oldest open" v={open.length ? date(open.reduce((m, r) => (r.raised < m ? r.raised : m), TODAY), false) : "n/a"} />
            </div>
          </Card>
          <Card title="Credit notes" sub="Approved in Pulse by Graham. Raised in the accounts system, which is not connected." flush bodyStyle={{ padding: "0 8px 10px" }}>
            {s.returns.filter(r => r.credit || creditApproval(r, s)).map(r => {
              const ap = creditApproval(r, s);
              return (
                <div key={r.id} className="ix11" onClick={() => openRecord("return", r.id)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)" }}>{(r.credit || "").replace(/ \(.*\)$/, "") || "Credit"} · {r.id}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{accName(r.account)} · {eur(ap?.value || returnValue(r))}</div>
                  </div>
                  {ap ? <Status s={ap.status === "Awaiting" ? "Awaiting approval" : ap.status} /> : <Badge tone="ok">Raised</Badge>}
                </div>
              );
            })}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            {qx.length > 0 && (
              <Notice tone="warn" title="Linked quality records">
                {qx.map(q => <div key={q.id} style={{ marginTop: 3 }}><RecLink type="qx" id={q.id}>{q.id}</RecLink>: {q.title} ({q.status.toLowerCase()})</div>)}
              </Notice>
            )}
            <Notice tone="info" title="Traceability">Restocking adds the units back to the main stockroom under their original lot, with a return movement. Short-dated lots are better sent back to the supplier.</Notice>
          </div>
        </div>
      </Stack>
    </Page>
  );
}
