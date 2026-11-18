/* Rentals · Overview: the NICE1 hire line at a glance. Secondary to distribution, shown as an extension of the same OS. */

import type { ReactNode } from "react";
import * as D from "../../data";
import { nav, openRecord, useHogan } from "../../store";
import { Badge, Btn, Card, Grid, I, Icon, Kpi, Notice, Page, PageHeader, Progress, Row, label } from "../../ui";
import { Spark } from "../../charts";
import { TODAY, addDays, date, dayDate, eur, rel } from "../../fmt";
import { useWidth } from "../sales/lib";
import { ASSET_TONE, FLEET, NOV_BOOKED, customerKind, liveBooking, weeksOf } from "./lib";
import { BookingStatus, HireActions } from "./parts";

export default function Overview() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const count = (st: D.RentalAssetStatus) => s.assets.filter(a => a.status === st).length;
  const onHire = count("On hire");
  const enquiries = s.bookings.filter(b => b.status === "Enquiry");
  const sunday = addDays(TODAY, 3);
  const dueBack = s.bookings.filter(b => (b.status === "On hire" || b.status === "Dispatched") && b.end <= sunday).sort((a, b) => a.end.localeCompare(b.end));
  const next = s.bookings.filter(b => b.status === "Reserved").sort((a, b) => a.start.localeCompare(b.start))[0];
  const lastDispatched = s.bookings.filter(b => b.status === "Dispatched").sort((a, b) => b.start.localeCompare(a.start))[0];
  const share = (NOV_BOOKED / D.FIN.revenue) * 100;
  const months = D.RENTAL_MONTHLY;
  const growth = Math.round(((months[months.length - 2].v - months[0].v) / months[0].v) * 100);

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Rentals · NICE1" title="NICE1 rentals"
          sub={"Cold-compression therapy unit hire: a separate, growing line that runs on the same OS as distribution. " + FLEET + " units, anonymised customer references only. Online booking from nice1.ie is a future concept and is not connected."}
          right={<Btn icon={I.calendar} onClick={() => nav("Rentals", "bookings")}>Booking calendar</Btn>} />

        <Grid min={w < 640 ? 150 : 180} gap={10}>
          <Kpi label="Fleet" value={FLEET + " units"} sub={onHire + " on hire · " + count("Reserved") + " reserved · " + count("Available") + " free" + (count("Inspection") ? " · " + count("Inspection") + " checks" : "")} onClick={() => nav("Rentals", "assets")} />
          <Kpi label="On hire now" value={Math.round((onHire / FLEET) * 100) + "%"} sub={onHire + " of " + FLEET + " units out"} spark={<div style={{ width: 54 }}><Progress value={onHire} max={FLEET} h={5} /></div>} />
          <Kpi label="November to date" demo value={eur(NOV_BOOKED)} sub="Matches the Finance figure" onClick={() => nav("Rentals", "revenue")} spark={<Spark values={months.map(m => m.v)} w={60} h={22} />} />
          <Kpi label="Open enquiries" value={enquiries.length} tone={enquiries.length ? "warn" : undefined} sub={enquiries[0] ? "Next from " + date(enquiries[0].start, false) : "None waiting"} onClick={() => nav("Rentals", "bookings")} />
          <Kpi label="Due back by Sunday" value={dueBack.length} sub={dueBack[0] ? dueBack[0].asset + " " + rel(dueBack[0].end).toLowerCase() : "None due"} onClick={() => nav("Rentals", "dispatch")} />
        </Grid>

        <div style={{ display: "grid", gridTemplateColumns: w >= 960 ? "minmax(0,1.25fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          {next ? <NextDispatch b={next} /> : lastDispatched ? <DispatchedCard b={lastDispatched} /> : <Card title="Next dispatch"><div style={{ fontSize: 13, color: "var(--dim)" }}>No reservations waiting to go out.</div></Card>}
          <Queue />
        </div>

        <Card title="Fleet now" sub="Each NICE1 unit, what it is doing and when it is next free. Click a unit for its history.">
          <Grid min={w < 640 ? 132 : 136} gap={8}>
            {s.assets.slice().sort((a, b) => a.id.localeCompare(b.id)).map(a => {
              const b = liveBooking(a.id, s);
              return (
                <button key={a.id} onClick={() => openRecord("rental", a.id)} className="ixx"
                  style={{ textAlign: "left", padding: "11px 12px", borderRadius: 13, background: "var(--surface-faint)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6, transition: "transform .18s var(--ease),border-color .18s var(--ease)" }}>
                  <Row gap={6}><span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, flex: 1 }}>{a.id}</span><Icon d={I.snow} size={13} color="var(--faint)" /></Row>
                  <Badge tone={ASSET_TONE[a.status]}>{a.status}</Badge>
                  <span style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>
                    {a.status === "Available" ? "Ready · cleaned " + date(a.cleaned, false) : a.status === "Inspection" ? "Cleaning and checks" : b ? (b.status === "Reserved" ? "Goes out " + date(b.start, false) : "Back " + date(b.end, false)) + " · " + b.id : ""}
                  </span>
                </button>
              );
            })}
          </Grid>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: w >= 960 ? "repeat(3,minmax(0,1fr))" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Card title="Published pricing" sub="Reference only. Not a guaranteed rate.">
            {D.RENTAL_PRICING.map((p, i) => (
              <Row key={p.k} gap={10} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--border)" : undefined }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--body)" }}>{p.k}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink)" }}>{eur(p.v)}</span>
              </Row>
            ))}
          </Card>
          <Card title="Size of the line" sub="Demo figures, November to date">
            <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
              Rentals brought in <b style={{ color: "var(--ink)" }}>{eur(NOV_BOOKED)}</b> of {eur(D.FIN.revenue)} company revenue this month ({share.toFixed(1)}%). Monthly hire income grew {growth}% from {months[0].m} to {months[months.length - 2].m}.
            </div>
            <div style={{ marginTop: 10 }}><Spark values={months.map(m => m.v)} w={220} h={34} /></div>
          </Card>
          <Card title="Online booking (future)" sub="nice1.ie · not connected">
            <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.6 }}>
              Enquiries from the website are logged by hand today. A later phase could take nice1.ie bookings straight into this calendar, check unit availability and hold a unit pending payment. Nothing here reads from or writes to the website.
            </div>
            <Btn kind="ghost" size="sm" icon={I.arrow} style={{ marginTop: 8 }} onClick={() => nav("Rentals", "bookings", { "rentals.logEnquiry": true })}>Log an enquiry by hand</Btn>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function NextDispatch({ b }: { b: D.RentalBooking }) {
  const steps = b.steps || [];
  const done = steps.filter(x => x.done).length;
  return (
    <Card title={<Row gap={8} wrap><span>Next dispatch · {b.id}</span><BookingStatus b={b} /></Row>} sub={"Starts " + dayDate(b.start) + " · " + rel(b.start).toLowerCase()}
      right={<Btn size="sm" onClick={() => openRecord("booking", b.id)}>Open booking</Btn>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Fact k="Unit" v={<button className="ix3" onClick={() => openRecord("rental", b.asset || "")} style={{ border: 0, background: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>NICE1 unit {b.asset}</button>} />
        <Fact k="Package" v={b.pkg} />
        <Fact k="Price" v={eur(b.price) + " · " + weeksOf(b) + " weeks"} />
        <Fact k="Hire dates" v={date(b.start) + " to " + date(b.end)} />
        <Fact k="Customer" v={b.customer} />
        <Fact k="Delivery" v={b.delivery} />
      </div>
      {b.referral && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>{b.referral}.</div>}
      <div style={{ marginTop: 14 }}>
        <Row gap={8} style={{ marginBottom: 6 }}><span style={{ ...label, flex: 1 }}>Dispatch steps · {done} of {steps.length}</span></Row>
        <Progress value={done} max={Math.max(1, steps.length)} h={6} tone={done === steps.length ? "ok" : "accent"} />
        <Row gap={6} wrap style={{ marginTop: 10 }}>
          {steps.map(st => <Badge key={st.k} tone={st.done ? "ok" : "neutral"}>{st.done ? "Done: " : ""}{st.k}</Badge>)}
        </Row>
      </div>
      <Row gap={8} style={{ marginTop: 14 }}>
        <Btn kind="primary" size="sm" icon={I.truck} onClick={() => nav("Rentals", "dispatch")}>Prepare dispatch</Btn>
        <Btn kind="ghost" size="sm" onClick={() => openRecord("booking", b.id)}>Steps and history</Btn>
      </Row>
    </Card>
  );
}

function DispatchedCard({ b }: { b: D.RentalBooking }) {
  return (
    <Card title={<Row gap={8}><span>Out for delivery · {b.id}</span><BookingStatus b={b} /></Row>} sub={"NICE1 unit " + b.asset + " · " + b.pkg + " · " + eur(b.price)}>
      <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>Hire runs {date(b.start)} to {date(b.end)} · {b.delivery}. Confirm delivery once the courier has dropped it off.</div>
      <div style={{ marginTop: 12 }}><HireActions b={b} /></div>
    </Card>
  );
}

const Fact = ({ k, v }: { k: string; v: ReactNode }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ ...label, fontSize: 9 }}>{k}</div>
    <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 4, lineHeight: 1.4 }}>{v}</div>
  </div>
);

