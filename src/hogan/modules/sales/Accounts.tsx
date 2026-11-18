/* Sales · Accounts: the 20 fictional accounts with coverage, revenue, opportunities and overdue invoices. */

import { useState } from "react";
import * as D from "../../data";
import { openOpps, openRecord, overdueInvoices, useHogan, useUi } from "../../store";
import { Avatar, Badge, Card, Chip, Grid, Kpi, Page, PageHeader, RecLink, Row, SearchBox, SelectBox, Table, label, match, type Col } from "../../ui";
import { HBars } from "../../charts";
import { date, daysAgo, eur, eurK } from "../../fmt";
import { QUIET_DAYS, SELLER_IDS, firstName, fullName, lastVisit, openRequests, useWidth } from "./lib";

type Filter = "all" | "consignment" | "quiet" | "overdue" | "opps";

export default function Accounts() {
  const s = useHogan();
  const [filter, setFilter] = useUi<Filter>("sales.accFilter", "all");
  const [owner, setOwner] = useUi<string>("sales.accOwner", "all");
  const [q, setQ] = useState("");
  const [ref, w] = useWidth();
  const opps = openOpps(s);
  const inv = overdueInvoices(s);
  const rows = D.ACCOUNTS.map(a => {
    const lv = lastVisit(a.id, s);
    const o = opps.filter(x => x.account === a.id);
    const i = inv.filter(x => x.account === a.id);
    return { a, lv, quiet: daysAgo(lv), opps: o.length, oppValue: o.reduce((t, x) => t + x.value, 0), inv: i.length, invValue: i.reduce((t, x) => t + x.amount, 0), reqs: openRequests(s).filter(r => r.account === a.id).length };
  });
  type R = typeof rows[number];
  const counts = {
    all: rows.length, consignment: rows.filter(r => r.a.consignment).length, quiet: rows.filter(r => r.quiet >= QUIET_DAYS).length,
    overdue: rows.filter(r => r.inv > 0).length, opps: rows.filter(r => r.opps > 0).length,
  };
  const shown = rows.filter(r => (owner === "all" || r.a.owner === owner) && match(q, r.a.name, r.a.type, r.a.region, r.a.id) &&
    (filter === "all" || (filter === "consignment" && r.a.consignment) || (filter === "quiet" && r.quiet >= QUIET_DAYS) || (filter === "overdue" && r.inv > 0) || (filter === "opps" && r.opps > 0)));
  const mtd = D.ACCOUNTS.reduce((t, a) => t + a.mtdRevenue, 0);
  const rentals = D.FIN.byCategory.find(c => c.k === "NICE1 rentals")?.rev || 0;
  const wide = w >= 900;

  const cols: Col<R>[] = [
    { key: "name", label: "Account", w: "minmax(200px,2fr)", sort: r => r.a.name, render: r => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.a.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.a.type} · {r.a.region}</div>
      </div>) },
    { key: "owner", label: "Owner", w: "118px", sort: r => fullName(r.a.owner), render: r => (
      <Row gap={7}><Avatar id={r.a.owner} size={22} /><span style={{ minWidth: 0 }}>
        <span style={{ display: "block", whiteSpace: "nowrap" }}>{firstName(r.a.owner)}</span>
        {D.staffById(r.a.owner)?.fictional && <span style={{ display: "block", fontSize: 10, color: "var(--faint)" }}>fictional</span>}
      </span></Row>) },
    { key: "site", label: "Site", title: "Consignment stock held on site", w: "104px", sort: r => (r.a.locId ? 0 : 1), render: r => r.a.locId ? <RecLink type="location" id={r.a.locId} style={{ whiteSpace: "nowrap" }}>{D.locById(r.a.locId)?.short}</RecLink> : <span style={{ color: "var(--faint)" }}>None</span> },
    { key: "visit", label: "Last visit", w: "124px", sort: r => r.quiet, render: r => (
      <Row gap={6}>
        <span style={{ color: r.quiet >= QUIET_DAYS ? "var(--bad)" : "var(--body)", whiteSpace: "nowrap" }}>{date(r.lv, false)}</span>
        <Badge tone={r.quiet >= QUIET_DAYS ? "bad" : r.quiet >= 10 ? "warn" : "neutral"} title={r.quiet >= QUIET_DAYS ? "Not visited recently" : undefined}>{r.quiet}d</Badge>
      </Row>) },
    { key: "order", label: "Last order", w: "92px", sort: r => -daysAgo(r.a.lastOrder), render: r => <span title={daysAgo(r.a.lastOrder) + " days ago"} style={{ whiteSpace: "nowrap" }}>{date(r.a.lastOrder, false)}</span> },
    { key: "mtd", label: "MTD (demo)", title: "Revenue month to date, demo figure", w: "104px", align: "right", mono: true, sort: r => r.a.mtdRevenue, render: r => <span style={{ color: "var(--ink)" }}>{eur(r.a.mtdRevenue)}</span> },
    { key: "ytd", label: "YTD", title: "Revenue year to date, demo figure", w: "72px", align: "right", mono: true, sort: r => r.a.ytdRevenue, render: r => eurK(r.a.ytdRevenue) },
    { key: "opps", label: "Open opps", w: "104px", align: "right", sort: r => r.oppValue, render: r => r.opps ? <span style={{ whiteSpace: "nowrap" }}><span style={{ color: "var(--ink)" }}>{r.opps}</span><span style={{ color: "var(--faint)", fontFamily: "var(--mono)" }}> · {eurK(r.oppValue)}</span></span> : <span style={{ color: "var(--faint)" }}>None</span> },
    { key: "inv", label: "Overdue inv.", title: "Overdue customer invoices", w: "118px", align: "right", sort: r => r.invValue, render: r => r.inv ? <Badge tone="bad">{r.inv} · {eur(r.invValue)}</Badge> : <span style={{ color: "var(--faint)" }}>None</span> },
  ];

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · Accounts" title="Accounts"
          sub={D.ACCOUNTS.length + " fictional accounts, " + counts.consignment + " with consignment stock on site. " + counts.quiet + " have not had a visit in " + QUIET_DAYS + " days or more. Rory, Clodagh and Eoin are fictional reps."}
          right={<>
            <SearchBox value={q} onChange={setQ} placeholder="Search accounts" style={{ width: w < 640 ? "100%" : 220 }} />
            <SelectBox title="Owner" value={owner} onChange={setOwner} options={[["all", "All owners"], ...SELLER_IDS.map(id => [id, fullName(id) + (D.staffById(id)?.fictional ? " (fictional)" : "")] as [string, string])]} />
          </>} />

        <Grid min={w < 640 ? 150 : 200} gap={10}>
          <Kpi label="Accounts" value={D.ACCOUNTS.length} sub={counts.consignment + " consignment sites"} onClick={() => setFilter("consignment")} />
          <Kpi label="Revenue this month" demo value={eur(mtd)} sub={"Plus " + eur(rentals) + " NICE1 rentals = " + eur(mtd + rentals)} />
          <Kpi label={"No visit in " + QUIET_DAYS + "+ days"} value={counts.quiet} tone={counts.quiet ? "warn" : "ok"} sub="Click to list them" onClick={() => setFilter("quiet")} />
          <Kpi label="Overdue invoices" value={inv.length} tone="bad" sub={eur(inv.reduce((t, x) => t + x.amount, 0)) + " across " + counts.overdue + " accounts"} onClick={() => setFilter("overdue")} />
        </Grid>

        <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1.1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Coverage rows={rows.map(r => ({ id: r.a.id, name: r.a.name, owner: r.a.owner, days: r.quiet }))} />
          <ByOwner narrow={w < 560} />
        </div>

        <Row gap={8} wrap>
          {([["all", "All"], ["consignment", "Consignment sites"], ["quiet", "Not visited recently"], ["overdue", "Overdue invoices"], ["opps", "With open opportunities"]] as [Filter, string][]).map(([k, l]) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)} count={counts[k]}>{l}</Chip>
          ))}
        </Row>

        <Card flush pad={0}>
          <Table cols={cols} rows={shown} rowKey={r => r.a.id} onRow={r => openRecord("account", r.a.id)} initialSort={{ key: "mtd", dir: -1 }} minWidth={1020}
            footer={shown.length + " of " + rows.length + " accounts · revenue figures are fictional demo data · click a row for contacts, orders, invoices and activity"} />
        </Card>
      </div>
    </Page>
  );
}

