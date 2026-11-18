/* Sales · Follow-ups: the overdue queue and what is due this week, with log, schedule and reassign. */

import { useState } from "react";
import * as D from "../../data";
import { nav, openOpps, openRecord, overdueFollowups, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Empty, Grid, I, Icon, Kpi, Page, PageHeader, Row, Seg, SelectBox, TextInput, label } from "../../ui";
import { Line } from "../../charts";
import { TODAY, addDays, date, dayDate, eur } from "../../fmt";
import {
  SELLER_IDS, SELLER_OPTIONS, THIS_SUNDAY, actionText, followTitle, dayLabel, firstName, fullName, isOverdue, logFollowUp, overdueBy, plannedFor, reassignOpp, useWidth,
} from "./lib";
import { DuePill, QuietPill, Rule, SchedulePanel, panelStyle } from "./parts";

export default function Followups() {
  const s = useHogan();
  const [rep, setRep] = useUi<string>("sales.fuRep", "all");
  const [ref, w] = useWidth();
  const mine = (o: D.Opportunity) => rep === "all" || o.owner === rep;
  const overdueAll = overdueFollowups(s);
  const overdue = overdueAll.filter(mine);
  const week = openOpps(s).filter(o => mine(o) && o.nextDue >= TODAY && o.nextDue <= THIS_SUNDAY).sort((a, b) => a.nextDue.localeCompare(b.nextDue) || b.value - a.value);
  const nextWeek = openOpps(s).filter(o => mine(o) && o.nextDue > THIS_SUNDAY && o.nextDue <= addDays(THIS_SUNDAY, 7)).sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const planned = overdue.filter(o => plannedFor(o.id, s).length > 0).length;
  const oldest = overdue.slice().sort((a, b) => a.nextDue.localeCompare(b.nextDue))[0];
  const wide = w >= 1000;

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · Follow-ups" title="Follow-ups"
          sub={overdueAll.length + " follow-ups are overdue across the team and " + openOpps(s).filter(o => o.nextDue >= TODAY && o.nextDue <= THIS_SUNDAY).length + " more fall due by Sunday. Log what happened, put the next one in someone's plan, or hand it to a colleague."}
          right={<Seg<string> value={rep} onChange={setRep} items={[["all", "Everyone", overdueAll.length], ...SELLER_IDS.map(id => [id, firstName(id), overdueAll.filter(o => o.owner === id).length] as [string, string, number])]} />} />

        <Grid min={w < 640 ? 150 : 190} gap={10}>
          <Kpi label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : "ok"} sub={eur(overdue.reduce((a, o) => a + o.value, 0)) + " in these opportunities"} />
          <Kpi label="Due by Sunday" value={week.length} tone={week.length ? "warn" : undefined} sub={week[0] ? "Next: " + dayDate(week[0].nextDue) : "Nothing else due"} />
          <Kpi label="Overdue with a slot booked" value={planned + " of " + overdue.length} sub={overdue.length - planned ? (overdue.length - planned) + " not in anyone's plan" : "All booked in"} tone={overdue.length - planned ? "warn" : "ok"} />
          <Kpi label="Longest overdue" value={oldest ? overdueBy(oldest) + " days" : "None"} sub={oldest ? D.accountById(oldest.account)?.name : "Queue is clear"} onClick={oldest ? () => openRecord("opp", oldest.id) : undefined} />
        </Grid>

        <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1fr) 300px" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <Card title={"Overdue · " + overdue.length} sub="Largest first. Each one needs a logged contact or a slot in someone's plan." flush pad={18}>
              {overdue.length === 0 && <Empty title="No overdue follow-ups" sub={rep === "all" ? "Every open opportunity has a current next step." : firstName(rep) + " is up to date."} />}
              {overdue.map(o => <FollowRow key={o.id} o={o} narrow={w < 700} />)}
            </Card>
            <Card title={"Due by Sunday · " + week.length} sub={"Today to " + dayDate(THIS_SUNDAY)} flush pad={18}>
              {week.length === 0 && <Empty title="Nothing else due this week" />}
              {week.map(o => <FollowRow key={o.id} o={o} narrow={w < 700} />)}
            </Card>
            {nextWeek.length > 0 && (
              <Card title={"Next week · " + nextWeek.length} sub="Due 23 to 29 Nov. Plan these on Friday." flush pad={18}>
                {nextWeek.map(o => <FollowRow key={o.id} o={o} narrow={w < 700} compact />)}
              </Card>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <ByRep rep={rep} onPick={setRep} />
            <Card title="Follow-up completion" sub="Share of follow-ups done by their due date, last 12 weeks (demo)">
              <Line labels={D.WEEKS} series={[{ name: "Completed on time", values: D.OPS_TRENDS.followupCompletion, color: "var(--accent)" }]} height={130} fmt={n => n + "%"} yMin={50} markLast />
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>Latest week {D.OPS_TRENDS.followupCompletion[D.OPS_TRENDS.followupCompletion.length - 1]}%. Clearing the {overdueAll.length} overdue items is the quickest way to lift it.</div>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}

function ByRep({ rep, onPick }: { rep: string; onPick: (r: string) => void }) {
  const s = useHogan();
  const all = overdueFollowups(s);
  return (
    <Card title="By salesperson" sub="Overdue now and due by Sunday" flush pad={18}>
      {SELLER_IDS.map(id => {
        const od = all.filter(o => o.owner === id);
        const wk = openOpps(s).filter(o => o.owner === id && o.nextDue >= TODAY && o.nextDue <= THIS_SUNDAY);
        const on = rep === id;
        return (
          <div key={id} className="ix11" onClick={() => onPick(on ? "all" : id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderTop: "1px solid var(--border)", cursor: "pointer", background: on ? "var(--accent-faint)" : undefined }}>
            <Avatar id={id} size={26} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{fullName(id)}{D.staffById(id)?.fictional && <span style={{ fontSize: 10, color: "var(--faint)" }}> (fictional)</span>}</span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{eur(od.reduce((a, o) => a + o.value, 0))} overdue · {wk.length} due this week</span>
            </span>
            <Badge tone={od.length ? "bad" : "ok"}>{od.length}</Badge>
          </div>
        );
      })}
    </Card>
  );
}

type Mode = "" | "log" | "schedule" | "reassign";

function FollowRow({ o, narrow, compact }: { o: D.Opportunity; narrow: boolean; compact?: boolean }) {
  const s = useHogan();
  const [mode, setMode] = useState<Mode>("");
  const acc = D.accountById(o.account);
  const plan = plannedFor(o.id, s);
  const late = isOverdue(o);
  const toggle = (m: Mode) => setMode(mode === m ? "" : m);
  return (
    <div style={{ padding: "13px 18px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: narrow ? "wrap" : undefined }}>
        <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: late ? "var(--bad-soft)" : "var(--warn-soft)", color: late ? "var(--bad)" : "var(--warn)" }}>
          <Icon d={late ? I.alert : I.clock} size={14} />
        </span>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <Row gap={8} wrap>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{acc?.name}</span>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>{o.title}</span>
          </Row>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 5, lineHeight: 1.5 }}>
            <span style={{ color: "var(--faint)" }}>Next action: </span>{actionText(o.nextAction)}
            <span style={{ color: late ? "var(--bad)" : "var(--dim)" }}> · {late ? "was due " + date(o.nextDue, false) : "due " + dayDate(o.nextDue)}</span>
          </div>
          {!compact && (
            <Row gap={6} wrap style={{ marginTop: 7 }}>
              <DuePill o={o} />
              <QuietPill since={o.lastActivity} />
              <Badge tone="neutral">{o.stage}</Badge>
              {plan[0] ? <Badge tone="ok" title={plan[0].title}>In {firstName(plan[0].rep)}'s plan · {dayLabel(plan[0].date)} {plan[0].time}</Badge>
                : <Badge tone="warn">Not in anyone's plan</Badge>}
            </Row>
          )}
        </div>
        <div style={{ flex: "none", textAlign: narrow ? "left" : "right", display: "flex", flexDirection: narrow ? "row" : "column", alignItems: narrow ? "center" : "flex-end", gap: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{eur(o.value)}</span>
          <Row gap={6}><Avatar id={o.owner} size={20} /><span style={{ fontSize: 12, color: "var(--dim)" }}>{firstName(o.owner)}</span></Row>
        </div>
      </div>
      <Row gap={8} wrap style={{ paddingLeft: narrow ? 0 : 42 }}>
        <Btn kind={mode === "log" ? "accent" : "primary"} size="sm" icon={I.check} onClick={() => toggle("log")}>Log follow-up</Btn>
        <Btn kind={mode === "schedule" ? "accent" : "secondary"} size="sm" icon={I.calendar} onClick={() => toggle("schedule")}>Schedule</Btn>
        <Btn kind={mode === "reassign" ? "accent" : "secondary"} size="sm" icon={I.users} onClick={() => toggle("reassign")}>Reassign</Btn>
        <Btn kind="ghost" size="sm" onClick={() => openRecord("opp", o.id)}>Open</Btn>
      </Row>
      {mode !== "" && (
        <div style={{ paddingLeft: narrow ? 0 : 42 }}>
          {mode === "log" && <LogPanel o={o} onDone={() => setMode("")} />}
          {mode === "schedule" && <SchedulePanel title={followTitle(o)} rep={o.owner} account={o.account} opp={o.id} priority={late ? "High" : "Medium"} note={late ? "Overdue " + overdueBy(o) + " days when scheduled." : undefined} onDone={() => setMode("")} onCancel={() => setMode("")} />}
          {mode === "reassign" && <ReassignPanel o={o} onDone={() => setMode("")} />}
        </div>
      )}
    </div>
  );
}

function LogPanel({ o, onDone }: { o: D.Opportunity; onDone: () => void }) {
  const [outcome, setOutcome] = useState("");
  const [next, setNext] = useState(/^Next step agreed on /.test(o.nextAction) ? "" : o.nextAction);
  const [due, setDue] = useState(addDays(TODAY, 7));
  const acc = D.accountById(o.account);
  return (
    <div style={panelStyle}>
      <span style={label}>Log a follow-up with {acc?.name}</span>
      <TextInput value={outcome} onChange={setOutcome} placeholder="What happened? For example: spoke to theatre manager, feedback positive" style={{ width: "100%" }} />
      <TextInput value={next} onChange={setNext} placeholder="Next step" style={{ width: "100%" }} />
      <Row gap={8} wrap>
        <SelectBox title="Next step due" value={due} onChange={setDue} options={[3, 7, 14].map(n => [addDays(TODAY, n), "Next step due " + dayDate(addDays(TODAY, n))] as [string, string])} />
        <Btn kind="primary" size="sm" icon={I.check} disabled={!next.trim()} onClick={() => { logFollowUp(o, outcome.trim(), next.trim(), due); onDone(); }}>Save and clear</Btn>
        <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>
      </Row>
      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Logged as {fullName(o.owner)}'s follow-up today. The opportunity's last activity moves to today and the overdue flag clears everywhere.</span>
    </div>
  );
}

function ReassignPanel({ o, onDone }: { o: D.Opportunity; onDone: () => void }) {
  const others = SELLER_OPTIONS.filter(([id]) => id !== o.owner);
  const [to, setTo] = useState<D.StaffId>(others[0][0]);
  const s = useHogan();
  const load = (id: string) => overdueFollowups(s).filter(x => x.owner === id).length;
  return (
    <div style={panelStyle}>
      <span style={label}>Hand {o.title} to a colleague</span>
      <Row gap={8} wrap>
        <SelectBox<D.StaffId> value={to} onChange={setTo} options={others.map(([id, n]) => [id, n + " · " + load(id) + " overdue"] as [D.StaffId, string])} />
        <Btn kind="primary" size="sm" icon={I.users} onClick={() => { reassignOpp(o.id, to); onDone(); }}>Reassign</Btn>
        <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>
      </Row>
      <Rule>Account owner stays {fullName(D.accountById(o.account)?.owner || "")}</Rule>
      <Btn kind="ghost" size="sm" icon={I.arrow} onClick={() => nav("Sales", "planner", { "sales.planRep": to, "sales.planWeek": "this" })} style={{ alignSelf: "flex-start" }}>Open {firstName(to)}'s week first</Btn>
    </div>
  );
}
