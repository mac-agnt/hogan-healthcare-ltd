/* Sales record views for the slide-out drawer: account, opportunity, quotation. */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { nav, openRecord, useHogan } from "../../store";
import { Avatar, Badge, Btn, Empty, I, KV, Notice, RecLink, RecordHead, RecordSection, Row, SelectBox, Status, Steps, Timeline, label, type Tone } from "../../ui";
import { TODAY, date, dayDate, daysAgo, daysUntil, eur, rel } from "../../fmt";
import {
  OPEN_STAGES, QUIET_DAYS, SELLER_OPTIONS, STAGE_PROB, THIS_SUNDAY, actionText, byWhen, followTitle, closedOpps, dayLabel, findOpp, firstName, freeSlot, fullName, isOpen, isOverdue,
  lastVisit, openRequests, overdueBy, planActivity, plannedFor, quoteStatus, reassignOpp, setQuoteStatus, setStage, type QStatus,
} from "./lib";
import { DuePill, QuietPill, SchedulePanel } from "./parts";
import { NextStepPanel } from "./MyDay";

const row = (key: string, left: ReactNode, right: ReactNode, onClick?: () => void, sub?: ReactNode) => (
  <div key={key} onClick={onClick} className={onClick ? "ix11" : undefined}
    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", margin: "0 -8px", borderRadius: 9, cursor: onClick ? "pointer" : undefined }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
  </div>
);

/* ── Account ────────────────────────────────────────────────────────────── */

