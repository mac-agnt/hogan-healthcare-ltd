/* Sales · Team Performance: the Friday review. Activity and pipeline per salesperson, from the same store. */

import * as D from "../../data";
import { nav, openOpps, useHogan } from "../../store";
import { Avatar, Badge, Btn, Card, Grid, I, Notice, Page, PageHeader, Person, Progress, Row, Table, label, type Col } from "../../ui";
import { StackBars } from "../../charts";
import { TODAY, addDays, eur, eurK } from "../../fmt";
import { NEXT_WEEK, SELLER_IDS, closedOpps, firstName, openRequests, repPipeline, useWidth, weekDays, weekStats } from "./lib";

export default function Team() {
  const s = useHogan();
  const [ref, w] = useWidth();
  const since30 = addDays(TODAY, -30);
  const allOpps = s.opps.concat(D.CLOSED_OPPS);
  const closed = closedOpps(s);
  const rows = SELLER_IDS.map(id => {
    const wk = weekStats(id, s);
    const won = closed.filter(o => o.owner === id && o.stage === "Won");
    const lost = closed.filter(o => o.owner === id && o.stage === "Lost");
    return {
      id, wk, pipe: repPipeline(id, s),
      created: allOpps.filter(o => o.owner === id && o.created >= since30).length,
      quotesNov: D.QUOTES.filter(q => q.owner === id && q.sent >= "2026-11-01").length,
      won, lost, wonValue: won.reduce((a, o) => a + o.value, 0), lostValue: lost.reduce((a, o) => a + o.value, 0),
      requests: openRequests(s, id).length,
      nextWeek: s.activities.filter(a => a.rep === id && weekDays(NEXT_WEEK).includes(a.date)).length,
      proposals: s.proposals.filter(p => p.rep === id).length,
    };
  });
  type R = typeof rows[number];
  const cols: Col<R>[] = [
    { key: "rep", label: "Salesperson", w: "minmax(190px,1.6fr)", sort: r => firstName(r.id), render: r => <Person id={r.id} size={24} /> },
    { key: "created", label: "New opps", title: "New opportunities created in the last 30 days", w: "88px", align: "right", mono: true, sort: r => r.created, render: r => r.created },
    { key: "fu", label: "Follow-ups", title: "Completed activities linked to an opportunity this week, against target", w: "96px", align: "right", mono: true, sort: r => r.wk.followups, render: r => r.wk.followups + " / " + r.wk.target.followups },
    { key: "quotes", label: "Quotes", title: "Quotes sent in November", w: "76px", align: "right", mono: true, sort: r => r.quotesNov, render: r => r.quotesNov },
    { key: "rev", label: "Revenue", title: "Revenue attributed this week to date against target, demo figure", w: "118px", align: "right", mono: true, sort: r => r.wk.revenue, render: r => eurK(r.wk.revenue) + " / " + eurK(r.wk.target.revenue) },
    { key: "won", label: "Won (qtr)", title: "Value and number won this quarter", w: "104px", align: "right", mono: true, sort: r => r.wonValue, render: r => eurK(r.wonValue) + " · " + r.won.length },
    { key: "visited", label: "Visited", title: "Distinct accounts with a completed visit, meeting, demo or theatre support this week", w: "78px", align: "right", mono: true, sort: r => r.wk.accountsVisited, render: r => r.wk.accountsVisited },
    { key: "req", label: "Requests", title: "Open customer requests owned", w: "84px", align: "right", mono: true, sort: r => r.requests, render: r => r.requests },
    { key: "pipe", label: "Pipeline", title: "Open pipeline value and overdue follow-ups", w: "124px", align: "right", mono: true, sort: r => r.pipe.value, render: r => <span>{eurK(r.pipe.value)} <span style={{ color: r.pipe.overdue ? "var(--bad)" : "var(--faint)" }}>· {r.pipe.overdue} late</span></span> },
  ];
  const groups: [string, D.Stage[], string][] = [
    ["Early: lead, qualified", ["Lead", "Qualified"], "var(--faint)"],
    ["Evaluating: product discussion, clinical evaluation", ["Product Discussion", "Clinical Evaluation"], "var(--accent)"],
    ["Closing: quotation, negotiation", ["Quotation", "Negotiation"], "var(--ok)"],
  ];
  const open = openOpps(s);

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · Team Performance" title="Team performance"
          sub="This week's work and the open pipeline for each salesperson: the Friday review, then Monday's plan." />
        <Notice tone="info" title="Fictional team data">
          Rory Whelan, Clodagh Byrne and Eoin Tierney are fictional representatives and every figure here is demo data. These measures count planned work and outcomes so support can be planned; they are not ratings of individuals.
        </Notice>

        <Grid min={w < 640 ? 260 : 250} gap={12}>
          {rows.map(r => <RepCard key={r.id} r={r} />)}
        </Grid>

        <Card title="Scorecard" sub="Hover a column heading for its definition. Periods: this week (Mon 16 to Fri 20 Nov) unless stated." flush pad={18}>
          <Table cols={cols} rows={rows} rowKey={r => r.id} minWidth={960} onRow={r => nav("Sales", "planner", { "sales.planRep": r.id, "sales.planWeek": "this" })}
            footer={"Click a row to open that person's week in the planner. Team totals: " + rows.reduce((a, r) => a + r.wk.followups, 0) + " follow-ups done, " + rows.reduce((a, r) => a + r.wk.accountsVisited, 0) + " account visits, " + eurK(rows.reduce((a, r) => a + r.wk.revenue, 0)) + " revenue attributed (demo)."} />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: w >= 900 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14 }}>
          <Card title="Open pipeline by stage" sub={"€ by salesperson · " + open.length + " open opportunities, " + eur(open.reduce((a, o) => a + o.value, 0))}>
            <StackBars labels={rows.map(r => firstName(r.id))} fmt={eurK} height={190}
              series={groups.map(([name, stages, color]) => ({ name, color, values: rows.map(r => open.filter(o => o.owner === r.id && stages.includes(o.stage)).reduce((a, o) => a + o.value, 0)) }))} />
          </Card>
          <Card title="Closed this quarter" sub="Won and lost value by salesperson (demo)">
            <StackBars labels={rows.map(r => firstName(r.id))} fmt={eurK} height={190}
              series={[{ name: "Won", color: "var(--ok)", values: rows.map(r => r.wonValue) }, { name: "Lost", color: "var(--bad)", values: rows.map(r => r.lostValue) }]} />
          </Card>
        </div>

        <Card title="Friday review" sub="Close out this week and check next week is planned before Monday" flush pad={18}>
          {rows.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}><Person id={r.id} size={26} sub={D.staffById(r.id)?.territory} /></div>
              <Row gap={6} wrap style={{ flex: "1 1 300px" }}>
                <Badge tone="ok">{r.wk.done} done</Badge>
                <Badge tone="neutral">{r.wk.planned} still planned</Badge>
                <Badge tone={r.wk.missed ? "bad" : "neutral"}>{r.wk.missed} missed</Badge>
                <Badge tone={r.nextWeek >= 6 ? "ok" : "warn"}>{r.nextWeek} booked next week</Badge>
                {r.proposals > 0 && <Badge tone="accent">{r.proposals} suggestions waiting</Badge>}
              </Row>
              <Row gap={8}>
                <Btn size="sm" onClick={() => nav("Sales", "planner", { "sales.planRep": r.id, "sales.planWeek": "this" })}>Review week</Btn>
                <Btn kind="primary" size="sm" icon={I.calendar} onClick={() => nav("Sales", "planner", { "sales.planRep": r.id, "sales.planWeek": "next" })}>Plan next week</Btn>
              </Row>
            </div>
          ))}
        </Card>
      </div>
    </Page>
  );
}

