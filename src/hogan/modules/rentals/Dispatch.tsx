/* Rentals · Dispatch & Returns: get reserved units out, bring hires back, clean and inspect. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { openRecord, useHogan } from "../../store";
import { Badge, Card, Empty, I, Page, PageHeader, Row, label } from "../../ui";
import { TODAY, addDays, date, dayDate, eur, rel } from "../../fmt";
import { useWidth } from "../sales/lib";
import { customerKind, weeksOf } from "./lib";
import { BookingStatus, DeliveryPicker, DispatchChecklist, HireActions, InspectionPanel, RentalFeed } from "./parts";

export default function Dispatch() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const toGo = s.bookings.filter(b => b.status === "Reserved" || b.status === "Dispatched").sort((a, b) => a.start.localeCompare(b.start));
  const out = s.bookings.filter(b => b.status === "On hire").sort((a, b) => a.end.localeCompare(b.end));
  const insp = s.assets.filter(a => a.status === "Inspection");
  const cols = w >= 1080 ? "repeat(3,minmax(0,1fr))" : w >= 720 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Rentals · Dispatch & Returns" title="Dispatch and returns"
          sub={toGo.length + " to send out · " + out.length + " on hire · " + insp.length + " in cleaning and inspection. Tick the dispatch steps before a unit leaves; returned units go through checks before they can be hired again."} />

        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14, alignItems: "start" }}>
          <Lane title="To dispatch" sub="Reserved and out for delivery" count={toGo.length}>
            {toGo.length === 0 && <Empty title="Nothing to send" sub="Confirmed enquiries appear here." icon={I.truck} />}
            {toGo.map(b => (
              <Item key={b.id} b={b}>
                <Row gap={8} wrap style={{ fontSize: 12, color: "var(--dim)" }}>
                  <span style={{ flex: 1 }}>Starts {dayDate(b.start)} · {rel(b.start).toLowerCase()}</span>
                  {b.status === "Reserved" ? <DeliveryPicker b={b} /> : <span>{b.delivery}</span>}
                </Row>
                {b.status === "Reserved" ? <DispatchChecklist b={b} compact /> : <HireActions b={b} />}
              </Item>
            ))}
          </Lane>

          <Lane title="On hire" sub="Due back first at the top" count={out.length}>
            {out.length === 0 && <Empty title="No units on hire" />}
            {out.map(b => {
              const late = b.end < TODAY, soon = b.end <= addDays(TODAY, 1);
              return (
                <Item key={b.id} b={b} tone={late ? "bad" : soon ? "warn" : undefined}>
                  <div style={{ fontSize: 12, color: late ? "var(--bad)" : soon ? "var(--warn)" : "var(--dim)" }}>
                    Due back {dayDate(b.end)} · {rel(b.end).toLowerCase()} · {b.delivery}
                  </div>
                  {b.extension?.state === "Requested" && <Badge tone="warn">Customer asked for +{b.extension.weeks} week · {eur(b.extension.fee)}</Badge>}
                  {b.extension?.state === "Approved" && <Badge tone="ok">Extension approved · +{b.extension.weeks} week</Badge>}
                  <HireActions b={b} />
                </Item>
              );
            })}
          </Lane>

          <Lane title="Cleaning and inspection" sub="Checks before a unit goes out again" count={insp.length}>
            {insp.length === 0 && <Empty title="Every returned unit is clean" sub="Mark a hire returned and the unit lands here for checks." icon={I.shield} />}
            {insp.map(a => (
              <div key={a.id} style={{ padding: 12, borderRadius: 13, background: "var(--surface-faint)", border: "1px solid var(--warn-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
                <Row gap={8}>
                  <button className="ix3" onClick={() => openRecord("rental", a.id)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{a.id}</button>
                  <span style={{ flex: 1, fontSize: 11.5, color: "var(--faint)" }}>Serial {a.serial} · last service {date(a.lastService, false)}</span>
                  <Badge tone="warn">Inspection</Badge>
                </Row>
                <InspectionPanel asset={a} />
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>Cleaning and functional checks only. No patient or health details are recorded against a unit.</div>
          </Lane>
        </div>

        <Card title="Rentals activity" sub="Every dispatch, return, extension and inspection, newest first">
          <RentalFeed max={12} />
        </Card>
      </div>
    </Page>
  );
}

function Lane({ title, sub, count, children }: { title: string; sub: string; count: number; children: ReactNode }) {
  return (
    <Card title={<Row gap={8}><span>{title}</span><Badge tone="neutral">{count}</Badge></Row>} sub={sub} pad={14}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </Card>
  );
}

function Item({ b, tone, children }: { b: D.RentalBooking; tone?: "bad" | "warn"; children: ReactNode }) {
  return (
    <div style={{ padding: 12, borderRadius: 13, background: "var(--surface-faint)", border: "1px solid " + (tone ? "var(--" + tone + "-soft)" : "var(--border)"), display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp .25s var(--ease) both" }}>
      <Row gap={8} wrap>
        <button className="ix3" onClick={() => openRecord("booking", b.id)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{b.id}</button>
        <button className="ix3" onClick={() => b.asset && openRecord("rental", b.asset)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 12.5, color: "var(--accent)" }}>{b.asset}</button>
        <span style={{ flex: 1 }} />
        <BookingStatus b={b} />
      </Row>
      <div style={{ fontSize: 12.5, color: "var(--body)" }}>{customerKind(b)} · {b.pkg} · {eur(b.price)} · {weeksOf(b)} weeks</div>
      <div style={{ ...label, fontSize: 9 }}>{date(b.start, false)} to {date(b.end, false)}</div>
      {children}
    </div>
  );
}