export function AccountRecord({ id }: { id: string }) {
  const s = useHogan();
  const [mode, setMode] = useState<"" | "visit" | "call">("");
  const a = D.accountById(id);
  if (!a) return <Empty title="Account not found" sub={id} />;
  const lv = lastVisit(a.id, s);
  const loc = a.locId ? D.locById(a.locId) : undefined;
  const opps = s.opps.filter(o => o.account === id && isOpen(o));
  const closed = closedOpps(s).filter(o => o.account === id);
  const orders = s.orders.filter(o => o.account === id).sort((x, y) => y.created.localeCompare(x.created));
  const invoices = s.invoices.filter(i => i.account === id).sort((x, y) => (x.status === "Overdue" ? 0 : 1) - (y.status === "Overdue" ? 0 : 1) || y.due.localeCompare(x.due));
  const overdue = invoices.filter(i => i.status === "Overdue");
  const reqs = openRequests(s).filter(r => r.account === id);
  const upcoming = s.activities.filter(x => x.account === id && x.status === "Planned" && x.date >= TODAY).sort(byWhen);
  const recent = s.activities.filter(x => x.account === id && x.status !== "Planned").sort(byWhen).reverse();
  const quiet = daysAgo(lv) >= QUIET_DAYS;
  const bookings = s.bookings.filter(b => b.referral && b.referral.includes(a.name));
  return (
    <div>
      <RecordHead kind="Account" title={a.name} sub={a.type + " · " + a.region + " · customer since " + a.since + " · " + a.id}
        status={quiet ? "Visit overdue" : undefined} right={<Avatar id={a.owner} size={34} />} />
      <Row gap={8} wrap style={{ marginTop: 14 }}>
        <Btn kind="primary" size="sm" icon={I.pin} onClick={() => setMode(mode === "visit" ? "" : "visit")}>Plan a visit</Btn>
        <Btn size="sm" icon={I.phone} onClick={() => setMode(mode === "call" ? "" : "call")}>Plan a call</Btn>
        <Btn kind="ghost" size="sm" icon={I.arrow} onClick={() => nav("Sales", "pipeline", { "sales.pipeOwner": "all" })}>Pipeline</Btn>
      </Row>
      {mode && <div style={{ marginTop: 10 }}><SchedulePanel key={mode} title={(mode === "visit" ? "Account visit: " : "Call: ") + a.name} type={mode === "visit" ? "Visit" : "Call"} rep={a.owner} account={a.id} onDone={() => setMode("")} onCancel={() => setMode("")} /></div>}
      {quiet && <Notice tone="warn" style={{ marginTop: 14 }} title={"No visit for " + daysAgo(lv) + " days"}>Last visit {date(lv)}. {firstName(a.owner)} owns this account{opps.length ? " and has " + opps.length + " open opportunit" + (opps.length === 1 ? "y" : "ies") + " here" : ""}.</Notice>}

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Owner", <span>{fullName(a.owner)}{D.staffById(a.owner)?.fictional ? " (fictional)" : ""}</span>],
        ["Consignment site", loc ? <RecLink type="location" id={loc.id}>{loc.short}</RecLink> : "No consignment"],
        ["Agreement", loc?.agreement || "Standard terms"],
        ["Last visit", <span style={{ color: quiet ? "var(--bad)" : undefined }}>{date(lv, false)} · {rel(lv).toLowerCase()}</span>],
        ["Last order", date(a.lastOrder, false) + " · " + rel(a.lastOrder).toLowerCase()],
        ["Payment terms", a.terms],
        ["Revenue MTD (demo)", eur(a.mtdRevenue)],
        ["Gross profit MTD (demo)", eur(a.mtdGP)],
        ["Revenue YTD (demo)", eur(a.ytdRevenue)],
        ["Lead source", a.leadSource],
        ["Open pipeline", eur(opps.reduce((t, o) => t + o.value, 0))],
        ["Overdue invoices", overdue.length ? <span style={{ color: "var(--bad)" }}>{overdue.length} · {eur(overdue.reduce((t, i) => t + i.amount, 0))}</span> : "None"],
      ]} />

      <RecordSection title="Contacts by role">
        {a.contacts.map(c => row(c.name, <span>{c.name} <span style={{ color: "var(--dim)" }}>· {c.role}</span></span>, <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Contact details: demo placeholder</span>))}
      </RecordSection>

      <RecordSection title={"Open opportunities · " + opps.length}>
        {opps.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No open opportunities.{closed.length ? " " + closed.length + " closed this quarter." : ""}</div>}
        {opps.map(o => row(o.id, o.title, <><DuePill o={o} /><span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{eur(o.value)}</span></>, () => openRecord("opp", o.id), o.stage + " · " + firstName(o.owner) + " · " + actionText(o.nextAction)))}
        {closed.map(o => row(o.id, o.title, <><Badge tone={o.stage === "Won" ? "ok" : "bad"}>{o.stage}</Badge><span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{eur(o.value)}</span></>, () => openRecord("opp", o.id), "Closed " + date(o.lastActivity, false)))}
      </RecordSection>

      <RecordSection title={"Orders · " + orders.length}>
        {orders.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No orders in the current list.</div>}
        {orders.slice(0, 6).map(o => row(o.id, <RecLink type="order" id={o.id}>{o.id}</RecLink>, <><Status s={o.status} /><span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{eur(D.orderValue(o))}</span></>, undefined, "Created " + date(o.created, false) + " · " + o.lines.length + " line" + (o.lines.length === 1 ? "" : "s") + " · " + o.poRef))}
        {orders.length > 6 && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>{orders.length - 6} older orders not shown.</div>}
      </RecordSection>

      <RecordSection title={"Invoices · " + invoices.length}>
        {invoices.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No invoices on file.</div>}
        {invoices.slice(0, 6).map(i => row(i.id, <RecLink type="invoice" id={i.id}>{i.id}</RecLink>, <><Status s={i.status} /><span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{eur(i.amount)}</span></>, undefined,
          i.status === "Overdue" ? "Due " + date(i.due, false) + " · " + daysAgo(i.due) + " days overdue · " + i.reminders + " reminder" + (i.reminders === 1 ? "" : "s") : i.status === "Paid" ? "Paid " + date(i.paid || i.due, false) : "Due " + date(i.due, false)))}
      </RecordSection>

      {reqs.length > 0 && (
        <RecordSection title={"Customer requests · " + reqs.length}>
          {reqs.map(r => row(r.id, r.title, <Badge tone={r.status === "Open" ? "warn" : "neutral"}>{r.status}</Badge>, undefined, r.kind + " · " + fullName(r.owner) + " · raised " + date(r.raised, false)))}
        </RecordSection>
      )}

      {bookings.length > 0 && (
        <RecordSection title="NICE1 referrals">
          {bookings.map(b => row(b.id, <RecLink type="booking" id={b.id}>{b.id}</RecLink>, <Status s={b.status} />, undefined, b.pkg + " · " + date(b.start, false) + " to " + date(b.end, false)))}
        </RecordSection>
      )}

      <RecordSection title={"Coming up · " + upcoming.length}>
        {upcoming.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing planned with this account.</div>
          : upcoming.slice(0, 5).map(x => row(x.id, x.title, <><Avatar id={x.rep} size={20} /><span style={{ fontSize: 12, color: "var(--dim)" }}>{dayLabel(x.date)} {x.time}</span></>, x.opp ? () => openRecord("opp", x.opp!) : undefined, x.type + " · " + fullName(x.rep)))}
      </RecordSection>
      <RecordSection title={"Recent activity · " + recent.length}>
        {recent.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No activity logged in Pulse yet.</div> : (
          <Timeline dense items={recent.slice(0, 8).map(x => ({
            when: dayDate(x.date) + " " + x.time + " · " + fullName(x.rep), title: x.title,
            sub: x.type + (x.note ? " · " + x.note : ""), tone: (x.status === "Done" ? "ok" : "bad") as Tone,
            tag: <Badge tone={x.status === "Done" ? "ok" : "bad"}>{x.status}</Badge>,
            onClick: x.opp ? () => openRecord("opp", x.opp!) : undefined,
          }))} />
        )}
      </RecordSection>
    </div>
  );
}