function Coverage({ rows }: { rows: { id: string; name: string; owner: string; days: number }[] }) {
  const [all, setAll] = useState(false);
  const sorted = rows.slice().sort((a, b) => b.days - a.days);
  const list = all ? sorted : sorted.slice(0, 8);
  return (
    <Card title="Visit coverage" sub={"Days since the last visit. Red is " + QUIET_DAYS + " days or more."}
      right={<button onClick={() => setAll(!all)} className="ix3" style={{ border: 0, background: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>{all ? "Show fewer" : "Show all " + rows.length}</button>}>
      <HBars onRow={i => openRecord("account", list[i].id)} max={Math.max(30, sorted[0]?.days || 0)}
        data={list.map(r => ({ label: <span>{r.name} <span style={{ color: "var(--faint)" }}>· {firstName(r.owner)}</span></span>, value: r.days, right: r.days + "d", color: r.days >= QUIET_DAYS ? "var(--bad)" : r.days >= 10 ? "var(--warn)" : "var(--accent)" }))} />
    </Card>
  );
}

function ByOwner({ narrow }: { narrow: boolean }) {
  const s = useHogan();
  const opps = openOpps(s);
  return (
    <Card title="Book by owner" sub="Accounts, revenue this month (demo), coverage and open pipeline" flush pad={18}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {SELLER_IDS.map(id => {
          const mine = D.ACCOUNTS.filter(a => a.owner === id);
          const quiet = mine.filter(a => daysAgo(lastVisit(a.id, s)) >= QUIET_DAYS).length;
          const o = opps.filter(x => x.owner === id);
          return (
            <div key={id} style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(3,minmax(0,1fr))" : "minmax(0,1.6fr) repeat(3,minmax(0,1fr))", gap: 10, alignItems: "center", padding: "11px 18px", borderTop: "1px solid var(--border)" }}>
              <Row gap={9} style={narrow ? { gridColumn: "1 / -1" } : undefined}><Avatar id={id} size={26} /><span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName(id)}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{D.staffById(id)?.fictional ? "Fictional rep · " : ""}{mine.length} accounts</span>
              </span></Row>
              <div><div style={{ ...label, fontSize: 9 }}>MTD</div><div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{eurK(mine.reduce((t, a) => t + a.mtdRevenue, 0))}</div></div>
              <div><div style={{ ...label, fontSize: 9 }}>Quiet</div><div style={{ fontSize: 13, color: quiet ? "var(--bad)" : "var(--ok)" }}>{quiet ? quiet + " account" + (quiet > 1 ? "s" : "") : "All visited"}</div></div>
              <div><div style={{ ...label, fontSize: 9 }}>Pipeline</div><div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{o.length} · {eurK(o.reduce((t, x) => t + x.value, 0))}</div></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