function Queue() {
  const s = useHogan();
  const ext = s.bookings.filter(b => b.extension?.state === "Requested");
  const due = s.bookings.filter(b => (b.status === "On hire" || b.status === "Dispatched") && b.end <= addDays(TODAY, 1) && b.extension?.state !== "Requested").sort((a, b) => a.end.localeCompare(b.end));
  const enq = s.bookings.filter(b => b.status === "Enquiry");
  const insp = s.assets.filter(a => a.status === "Inspection");
  const n = ext.length + due.length + enq.length + insp.length;
  const item = (key: string, icon: string, tone: "warn" | "accent" | "ok", title: string, sub: string, action: ReactNode) => (
    <div key={key} style={{ display: "flex", gap: 10, padding: "11px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--" + tone + "-soft)", color: "var(--" + tone + ")" }}><Icon d={icon} size={14} /></span>
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ flex: "none", alignSelf: "center" }}>{action}</div>
    </div>
  );
  return (
    <Card title="Needs action" sub={n ? n + " things for the rentals desk" : "Nothing waiting"} right={<Badge tone={n ? "warn" : "ok"}>{n}</Badge>}>
      {n === 0 && <Notice tone="ok">Every hire is on track and every unit is clean.</Notice>}
      {ext.map(b => item("x" + b.id, I.clock, "warn", "Extension request · " + b.id, b.asset + " · " + customerKind(b) + " · +" + b.extension!.weeks + " week for " + eur(b.extension!.fee) + " · due back " + date(b.end, false), <HireActions b={b} />))}
      {due.map(b => item("d" + b.id, I.refresh, "accent", "Due back " + rel(b.end).toLowerCase() + " · " + b.id, b.asset + " · " + customerKind(b) + " · " + b.delivery, <HireActions b={b} />))}
      {enq.map(b => item("e" + b.id, I.mail, "warn", "Enquiry to confirm · " + b.id, customerKind(b) + " · " + b.pkg + " · from " + date(b.start, false), <Btn size="sm" onClick={() => openRecord("booking", b.id)}>Confirm</Btn>))}
      {insp.map(a => item("i" + a.id, I.shield, "warn", "Clean and inspect · " + a.id, "Returned unit waiting for checks before it can go out again", <Btn size="sm" onClick={() => nav("Rentals", "dispatch")}>Inspect</Btn>))}
    </Card>
  );
}