/* ── Opportunity ────────────────────────────────────────────────────────── */

export function OppRecord({ id }: { id: string }) {
  const s = useHogan();
  const [mode, setMode] = useState<"" | "schedule" | "next" | "won" | "lost">("");
  const o = findOpp(id, s);
  if (!o) return <Empty title="Opportunity not found" sub={id} />;
  const acc = D.accountById(o.account);
  const open = isOpen(o);
  const live = !!s.opps.find(x => x.id === id);
  const plan = plannedFor(id, s);
  const quotes = D.QUOTES.filter(q => q.opp === id);
  const stageIdx = OPEN_STAGES.indexOf(o.stage as typeof OPEN_STAGES[number]);
  const history = [
    ...s.activities.filter(a => a.opp === id && a.status !== "Planned").map(a => ({ k: a.date + a.time, when: dayDate(a.date) + " " + a.time + " · " + fullName(a.rep), title: a.title, sub: a.type + (a.note ? " · " + a.note : ""), tone: (a.status === "Done" ? "ok" : "bad") as Tone })),
    ...quotes.map(q => ({ k: q.sent + "12:00", when: dayDate(q.sent), title: "Quote " + q.id + " sent", sub: eur(q.value) + " · " + quoteStatus(q, s), tone: "accent" as Tone })),
    ...s.events.filter(e => e.ref === id && !/^(Done: |Added to )/.test(e.title)).map(e => ({ k: e.date + e.time, when: dayDate(e.date) + " " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: (e.stream === "ai" ? "accent" : "neutral") as Tone })),
    { k: o.created + "00:00", when: dayDate(o.created), title: "Opportunity created", sub: "Source: " + o.source, tone: "neutral" as Tone },
  ];
  if (!history.some(h => h.k.startsWith(o.lastActivity)) && o.lastActivity !== o.created)
    history.push({ k: o.lastActivity + "00:01", when: dayDate(o.lastActivity), title: "Last recorded contact", sub: "Imported with the opportunity (" + fullName(o.owner) + ")", tone: "neutral" as Tone });
  history.sort((a, b) => b.k.localeCompare(a.k));
  return (
    <div>
      <RecordHead kind="Opportunity" title={o.title} status={o.stage}
        sub={<><RecLink type="account" id={o.account}>{acc?.name}</RecLink> · {fullName(o.owner)}{D.staffById(o.owner)?.fictional ? " (fictional)" : ""} · {o.id}</>}
        right={<div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--mono)" }}>{eur(o.value)}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>demo value</div></div>} />

      {open && isOverdue(o) && (
        <Notice tone="bad" style={{ marginTop: 14 }} title={"Follow-up overdue by " + overdueBy(o) + " days"}>
          Last activity {date(o.lastActivity)}, {daysAgo(o.lastActivity)} days ago. "{actionText(o.nextAction)}" was due {date(o.nextDue)}.
          {plan[0] ? " " + firstName(plan[0].rep) + " has it planned " + (plan[0].date === TODAY ? "today" : dayDate(plan[0].date)) + " at " + plan[0].time + "." : " It is not in anyone's plan yet."}
        </Notice>
      )}

      {open && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...label, marginBottom: 8 }}>Stage {live ? "· click to move" : ""}</div>
          <Steps steps={OPEN_STAGES.map((st, i) => ({ label: st, done: i < stageIdx, active: i === stageIdx }))} onPick={live ? i => setStage(id, OPEN_STAGES[i]) : undefined} />
        </div>
      )}

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Stage", o.stage], ["Probability", STAGE_PROB[o.stage] + "%"], ["Weighted value", eur(Math.round(o.value * STAGE_PROB[o.stage] / 100))],
        ["Owner", live && open ? (
          <SelectBox<D.StaffId> value={o.owner} onChange={v => reassignOpp(id, v)} options={SELLER_OPTIONS} style={{ height: 28, fontSize: 12, width: "100%" }} />
        ) : fullName(o.owner)],
        ["Created", date(o.created, false)], ["Last activity", <span>{date(o.lastActivity, false)} <QuietPill since={o.lastActivity} /></span>],
        ["Next action", open ? actionText(o.nextAction) : "Closed"], ["Next due", open ? <span style={{ color: isOverdue(o) ? "var(--bad)" : undefined }}>{date(o.nextDue, false)}</span> : "Closed"], ["Product interest", o.interest],
        ["Lead source", o.source], ["Account owner", fullName(acc?.owner || "")], ["Region", acc?.region || ""],
      ]} />

      {open && live && (
        <>
          <Row gap={8} wrap style={{ marginTop: 14 }}>
            <Btn kind="primary" size="sm" icon={I.calendar} onClick={() => setMode(mode === "schedule" ? "" : "schedule")}>Schedule follow-up</Btn>
            <Btn size="sm" icon={I.edit} onClick={() => setMode(mode === "next" ? "" : "next")}>Set next step</Btn>
            <span style={{ flex: 1 }} />
            <Btn size="sm" icon={I.check} onClick={() => setMode(mode === "won" ? "" : "won")}>Mark won</Btn>
            <Btn kind="danger" size="sm" icon={I.x} onClick={() => setMode(mode === "lost" ? "" : "lost")}>Mark lost</Btn>
          </Row>
          <div style={{ marginTop: 10 }}>
            {mode === "schedule" && <SchedulePanel title={followTitle(o)} rep={o.owner} account={o.account} opp={o.id} priority={isOverdue(o) ? "High" : "Medium"} onDone={() => setMode("")} onCancel={() => setMode("")} />}
            {mode === "next" && <NextStepPanel o={o} onDone={() => setMode("")} />}
            {(mode === "won" || mode === "lost") && (
              <Notice tone={mode === "won" ? "ok" : "bad"} title={"Close " + o.id + " as " + mode + "?"}
                right={<Row gap={6}><Btn kind={mode === "won" ? "primary" : "danger"} size="sm" onClick={() => { setStage(id, mode === "won" ? "Won" : "Lost"); setMode(""); }}>Confirm</Btn><Btn kind="ghost" size="sm" onClick={() => setMode("")}>Cancel</Btn></Row>}>
                It leaves the open pipeline ({eur(o.value)}) and counts in this quarter's conversion. {mode === "won" ? "Raise the order in Orders as usual." : ""}
              </Notice>
            )}
          </div>
        </>
      )}

      <RecordSection title={"Planned · " + plan.length}>
        {plan.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing planned for this opportunity.</div>}
        {plan.map(a => row(a.id, a.title, <><Avatar id={a.rep} size={20} /><span style={{ fontSize: 12, color: "var(--dim)" }}>{dayLabel(a.date)} {a.time}</span></>, () => nav("Sales", "planner", { "sales.planRep": a.rep, "sales.planWeek": a.date > THIS_SUNDAY ? "next" : "this" }), a.type + " · " + fullName(a.rep)))}
      </RecordSection>

      {quotes.length > 0 && (
        <RecordSection title="Quotations">
          {quotes.map(q => row(q.id, <RecLink type="quote" id={q.id}>{q.id}</RecLink>, <><Status s={quoteStatus(q, s)} /><span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{eur(q.value)}</span></>, undefined, "Sent " + date(q.sent, false) + " · valid to " + date(q.validTo, false)))}
        </RecordSection>
      )}

      <RecordSection title="History">
        <Timeline dense items={history.map(h => ({ when: h.when, title: h.title, sub: h.sub, tone: h.tone }))} />
      </RecordSection>
    </div>
  );
}

