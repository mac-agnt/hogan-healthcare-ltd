/* Sales module: small shared pieces (rep picker, scheduling panels, pills). */

import { useState, type CSSProperties, type ReactNode } from "react";
import * as D from "../../data";
import { openOpps, useHogan } from "../../store";
import { Avatar, Badge, Btn, I, Icon, Row, Seg, SelectBox, TextInput, label, type Tone } from "../../ui";
import { TODAY, date as fmtDate, daysAgo } from "../../fmt";
import {
  ACT_TYPES, SCHEDULE_DAYS, SELLER_IDS, SELLER_OPTIONS, TIME_OPTIONS, dayLabel, firstName, freeSlot, isOverdue, overdueBy,
  planActivity, rescheduleActivity,
} from "./lib";

export const TYPE_ICON: Record<D.ActType, string> = {
  Visit: I.pin, Call: I.phone, Meeting: I.users, "Follow-up": I.refresh, Demo: I.target, Admin: I.doc, "Clinical support": I.hospital,
};
export const PRIORITY_TONE: Record<D.SalesActivity["priority"], Tone> = { High: "bad", Medium: "warn", Low: "neutral" };

export const panelStyle: CSSProperties = {
  display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: "var(--r-sm,11px)", background: "var(--surface-faint)",
  border: "1px solid var(--border)", animation: "fadeUp .22s var(--ease) both",
};

/** Rep switcher used on My Day and the planner. The three field reps are fictional. */
export function RepPicker({ value, onChange, size = "md" }: { value: string; onChange: (v: D.StaffId) => void; size?: "sm" | "md" }) {
  return (
    <Seg<D.StaffId> size={size} value={value as D.StaffId} onChange={onChange}
      items={SELLER_IDS.map(id => [id, (
        <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 7 }} title={D.staffById(id)?.fictional ? "Fictional representative for the demo" : D.staffById(id)?.role}>
          <Avatar id={id} size={18} />{firstName(id)}
          {D.staffById(id)?.fictional && <span style={{ fontSize: 9.5, color: "var(--faint)", fontWeight: 400 }}>fictional</span>}
        </span>
      )] as [D.StaffId, ReactNode])} />
  );
}

export function TypeChip({ type, done }: { type: D.ActType; done?: boolean }) {
  return (
    <span title={type} style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: done ? "var(--ok-soft)" : "var(--surface-2)", color: done ? "var(--ok)" : "var(--body)", border: "1px solid " + (done ? "var(--ok-soft)" : "var(--border)") }}>
      <Icon d={done ? I.check : TYPE_ICON[type]} size={13} stroke={done ? 2.4 : 1.8} />
    </span>
  );
}

export function QuietPill({ since }: { since: string }) {
  const d = daysAgo(since);
  if (!since) return null;
  return <Badge tone={d >= 14 ? "bad" : d >= 7 ? "warn" : "neutral"} title={"Last activity " + since}>{d === 0 ? "Active today" : d + "d quiet"}</Badge>;
}
export function DuePill({ o }: { o: D.Opportunity }) {
  if (isOverdue(o)) return <Badge tone="bad" title={"Follow-up was due " + o.nextDue}>Overdue {overdueBy(o)}d</Badge>;
  const d = -daysAgo(o.nextDue);
  return <Badge tone={d <= 2 ? "warn" : "neutral"}>{d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : "Due in " + d + "d"}</Badge>;
}

export function AgentTag({ text = "Sales Agent" }: { text?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...label, color: "var(--accent)" }}>
      <Avatar id="agent:sales" size={18} />{text}
    </span>
  );
}

/** A labelled value in a dense field grid. */
export function Field({ k, children, tone }: { k: ReactNode; children: ReactNode; tone?: Tone }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...label, fontSize: 9 }}>{k}</div>
      <div style={{ marginTop: 3, fontSize: 12.5, lineHeight: 1.4, color: tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : "var(--body)", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</div>
    </div>
  );
}

export const dayOptions = (days: string[]): [string, string][] => days.map(d => [d, dayLabel(d) + (d === TODAY || d === SCHEDULE_DAYS[1] ? " · " + fmtDate(d, false) : "")]);

/** Put a follow-up (or any activity) into someone's plan: pick who, which day and what time. */
export function SchedulePanel({ title, rep: defaultRep, account, opp, type = "Follow-up", priority = "Medium", note, source = "planner", allowRep = true, onDone, onCancel, cta = "Add to plan" }: {
  title: string; rep: D.StaffId; account?: string; opp?: string; type?: D.ActType; priority?: D.SalesActivity["priority"]; note?: string;
  source?: D.SalesActivity["source"]; allowRep?: boolean; onDone?: () => void; onCancel?: () => void; cta?: string;
}) {
  const s = useHogan();
  const [rep, setRep] = useState<D.StaffId>(defaultRep);
  const [date, setDate] = useState(SCHEDULE_DAYS[0]);
  const [time, setTime] = useState(() => freeSlot(defaultRep, SCHEDULE_DAYS[0], s));
  const [text, setText] = useState(title);
  const [actType, setActType] = useState<D.ActType>(type);
  return (
    <div style={panelStyle} onClick={e => e.stopPropagation()}>
      <span style={label}>Schedule into a plan</span>
      <TextInput value={text} onChange={setText} placeholder="What needs doing" style={{ width: "100%" }} />
      <Row wrap gap={8}>
        {allowRep && <SelectBox<D.StaffId> title="Who" value={rep} onChange={r => { setRep(r); setTime(freeSlot(r, date, s)); }} options={SELLER_OPTIONS} />}
        <SelectBox<D.ActType> title="Type" value={actType} onChange={setActType} options={ACT_TYPES.map(t => [t, t])} />
        <SelectBox title="Day" value={date} onChange={d => { setDate(d); setTime(freeSlot(rep, d, s)); }} options={dayOptions(SCHEDULE_DAYS)} />
        <SelectBox title="Time" value={time} onChange={setTime} options={TIME_OPTIONS.map(t => [t, t])} />
      </Row>
      <Row gap={8} wrap>
        <Btn kind="primary" size="sm" icon={I.plus} disabled={!text.trim()}
          onClick={() => { planActivity({ rep, date, time, type: actType, title: text.trim(), account, opp, status: "Planned", priority, source, note }); onDone?.(); }}>{cta}</Btn>
        {onCancel && <Btn kind="ghost" size="sm" onClick={onCancel}>Cancel</Btn>}
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Suggested time avoids {firstName(rep)}'s other plans that day.</span>
      </Row>
    </div>
  );
}

