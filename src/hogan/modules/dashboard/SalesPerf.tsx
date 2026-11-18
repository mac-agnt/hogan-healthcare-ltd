/* Dashboard · Sales Performance. Pipeline, conversion, the team, categories,
   lead sources, quotes and accounts that have gone quiet. Opportunities and
   quotes are live demo records; lead history is illustrative. */

import { Fragment } from "react";
import * as D from "../../data";
import { nav, openOpps, openRecord, overdueFollowups, pipelineValue, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, I, Icon, Kpi, Page, PageHeader, Progress, RecLink, Status, Table, type Col } from "../../ui";
import { HBars } from "../../charts";
import { daysAgo, date, eur, eurK, pct } from "../../fmt";
import { CHART, FIN, MTD_LABEL, closedOpps, leadSources, quietAccounts, quoteStats, repStats, stageBreakdown, sum, weighted } from "../finance/derive";
import { DaysBadge, Go, ItemRow, Kit, Kpis, Meter, Reconciles, Split, Src, th } from "../finance/kit";

type Rep = ReturnType<typeof repStats>[number];

function Team() {
  const s = useHogan();
  const reps = repStats(s);
  const accTotal = sum(reps.map(r => r.accountsRevenue));
  const rentals = FIN.byCategory.find(c => /NICE1/.test(c.k))?.rev || 0;
  const cols: Col<Rep>[] = [
    { key: "rep", label: "Representative", w: "minmax(160px,1.6fr)", render: r => (
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Avatar id={r.id} size={24} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.staff.name}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{r.accounts.length} accounts{r.staff.fictional ? " · fictional rep" : ""}</span>
        </span>
      </span>) },
    { key: "acc", label: "Sales MTD", w: "104px", align: "right", sort: r => r.accountsRevenue, render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{eur(r.accountsRevenue)}</b> },
    { key: "wk", label: "This week", w: "minmax(132px,1.2fr)", sort: r => r.weekRevenue / r.weekTarget, render: r => (
      <div>
        <div title={eur(r.weekRevenue) + " of a " + eur(r.weekTarget) + " weekly target"} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}><span>{eurK(r.weekRevenue)} <span style={{ color: "var(--faint)" }}>/ {eurK(r.weekTarget)}</span></span><span style={{ color: "var(--faint)" }}>{Math.round((r.weekRevenue / r.weekTarget) * 100)}%</span></div>
        <Progress value={r.weekRevenue} max={r.weekTarget} h={4} tone={r.weekRevenue / r.weekTarget < 0.7 ? "warn" : "accent"} style={{ marginTop: 5 }} />
      </div>) },
    { key: "pipe", label: "Pipeline", w: "92px", align: "right", sort: r => r.pipeline, render: r => <>{eur(r.pipeline)}<div style={{ fontSize: 11, color: "var(--faint)" }}>{r.pipelineCount} opps</div></> },
    { key: "wl", label: "Won · lost", w: "98px", align: "center", sort: r => r.won, render: r => <span><b style={{ color: "var(--ok)", fontWeight: 600 }}>{r.won}</b> · <span style={{ color: "var(--dim)" }}>{r.lost}</span></span> },
    { key: "od", label: "Overdue", w: "88px", align: "center", sort: r => r.overdue, render: r => r.overdue ? <Badge tone="warn">{r.overdue}</Badge> : <Badge tone="ok">0</Badge> },
  ];
  return (
    <Card title="Sales by representative" sub="Account sales month to date, this week against target, open pipeline, wins and losses this quarter, and overdue follow-ups. Click a person for their record." right={<Src k="live" />} flush>
      <Table cols={cols} rows={reps} rowKey={r => r.id} onRow={r => openRecord("staff", r.id)} minWidth={640} initialSort={{ key: "acc", dir: -1 }} />
      <div style={{ padding: "12px 16px" }}>
        <Reconciles ok={accTotal + rentals === FIN.revenue}>
          Account sales {eur(accTotal)} + NICE1 rentals to private customers {eur(rentals)} = {eur(FIN.revenue)} revenue, {MTD_LABEL}.
        </Reconciles>
      </div>
    </Card>
  );
}

