/* Rentals · Rental Revenue: monthly hire income, what makes up November to date, and what is booked ahead. */

import * as D from "../../data";
import { openRecord, useHogan } from "../../store";
import { Badge, Card, Grid, Kpi, Notice, Page, PageHeader, Row, Table, label, type Col } from "../../ui";
import { Bars, Donut, Legend } from "../../charts";
import { eur } from "../../fmt";
import { useWidth } from "../sales/lib";
import { NOV_BOOKED, PACKAGES, customerKind, forwardLines, novemberLines, type RevLine } from "./lib";

export default function Revenue() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const months = D.RENTAL_MONTHLY;
  const lines = novemberLines(s);
  const derived = lines.reduce((a, l) => a + l.amount, 0);
  const delta = derived - NOV_BOOKED;
  const fwd = forwardLines(s);
  const cat = D.FIN.byCategory.find(c => c.k === "NICE1 rentals");
  const gp = D.FIN.bySupplier.find(c => c.k === "NICE1 rentals")?.gp ?? (cat ? cat.rev - cat.cogs : 0);
  const growth = Math.round(((months[months.length - 2].v - months[0].v) / months[0].v) * 100);
  const mix = PACKAGES.map((p, i) => ({ label: p, value: s.bookings.filter(b => b.pkg === p).length, color: i ? "var(--accent)" : "var(--warn)" }));

  const cols: Col<RevLine>[] = [
    { key: "when", label: "Invoiced", w: "100px", sort: l => l.date, render: l => l.when },
    { key: "b", label: "Booking", w: "96px", mono: true, sort: l => l.booking.id, render: l => <span style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{l.booking.id}</span> },
    { key: "c", label: "Customer (anonymised)", w: "minmax(150px,1.2fr)", render: l => customerKind(l.booking) },
    { key: "basis", label: "Basis", w: "minmax(200px,1.6fr)", render: l => l.basis },
    { key: "amt", label: "Amount", w: "84px", align: "right", mono: true, sort: l => l.amount, render: l => <span style={{ color: "var(--ink)" }}>{eur(l.amount)}</span> },
  ];

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Rentals · Rental Revenue" title="Rental revenue"
          sub="Hire income from NICE1 units. Demo figures: monthly history is illustrative and November is month to date, matching the NICE1 line in Finance." />

        <Grid min={w < 640 ? 150 : 190} gap={10}>
          <Kpi label="November to date" demo value={eur(NOV_BOOKED)} sub="Same figure as Finance" />
          <Kpi label="Gross profit" demo value={eur(gp)} sub={cat ? Math.round((gp / cat.rev) * 100) + "% margin on " + eur(cat.rev) : ""} />
          <Kpi label="Share of revenue" value={((NOV_BOOKED / D.FIN.revenue) * 100).toFixed(1) + "%"} sub={"of " + eur(D.FIN.revenue) + " this month"} />
          <Kpi label="Growth since June" value={"+" + growth + "%"} tone="ok" sub={months[0].m + " " + eur(months[0].v) + " to " + months[months.length - 2].m + " " + eur(months[months.length - 2].v)} />
          <Kpi label="Booked ahead" demo value={eur(fwd.reduce((a, l) => a + l.amount, 0))} sub={fwd.length + " bookings, enquiries and extensions"} />
        </Grid>

        <div style={{ display: "grid", gridTemplateColumns: w >= 960 ? "minmax(0,1.6fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Card title="Monthly hire income" sub="June to November. November is month to date (1 to 19 Nov).">
            <Bars data={months.map((m, i) => ({ label: m.m.replace("*", " (to date)"), value: m.v, color: i === months.length - 1 ? "var(--accent-line)" : undefined, note: i === months.length - 1 ? "Month to date" : undefined }))} fmt={eur} height={200} highlight={months.length - 1} />
          </Card>
          <Card title="Bookings by package" sub={s.bookings.length + " bookings since late October"}>
            <Row gap={18} wrap>
              <Donut data={mix} size={130} thickness={15} center={<><div style={{ fontSize: 20, fontWeight: 600 }}>{s.bookings.length}</div><div style={{ fontSize: 10.5, color: "var(--dim)" }}>bookings</div></>} />
              <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 10 }}>
                <Legend items={mix.map(m => ({ label: m.label + " · " + m.value, color: m.color }))} style={{ flexDirection: "column", gap: 8 }} />
                {D.RENTAL_PRICING.map(p => <div key={p.k} style={{ fontSize: 12, color: "var(--dim)" }}>{p.k}: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{eur(p.v)}</b></div>)}
                <div style={{ ...label, fontSize: 9 }}>Published rates · reference only, not a guaranteed rate</div>
              </div>
            </Row>
          </Card>
        </div>

        <Card title="What makes up November to date" sub="Hire fees are invoiced on the start date; extension weeks when approved during a hire." flush pad={18}
          right={delta === 0 ? <Badge tone="ok">Reconciles with Finance · {eur(NOV_BOOKED)}</Badge> : <Badge tone="warn">{eur(derived)} incl. {eur(delta)} from this session</Badge>}>
          <Table cols={cols} rows={lines} rowKey={(l, i) => l.booking.id + i} onRow={l => openRecord("booking", l.booking.id)} minWidth={640} initialSort={{ key: "when", dir: 1 }}
            footer={lines.length + " lines · total " + eur(derived) + (delta ? ". Changes made in this demo session (" + eur(delta) + ") are not posted to Finance." : ", the same as Finance's NICE1 rentals line for November.")} />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: w >= 960 ? "minmax(0,1.6fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Card title="Booked ahead" sub="Reserved hires, enquiries and requested extensions not yet invoiced" flush pad={18}>
            <Table cols={cols} rows={fwd} rowKey={(l, i) => l.booking.id + "f" + i} onRow={l => openRecord("booking", l.booking.id)} minWidth={640}
              empty={<div style={{ padding: 18, fontSize: 12.5, color: "var(--dim)" }}>Nothing booked ahead.</div>}
              footer={"Enquiries are not confirmed and may not convert. Total " + eur(fwd.reduce((a, l) => a + l.amount, 0)) + "."} />
          </Card>
          <Notice tone="info" title="A secondary line, built to grow">
            NICE1 hire is small next to distribution ({((NOV_BOOKED / D.FIN.revenue) * 100).toFixed(1)}% of this month's revenue) but it runs on the same records, approvals and activity log. Online booking from nice1.ie could feed this view later; it is not connected today.
          </Notice>
        </div>
      </div>
    </Page>
  );
}