/** Move an activity to another day and time. */
export function ReschedulePanel({ act, onDone, days = SCHEDULE_DAYS }: { act: D.SalesActivity; onDone?: () => void; days?: string[] }) {
  const s = useHogan();
  const first = days.find(d => d !== act.date) || days[0];
  const [date, setDate] = useState(first);
  const [time, setTime] = useState(() => freeSlot(act.rep, first, s));
  return (
    <div style={panelStyle} onClick={e => e.stopPropagation()}>
      <span style={label}>{act.status === "Missed" ? "Rebook this commitment" : "Reschedule"}</span>
      <Row wrap gap={8}>
        <SelectBox title="Day" value={date} onChange={d => { setDate(d); setTime(freeSlot(act.rep, d, s)); }} options={dayOptions(days)} />
        <SelectBox title="Time" value={time} onChange={setTime} options={TIME_OPTIONS.map(t => [t, t])} />
        <Btn kind="primary" size="sm" icon={I.calendar} onClick={() => { rescheduleActivity(act.id, date, time); onDone?.(); }}>Move</Btn>
        {onDone && <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>}
      </Row>
    </div>
  );
}

/** Full composer used by the planner: type, account, opportunity, time, title, priority. */
export function ActivityComposer({ rep, date, days, onDone, onCancel, source = "planner", heading }: { rep: D.StaffId; date: string; days: string[]; onDone?: () => void; onCancel?: () => void; source?: D.SalesActivity["source"]; heading?: string }) {
  const s = useHogan();
  const [type, setType] = useState<D.ActType>("Visit");
  const [account, setAccount] = useState<string>("");
  const [opp, setOpp] = useState<string>("");
  const [day, setDay] = useState(date);
  const [time, setTime] = useState(() => freeSlot(rep, date, s));
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [priority, setPriority] = useState<D.SalesActivity["priority"]>("Medium");
  const mine = D.ACCOUNTS.filter(a => a.owner === rep).sort((a, b) => a.name.localeCompare(b.name));
  const others = D.ACCOUNTS.filter(a => a.owner !== rep).sort((a, b) => a.name.localeCompare(b.name));
  const opps = openOpps(s).filter(o => o.account === account);
  const auto = (t: D.ActType, acc: string, op: string) => {
    const o = opps.find(x => x.id === op) || openOpps(s).find(x => x.id === op);
    const a = D.accountById(acc);
    return o ? t + ": " + o.title : a ? t + ": " + a.name : t === "Admin" ? "Admin: account notes" : t;
  };
  const shown = touched ? title : auto(type, account, opp);
  const accOptions: [string, string][] = [["", "No account (internal)"], ...mine.map(a => [a.id, a.name] as [string, string]), ...others.map(a => [a.id, a.name + " · " + firstName(a.owner) + "'s account"] as [string, string])];
  return (
    <div style={panelStyle}>
      <Row gap={8} wrap>
        <span style={{ ...label, flex: 1 }}>{heading || "Assign an activity to " + firstName(rep)}</span>
        <Seg<D.SalesActivity["priority"]> size="sm" value={priority} onChange={setPriority} items={[["High", "High"], ["Medium", "Medium"], ["Low", "Low"]]} />
      </Row>
      <Row wrap gap={8}>
        <SelectBox<D.ActType> title="Type" value={type} onChange={setType} options={ACT_TYPES.map(t => [t, t])} />
        <SelectBox title="Account" value={account} onChange={v => { setAccount(v); setOpp(""); }} options={accOptions} style={{ maxWidth: 280 }} />
        <SelectBox title="Opportunity" value={opp} onChange={setOpp} options={[["", opps.length ? "No opportunity" : "No open opportunity"], ...opps.map(o => [o.id, o.title] as [string, string])]} style={{ maxWidth: 260 }} />
        <SelectBox title="Day" value={day} onChange={d => { setDay(d); setTime(freeSlot(rep, d, s)); }} options={dayOptions(days)} />
        <SelectBox title="Time" value={time} onChange={setTime} options={TIME_OPTIONS.map(t => [t, t])} />
      </Row>
      <TextInput value={shown} onChange={v => { setTitle(v); setTouched(true); }} placeholder="Title" style={{ width: "100%" }} />
      <Row gap={8} wrap>
        <Btn kind="primary" size="sm" icon={I.plus} disabled={!shown.trim()}
          onClick={() => {
            planActivity({ rep, date: day, time, type, title: shown.trim(), account: account || undefined, opp: opp || undefined, status: "Planned", priority, source });
            onDone?.();
          }}>{source === "rep" ? "Add to my day" : "Add to " + firstName(rep) + "'s plan"}</Btn>
        {onCancel && <Btn kind="ghost" size="sm" onClick={onCancel}>Cancel</Btn>}
      </Row>
    </div>
  );
}

/** Section label with a hairline, used inside dense cards. */
export function Rule({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 2px" }}>
      <span style={label}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      {right}
    </div>
  );
}
