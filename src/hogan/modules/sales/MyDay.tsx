/* Sales · My Day: the daily action workspace for a field salesperson. */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { completeActivity, openRecord, overdueFollowups, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, Grid, I, Icon, Kpi, Page, PageHeader, Progress, RecLink, Row, SelectBox, TextInput, label } from "../../ui";
import { TODAY, addDays, date, dayDate, daysAgo, eur, eurK, longDate, rel } from "../../fmt";
import {
  IN_PERSON, SCHEDULE_DAYS, actionText, byWhen, followTitle, dayLabel, findOpp, firstName, freeSlot, isOverdue, lastContact, lastVisit, openQuotes, openRequests, overdueBy,
  planActivity, plannedFor, quietAccounts, quoteStatus, resolveRequest, setNextStep, useWidth, weekStats,
} from "./lib";
import { ActivityComposer, AgentTag, Field, PRIORITY_TONE, RepPicker, ReschedulePanel, Rule, TypeChip, panelStyle } from "./parts";

export default function MyDay() {
  const s = useHogan();
  const [rep, setRep] = useUi<D.StaffId>("sales.rep", "AC");
  const [ref, w] = useWidth();
  const [adding, setAdding] = useState(false);
  const staff = D.staffById(rep)!;
  const today = s.activities.filter(a => a.rep === rep && a.date === TODAY).sort(byWhen);
  const done = today.filter(a => a.status === "Done").length;
  const next = today.find(a => a.status === "Planned");
  const overdue = overdueFollowups(s).filter(o => o.owner === rep);
  const quotes = openQuotes(s, rep);
  const requests = openRequests(s, rep);
  const wk = weekStats(rep, s);
  const wide = w >= 940;

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · My Day"
          title={<>{staff.name} · {longDate(TODAY)}</>}
          sub={<>{staff.role}{staff.fictional ? " (fictional representative)" : ""} · {staff.territory}. {done} of {today.length} done today{next ? <>. Next up: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{next.time} {next.title}</b></> : ""}.</>}
          right={<RepPicker value={rep} onChange={v => { setRep(v); setAdding(false); }} />} />

        <Grid min={wide ? 170 : 140} gap={10}>
          <Kpi label="Today" value={done + " / " + today.length} sub={next ? "Next " + next.time : today.length ? "All done" : "Nothing planned"} />
          <Kpi label="Overdue follow-ups" value={overdue.length} tone={overdue.length ? "warn" : "ok"} sub={overdue.length ? eur(overdue.reduce((a, o) => a + o.value, 0)) + " waiting" : "All current"} />
          <Kpi label="Quotes awaiting reply" value={quotes.length} sub={quotes.length ? eur(quotes.reduce((a, q) => a + q.value, 0)) + " quoted" : "None open"} />
          <Kpi label="Customer requests" value={requests.length} sub={requests.length ? "Oldest " + rel(requests[0].raised).toLowerCase() : "None open"} />
          <Kpi label="Revenue this week" demo value={eur(wk.revenue)} sub={"Target " + eur(wk.target.revenue)} spark={<div style={{ width: 54 }}><Progress value={wk.revenue} max={wk.target.revenue} h={5} /></div>} />
        </Grid>

        <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1.7fr) minmax(300px,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Card title={"Today's plan · " + dayDate(TODAY)} sub={today.length + " activities · " + done + " done · " + (today.length - done) + " to go"}
            right={<Btn size="sm" icon={adding ? I.x : I.plus} onClick={() => setAdding(!adding)}>{adding ? "Close" : "Add to my day"}</Btn>}>
            {adding && <div style={{ marginBottom: 6 }}><ActivityComposer rep={rep} date={TODAY} days={SCHEDULE_DAYS} source="rep" heading={"Add to " + firstName(rep) + "'s day"} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
            {today.length === 0 && !adding && <Empty title="Nothing planned today" sub="Add a visit or call, or take one of the Sales Agent's suggestions." icon={I.calendar} />}
            {today.map((a, i) => <DayItem key={a.id} a={a} first={i === 0 && !adding} narrow={w < 640} />)}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <Suggestions rep={rep} />
            <Targets rep={rep} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3,minmax(0,1fr))" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Quotes rep={rep} />
          <Requests rep={rep} />
          <ComingUp rep={rep} />
        </div>
      </div>
    </Page>
  );
}

