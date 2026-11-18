/* Sales · Weekly Planner: Graham reviews Monday to Friday per salesperson, assigns work,
   rebooks missed commitments and approves (or amends) the Sales Agent's draft week. */

import { useState, type DragEvent } from "react";
import * as D from "../../data";
import { acceptAllProposals, acceptProposal, completeActivity, dismissProposal, nav, openRecord, overdueFollowups, toast, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Empty, I, Icon, Notice, Page, PageHeader, RecLink, Row, Seg, SelectBox, label } from "../../ui";
import { TODAY, date, dayDate, daysAgo, eur, weekday } from "../../fmt";
import {
  IN_PERSON, NEXT_WEEK, SCHEDULE_DAYS, THIS_WEEK, actionText, followTitle, TIME_OPTIONS, amendProposal, byWhen, dayLabel, dismissAll, draftWeek, dropActivity, findOpp, firstName,
  freeSlot, fullName, isOverdue, lastVisit, neglected, overdueBy, planActivity, plannedFor, quietAccounts, rescheduleActivity, useWidth, weekDays,
} from "./lib";
import { ActivityComposer, AgentTag, PRIORITY_TONE, RepPicker, Rule, TYPE_ICON, TypeChip, dayOptions, panelStyle } from "./parts";

type WeekKey = "this" | "next";
type Drag = { kind: "act" | "prop" | "opp" | "acc"; id: string };
type Sel = { kind: "act" | "prop"; id: string } | null;

