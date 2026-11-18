/* Orders · Dispatch: six lanes from packed to delivered, plus issues.
   Booking, dispatching and delivery confirmation are explicit clicks; courier
   tracking is not connected, so proof of delivery is confirmed by hand. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, daysBetween, eur, eurK, plural } from "../../fmt";
import { nav, openRecord, orderProgress, useHogan, useUi } from "../../store";
import { Btn, I, Icon, Page, PageHeader, Progress, Seg, TONE, label, type Tone } from "../../ui";
import { AgentLine, FlowStrip, Stack } from "./kit";
import { COURIERS, CUTOFF, accName, bookCourier, confirmDelivery, daysLate, dispatchNow, requiredLabel } from "./common";

function Lane({ title, sub, tone, count, value, action, children }: { title: string; sub: string; tone: Tone; count: number; value: number; action?: ReactNode; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <section style={{ minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", overflow: "hidden" }}>
      <div style={{ padding: "13px 14px 11px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, color: t.fg, fontSize: 13, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{count}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px" }}>{title}</div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{sub}{count ? " · " + eurK(value) : ""}</div>
        </div>
        {action}
      </div>
      <div className="hk-scroll" style={{ maxHeight: 360, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </section>
  );
}

function OrderCard({ o, meta, warn, children }: { o: D.SalesOrder; meta: ReactNode; warn?: ReactNode; children?: ReactNode }) {
  return (
    <div onClick={() => openRecord("order", o.id)} className="ixz"
      style={{ padding: "10px 11px", borderRadius: "var(--r-sm,11px)", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", minWidth: 0, animation: "rowIn .3s var(--ease) both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--accent)" }}>{o.id}</span>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(D.orderValue(o))}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{accName(o.account)}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{meta}</div>
      {warn && <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 4, lineHeight: 1.45 }}>{warn}</div>}
      {children && <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <div style={{ padding: "18px 10px", fontSize: 12.5, color: "var(--dim)", textAlign: "center", lineHeight: 1.5 }}>{children}</div>;
}

export default function Dispatch() {
  const s = useHogan();
  const [courier, setCourier] = useUi<string>("orders.courier", COURIERS[0]);
  const by = (st: D.OrderStatus) => s.orders.filter(o => o.status === st);
  const val = (l: D.SalesOrder[]) => l.reduce((a, o) => a + D.orderValue(o), 0);
  const asc = (a: D.SalesOrder, b: D.SalesOrder) => (a.required < b.required ? -1 : a.required > b.required ? 1 : a.id < b.id ? -1 : 1);

  const ready = by("Packed").sort(asc);
  const picking = by("Picking").sort(asc);
  const awaiting = by("Awaiting courier").sort(asc);
  const sent = by("Dispatched").sort((a, b) => ((a.dispatched || "") < (b.dispatched || "") ? -1 : 1));
  const week = addDays(TODAY, -7);
  const delivered = by("Delivered").filter(o => (o.delivered || "") >= week).sort((a, b) => ((a.delivered || "") < (b.delivered || "") ? 1 : -1));
  const lastDelivered = by("Delivered").sort((a, b) => ((a.delivered || "") < (b.delivered || "") ? 1 : -1))[0];
  const issues = by("Issue");
  const sentToday = s.orders.filter(o => o.dispatched === TODAY);

  const lateTag = (o: D.SalesOrder) => (daysLate(o) > 0 ? " · " + daysLate(o) + "d past required" : "");

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="Dispatch"
          sub={"Courier cut-off " + CUTOFF + ". " + plural(sentToday.length, "order") + " dispatched today. Courier tracking is not connected yet, so delivery is confirmed by hand."}
          right={<>
            <span style={{ ...label, fontSize: 9 }}>Book with</span>
            <Seg size="sm" value={courier} onChange={setCourier} items={COURIERS.map(c => [c, c] as [string, string])} />
          </>} />

        <FlowStrip min={150} stages={[
          { key: "ready", label: "Ready to dispatch", count: ready.length, sub: eurK(val(ready)) },
          { key: "picking", label: "Awaiting packing", count: picking.length, sub: eurK(val(picking)) },
          { key: "awaiting", label: "Awaiting courier", count: awaiting.length, sub: eurK(val(awaiting)) },
          { key: "sent", label: "Dispatched", count: sent.length, sub: eurK(val(sent)) },
          { key: "delivered", label: "Delivered, 7 days", count: delivered.length, sub: delivered.length ? eurK(val(delivered)) : "none confirmed", tone: delivered.length ? "ok" : undefined },
          { key: "issues", label: "Issues", count: issues.length, sub: issues.length ? eurK(val(issues)) : "clear", tone: "bad" },
        ]} />

        {awaiting.length > 0 && (
          <AgentLine agent="Order Flow Agent" when="Suggestion"
            right={<Btn size="sm" kind="primary" icon={I.truck} onClick={() => awaiting.forEach(o => dispatchNow(o.id, courier))}>Mark {awaiting.length} collected</Btn>}>
            {plural(awaiting.length, "order")} packed and waiting for a collection: {awaiting.map(o => o.id).join(", ")}. Suggest putting them on the next run before the {CUTOFF} cut-off. Mark them collected once the driver has signed.
          </AgentLine>
        )}

        <div className="hk-lanes">
          <Lane title="Ready to dispatch" sub="Packed, no courier yet" tone="ok" count={ready.length} value={val(ready)}
            action={ready.length > 1 ? <Btn size="sm" kind="accent" onClick={() => ready.forEach(o => bookCourier(o.id, courier))}>Book all</Btn> : undefined}>
            {ready.length ? ready.map(o => (
              <OrderCard key={o.id} o={o} meta={plural(o.lines.length, "line") + " · required " + requiredLabel(o) + lateTag(o)}>
                <Btn size="sm" kind="primary" onClick={() => bookCourier(o.id, courier)}>Book courier</Btn>
                <Btn size="sm" kind="secondary" icon={I.truck} onClick={() => dispatchNow(o.id, courier)}>Dispatch</Btn>
              </OrderCard>
            )) : <Quiet>Nothing packed and waiting. Orders land here once every line is scanned.</Quiet>}
          </Lane>

          <Lane title="Awaiting packing" sub="Still being picked" tone="warn" count={picking.length} value={val(picking)}>
            {picking.length ? picking.map(o => {
              const p = orderProgress(o);
              return (
                <OrderCard key={o.id} o={o} meta={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><Progress value={p.scanned} max={p.total} h={4} style={{ flex: 1 }} />{p.scanned}/{p.total} scanned</span>}
                  warn={o.required <= TODAY ? (o.required === TODAY ? "Due today" : daysLate(o) + " days past required date") : undefined}>
                  <Btn size="sm" kind="accent" icon={I.scan} onClick={() => nav("Orders", "picking", { "orders.pick": o.id })}>Scan</Btn>
                </OrderCard>
              );
            }) : <Quiet>No orders mid-pick.</Quiet>}
          </Lane>

          <Lane title="Awaiting courier" sub="Booked, waiting for collection" tone="info" count={awaiting.length} value={val(awaiting)}>
            {awaiting.length ? awaiting.map(o => (
              <OrderCard key={o.id} o={o} meta={(o.courier || "Courier") + " · required " + requiredLabel(o) + lateTag(o)}>
                <Btn size="sm" kind="primary" icon={I.truck} onClick={() => dispatchNow(o.id, courier)}>Collected</Btn>
              </OrderCard>
            )) : <Quiet>No collections outstanding.</Quiet>}
          </Lane>

          <Lane title="Dispatched" sub="On the road, delivery not confirmed" tone="accent" count={sent.length} value={val(sent)}>
            {sent.length ? sent.map(o => {
              const days = o.dispatched ? daysBetween(o.dispatched, TODAY) : 0;
              return (
                <OrderCard key={o.id} o={o} meta={"Sent " + (o.dispatched === TODAY ? "today" : date(o.dispatched || TODAY, false)) + " · " + (o.courier || "") + " · " + (o.tracking || "")}
                  warn={days >= 3 ? "No proof of delivery after " + days + " days" : undefined}>
                  <Btn size="sm" kind="secondary" icon={I.check} onClick={() => confirmDelivery(o.id)}>Confirm delivery</Btn>
                </OrderCard>
              );
            }) : <Quiet>Nothing in transit.</Quiet>}
          </Lane>

          <Lane title="Delivery confirmed" sub="Delivered in the last 7 days" tone="ok" count={delivered.length} value={val(delivered)}>
            {delivered.length ? delivered.map(o => (
              <OrderCard key={o.id} o={o} meta={"Delivered " + (o.delivered === TODAY ? "today" : date(o.delivered || TODAY, false)) + " · " + (o.courier || "")} />
            )) : (
              <Quiet>
                No deliveries confirmed since {date(week, false)}. {sent.length ? plural(sent.length, "dispatched order") + " still need proof of delivery." : ""}
                {lastDelivered && <div style={{ marginTop: 6, color: "var(--faint)" }}>Last confirmed: {lastDelivered.id}, {date(lastDelivered.delivered || TODAY, false)}</div>}
              </Quiet>
            )}
          </Lane>

          <Lane title="Issues" sub="On hold until someone decides" tone="bad" count={issues.length} value={val(issues)}>
            {issues.length ? issues.map(o => (
              <OrderCard key={o.id} o={o} meta={"Required " + requiredLabel(o) + lateTag(o)} warn={o.issue}>
                <Btn size="sm" kind="danger" icon={I.alert} onClick={() => openRecord("order", o.id)}>Resolve</Btn>
              </OrderCard>
            )) : <Quiet><Icon d={I.check} size={14} color="var(--ok)" style={{ verticalAlign: "-2px", marginRight: 6 }} />No orders on hold.</Quiet>}
          </Lane>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "0 4px", lineHeight: 1.5 }}>
          Dispatching takes the stock out of the main stockroom and writes a traceable movement per lot or serial. Tracking numbers are demo references.
        </div>
      </Stack>
    </Page>
  );
}