/* ── Today's activities ─────────────────────────────────────────────────── */

function DayItem({ a, first, narrow }: { a: D.SalesActivity; first: boolean; narrow: boolean }) {
  const s = useHogan();
  const [mode, setMode] = useState<"" | "move" | "next">("");
  const acc = a.account ? D.accountById(a.account) : undefined;
  const o = a.opp ? findOpp(a.opp, s) : undefined;
  const isDone = a.status === "Done";
  const lc = lastContact(a, s);
  const lcDays = lc ? daysAgo(lc) : 0;
  const accOpps = acc ? s.opps.filter(x => x.account === acc.id && x.stage !== "Won" && x.stage !== "Lost") : [];
  const req = acc ? openRequests(s).find(r => r.account === acc.id) : undefined;
  const interest = o ? o.interest : Array.from(new Set(accOpps.map(x => x.interest))).join(", ") || acc?.type || "";
  const internal = !acc && !o;
  const customerToday = s.activities.filter(x => x.rep === a.rep && x.date === TODAY && x.account).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "58px minmax(0,1fr)", gap: narrow ? 8 : 12, padding: "14px 0", borderTop: first ? undefined : "1px solid var(--border)", opacity: isDone ? 0.78 : 1, animation: "fadeUp .3s var(--ease) both" }}>
      <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", alignItems: narrow ? "center" : "flex-start", gap: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, color: isDone ? "var(--dim)" : "var(--ink)", letterSpacing: "-.3px" }}>{a.time}</span>
        <TypeChip type={a.type} done={isDone} />
      </div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <Row gap={8} wrap>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.2px", marginRight: 2 }}>{a.title}</span>
          <Badge tone={PRIORITY_TONE[a.priority]}>{a.priority} priority</Badge>
          {isDone ? <Badge tone="ok">Done</Badge> : a.status === "Missed" ? <Badge tone="bad">Missed</Badge> : <Badge tone="neutral">{a.type}</Badge>}
          {a.source === "planner" && <Badge tone="accent" title="Added from the weekly planner">Added by Graham</Badge>}
          {a.source === "agent" && <Badge tone="accent">Sales Agent</Badge>}
        </Row>
        {internal ? (
          <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Internal. {customerToday} customer {customerToday === 1 ? "activity" : "activities"} on today's plan to write up.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "10px 16px" }}>
            <Field k="Customer">{acc ? <RecLink type="account" id={acc.id}>{acc.name}</RecLink> : "Not linked"}</Field>
            <Field k="Opportunity">{o ? <><RecLink type="opp" id={o.id}>{o.title}</RecLink><span style={{ color: "var(--dim)" }}> · {eur(o.value)} · {o.stage}</span></> : accOpps.length ? accOpps.length + " open with " + Array.from(new Set(accOpps.map(x => firstName(x.owner)))).join(", ") : "None open"}</Field>
            <Field k="Last contact" tone={lcDays >= 14 ? "bad" : lcDays >= 7 ? "warn" : undefined}>{lc ? date(lc, false) + " · " + rel(lc).toLowerCase() : "No contact logged"}</Field>
            <Field k="Next action" tone={o && isOverdue(o) ? "bad" : undefined}>
              {o ? actionText(o.nextAction) : req ? "Open request: " + req.title : accOpps[0] ? actionText(accOpps[0].nextAction) : "No next action set"}
              {o && <span style={{ display: "block", color: isOverdue(o) ? "var(--bad)" : "var(--dim)" }}>{isOverdue(o) ? "Was due " + date(o.nextDue, false) + ", " + overdueBy(o) + " days overdue" : "Due " + dayDate(o.nextDue)}</span>}
            </Field>
            <Field k="Product interest">{interest || "Not recorded"}</Field>
            <Field k="Due">{isDone ? "Done · booked for " + a.time : a.status === "Missed" ? "Missed · was " + a.time : a.time + " today"}</Field>
          </div>
        )}
        {a.note && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)", padding: "8px 11px", background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)" }}>{a.note}</div>}
        <Row gap={8} wrap>
          {!isDone && <Btn kind="primary" size="sm" icon={I.check} onClick={() => completeActivity(a.id)}>Mark done</Btn>}
          {!isDone && <Btn size="sm" icon={I.calendar} onClick={() => setMode(mode === "move" ? "" : "move")}>Reschedule</Btn>}
          {isDone && o && o.stage !== "Won" && o.stage !== "Lost" && <Btn size="sm" icon={I.edit} onClick={() => setMode(mode === "next" ? "" : "next")}>Set next step</Btn>}
          {o && <Btn kind="ghost" size="sm" onClick={() => openRecord("opp", o.id)}>Open opportunity</Btn>}
          {!o && acc && <Btn kind="ghost" size="sm" onClick={() => openRecord("account", acc.id)}>Open account</Btn>}
          {isDone && o && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Next step: {actionText(o.nextAction)} · due {dayDate(o.nextDue)}</span>}
        </Row>
        {mode === "move" && <ReschedulePanel act={a} onDone={() => setMode("")} />}
        {mode === "next" && o && <NextStepPanel o={o} onDone={() => setMode("")} />}
      </div>
    </div>
  );
}