export default function Planner() {
  const s = useHogan();
  const [rep, setRep] = useUi<D.StaffId>("sales.planRep", "AC");
  const [wk, setWk] = useUi<WeekKey>("sales.planWeek", "this");
  const [ref, w] = useWidth();
  const [sel, setSel] = useState<Sel>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const start = wk === "this" ? THIS_WEEK : NEXT_WEEK;
  const days = weekDays(start);
  const openDays = days.filter(d => d >= TODAY);
  const acts = s.activities.filter(a => a.rep === rep && days.includes(a.date));
  const props = s.proposals.filter(p => p.rep === rep && days.includes(p.date));
  const staff = D.staffById(rep)!;
  const wide = w >= 1080, cols5 = w >= 700;
  const firstOpen = openDays[0] || days[0];

  const drop = (day: string) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const raw = e.dataTransfer.getData("text/plain");
    let d: Drag | null = drag;
    try { if (raw) d = JSON.parse(raw) as Drag; } catch { /* plain text drop */ }
    setDrag(null);
    if (!d) return;
    if (day < TODAY) { planToast(); return; }
    if (d.kind === "act") { const a = s.activities.find(x => x.id === d!.id); if (a && a.date !== day) rescheduleActivity(a.id, day, clash(a.rep, day, a.time, a.id) ? freeSlot(a.rep, day, s) : a.time); }
    if (d.kind === "prop") { const p = s.proposals.find(x => x.id === d!.id); if (p) amendProposal(p.id, day, clash(p.rep, day, p.time, p.id) ? freeSlot(p.rep, day, s) : p.time); }
    if (d.kind === "opp") addFollowUp(d.id, day);
    if (d.kind === "acc") addVisit(d.id, day);
  };
  const clash = (r: string, day: string, time: string, self: string) => s.activities.concat(s.proposals).some(x => x.rep === r && x.date === day && x.time === time && x.id !== self);
  const planToast = () => toast("Pick today or a later day.", "warn");
  const addFollowUp = (oppId: string, day: string) => {
    const o = findOpp(oppId, s);
    if (!o) return;
    planActivity({ rep, date: day, time: freeSlot(rep, day, s), type: "Follow-up", title: followTitle(o), account: o.account, opp: o.id, status: "Planned", priority: isOverdue(o) ? "High" : "Medium", source: "planner",
      note: "Added by Graham from the Sales Agent's list: " + (isOverdue(o) ? "overdue " + overdueBy(o) + " days, " : "") + "quiet " + daysAgo(o.lastActivity) + " days." });
  };
  const addVisit = (accId: string, day: string) => {
    const a = D.accountById(accId);
    if (!a) return;
    planActivity({ rep, date: day, time: freeSlot(rep, day, s), type: "Visit", title: "Account visit: " + a.name, account: a.id, status: "Planned", priority: "Medium", source: "planner", note: "No visit for " + daysAgo(lastVisit(a.id, s)) + " days." });
  };

  const done = acts.filter(a => a.status === "Done").length;
  const missed = acts.filter(a => a.status === "Missed").length;
  const planned = acts.filter(a => a.status === "Planned").length;
  const allProps = s.proposals.filter(p => p.rep === rep);

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · Weekly Planner" title="Weekly Planner"
          sub="Review Monday to Friday for each salesperson, rebook what slipped and plan next week. The Sales Agent can draft a week; nothing goes into anyone's plan until you approve it."
          right={<>
            <RepPicker value={rep} onChange={v => { setRep(v); setSel(null); setAdding(null); }} />
            <Seg<WeekKey> value={wk} onChange={v => { setWk(v); setSel(null); setAdding(null); }} items={[["this", "This week · 16 to 20 Nov"], ["next", "Next week · 23 to 27 Nov"]]} />
          </>} />

        <Card pad={14}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Row gap={10} style={{ flex: "1 1 300px" }}>
              <Avatar id={rep} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{staff.name}{staff.fictional && <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}> (fictional)</span>}</div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>{staff.territory} · w/c {dayDate(start)}</div>
              </div>
            </Row>
            <Row gap={6} wrap>
              <Badge tone="neutral">{acts.length} activities</Badge>
              <Badge tone="ok">{done} done</Badge>
              <Badge tone="neutral">{planned} planned</Badge>
              <Badge tone={missed ? "bad" : "neutral"}>{missed} missed</Badge>
              {props.length > 0 && <Badge tone="accent">{props.length} suggested</Badge>}
            </Row>
            <Row gap={8} wrap>
              {allProps.length === 0 ? (
                <Btn kind="primary" icon={I.agent} disabled={openDays.length === 0} onClick={() => {
                  const r = draftWeek(rep, start);
                  setSel(null);
                  toast(r.made ? "Sales Agent drafted " + r.made + " suggestion" + (r.made === 1 ? "" : "s") + " for " + firstName(rep) + (r.skipped ? " (" + r.skipped + " already planned, left out)" : "") + ". Review, amend, then approve." : "Sales Agent has nothing to add: " + firstName(rep) + "'s week already covers the open follow-ups.", "info");
                }}>{wk === "this" ? "Draft rest of this week" : "Generate proposed week"}</Btn>
              ) : (
                <>
                  <Btn kind="primary" icon={I.check} onClick={() => { acceptAllProposals(rep); setSel(null); }}>Approve plan ({allProps.length})</Btn>
                  <Btn kind="danger" icon={I.x} onClick={() => { dismissAll(rep); setSel(null); }}>Discard draft</Btn>
                </>
              )}
              <Btn kind="ghost" icon={I.arrow} onClick={() => nav("Sales", "myday", { "sales.rep": rep })}>{firstName(rep)}'s My Day</Btn>
            </Row>
          </div>
          {allProps.length > 0 && (
            <Notice tone="accent" icon={I.agent} style={{ marginTop: 12 }} title={"Draft from the Sales Agent: " + allProps.length + " suggestion" + (allProps.length === 1 ? "" : "s") + " for " + firstName(rep)}>
              Dashed cards are suggestions only. Drag them to another day, click one to change its time, accept or dismiss them one by one, or approve the lot. Nothing is in {firstName(rep)}'s plan until it is approved.
              {allProps.some(p => !days.includes(p.date)) && <> Some suggestions sit in the {wk === "this" ? "next" : "current"} week.</>}
            </Notice>
          )}
        </Card>

        {(adding || sel) && (
          <div>
            {adding && <ActivityComposer key={adding + rep} rep={rep} date={adding} days={SCHEDULE_DAYS} onDone={() => setAdding(null)} onCancel={() => setAdding(null)} />}
            {sel && <Editor sel={sel} onClose={() => setSel(null)} />}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1fr) 290px" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "grid", gridTemplateColumns: cols5 ? "repeat(5,minmax(0,1fr))" : "minmax(0,1fr)", gap: 8, alignItems: "stretch", minWidth: 0 }}>
            {days.map(d => {
              const items = [...acts.filter(a => a.date === d).map(a => ({ k: "act" as const, a })), ...props.filter(p => p.date === d).map(p => ({ k: "prop" as const, a: p }))]
                .sort((x, y) => x.a.time.localeCompare(y.a.time));
              const isToday = d === TODAY, past = d < TODAY;
              const hot = over === d && !past;
              const dDone = items.filter(x => x.k === "act" && x.a.status === "Done").length;
              return (
                <div key={d} onDragOver={e => { if (past) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== d) setOver(d); }}
                  onDragLeave={() => setOver(o => (o === d ? null : o))} onDrop={drop(d)}
                  style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 7, padding: 8, borderRadius: 16, minHeight: cols5 ? 380 : undefined,
                    background: hot ? "var(--accent-faint)" : isToday ? "var(--surface)" : "var(--surface-faint)",
                    border: "1px " + (hot ? "dashed var(--accent-line)" : isToday ? "solid var(--accent-line)" : "solid var(--border)"), transition: "background .15s var(--ease)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2px 4px 4px" }}>
                    <span style={{ ...label, color: isToday ? "var(--accent)" : "var(--faint)" }}>{isToday ? "Today" : weekday(d)}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: past ? "var(--dim)" : "var(--ink)", whiteSpace: "nowrap" }}>{date(d, false)}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }} title="Done of total">{dDone}/{items.filter(x => x.k === "act").length}</span>
                  </div>
                  {items.length === 0 && <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "14px 4px", textAlign: "center" }}>{past ? "Nothing logged" : hot ? "Drop here" : "Free day"}</div>}
                  {items.map(x => x.k === "act"
                    ? <PlanCard key={x.a.id} a={x.a} selected={sel?.kind === "act" && sel.id === x.a.id} onSelect={() => { setAdding(null); setSel({ kind: "act", id: x.a.id }); }} onDrag={setDrag} />
                    : <GhostCard key={x.a.id} p={x.a} selected={sel?.kind === "prop" && sel.id === x.a.id} onSelect={() => { setAdding(null); setSel({ kind: "prop", id: x.a.id }); }} onDrag={setDrag} />)}
                  {!past && (
                    <button onClick={() => { setSel(null); setAdding(adding === d ? null : d); }} className="ixa"
                      style={{ marginTop: "auto", height: 30, border: "1px dashed var(--border-strong)", borderRadius: 10, background: adding === d ? "var(--accent-faint)" : "none", color: "var(--dim)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Icon d={I.plus} size={12} />Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <AgentRail rep={rep} day={firstOpen} onDrag={setDrag} onAdd={addFollowUp} wk={wk} />
            <Uncontacted rep={rep} day={firstOpen} onDrag={setDrag} onAdd={addVisit} />
            <Missed rep={rep} day={firstOpen} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--faint)" }}>Everything here is the same plan {firstName(rep)} sees in My Day. Activity counts are for planning support, not individual monitoring. Demo data.</div>
      </div>
    </Page>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

function PlanCard({ a, selected, onSelect, onDrag }: { a: D.SalesActivity; selected: boolean; onSelect: () => void; onDrag: (d: Drag | null) => void }) {
  const acc = a.account ? D.accountById(a.account) : undefined;
  const isDone = a.status === "Done", missed = a.status === "Missed";
  const movable = !isDone;
  return (
    <div draggable={movable} onDragStart={e => { const d: Drag = { kind: "act", id: a.id }; e.dataTransfer.setData("text/plain", JSON.stringify(d)); e.dataTransfer.effectAllowed = "move"; onDrag(d); }} onDragEnd={() => onDrag(null)}
      onClick={onSelect} className="ixx" title={a.title + (acc ? " · " + acc.name : "") + (movable ? " · drag to another day" : "")}
      style={{ padding: "8px 9px", borderRadius: 11, cursor: movable ? "grab" : "pointer", display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp .25s var(--ease) both",
        background: missed ? "var(--bad-soft)" : "var(--surface)", opacity: isDone ? 0.72 : 1,
        border: "1px solid " + (selected ? "var(--accent)" : missed ? "var(--bad)" : a.source === "planner" ? "var(--accent-line)" : "var(--border)"), transition: "transform .18s var(--ease),border-color .18s var(--ease)" }}>
      <Row gap={6}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 600, color: isDone ? "var(--dim)" : "var(--ink)" }}>{a.time}</span>
        <Icon d={isDone ? I.check : TYPE_ICON[a.type]} size={12} color={isDone ? "var(--ok)" : missed ? "var(--bad)" : "var(--dim)"} stroke={isDone ? 2.4 : 1.8} />
        <span style={{ flex: 1 }} />
        {a.priority === "High" && !isDone && <span title="High priority" style={{ fontSize: 10, fontWeight: 600, color: "var(--bad)" }}>HIGH</span>}
      </Row>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: isDone ? "var(--dim)" : "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.title}</div>
      <div style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc ? acc.name : "Internal"}</div>
      {(missed || a.source === "planner") && (
        <Row gap={4} wrap>
          {missed && <Badge tone="bad" style={{ height: 18, fontSize: 10.5 }}>Missed</Badge>}
          {a.source === "planner" && <Badge tone="accent" style={{ height: 18, fontSize: 10.5 }}>Added by Graham</Badge>}
        </Row>
      )}
    </div>
  );
}

