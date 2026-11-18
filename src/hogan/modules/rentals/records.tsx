/* NICE1 rental record views for the drawer: a booking and a unit. */

import type { ReactNode } from "react";
import { openRecord, useHogan } from "../../store";
import { Badge, Btn, Empty, I, KV, Notice, RecLink, RecordHead, RecordSection, Row, Timeline, type Tone } from "../../ui";
import { TODAY, addDays, date, dayDate, daysAgo, eur, rel } from "../../fmt";
import { ASSET_TONE, DAYS_YTD, assetOf, customerKind, freeFrom, freeUnits, liveBooking, priceFor, utilisation, weeksOf } from "./lib";
import { BookingStatus, ConfirmPanel, DeliveryPicker, DispatchChecklist, HireActions, InspectionPanel, RentalFeed } from "./parts";

const line = (key: string, left: ReactNode, right: ReactNode, sub?: ReactNode, onClick?: () => void) => (
  <div key={key} onClick={onClick} className={onClick ? "ix11" : undefined}
    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", margin: "0 -8px", borderRadius: 9, cursor: onClick ? "pointer" : undefined }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{left}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
  </div>
);

export function BookingRecord({ id }: { id: string }) {
  const s = useHogan();
  const b = s.bookings.find(x => x.id === id);
  if (!b) return <Empty title="Booking not found" sub={id} />;
  const unit = assetOf(b.asset, s);
  const weeks = weeksOf(b);
  const listPrice = priceFor(b.pkg, weeks);
  const prep = b.status === "Reserved" && (b.steps || []).some(x => !x.done);
  return (
    <div>
      <RecordHead kind="NICE1 rental booking" title={b.id + (unit ? " · NICE1 unit " + unit.id : "")}
        sub={b.customer + (b.referral ? " · " + b.referral : "")} status={prep ? "Reserved / preparing dispatch" : b.status}
        right={<div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--mono)" }}>{eur(b.price)}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{b.pkg}</div></div>} />

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Unit", unit ? <RecLink type="rental" id={unit.id}>NICE1 unit {unit.id}</RecLink> : "Not assigned yet"],
        ["Package", b.pkg],
        ["Price", eur(b.price) + (b.price === listPrice ? " · published rate" : " · list " + eur(listPrice))],
        ["Hire starts", dayDate(b.start) + " " + b.start.slice(0, 4)],
        ["Hire ends", dayDate(b.end) + " " + b.end.slice(0, 4)],
        ["Length", weeks + " weeks"],
        ["Delivery", b.status === "Reserved" || b.status === "Enquiry" ? <DeliveryPicker b={b} /> : b.delivery],
        ["Customer type", customerKind(b)],
        ["Extension", b.extension ? "+" + b.extension.weeks + " week · " + eur(b.extension.fee) + " · " + b.extension.state.toLowerCase() : "None"],
      ]} />

      <Notice tone="info" style={{ marginTop: 14 }}>The customer is held as an anonymised reference. No names, addresses or health details are stored in Pulse. Pricing shown is the published rate for reference, not a guaranteed rate.</Notice>

      {b.status === "Enquiry" && (
        <RecordSection title="Confirm this enquiry">
          <ConfirmPanel b={b} />
        </RecordSection>
      )}
      {b.status === "Reserved" && (
        <RecordSection title={"Prepare and dispatch " + (b.asset || "")} right={<BookingStatus b={b} />}>
          <DispatchChecklist b={b} />
        </RecordSection>
      )}
      {(b.status === "Dispatched" || b.status === "On hire") && (
        <RecordSection title={b.status === "Dispatched" ? "Out for delivery" : "On hire"} right={<BookingStatus b={b} />}>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginBottom: 10 }}>
            {b.status === "Dispatched" ? "On its way: " + b.delivery + ". Confirm once delivered." : "Due back " + dayDate(b.end) + " (" + rel(b.end).toLowerCase() + ")."}
            {b.extension?.state === "Requested" ? " The customer has asked for one more week." : ""}
          </div>
          <HireActions b={b} />
        </RecordSection>
      )}
      {b.status === "Returned" && unit && (
        <RecordSection title={"Returned · " + unit.id + " in cleaning and inspection"}>
          {unit.status === "Inspection" ? <InspectionPanel asset={unit} /> : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{unit.id} has passed inspection.</div>}
        </RecordSection>
      )}
      {b.status === "Completed" && (
        <RecordSection title="Completed">
          <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Hire finished {date(b.end)}. {unit ? unit.id + " was cleaned and inspected afterwards." : ""}</div>
        </RecordSection>
      )}

      <RecordSection title="Activity">
        <RentalFeed max={10} filter={e => e.ref === b.id || e.title.includes(b.id) || (!!b.asset && e.ref === b.asset && e.date >= addDays(b.start, -3))} />
      </RecordSection>
    </div>
  );
}