export function NextStepPanel({ o, onDone }: { o: D.Opportunity; onDone: () => void }) {
  const [text, setText] = useState(o.nextAction.startsWith("Next step agreed") ? "" : o.nextAction);
  const [due, setDue] = useState(o.nextDue > TODAY ? o.nextDue : addDays(TODAY, 7));
  const opts: [string, string][] = [2, 5, 7, 14, 21].map(n => [addDays(TODAY, n), dayDate(addDays(TODAY, n)) + " · in " + n + " days"]);
  if (!opts.some(x => x[0] === due)) opts.unshift([due, dayDate(due)]);
  return (
    <div style={panelStyle}>
      <span style={label}>Next step for {o.title}</span>
      <TextInput value={text} onChange={setText} placeholder="For example: confirm trial dates with theatre manager" style={{ width: "100%" }} />
      <Row gap={8} wrap>
        <SelectBox title="Due" value={due} onChange={setDue} options={opts} />
        <Btn kind="primary" size="sm" icon={I.check} disabled={!text.trim()} onClick={() => { setNextStep(o.id, text.trim(), due); onDone(); }}>Save next step</Btn>
        <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>
      </Row>
    </div>
  );
}

/* ── Sales Agent suggestions ────────────────────────────────────────────── */

function Suggestions({ rep }: { rep: D.StaffId }) {
  const s = useHogan();
  const [rebook, setRebook] = useState<string | null>(null);
  const overdue = overdueFollowups(s).filter(o => o.owner === rep);
  const missed = s.activities.filter(a => a.rep === rep && a.status === "Missed").sort(byWhen);
  const quiet = quietAccounts(rep, s);
  const count = overdue.length + missed.length + quiet.length;
  const row = (key: string, title: string, sub: string, action: ReactNode, tone: "bad" | "warn" | "neutral" = "warn", extra?: ReactNode, icon: string = I.alert) => (
    <div key={key} style={{ padding: "11px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 26, height: 26, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tone === "neutral" ? "var(--surface-2)" : "var(--" + tone + "-soft)", color: tone === "neutral" ? "var(--dim)" : "var(--" + tone + ")" }}><Icon d={icon} size={13} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
        </div>
        <div style={{ flex: "none" }}>{action}</div>
      </div>
      {extra}
    </div>
  );
  return (
    <Card title={<AgentTag text="Sales Agent suggests" />} sub="Suggestions only. Nothing goes into the plan until you choose." right={<Badge tone={count ? "warn" : "ok"}>{count}</Badge>}>
      {count === 0 && <Empty title="Nothing to chase" sub={"Every opportunity " + firstName(rep) + " owns has a current next step."} />}
      {overdue.map(o => {
        const p = plannedFor(o.id, s)[0];
        const acc = D.accountById(o.account);
        return row(o.id, "Follow up " + (acc?.name || "") + ": " + o.title,
          "Overdue " + overdueBy(o) + " days · " + eur(o.value) + " · quiet " + daysAgo(o.lastActivity) + " days · " + o.stage,
          p ? <Badge tone="ok" title={p.title}>Planned {p.date === TODAY ? p.time : dayLabel(p.date)}</Badge>
            : <Btn size="sm" icon={I.plus} onClick={() => planActivity({ rep, date: TODAY, time: freeSlot(rep, TODAY, s), type: "Follow-up", title: followTitle(o), account: o.account, opp: o.id, status: "Planned", priority: "High", source: "rep", note: "Suggested by the Sales Agent: " + overdueBy(o) + " days overdue." })}>Add today</Btn>,
          o.value >= 10000 || overdueBy(o) >= 5 ? "bad" : "warn");
      })}
      {missed.map(a => row(a.id, "Rebook missed: " + a.title, dayDate(a.date) + " " + a.time + (a.account ? " · " + (D.accountById(a.account)?.name || "") : "") + (a.note ? ". " + a.note : ""),
        <Btn size="sm" icon={I.calendar} onClick={() => setRebook(rebook === a.id ? null : a.id)}>{rebook === a.id ? "Close" : "Rebook"}</Btn>, "warn",
        rebook === a.id ? <ReschedulePanel act={a} onDone={() => setRebook(null)} /> : undefined, I.calendar))}
      {quiet.map(acc => {
        const planned = s.activities.find(a => a.account === acc.id && a.rep === rep && a.status === "Planned" && a.date >= TODAY && IN_PERSON.includes(a.type));
        const tomorrow = SCHEDULE_DAYS[1];
        const lv = lastVisit(acc.id, s);
        return row(acc.id, "Visit " + acc.name, "No visit for " + daysAgo(lv) + " days · last " + date(lv, false) + " · " + eur(acc.mtdRevenue) + " this month (demo)",
          planned ? <Badge tone="ok">Planned {dayLabel(planned.date)}</Badge>
            : <Btn size="sm" icon={I.pin} onClick={() => planActivity({ rep, date: tomorrow, time: freeSlot(rep, tomorrow, s), type: "Visit", title: "Account visit: " + acc.name, account: acc.id, status: "Planned", priority: "Medium", source: "rep", note: "Suggested by the Sales Agent: not visited for " + daysAgo(lv) + " days." })}>Plan visit</Btn>,
          "neutral", undefined, I.pin);
      })}
    </Card>
  );
}

/* ── Weekly targets ─────────────────────────────────────────────────────── */

function Targets({ rep }: { rep: D.StaffId }) {
  const s = useHogan();
  const wk = weekStats(rep, s);
  const rows: [string, number, number, (n: number) => string, boolean?][] = [
    ["Visits", wk.visits, wk.target.visits, String],
    ["Follow-ups completed", wk.followups, wk.target.followups, String],
    ["Quotes sent", wk.quotes, wk.target.quotes, String],
    ["Revenue attributed", wk.revenue, wk.target.revenue, eurK, true],
  ];
  return (
    <Card title="This week" sub="Mon 16 to Fri 20 Nov · targets are demo figures">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(([k, v, t, f, demo]) => (
          <div key={k}>
            <Row gap={8} style={{ marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--body)" }}>{k}{demo && <span style={{ color: "var(--faint)" }}> (demo)</span>}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink)" }}>{f(v)} <span style={{ color: "var(--faint)" }}>/ {f(t)}</span></span>
            </Row>
            <Progress value={v} max={t} tone={v >= t ? "ok" : "accent"} h={6} />
          </div>
        ))}
        <Rule>Activities</Rule>
        <Row gap={6} wrap>
          <Badge tone="ok">{wk.done} done</Badge>
          <Badge tone="neutral">{wk.planned} planned</Badge>
          <Badge tone={wk.missed ? "bad" : "neutral"}>{wk.missed} missed</Badge>
          <Badge tone="neutral">{wk.accountsVisited} accounts visited</Badge>
        </Row>
      </div>
    </Card>
  );
}