function GhostCard({ p, selected, onSelect, onDrag }: { p: D.SalesActivity; selected: boolean; onSelect: () => void; onDrag: (d: Drag | null) => void }) {
  const acc = p.account ? D.accountById(p.account) : undefined;
  return (
    <div draggable onDragStart={e => { const d: Drag = { kind: "prop", id: p.id }; e.dataTransfer.setData("text/plain", JSON.stringify(d)); e.dataTransfer.effectAllowed = "move"; onDrag(d); }} onDragEnd={() => onDrag(null)}
      onClick={onSelect} title={"Suggested by the Sales Agent: " + p.title}
      style={{ padding: "8px 9px", borderRadius: 11, cursor: "grab", display: "flex", flexDirection: "column", gap: 5, background: "var(--accent-faint)", animation: "fadeUp .3s var(--ease) both",
        border: "1.5px dashed " + (selected ? "var(--accent)" : "var(--accent-line)") }}>
      <Row gap={6}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>{p.time}</span>
        <Icon d={I.agent} size={12} color="var(--accent)" />
        <span style={{ flex: 1, ...label, fontSize: 8.5, color: "var(--accent)" }}>Suggested</span>
      </Row>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
      <div style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.note || acc?.name || p.type}</div>
      <Row gap={4}>
        <button onClick={e => { e.stopPropagation(); acceptProposal(p.id); }} className="ixm" title="Accept into the plan"
          style={{ flex: 1, height: 24, borderRadius: 8, border: "1px solid var(--accent-line)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Icon d={I.check} size={11} stroke={2.4} />Accept
        </button>
        <button onClick={e => { e.stopPropagation(); dismissProposal(p.id); }} className="ixm" title="Dismiss suggestion"
          style={{ width: 26, height: 24, borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--dim)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.x} size={11} stroke={2.2} />
        </button>
      </Row>
    </div>
  );
}

/* ── Editor for a selected activity or suggestion ───────────────────────── */

function Editor({ sel, onClose }: { sel: NonNullable<Sel>; onClose: () => void }) {
  const s = useHogan();
  const a = sel.kind === "act" ? s.activities.find(x => x.id === sel.id) : s.proposals.find(x => x.id === sel.id);
  const [day, setDay] = useState(a ? (a.date >= TODAY ? a.date : TODAY) : TODAY);
  const [time, setTime] = useState(a?.time || "09:00");
  if (!a) return null;
  const acc = a.account ? D.accountById(a.account) : undefined;
  const o = a.opp ? findOpp(a.opp, s) : undefined;
  const isProp = sel.kind === "prop";
  const isDone = a.status === "Done";
  const dayList = Array.from(new Set([...(a.date >= TODAY ? [a.date] : []), ...SCHEDULE_DAYS])).sort();
  return (
    <div style={{ ...panelStyle, background: isProp ? "var(--accent-faint)" : "var(--surface)", border: "1px " + (isProp ? "dashed var(--accent-line)" : "solid var(--border-strong)") }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TypeChip type={a.type} done={isDone} />
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <Row gap={8} wrap>
            {isProp && <AgentTag text="Suggested by the Sales Agent" />}
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{a.title}</span>
            <Badge tone={PRIORITY_TONE[a.priority]}>{a.priority}</Badge>
            {!isProp && <Badge tone={isDone ? "ok" : a.status === "Missed" ? "bad" : "neutral"}>{a.status}</Badge>}
          </Row>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.6 }}>
            {fullName(a.rep)} · {dayDate(a.date)} at {a.time} · {a.type}
            {acc && <> · <RecLink type="account" id={acc.id}>{acc.name}</RecLink></>}
            {o && <> · <RecLink type="opp" id={o.id}>{o.title}</RecLink> ({eur(o.value)}, {o.stage}{isOverdue(o) ? ", follow-up overdue " + overdueBy(o) + " days" : ""})</>}
          </div>
          {a.note && <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 6 }}>{a.note}</div>}
        </div>
        <Btn kind="ghost" size="sm" icon={I.x} onClick={onClose}>Close</Btn>
      </div>
      {!isDone && (
        <Row gap={8} wrap>
          <span style={{ ...label, marginRight: 4 }}>{isProp ? "Amend" : a.status === "Missed" ? "Rebook" : "Move"}</span>
          <SelectBox title="Day" value={day} onChange={setDay} options={dayOptions(dayList)} />
          <SelectBox title="Time" value={time} onChange={setTime} options={TIME_OPTIONS.map(t => [t, t])} />
          <Btn size="sm" icon={I.calendar} disabled={day === a.date && time === a.time} onClick={() => {
            if (isProp) { amendProposal(a.id, day, time); toast("Suggestion moved to " + dayLabel(day) + " at " + time + ". Still waiting for approval.", "info"); }
            else rescheduleActivity(a.id, day, time);
          }}>{isProp ? "Move suggestion" : "Move"}</Btn>
          <span style={{ flex: 1 }} />
          {isProp ? (
            <>
              <Btn kind="primary" size="sm" icon={I.check} onClick={() => { acceptProposal(a.id); onClose(); }}>Accept into plan</Btn>
              <Btn kind="danger" size="sm" icon={I.x} onClick={() => { dismissProposal(a.id); onClose(); }}>Dismiss</Btn>
            </>
          ) : (
            <>
              {a.date <= TODAY && <Btn kind="primary" size="sm" icon={I.check} onClick={() => { completeActivity(a.id); onClose(); }}>Mark done</Btn>}
              <Btn kind="danger" size="sm" icon={I.x} onClick={() => { dropActivity(a.id); onClose(); }}>Remove from plan</Btn>
            </>
          )}
        </Row>
      )}
      {isDone && o && <div style={{ fontSize: 12, color: "var(--dim)" }}>Done. Next step on the opportunity: {actionText(o.nextAction)} · due {dayDate(o.nextDue)}.</div>}
    </div>
  );
}