/* ── Quotation ──────────────────────────────────────────────────────────── */

export function QuoteRecord({ id }: { id: string }) {
  const s = useHogan();
  const q = D.QUOTES.find(x => x.id === id);
  if (!q) return <Empty title="Quotation not found" sub={id} />;
  const st = quoteStatus(q, s);
  const o = findOpp(q.opp, s);
  const acc = D.accountById(q.account);
  const chase = s.activities.filter(a => a.title.includes(q.id)).sort(byWhen).reverse();
  const left = daysUntil(q.validTo);
  const responses: QStatus[] = ["Viewed", "Revision requested", "Accepted", "Declined"];
  return (
    <div>
      <RecordHead kind="Quotation" title={q.id + " · " + (acc?.name || "")} status={st}
        sub={<>{o ? <RecLink type="opp" id={o.id}>{o.title}</RecLink> : q.opp} · {fullName(q.owner)}{D.staffById(q.owner)?.fictional ? " (fictional)" : ""}</>}
        right={<div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--mono)" }}>{eur(q.value)}</div>} />
      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Sent", date(q.sent, false) + " · " + daysAgo(q.sent) + " days ago"],
        ["Valid to", <span style={{ color: left <= 7 ? "var(--warn)" : undefined }}>{date(q.validTo, false)} · {left >= 0 ? left + " days left" : "expired"}</span>],
        ["Owner", fullName(q.owner)],
        ["Opportunity stage", o ? o.stage : "Unknown"],
        ["Next action", o && isOpen(o) ? actionText(o.nextAction) : "Closed"],
        ["Account", acc ? <RecLink type="account" id={acc.id}>{acc.name}</RecLink> : q.account],
      ]} />
      <Notice tone="info" style={{ marginTop: 14 }}>Line pricing and the quote document stay in the current ERP (integration not yet verified). Pulse tracks the response and the next step.</Notice>

      <RecordSection title="Record the customer's response">
        <Row gap={6} wrap>
          {responses.map(r => <Btn key={r} size="sm" kind={st === r ? "accent" : "secondary"} disabled={st === r} onClick={() => setQuoteStatus(q.id, r)}>{r}</Btn>)}
        </Row>
        {st === "Accepted" && o && isOpen(o) && (
          <Notice tone="ok" style={{ marginTop: 10 }} title="Quote accepted" right={<Btn kind="primary" size="sm" onClick={() => setStage(o.id, "Won")}>Mark {o.id} won</Btn>}>Close the opportunity when the purchase order is confirmed.</Notice>
        )}
        {st === "Declined" && o && isOpen(o) && (
          <Notice tone="bad" style={{ marginTop: 10 }} title="Quote declined" right={<Btn kind="danger" size="sm" onClick={() => setStage(o.id, "Lost")}>Mark {o.id} lost</Btn>}>Or set a new next step on the opportunity if it can be saved.</Notice>
        )}
      </RecordSection>

      <RecordSection title="Chase" right={<Btn size="sm" icon={I.phone} onClick={() => planActivity({ rep: q.owner, date: TODAY, time: freeSlot(q.owner, TODAY, s), type: "Call", title: "Chase " + q.id + " with " + (acc?.name || ""), account: q.account, opp: q.opp, status: "Planned", priority: "Medium", source: "planner" })}>Plan a chase call today</Btn>}>
        {chase.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No chase calls logged against {q.id}.</div>}
        {chase.map(a => row(a.id, a.title, <Badge tone={a.status === "Done" ? "ok" : a.status === "Missed" ? "bad" : "neutral"}>{a.status}</Badge>, undefined, dayLabel(a.date) + " " + a.time + " · " + fullName(a.rep)))}
      </RecordSection>
    </div>
  );
}