/* ── Quotes, requests, coming up ────────────────────────────────────────── */

function Quotes({ rep }: { rep: D.StaffId }) {
  const s = useHogan();
  const list = openQuotes(s, rep);
  return (
    <Card title="Quotations awaiting a response" sub={list.length ? list.length + " open · " + eur(list.reduce((a, q) => a + q.value, 0)) : "None open"}>
      {list.length === 0 && <Empty title="No quotes waiting" sub="Every quote sent has a response recorded." />}
      {list.map((q, i) => {
        const chase = s.activities.find(a => a.title.includes(q.id) && a.status === "Planned");
        const st = quoteStatus(q, s);
        return (
          <div key={q.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : undefined, display: "flex", flexDirection: "column", gap: 6 }}>
            <Row gap={8} wrap>
              <RecLink type="quote" id={q.id} style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{q.id}</RecLink>
              <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{D.accountById(q.account)?.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink)" }}>{eur(q.value)}</span>
            </Row>
            <Row gap={8} wrap>
              <Badge tone={st === "Revision requested" ? "warn" : st === "Viewed" ? "accent" : "neutral"}>{st}</Badge>
              <span style={{ fontSize: 12, color: daysAgo(q.sent) >= 7 ? "var(--warn)" : "var(--dim)", flex: 1 }}>Sent {daysAgo(q.sent)} days ago · valid to {date(q.validTo, false)}</span>
              {chase ? <Badge tone="ok" title={chase.title}>Chase {dayLabel(chase.date)} {chase.time}</Badge>
                : <Btn size="sm" icon={I.phone} onClick={() => planActivity({ rep, date: TODAY, time: freeSlot(rep, TODAY, s), type: "Call", title: "Chase " + q.id + " with " + (D.accountById(q.account)?.name || ""), account: q.account, opp: q.opp, status: "Planned", priority: "Medium", source: "rep" })}>Chase today</Btn>}
            </Row>
          </div>
        );
      })}
    </Card>
  );
}