function Followups() {
  const s = useHogan();
  const od = overdueFollowups(s);
  return (
    <Card title="Overdue follow-ups" sub={od.length + " opportunities worth " + eur(sum(od.map(o => o.value))) + " have a next step that is past due."}
      right={<Go onClick={() => nav("Sales", "followups")}>Follow-ups</Go>}>
      <div className="hk-list" style={{ maxHeight: 470, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
        {od.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 4px" }}>Every open opportunity has a current next step.</div>}
        {od.map(o => (
          <ItemRow key={o.id} tone={daysAgo(o.lastActivity) >= 14 ? "bad" : "warn"} icon={I.clock} onClick={() => openRecord("opp", o.id)}
            title={<>{D.accountById(o.account)?.name} <span style={{ color: "var(--dim)", fontWeight: 400 }}>· {eur(o.value)}</span></>}
            sub={o.nextAction}
            meta={<><Status s={o.stage} /><span style={{ fontSize: 11.5, color: "var(--faint)" }}>Due {date(o.nextDue, false)} · quiet {daysAgo(o.lastActivity)} days</span></>}
            right={<Avatar id={o.owner} size={22} />} />
        ))}
      </div>
    </Card>
  );
}

function Stages() {
  const s = useHogan();
  const st = stageBreakdown(s);
  const total = sum(st.map(x => x.value));
  return (
    <Card title="Pipeline by stage" sub="Value and count at each stage, with the probability used for weighting." right={<Go onClick={() => nav("Sales", "pipeline")}>Pipeline</Go>}>
      <HBars onRow={() => nav("Sales", "pipeline")} fmt={eur}
        data={st.map((x, i) => ({ label: x.stage, value: x.value, color: CHART[(i + 2) % CHART.length], sub: x.count + " · " + x.prob + "%", right: eurK(x.value) }))} />
      <Reconciles ok={total === pipelineValue(s)} style={{ marginTop: 14 }}>
        {st.map(x => x.count).join(" + ")} = {openOpps(s).length} open opportunities, {eur(total)}. Weighted by stage: {eur(weighted(s))}.
      </Reconciles>
    </Card>
  );
}

function Sources() {
  const s = useHogan();
  const rows = leadSources(s);
  const [open, setOpen] = useUi<string>("dash.leadSource", "");
  const tpl = "minmax(150px,1.6fr) 0.6fr 0.6fr 0.9fr 1fr";
  return (
    <Card title="Lead sources" sub="Leads and wins logged by source (demo history). Open pipeline is live. Click a source to see its opportunities." right={<Src k="live" />} flush>
      <div className="hk-scroll">
        <div style={{ minWidth: 520 }}>
          <div style={{ display: "grid", gridTemplateColumns: tpl, background: "var(--surface-faint)", borderBottom: "1px solid var(--border)" }}>
            {["Source", "Leads", "Won", "Conversion", "Open pipeline"].map((h, i) => <div key={h} style={{ ...th, textAlign: i ? "right" : "left" }}>{h}</div>)}
          </div>
          {rows.map(r => {
            const on = open === r.source;
            return (
              <Fragment key={r.source}>
                <div onClick={() => setOpen(on ? "" : r.source)} className="ix11"
                  style={{ display: "grid", gridTemplateColumns: tpl, alignItems: "center", borderBottom: "1px solid var(--border)", cursor: "pointer", background: on ? "var(--accent-faint)" : undefined }}>
                  <div style={{ padding: "9px 12px", fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <Icon d={on ? I.down : I.chevron} size={11} color="var(--faint)" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source}</span>
                  </div>
                  <div style={{ padding: "9px 12px", textAlign: "right", fontSize: 13 }}>{r.leads}</div>
                  <div style={{ padding: "9px 12px", textAlign: "right", fontSize: 13 }}>{r.won}</div>
                  <div style={{ padding: "9px 12px", textAlign: "right", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <Meter value={r.conv} max={50} w={36} color={r.conv >= 30 ? "var(--ok)" : "var(--accent)"} />{Math.round(r.conv)}%
                  </div>
                  <div style={{ padding: "9px 12px", textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{eur(r.live)}<span style={{ color: "var(--faint)", fontSize: 11 }}> · {r.opps.length}</span></div>
                </div>
                {on && (
                  <div style={{ padding: "6px 14px 10px 32px", borderBottom: "1px solid var(--border)", background: "var(--accent-faint)", animation: "expandIn .22s var(--ease) both" }}>
                    {r.opps.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>No open opportunities from this source.</div>}
                    {r.opps.map(o => (
                      <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", fontSize: 12.5 }}>
                        <RecLink type="opp" id={o.id} />
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--body)" }}>{D.accountById(o.account)?.name} · {o.title}</span>
                        <Status s={o.stage} />
                        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 64, textAlign: "right" }}>{eur(o.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: tpl, background: "var(--surface-faint)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
            <div style={{ padding: "9px 12px" }}>All sources</div>
            <div style={{ padding: "9px 12px", textAlign: "right" }}>{sum(rows.map(r => r.leads))}</div>
            <div style={{ padding: "9px 12px", textAlign: "right" }}>{sum(rows.map(r => r.won))}</div>
            <div style={{ padding: "9px 12px", textAlign: "right" }}>{Math.round((sum(rows.map(r => r.won)) / sum(rows.map(r => r.leads))) * 100)}%</div>
            <div style={{ padding: "9px 12px", textAlign: "right" }}>{eur(sum(rows.map(r => r.live)))}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Categories() {
  const cats = FIN.byCategory;
  const total = sum(cats.map(c => c.rev));
  return (
    <Card title="Sales by product category" sub={MTD_LABEL + ", with gross margin per category."} right={<Src k="accounts" />}>
      <HBars fmt={eur} onRow={() => nav("Finance", "profit")}
        data={cats.map((c, i) => ({ label: c.k, value: c.rev, color: CHART[i % CHART.length], sub: pct(((c.rev - c.cogs) / c.rev) * 100) + " GM", right: eurK(c.rev) }))} />
      <Reconciles ok={total === FIN.revenue} style={{ marginTop: 14 }}>Seven categories add up to {eur(total)}, the month's revenue.</Reconciles>
    </Card>
  );
}

function Quotes() {
  const q = quoteStats();
  const rev = q.open.filter(x => x.status === "Revision requested");
  const cols: Col<D.Quote>[] = [
    { key: "id", label: "Quote", w: "84px", render: r => <RecLink type="quote" id={r.id} /> },
    { key: "acc", label: "Account", w: "minmax(110px,1.2fr)", render: r => <span style={{ display: "block", lineHeight: 1.35 }}>{D.accountById(r.account)?.name}</span> },
    { key: "owner", label: "Rep", w: "56px", align: "center", render: r => <Avatar id={r.owner} size={20} /> },
    { key: "value", label: "Value", w: "80px", align: "right", sort: r => r.value, render: r => eur(r.value) },
    { key: "status", label: "Status", w: "152px", render: r => <Status s={r.status} /> },
    { key: "age", label: "Sent", w: "64px", align: "right", sort: r => daysAgo(r.sent), render: r => daysAgo(r.sent) > 7 ? <DaysBadge days={daysAgo(r.sent)} /> : <span style={{ fontSize: 12, color: "var(--dim)" }}>{daysAgo(r.sent)}d</span> },
  ];
  return (
    <Card title="Quotation performance" sub={q.open.length + " open quotes worth " + eur(q.openValue) + ". " + q.stale.length + " have waited more than a week (" + eur(q.staleValue) + ")."} flush>
      <Table cols={cols} rows={q.open} rowKey={r => r.id} dense onRow={r => openRecord("opp", r.opp)} highlight={r => daysAgo(r.sent) > 7} minWidth={520} initialSort={{ key: "age", dir: -1 }} />
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {rev.map(x => (
          <div key={x.id} style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
            <Badge tone="warn" style={{ marginRight: 8 }}>Revision requested</Badge>
            <RecLink type="quote" id={x.id} /> for {D.accountById(x.account)?.name}, {eur(x.value)}: asked for {daysAgo(x.sent)} days ago and still with {D.staffById(x.owner)?.first}.
          </div>
        ))}
        <div style={{ fontSize: 12, color: "var(--dim)" }}>
          Decided this quarter: {q.accepted.length} accepted ({eur(sum(q.accepted.map(x => x.value)))}), {q.declined.length} declined ({eur(sum(q.declined.map(x => x.value)))}).
        </div>
      </div>
    </Card>
  );
}

function Quiet() {
  const s = useHogan();
  const rows = quietAccounts(s, 14);
  const withDebt = rows.filter(r => r.overdue.length).length;
  type R = (typeof rows)[number];
  const cols: Col<R>[] = [
    { key: "acc", label: "Account", w: "minmax(170px,1.6fr)", render: r => <><RecLink type="account" id={r.a.id}>{r.a.name}</RecLink><div style={{ fontSize: 11, color: "var(--faint)" }}>{r.a.type} · {r.a.region}</div></> },
    { key: "owner", label: "Owner", w: "minmax(110px,1fr)", render: r => <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Avatar id={r.a.owner} size={20} />{D.staffById(r.a.owner)?.first}</span> },
    { key: "days", label: "Last visit", w: "minmax(110px,1fr)", sort: r => r.days, render: r => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><DaysBadge days={r.days} /><span style={{ fontSize: 12, color: "var(--dim)" }}>{date(r.a.lastVisit, false)}</span></span> },
    { key: "ytd", label: "Sales this year", w: "1fr", align: "right", sort: r => r.a.ytdRevenue, render: r => eur(r.a.ytdRevenue) },
    { key: "pipe", label: "Open pipeline", w: "1fr", align: "right", sort: r => r.pipeline, render: r => (r.pipeline ? eur(r.pipeline) : <span style={{ color: "var(--faint)" }}>None</span>) },
    { key: "od", label: "Overdue invoices", w: "minmax(120px,1fr)", render: r => r.overdue.length ? r.overdue.map(i => <RecLink key={i.id} type="invoice" id={i.id} style={{ marginRight: 8 }}>{i.id}</RecLink>) : <span style={{ color: "var(--faint)" }}>None</span> },
  ];
  return (
    <Card title="Accounts not visited in the last 14 days" sub={rows.length + " accounts. " + withDebt + " of them also have an overdue invoice, so a visit can cover the payment conversation too."}
      right={<Btn size="sm" icon={I.calendar} onClick={() => nav("Sales", "planner")}>Plan visits</Btn>} flush>
      <Table cols={cols} rows={rows} rowKey={r => r.a.id} onRow={r => openRecord("account", r.a.id)} minWidth={760} initialSort={{ key: "days", dir: -1 }} />
    </Card>
  );
}

export default function SalesPerf() {
  const s = useHogan();
  const open = openOpps(s), od = overdueFollowups(s), c = closedOpps(s), q = quoteStats();
  return (
    <Page>
      <Kit>
        <PageHeader eyebrow="Dashboard · Sales performance" title="Pipeline, conversion and the field team"
          sub="Pipeline, conversion and field activity. Opportunities and quotes are live demo records; lead history is illustrative."
          right={<Btn size="sm" icon={I.target} onClick={() => nav("Sales", "pipeline")}>Open Sales</Btn>} />
        <Kpis>
          <Kpi label="Open pipeline" value={eur(pipelineValue(s))} sub={open.length + " opportunities"} onClick={() => nav("Sales", "pipeline")} />
          <Kpi label="Weighted pipeline" value={eur(weighted(s))} sub="Value × stage probability" />
          <Kpi label="Win rate, this quarter" value={Math.round(c.rate) + "%"} sub={c.won.length + " of " + c.all.length + " won, " + Math.round(c.valueRate) + "% of value"} />
          <Kpi label="Overdue follow-ups" value={od.length + " of " + open.length} tone={od.length ? "warn" : "ok"} sub={Math.round((od.length / Math.max(1, open.length)) * 100) + "% of open opportunities"} onClick={() => nav("Sales", "followups")} />
          <Kpi label="Open quotes" value={eur(q.openValue)} sub={q.open.length + " quotes · " + q.stale.length + " older than a week"} />
        </Kpis>
        <Split k="21">
          <Team />
          <Followups />
        </Split>
        <Split k="12">
          <Stages />
          <Sources />
        </Split>
        <Split k="11">
          <Categories />
          <Quotes />
        </Split>
        <Quiet />
      </Kit>
    </Page>
  );
}