/* ── Right rail: what the agent and the data say needs attention ────────── */

function AgentRail({ rep, day, onDrag, onAdd, wk }: { rep: D.StaffId; day: string; onDrag: (d: Drag | null) => void; onAdd: (oppId: string, day: string) => void; wk: WeekKey }) {
  const s = useHogan();
  const list = neglected(rep, s);
  const team = overdueFollowups(s).length;
  return (
    <Card pad={14} title={<AgentTag text="Sales Agent: needs attention" />} sub={"Neglected opportunities for " + firstName(rep) + ". Drag one onto a day, or add it to " + (day === TODAY ? "today" : dayDate(day)) + "."}>
      {list.length === 0 && <Empty title="Nothing neglected" sub={firstName(rep) + "'s opportunities all have recent contact."} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {list.map(o => {
          const acc = D.accountById(o.account);
          const p = plannedFor(o.id, s)[0];
          const quiet = daysAgo(o.lastActivity);
          const hot = isOverdue(o) && quiet >= 14;
          return (
            <div key={o.id} draggable onDragStart={e => { const d: Drag = { kind: "opp", id: o.id }; e.dataTransfer.setData("text/plain", JSON.stringify(d)); e.dataTransfer.effectAllowed = "copy"; onDrag(d); }} onDragEnd={() => onDrag(null)}
              style={{ padding: "9px 10px", borderRadius: 12, cursor: "grab", background: hot ? "var(--bad-soft)" : "var(--surface-faint)", border: "1px solid " + (hot ? "var(--bad)" : "var(--border)"), display: "flex", flexDirection: "column", gap: 6 }}>
              <Row gap={6}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc?.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)" }}>{eur(o.value)}</span>
              </Row>
              <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>{o.title} · {o.stage}</div>
              <Row gap={5} wrap>
                {isOverdue(o) && <Badge tone="bad" style={{ height: 19, fontSize: 10.5 }}>Overdue {overdueBy(o)}d</Badge>}
                <Badge tone={quiet >= 14 ? "bad" : "warn"} style={{ height: 19, fontSize: 10.5 }}>Quiet {quiet}d</Badge>
                {p && <Badge tone="ok" style={{ height: 19, fontSize: 10.5 }} title={p.title}>Planned {dayLabel(p.date)} {p.time}</Badge>}
              </Row>
              <Row gap={6}>
                <Btn size="sm" icon={I.plus} onClick={() => onAdd(o.id, day)} style={{ height: 26 }}>Follow-up {day === TODAY ? "today" : dayDate(day).split(" ")[0]}</Btn>
                <Btn kind="ghost" size="sm" onClick={() => openRecord("opp", o.id)} style={{ height: 26 }}>Open</Btn>
              </Row>
            </div>
          );
        })}
      </div>
      <button onClick={() => nav("Sales", "followups")} className="ix3" style={{ marginTop: 10, border: 0, background: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0 }}>
        Team-wide: {team} overdue follow-ups →
      </button>
      {wk === "next" && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>Adds go to Monday 23 Nov. Drag to choose another day.</div>}
    </Card>
  );
}