const REQ_TYPE: Record<string, D.ActType> = { Training: "Clinical support", "Loan set": "Clinical support", Pricing: "Call", Documentation: "Admin", Return: "Admin", Tender: "Admin", Reporting: "Admin", Stock: "Visit" };

function Requests({ rep }: { rep: D.StaffId }) {
  const s = useHogan();
  const list = openRequests(s, rep);
  return (
    <Card title="Customer requests" sub={list.length ? list.length + " open for " + firstName(rep) : "None open"}>
      {list.length === 0 && <Empty title="No open requests" sub="Requests from customers that need you will show here." />}
      {list.map((r, i) => {
        const planned = s.activities.find(a => a.note === "Request " + r.id && a.status === "Planned");
        const tomorrow = SCHEDULE_DAYS[1];
        return (
          <div key={r.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : undefined, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{r.title}</div>
            <Row gap={8} wrap>
              <RecLink type="account" id={r.account} style={{ fontSize: 12 }}>{D.accountById(r.account)?.name}</RecLink>
              <span style={{ fontSize: 12, color: "var(--dim)", flex: 1 }}>{r.kind} · {r.id} · raised {rel(r.raised).toLowerCase()}</span>
              <Badge tone={r.status === "Open" ? "warn" : "neutral"}>{r.status}</Badge>
            </Row>
            <Row gap={8}>
              {planned ? <Badge tone="ok">Planned {dayLabel(planned.date)} {planned.time}</Badge>
                : <Btn size="sm" icon={I.calendar} onClick={() => planActivity({ rep, date: tomorrow, time: freeSlot(rep, tomorrow, s), type: REQ_TYPE[r.kind] || "Call", title: r.title, account: r.account, status: "Planned", priority: "Medium", source: "rep", note: "Request " + r.id })}>Plan tomorrow</Btn>}
              <Btn kind="ghost" size="sm" icon={I.check} onClick={() => resolveRequest(r.id)}>Mark resolved</Btn>
            </Row>
          </div>
        );
      })}
    </Card>
  );
}

function ComingUp({ rep }: { rep: D.StaffId }) {
  const s = useHogan();
  const days = SCHEDULE_DAYS.slice(1, 6);
  const items = s.activities.filter(a => a.rep === rep && days.includes(a.date) && a.status === "Planned").sort(byWhen);
  return (
    <Card title="Coming up" sub={"Next five working days · " + items.length + " planned"}>
      {items.length === 0 && <Empty title="Nothing booked yet" sub="Use the weekly planner to fill the next few days." icon={I.calendar} />}
      {days.filter(d => items.some(a => a.date === d)).map(d => (
        <div key={d} style={{ marginBottom: 8 }}>
          <Rule>{dayLabel(d) === "Tomorrow" ? "Tomorrow · " + dayDate(d) : dayDate(d)}</Rule>
          {items.filter(a => a.date === d).map(a => (
            <div key={a.id} className="ix11" onClick={() => a.opp ? openRecord("opp", a.opp) : a.account ? openRecord("account", a.account) : undefined}
              style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 6px", margin: "0 -6px", borderRadius: 8, cursor: a.opp || a.account ? "pointer" : undefined }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)", width: 38, flex: "none" }}>{a.time}</span>
              <TypeChip type={a.type} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.account ? D.accountById(a.account)?.name : "Internal"}</span>
              </span>
              {a.priority === "High" && <Badge tone="bad">High</Badge>}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}