export function RentalRecord({ id }: { id: string }) {
  const s = useHogan();
  const a = s.assets.find(x => x.id === id);
  if (!a) return <Empty title="Unit not found" sub={id} />;
  const b = liveBooking(id, s);
  const history = s.bookings.filter(x => x.asset === id).sort((x, y) => y.start.localeCompare(x.start));
  const enquiries = s.bookings.filter(x => x.status === "Enquiry" && freeUnits(x.start, x.end, s, x.id).some(u => u.id === id));
  const service: { when: string; title: string; sub?: string; tone: Tone }[] = [
    ...s.events.filter(e => e.ref === id).map(e => ({ when: dayDate(e.date) + " " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: "ok" as Tone })),
    { when: dayDate(a.cleaned), title: "Cleaned and inspected", sub: "Last recorded clean", tone: "ok" },
    { when: dayDate(a.lastService), title: "Service", sub: "Manufacturer service check · " + daysAgo(a.lastService) + " days ago", tone: "accent" },
  ];
  return (
    <div>
      <RecordHead kind="NICE1 unit" title={"NICE1 unit " + a.id} sub={"Serial " + a.serial + " · cold-compression therapy system"} status={a.status}
        right={<Badge tone={ASSET_TONE[a.status]}>{utilisation(a)}% utilised</Badge>} />
      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Serial", a.serial],
        ["Status", a.status],
        ["Current booking", b ? <RecLink type="booking" id={b.id}>{b.id}</RecLink> : "None"],
        ["Free from", freeFrom(a, s) <= TODAY ? "Now" : date(freeFrom(a, s), false)],
        ["Last cleaned", date(a.cleaned, false)],
        ["Last service", date(a.lastService, false)],
        ["Hire days YTD", a.hireDaysYtd + " of " + DAYS_YTD],
        ["Utilisation YTD", utilisation(a) + "%"],
        ["Revenue YTD (demo)", eur(a.revenueYtd)],
      ]} />

      {a.status === "Inspection" && (
        <RecordSection title="Clean and inspect">
          <InspectionPanel asset={a} />
        </RecordSection>
      )}
      {b && (
        <RecordSection title={"Current booking · " + b.id} right={<BookingStatus b={b} />}>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginBottom: 10 }}>{customerKind(b)} · {b.pkg} · {eur(b.price)} · {date(b.start, false)} to {date(b.end, false)}</div>
          {b.status === "Reserved" ? <DispatchChecklist b={b} /> : <HireActions b={b} />}
        </RecordSection>
      )}
      {a.status === "Available" && (
        <RecordSection title="Ready to hire">
          {enquiries.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No open enquiries fit this unit's free dates.</div>
            : enquiries.map(e => line(e.id, e.id + " · " + customerKind(e), <Btn size="sm" icon={I.check} onClick={() => openRecord("booking", e.id)}>Confirm onto {a.id}</Btn>, e.pkg + " · " + date(e.start, false) + " to " + date(e.end, false)))}
        </RecordSection>
      )}

      <RecordSection title={"Booking history · " + history.length}>
        {history.map(h => line(h.id, <RecLink type="booking" id={h.id}>{h.id}</RecLink>, <BookingStatus b={h} />, customerKind(h) + " · " + h.pkg + " · " + date(h.start, false) + " to " + date(h.end, false) + " · " + eur(h.price)))}
        {history.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No bookings in the current list.</div>}
      </RecordSection>

      <RecordSection title="Service and cleaning">
        <Timeline dense items={service.map(x => ({ when: x.when, title: x.title, sub: x.sub, tone: x.tone }))} />
        <Row gap={6} style={{ marginTop: 6 }}><span style={{ fontSize: 11.5, color: "var(--faint)" }}>Functional checks only; nothing about the person who used the unit is recorded.</span></Row>
      </RecordSection>
    </div>
  );
}
