/* Rentals · Rental Assets: the seven NICE1 units, their state, cleaning and service, and how much they work. */

import * as D from "../../data";
import { openRecord, useHogan } from "../../store";
import { Badge, Card, Grid, I, Icon, Page, PageHeader, Progress, Row, Table, label, type Col } from "../../ui";
import { TODAY, date, daysAgo, rel } from "../../fmt";
import { useWidth } from "../sales/lib";
import { ASSET_TONE, DAYS_YTD, FLEET, customerKind, freeFrom, liveBooking, utilisation } from "./lib";
import { BookingStatus } from "./parts";

export default function Assets() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const units = s.assets.slice().sort((a, b) => a.id.localeCompare(b.id));
  const avgUtil = Math.round(units.reduce((t, a) => t + utilisation(a), 0) / Math.max(1, units.length));
  const totalDays = units.reduce((t, a) => t + a.hireDaysYtd, 0);

  const cols: Col<D.RentalAsset>[] = [
    { key: "id", label: "Unit", w: "86px", mono: true, sort: a => a.id, render: a => <span style={{ color: "var(--ink)" }}>{a.id}</span> },
    { key: "serial", label: "Serial", w: "110px", mono: true, sort: a => a.serial, render: a => a.serial },
    { key: "status", label: "Status", w: "104px", sort: a => a.status, render: a => <Badge tone={ASSET_TONE[a.status]}>{a.status}</Badge> },
    { key: "booking", label: "Current booking", w: "minmax(170px,1.4fr)", render: a => { const b = liveBooking(a.id, s); return b ? <span style={{ whiteSpace: "nowrap" }}>{b.id} · {customerKind(b)}</span> : <span style={{ color: "var(--faint)" }}>None</span>; } },
    { key: "free", label: "Free from", w: "96px", sort: a => freeFrom(a, s), render: a => freeFrom(a, s) <= TODAY ? <span style={{ color: "var(--ok)" }}>Now</span> : date(freeFrom(a, s), false) },
    { key: "cleaned", label: "Last cleaned", w: "104px", sort: a => a.cleaned, render: a => date(a.cleaned, false) },
    { key: "service", label: "Last service", w: "104px", sort: a => a.lastService, render: a => <span title={daysAgo(a.lastService) + " days ago"}>{date(a.lastService, false)}</span> },
    { key: "days", label: "Hire days YTD", w: "104px", align: "right", mono: true, sort: a => a.hireDaysYtd, render: a => a.hireDaysYtd },
    { key: "util", label: "Utilisation", w: "120px", sort: a => utilisation(a), render: a => <Row gap={8}><div style={{ flex: 1 }}><Progress value={utilisation(a)} max={100} h={5} /></div><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{utilisation(a)}%</span></Row> },
  ];

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Rentals · Rental Assets" title="Rental assets"
          sub={FLEET + " NICE1 cold-compression units. Utilisation is days on hire divided by the " + DAYS_YTD + " days of the year so far. Revenue per unit is demo data."} />

        <Grid min={w < 640 ? 260 : 240} gap={12}>
          {units.map(a => {
            const b = liveBooking(a.id, s);
            return (
              <Card key={a.id} pad={16} onClick={() => openRecord("rental", a.id)}>
                <Row gap={10}>
                  <span style={{ width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--" + (a.status === "On hire" ? "accent" : a.status === "Available" ? "ok" : "warn") + "-soft)", color: "var(--" + (a.status === "On hire" ? "accent" : a.status === "Available" ? "ok" : "warn") + ")" }}><Icon d={I.snow} size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600 }}>{a.id}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Serial {a.serial}</div>
                  </div>
                  <Badge tone={ASSET_TONE[a.status]}>{a.status}</Badge>
                </Row>
                <div style={{ marginTop: 12, minHeight: 38, fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                  {b ? <>
                    <Row gap={6} wrap><span style={{ fontFamily: "var(--mono)" }}>{b.id}</span><BookingStatus b={b} /></Row>
                    <span style={{ color: "var(--dim)" }}>{customerKind(b)} · {date(b.start, false)} to {date(b.end, false)}{b.extension?.state === "Requested" ? " · extension requested" : ""}</span>
                  </> : a.status === "Inspection" ? <span style={{ color: "var(--warn)" }}>Back from hire. Needs cleaning and checks before it goes out again.</span>
                    : <span style={{ color: "var(--ok)" }}>Ready to hire. Cleaned {rel(a.cleaned).toLowerCase()}.</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
                  <div><div style={{ ...label, fontSize: 9 }}>Cleaned</div><div style={{ fontSize: 12.5, marginTop: 3 }}>{date(a.cleaned, false)}</div></div>
                  <div><div style={{ ...label, fontSize: 9 }}>Service</div><div style={{ fontSize: 12.5, marginTop: 3 }}>{date(a.lastService, false)}</div></div>
                  <div><div style={{ ...label, fontSize: 9 }}>Free from</div><div style={{ fontSize: 12.5, marginTop: 3, color: freeFrom(a, s) <= TODAY ? "var(--ok)" : undefined }}>{freeFrom(a, s) <= TODAY ? "Now" : date(freeFrom(a, s), false)}</div></div>
                </div>
                <Row gap={8} style={{ marginTop: 12 }}>
                  <span style={{ ...label, fontSize: 9 }}>Utilisation</span>
                  <div style={{ flex: 1 }}><Progress value={utilisation(a)} max={100} h={5} /></div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{utilisation(a)}%</span>
                </Row>
              </Card>
            );
          })}
        </Grid>

        <Card title="Unit register" sub={totalDays + " hire days across the fleet this year · average utilisation " + avgUtil + "%. Sortable; click a unit for bookings, cleaning and service history."} flush pad={18}>
          <Table cols={cols} rows={units} rowKey={a => a.id} onRow={a => openRecord("rental", a.id)} minWidth={980} initialSort={{ key: "days", dir: -1 }} />
        </Card>
      </div>
    </Page>
  );
}
