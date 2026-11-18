/* Rentals · Bookings: calendar by unit across November and December, enquiries to confirm, and every booking. */

import { useState } from "react";
import * as D from "../../data";
import { openRecord, useHogan, useUi } from "../../store";
import { Btn, Card, Chip, Empty, I, Page, PageHeader, Row, SearchBox, Table, match, type Col } from "../../ui";
import { TODAY, date, eur, rel } from "../../fmt";
import { useWidth } from "../sales/lib";
import { customerKind, freeUnits, weeksOf } from "./lib";
import { BookingCalendar, BookingStatus, ConfirmPanel, EnquiryForm } from "./parts";

type F = "all" | "live" | "Enquiry" | "Completed";

export default function Bookings() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const [filter, setFilter] = useUi<F>("rentals.bookFilter", "all");
  const [q, setQ] = useState("");
  const [logging, setLogging] = useUi<boolean>("rentals.logEnquiry", false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const enquiries = s.bookings.filter(b => b.status === "Enquiry").sort((a, b) => a.start.localeCompare(b.start));
  const isLive = (b: D.RentalBooking) => b.status === "Reserved" || b.status === "Dispatched" || b.status === "On hire" || b.status === "Returned";
  const counts = { all: s.bookings.length, live: s.bookings.filter(isLive).length, Enquiry: enquiries.length, Completed: s.bookings.filter(b => b.status === "Completed").length };
  const rows = s.bookings.filter(b => (filter === "all" || (filter === "live" ? isLive(b) : b.status === filter)) && match(q, b.id, b.customer, b.asset, b.pkg, b.referral))
    .sort((a, b) => b.start.localeCompare(a.start));

  const cols: Col<D.RentalBooking>[] = [
    { key: "id", label: "Booking", w: "96px", mono: true, sort: b => b.id, render: b => <span style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{b.id}</span> },
    { key: "customer", label: "Customer (anonymised)", w: "minmax(190px,1.5fr)", sort: b => b.customer, render: b => (
      <div style={{ minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink)" }}>{b.customer}</div>
        {b.referral && <div style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.referral}</div>}
      </div>) },
    { key: "pkg", label: "Package", w: "158px", sort: b => b.pkg, render: b => b.pkg },
    { key: "unit", label: "Unit", w: "80px", mono: true, sort: b => b.asset || "zz", render: b => b.asset || <span style={{ color: "var(--faint)" }}>None</span> },
    { key: "dates", label: "Hire", w: "150px", sort: b => b.start, render: b => <span style={{ whiteSpace: "nowrap" }}>{date(b.start, false)} to {date(b.end, false)}</span> },
    { key: "wk", label: "Wks", w: "52px", align: "right", mono: true, sort: b => weeksOf(b), render: b => weeksOf(b) },
    { key: "price", label: "Price", w: "76px", align: "right", mono: true, sort: b => b.price, render: b => <span style={{ color: "var(--ink)" }}>{eur(b.price)}</span> },
    { key: "status", label: "Status", w: "206px", sort: b => b.status, render: b => <BookingStatus b={b} /> },
  ];

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Rentals · Bookings" title="Bookings"
          sub={s.bookings.length + " bookings since late October across " + s.assets.length + " NICE1 units. Customers are anonymised references; nice1.ie enquiries are logged by hand (website not connected)."}
          right={<Btn kind={logging ? "accent" : "primary"} icon={logging ? I.x : I.plus} onClick={() => setLogging(!logging)}>{logging ? "Close" : "Log enquiry"}</Btn>} />

        {logging && <EnquiryForm onDone={() => setLogging(false)} />}

        <Card title="Booking calendar" sub="By unit, November to December. Dashed bars are enquiries or requested extensions.">
          <BookingCalendar />
        </Card>

        <Card title={"Enquiries to confirm · " + enquiries.length} sub="Pick the package and length, then reserve a free unit. Prices follow the published rates (reference only).">
          {enquiries.length === 0 && <Empty title="No enquiries waiting" sub="New phone, email or website enquiries are logged here." icon={I.mail} />}
          <div style={{ display: "grid", gridTemplateColumns: w >= 900 && enquiries.length > 1 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: 12 }}>
            {enquiries.map(b => {
              const free = freeUnits(b.start, b.end, s, b.id);
              return (
                <div key={b.id} style={{ padding: 14, borderRadius: 14, border: "1px dashed var(--warn)", background: "var(--surface-faint)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <Row gap={8} wrap>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{b.id}</span>
                    <span style={{ fontSize: 13, color: "var(--body)", flex: 1, minWidth: 0 }}>{customerKind(b)}</span>
                    <BookingStatus b={b} />
                  </Row>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                    {b.pkg} · {date(b.start, false)} to {date(b.end, false)} ({rel(b.start).toLowerCase()}) · quoted {eur(b.price)} · {free.length ? free.length + " unit" + (free.length === 1 ? "" : "s") + " free: " + free.map(u => u.id).join(", ") : "no unit free yet"}
                  </div>
                  {confirming === b.id ? <ConfirmPanel b={b} onDone={() => setConfirming(null)} /> : (
                    <Row gap={8}>
                      <Btn kind="primary" size="sm" icon={I.check} onClick={() => setConfirming(b.id)}>Confirm and reserve</Btn>
                      <Btn kind="ghost" size="sm" onClick={() => openRecord("booking", b.id)}>Details</Btn>
                    </Row>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Row gap={8} wrap>
          {([["all", "All"], ["live", "Live hires"], ["Enquiry", "Enquiries"], ["Completed", "Completed"]] as [F, string][]).map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)} count={counts[k]}>{l}</Chip>)}
          <span style={{ flex: 1 }} />
          <SearchBox value={q} onChange={setQ} placeholder="Search bookings" style={{ width: w < 640 ? "100%" : 220 }} />
        </Row>
        <Card flush pad={0}>
          <Table cols={cols} rows={rows} rowKey={b => b.id} onRow={b => openRecord("booking", b.id)} minWidth={900}
            footer={rows.length + " bookings · " + eur(rows.reduce((a, b) => a + b.price, 0)) + " at booked prices (demo) · today is " + date(TODAY, false)} />
        </Card>
      </div>
    </Page>
  );
}
