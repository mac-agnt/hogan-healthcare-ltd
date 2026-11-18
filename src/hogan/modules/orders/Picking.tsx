/* Orders · Picking & Packing (Story B, Interaction 2).
   SO-1047 for South Dublin Surgical Centre: five lines, three validated, two
   waiting (HH-AR-002 needs lot and expiry, HH-PT-415 needs a serial). Every
   scan is checked against the order before anything is marked; the store then
   moves a fully scanned order to Packed and closes Sharon's task. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { TODAY, date, eur, nowTime, plural } from "../../fmt";
import type { Gs1 } from "../../gs1";
import { ScanPanel } from "../../scan";
import { fefoLot, getState, nav, openRecord, orderById, orderProgress, scanOrderLine, scanTargetFor, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, I, Icon, Notice, Page, PageHeader, Person, Progress, RecLink, Row, Status, Timeline, label } from "../../ui";
import { CheckMark, MiniStat, Stack } from "./kit";
import {
  COURIERS, CUTOFF, accName, bookCourier, checkPickScan, daysLate, dispatchNow, markPacked, pickEvents, pickSamples, prodName, pushPickEvent, requiredLabel, startPicking, stockFor,
} from "./common";

const byRequired = (a: D.SalesOrder, b: D.SalesOrder) => (a.required === b.required ? (a.id < b.id ? -1 : 1) : a.required < b.required ? -1 : 1);

function QueueRow({ o, on, onPick }: { o: D.SalesOrder; on: boolean; onPick: () => void }) {
  const p = orderProgress(o);
  const late = daysLate(o);
  return (
    <div onClick={onPick} className={on ? undefined : "ix11"}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", minWidth: 0,
        background: on ? "var(--accent-faint)" : undefined, border: "1px solid " + (on ? "var(--accent-line)" : "transparent") }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: on ? "var(--ink)" : "var(--accent)", fontWeight: on ? 600 : 500 }}>{o.id}</span>
          {o.status === "Picking" || o.status === "Confirmed"
            ? late > 0 ? <Badge tone="bad" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>{late}d late</Badge> : o.required === TODAY ? <Badge tone="warn" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>Today</Badge> : null
            : null}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{accName(o.account)}</div>
      </div>
      <div style={{ width: 52, flex: "none", textAlign: "right" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: p.scanned === p.total ? "var(--ok)" : "var(--ink)" }}>{p.scanned}/{p.total}</div>
        <Progress value={p.scanned} max={p.total} h={4} tone={p.scanned === p.total ? "ok" : "accent"} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ ...label, fontSize: 9, padding: "8px 10px 4px", display: "flex", gap: 6 }}><span style={{ flex: 1 }}>{title}</span><span>{count}</span></div>
      {children}
    </div>
  );
}

export default function Picking() {
  const s = useHogan();
  const [sel, setSel] = useUi<string>("orders.pick", "SO-1047");
  const picking = s.orders.filter(o => o.status === "Picking").sort(byRequired);
  const ready = s.orders.filter(o => o.status === "Confirmed").sort(byRequired);
  const packed = s.orders.filter(o => o.status === "Packed").sort(byRequired);
  const o = orderById(sel, s) || picking[0] || ready[0];

  const queue = (
    <Card title="Pick queue" sub={plural(picking.length, "order") + " being picked · " + ready.length + " ready to start"} flush bodyStyle={{ padding: "0 8px 10px" }}>
      <div className="hk-scroll" style={{ maxHeight: 620 }}>
        <Group title="Picking" count={picking.length}>{picking.map(x => <QueueRow key={x.id} o={x} on={x.id === o?.id} onPick={() => setSel(x.id)} />)}</Group>
        <Group title="Ready to pick" count={ready.length}>{ready.map(x => <QueueRow key={x.id} o={x} on={x.id === o?.id} onPick={() => setSel(x.id)} />)}</Group>
        <Group title="Packed, ready to dispatch" count={packed.length}>{packed.map(x => <QueueRow key={x.id} o={x} on={x.id === o?.id} onPick={() => setSel(x.id)} />)}</Group>
      </div>
    </Card>
  );

  if (!o) {
    return (
      <Page><Stack>
        <PageHeader eyebrow="Orders" title="Picking & packing" />
        <Card><Empty title="Nothing to pick" sub="Every confirmed order has been picked and packed." action={<Btn kind="secondary" onClick={() => nav("Orders", "dispatch")}>Open dispatch board</Btn>} /></Card>
      </Stack></Page>
    );
  }

  const prog = orderProgress(o);
  const open = o.lines.filter(l => !l.scanned);
  const nextLine = open[0];
  const complete = prog.scanned === prog.total;
  const acc = D.accountById(o.account);
  const task = s.tasks.find(t => t.related?.id === o.id && t.status !== "Done") || s.tasks.find(t => t.related?.id === o.id);
  const exceptions = pickEvents(s, o.id).filter(e => !e.ok);
  const history = s.events.filter(e => e.ref === o.id).slice(0, 6);
  const late = daysLate(o);
  const needText = (l: D.OrderLine) => {
    const p = D.productBySku(l.sku);
    return (l.needs || (p?.tracking === "serial" ? "serial" : "lot")) === "serial" ? "needs serial" : "needs lot and expiry";
  };

  const onScan = (g: Gs1): string | void => {
    const cur = orderById(o.id);
    if (!cur) return "Order not found.";
    const v = checkPickScan(cur, g, getState());
    if (!v.ok) {
      pushPickEvent({ time: nowTime(), order: o.id, ok: false, code: v.code, msg: v.msg });
      return v.msg;
    }
    startPicking(o.id);
    scanOrderLine(o.id, v.line.id, { lot: g.lot, serial: g.serial, expiry: g.expiry });
    pushPickEvent({ time: nowTime(), order: o.id, ok: true, code: "Validated", msg: v.line.sku + (g.serial ? " · serial " + g.serial : " · lot " + g.lot) + (g.expiry ? " · exp " + date(g.expiry) : "") });
  };

  const station = complete ? (
    <Card tone={o.status === "Issue" ? "bad" : "ok"} title={
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon d={o.status === "Dispatched" || o.status === "Delivered" ? I.truck : I.check} size={16} color={o.status === "Issue" ? "var(--bad)" : "var(--ok)"} />
        {o.status === "Packed" ? "Ready for dispatch" : o.status === "Awaiting courier" ? "Courier booked" : o.status === "Dispatched" ? "Dispatched" : o.status === "Delivered" ? "Delivered" : o.status === "Issue" ? "On hold" : "All lines validated"}
      </span>}
      sub={prog.total + "/" + prog.total + " lines validated against lot, serial and expiry."}>
      {(o.status === "Picking" || o.status === "Confirmed") && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>Every line on {o.id} is validated but the order was never closed off. Pack it to release it to dispatch.</div>
          <Btn kind="primary" icon={I.box} full style={{ marginTop: 14 }} onClick={() => markPacked(o.id)}>Mark packed</Btn>
        </>
      )}
      {o.status === "Packed" && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>{o.id} is packed for {accName(o.account)}. {o.courier ? o.courier + " is pencilled in; " : ""}courier cut-off {CUTOFF}.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <Btn kind="primary" size="lg" icon={I.truck} full onClick={() => dispatchNow(o.id)}>Dispatch now · {o.courier || COURIERS[0]}</Btn>
            <Btn kind="secondary" full onClick={() => bookCourier(o.id, o.courier || COURIERS[0])}>Book a collection instead</Btn>
          </div>
        </>
      )}
      {o.status === "Awaiting courier" && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--body)" }}>{o.courier} booked. Mark it collected when the driver signs for it.</div>
          <Btn kind="primary" icon={I.truck} full style={{ marginTop: 14 }} onClick={() => dispatchNow(o.id)}>Collected · dispatch</Btn>
        </>
      )}
      {(o.status === "Dispatched" || o.status === "Delivered") && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>
            {o.status === "Delivered" ? "Delivered " + date(o.delivered || TODAY, false) + ". " : "Left the main stockroom " + (o.dispatched === TODAY ? "today" : date(o.dispatched || TODAY, false)) + " with " + (o.courier || "the courier") + ". "}
            Tracking {o.tracking || "pending"} (demo reference; courier tracking is not connected).
          </div>
          <Row gap={8} style={{ marginTop: 14 }} wrap>
            <Btn kind="secondary" icon={I.truck} onClick={() => nav("Orders", "dispatch")}>Dispatch board</Btn>
            <Btn kind="ghost" onClick={() => openRecord("order", o.id)}>Open order</Btn>
          </Row>
        </>
      )}
      {o.status === "Issue" && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--body)" }}>{o.issue}</div>
          <Btn kind="primary" full style={{ marginTop: 14 }} onClick={() => openRecord("order", o.id)}>Resolve hold</Btn>
        </>
      )}
    </Card>
  ) : (
    <Card title="Scan station" sub={nextLine ? "Next: " + nextLine.sku + " · " + prodName(nextLine.sku) : undefined}>
      <ScanPanel key={o.id} compact onScan={onScan} simulate={() => (nextLine ? scanTargetFor(o.id, nextLine.id) : undefined)} samples={pickSamples(o, s)}
        placeholder="Scan the GS1 label on the product"
        hint={<>Each scan is checked against {o.id} before anything is marked: product, expiry, lot or serial, and quarantine.</>} />
    </Card>
  );

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="Picking & packing"
          sub="Scan each line once. Lot, serial and expiry are captured at the shelf, so the order is traceable before it leaves the building."
          right={<Btn kind="secondary" icon={I.truck} onClick={() => nav("Orders", "dispatch")}>Dispatch board · {packed.length} packed</Btn>} />

        <div className="hk-side">
          <div style={{ minWidth: 0 }}>{queue}</div>

          <div className="hk-first-sm" style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {/* Order header and progress */}
            <Card>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                  <Row gap={8} wrap>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)" }}>{o.id}</span>
                    <Status s={o.status} />
                    {o.status === "Picking" && o.required === TODAY && <Badge tone="warn">Dispatch expected today</Badge>}
                    {late > 0 && <Badge tone="bad">{late} days past required date</Badge>}
                  </Row>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 7 }}>
                    <RecLink type="account" id={o.account} style={{ color: "var(--ink)", textDecorationColor: "var(--border-strong)" }}>{accName(o.account)}</RecLink>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
                    {acc?.type} · hospital PO {o.poRef} · required {requiredLabel(o).toLowerCase() === "today" ? "today" : requiredLabel(o)} · {o.courier ? o.courier + ", cut-off " + CUTOFF : "courier not booked"} · {eur(D.orderValue(o))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <Person id={o.owner} sub={task ? "Assigned · " + task.id + (task.dueTime ? " due " + task.dueTime : "") + " · " + task.status : "Assigned"} />
                  <Btn size="sm" kind="ghost" icon={I.external} onClick={() => openRecord("order", o.id)}>Open order</Btn>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ flex: "none" }}>
                  <div style={{ ...label, fontSize: 9 }}>Scan progress</div>
                  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.1, marginTop: 3, fontVariantNumeric: "tabular-nums", color: complete ? "var(--ok)" : "var(--ink)" }}>
                    {prog.scanned}<span style={{ color: "var(--faint)", fontWeight: 500 }}>/{prog.total}</span>
                  </div>
                </div>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {o.lines.map(l => <div key={l.id} title={l.sku + (l.scanned ? " validated" : " outstanding")} style={{ flex: 1, height: 8, borderRadius: 4, background: l.scanned ? "var(--ok)" : "var(--track)", transition: "background .4s var(--ease)" }} />)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
                    {open.length ? <>{plural(open.length, "line")} awaiting validation: {open.map((l, i) => <span key={l.id}>{i > 0 && " · "}<b style={{ color: "var(--ink)", fontWeight: 600 }}>{l.sku}</b> {needText(l)}</span>)}</>
                      : "Every line validated. " + (o.status === "Packed" ? "Ready for dispatch." : "")}
                  </div>
                </div>
                <MiniStat k="Units" v={o.lines.reduce((a, l) => a + l.qty, 0)} style={{ flex: "none" }} />
              </div>
            </Card>

            <div className="hk-two">
              {station}

              <Card title="Checklist" sub={plural(o.lines.length, "line") + " · " + prog.scanned + " validated"} flush bodyStyle={{ padding: "0 10px 10px" }}>
                {o.lines.map(l => {
                  const p = D.productBySku(l.sku);
                  const sl = stockFor(l, s);
                  const f = !l.scanned && p?.tracking === "lot" ? fefoLot(l.sku, s) : undefined;
                  const serials = !l.scanned && p?.tracking === "serial" ? s.stock.filter(x => x.sku === l.sku && x.loc === "DLM" && x.qty > 0 && x.serial && !s.orders.some(oo => oo.lines.some(y => y.serial === x.serial))).length : 0;
                  const isNext = nextLine?.id === l.id;
                  return (
                    <div key={l.id} style={{ display: "flex", gap: 10, padding: "10px 8px", borderRadius: "var(--r-sm,10px)", alignItems: "flex-start", background: isNext ? "var(--accent-faint)" : undefined }}>
                      <CheckMark ok={l.scanned ? true : null} size={22} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <RecLink type="product" id={l.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.sku}</RecLink>
                          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>× {l.qty}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: l.scanned ? "var(--dim)" : "var(--warn)", marginTop: 3, lineHeight: 1.45 }}>
                          {l.scanned
                            ? <>{l.serial ? "Serial " + l.serial : "Lot " + (l.lot || "n/a")}{sl?.expiry ? " · exp " + date(sl.expiry) : ""} · validated</>
                            : <>Awaiting validation: {needText(l)}{f ? " · FEFO lot " + f.lot + (f.expiry ? ", exp " + date(f.expiry) : "") + " on the shelf" : ""}{serials ? " · " + plural(serials, "serial") + " free on the shelf" : ""}</>}
                        </div>
                      </div>
                      {isNext && <Badge tone="accent" style={{ height: 19, fontSize: 10 }}>Next</Badge>}
                    </div>
                  );
                })}
              </Card>
            </div>

            <div className="hk-two">
              <Card title="Exceptions" sub={exceptions.length ? plural(exceptions.length, "scan") + " refused on " + o.id + ". Nothing was marked for these." : "Refused scans show here with the reason."}>
                {exceptions.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {exceptions.slice(0, 6).map((e, i) => (
                      <Notice key={i} tone="bad" title={e.code} right={<span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{e.time}</span>}>{e.msg}</Notice>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
                    No exceptions on this order. To see the checks, try the sample barcodes <b style={{ color: "var(--ink)", fontWeight: 500 }}>Wrong product</b> or <b style={{ color: "var(--ink)", fontWeight: 500 }}>Expired lot</b> in the scan station.
                  </div>
                )}
              </Card>
              <Card title="Order activity" sub="Written to the activity log as it happens">
                {history.length ? <Timeline dense items={history.map(e => ({ when: (e.date === TODAY ? "Today" : date(e.date, false)) + " · " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: e.stream === "ai" ? "accent" : e.status === "completed" ? "ok" : "warn", icon: e.stream === "ai" ? I.agent : undefined }))} />
                  : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No activity recorded yet.</div>}
              </Card>
            </div>
          </div>
        </div>
      </Stack>
    </Page>
  );
}