function RepCard({ r }: { r: { id: D.StaffId; wk: ReturnType<typeof weekStats>; pipe: ReturnType<typeof repPipeline> } }) {
  const st = D.staffById(r.id)!;
  const bars: [string, number, number, (n: number) => string][] = [
    ["Visits", r.wk.visits, r.wk.target.visits, String],
    ["Follow-ups", r.wk.followups, r.wk.target.followups, String],
    ["Quotes", r.wk.quotes, r.wk.target.quotes, String],
    ["Revenue (demo)", r.wk.revenue, r.wk.target.revenue, eurK],
  ];
  return (
    <Card pad={16}>
      <Row gap={10}>
        <Avatar id={r.id} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{st.name}{st.fictional && <span style={{ fontSize: 10.5, color: "var(--faint)", fontWeight: 400 }}> (fictional)</span>}</div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.role}</div>
        </div>
      </Row>
      <div style={{ ...label, marginTop: 14, marginBottom: 8 }}>This week against target</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {bars.map(([k, v, t, f]) => (
          <div key={k}>
            <Row gap={6} style={{ marginBottom: 4 }}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--body)" }}>{k}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{f(v)} <span style={{ color: "var(--faint)" }}>/ {f(t)}</span></span>
            </Row>
            <Progress value={v} max={t} h={5} tone={v >= t ? "ok" : "accent"} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
        <Badge tone="neutral">{r.pipe.count} open · {eurK(r.pipe.value)}</Badge>
        <Badge tone={r.pipe.overdue ? "bad" : "ok"}>{r.pipe.overdue} overdue</Badge>
        <Badge tone={r.wk.missed ? "warn" : "neutral"}>{r.wk.missed} missed</Badge>
      </div>
      <Row gap={8} style={{ marginTop: 14 }}>
        <Btn size="sm" icon={I.calendar} onClick={() => nav("Sales", "planner", { "sales.planRep": r.id, "sales.planWeek": "next" })}>Plan week</Btn>
        <Btn kind="ghost" size="sm" onClick={() => nav("Sales", "myday", { "sales.rep": r.id })}>My Day</Btn>
      </Row>
    </Card>
  );
}