function Uncontacted({ rep, day, onDrag, onAdd }: { rep: D.StaffId; day: string; onDrag: (d: Drag | null) => void; onAdd: (accId: string, day: string) => void }) {
  const s = useHogan();
  const list = quietAccounts(rep, s);
  return (
    <Card pad={14} title="Accounts not visited" sub={"No visit in 14 days or more · " + firstName(rep) + "'s accounts"}>
      {list.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Every account {firstName(rep)} owns has had a visit in the last two weeks.</div>}
      {list.map(a => {
        const lv = lastVisit(a.id, s);
        const booked = s.activities.find(x => x.account === a.id && x.rep === rep && x.status === "Planned" && x.date >= TODAY && IN_PERSON.includes(x.type));
        return (
          <div key={a.id} draggable onDragStart={e => { const d: Drag = { kind: "acc", id: a.id }; e.dataTransfer.setData("text/plain", JSON.stringify(d)); onDrag(d); }} onDragEnd={() => onDrag(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid var(--border)", cursor: "grab" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <RecLink type="account" id={a.id} style={{ fontSize: 12.5 }}>{a.name}</RecLink>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>Last visit {date(lv, false)} · {daysAgo(lv)} days</span>
            </span>
            {booked ? <Badge tone="ok" style={{ height: 20, fontSize: 10.5 }}>{dayLabel(booked.date)}</Badge> : <Btn size="sm" icon={I.pin} onClick={() => onAdd(a.id, day)} style={{ height: 26 }}>Plan visit</Btn>}
          </div>
        );
      })}
    </Card>
  );
}

function Missed({ rep, day }: { rep: D.StaffId; day: string }) {
  const s = useHogan();
  const list = s.activities.filter(a => a.rep === rep && a.status === "Missed").sort(byWhen);
  return (
    <Card pad={14} title="Missed commitments" sub={list.length ? "Rebook them or take them off the plan" : "Nothing missed"}>
      {list.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{firstName(rep)} has no missed activities.</div>}
      {list.map(a => (
        <div key={a.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>{a.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{dayDate(a.date)} {a.time}{a.account ? " · " + D.accountById(a.account)?.name : ""}{a.note ? ". " + a.note : ""}</div>
          <Row gap={6}>
            <Btn size="sm" icon={I.calendar} onClick={() => rescheduleActivity(a.id, day, freeSlot(rep, day, s))} style={{ height: 26 }}>Rebook {day === TODAY ? "today" : dayDate(day).split(" ")[0]}</Btn>
            <Btn kind="ghost" size="sm" onClick={() => dropActivity(a.id)} style={{ height: 26 }}>Drop</Btn>
          </Row>
        </div>
      ))}
      <Rule>Planner tip</Rule>
      <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>Rebooked items keep their notes and show as planned again in {firstName(rep)}'s My Day.</div>
    </Card>
  );
}
