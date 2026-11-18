/* Work: My Tasks, Team Plan and Approvals for Hogan Healthcare OS.
   (Schedule and Workflows are the original Pulse views, rendered by AppShell.) */

import { useState } from "react";
import * as D from "../data";
import * as S from "../store";
import { addDays, date, dayDate, daysAgo, eur, weekday } from "../fmt";
import {
  Avatar, Badge, Btn, Card, Chip, Empty, Grid, I, Icon, KV, Kpi, Notice, Page, PageHeader, Person, Progress, RecLink, RecordHead, RecordSection,
  Row, SearchBox, Seg, SelectBox, Status, Table, TextInput, label, match, type Col,
} from "../ui";

const ME: D.StaffId = "GH";
const DEPTS = ["Management", "Sales", "Orders", "Operations", "Inventory", "Purchasing", "Finance", "Compliance", "Rentals"];
const STATUSES: D.TaskStatus[] = ["Not started", "In progress", "Waiting", "Done"];

/** Opens whatever a task points at: a record drawer, or a page for page links. */
export function openRelated(r?: D.Task["related"]) {
  if (!r) return;
  if (r.type === "page") { const [page, tab] = r.id.split(":"); S.nav(page, tab); return; }
  S.openRecord(r.type, r.id);
}

function RelatedLink({ r }: { r?: D.Task["related"] }) {
  if (!r) return <span style={{ color: "var(--faint)" }}>None</span>;
  return (
    <button onClick={e => { e.stopPropagation(); openRelated(r); }} className="ix3"
      style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontSize: 12.5, textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {r.label}
    </button>
  );
}

function dueLabel(t: D.Task) {
  if (t.status === "Done") return <span style={{ color: "var(--faint)" }}>{date(t.due, false)}</span>;
  const n = daysAgo(t.due);
  if (n > 0) return <span style={{ color: "var(--bad)" }}>{n === 1 ? "1 day overdue" : n + " days overdue"}</span>;
  if (n === 0) return <span style={{ color: "var(--warn)" }}>Today{t.dueTime ? " " + t.dueTime : ""}</span>;
  return <span>{dayDate(t.due)}</span>;
}

function nextStatus(st: D.TaskStatus): D.TaskStatus {
  return st === "Not started" ? "In progress" : st === "In progress" ? "Done" : st === "Waiting" ? "In progress" : "Not started";
}

/* ── My Tasks ───────────────────────────────────────────────────────────── */

function Tasks() {
  const s = S.useHogan();
  const [who, setWho] = S.useUi<string>("work.who", "all");
  const [view, setView] = S.useUi<string>("work.view", "open");
  const [dept, setDept] = useState("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<string>(ME);
  const [prio, setPrio] = useState<string>("Medium");
  const [newDept, setNewDept] = useState<string>("Management");

  const base = s.tasks.filter(t => (who === "all" || t.owner === who) && (dept === "all" || t.dept === dept) && match(q, t.title, t.related?.label, D.staffById(t.owner)?.name, t.dept));
  const open = base.filter(t => t.status !== "Done");
  const views: Record<string, D.Task[]> = {
    open, today: open.filter(t => t.due === D.DEMO.today), overdue: open.filter(t => t.due < D.DEMO.today),
    waiting: open.filter(t => t.status === "Waiting"), done: base.filter(t => t.status === "Done"),
  };
  const rows = (views[view] || open).slice().sort((a, b) => (a.status === "Done" ? 1 : 0) - (b.status === "Done" ? 1 : 0) || a.due.localeCompare(b.due) || (a.priority === "High" ? -1 : 1));
  const mine = s.tasks.filter(t => t.owner === ME && t.status !== "Done");
  const add = () => {
    if (!title.trim()) return;
    S.addTask({ title: title.trim(), owner: owner as D.StaffId, due: D.DEMO.today, priority: prio as D.Task["priority"], dept: newDept, status: "Not started", createdBy: ME });
    S.toast("Task added for " + (D.staffById(owner)?.first || owner) + ".");
    setTitle("");
  };

  const cols: Col<D.Task>[] = [
    { key: "done", label: "", w: "44px", render: t => (
      <button onClick={e => { e.stopPropagation(); S.setTaskStatus(t.id, t.status === "Done" ? "Not started" : "Done"); }} title={t.status === "Done" ? "Reopen" : "Mark done"}
        style={{ width: 18, height: 18, borderRadius: 6, border: "1.5px solid " + (t.status === "Done" ? "var(--accent)" : "var(--border-strong)"), background: t.status === "Done" ? "var(--accent)" : "none", color: "var(--on-accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        {t.status === "Done" && <Icon d={I.check} size={11} stroke={2.6} />}
      </button>) },
    { key: "title", label: "Task", w: "2.4fr", sort: t => t.title, render: t => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: t.status === "Done" ? "var(--faint)" : "var(--ink)", textDecoration: t.status === "Done" ? "line-through" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
        {t.note && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note}</div>}
      </div>) },
    { key: "owner", label: "Owner", w: "1.25fr", sort: t => t.owner, render: t => <Person id={t.owner} size={22} sub={D.staffById(t.owner)?.dept} /> },
    { key: "due", label: "Due", w: "1fr", sort: t => t.due, render: t => dueLabel(t) },
    { key: "priority", label: "Priority", w: ".8fr", sort: t => (t.priority === "High" ? 0 : t.priority === "Medium" ? 1 : 2), render: t => <Badge tone={t.priority === "High" ? "bad" : t.priority === "Medium" ? "warn" : "neutral"}>{t.priority}</Badge> },
    { key: "dept", label: "Department", w: ".95fr", sort: t => t.dept },
    { key: "related", label: "Related record", w: "1.7fr", render: t => <RelatedLink r={t.related} /> },
    { key: "status", label: "Status", w: "1fr", sort: t => STATUSES.indexOf(t.status), render: t => (
      <button onClick={e => { e.stopPropagation(); S.setTaskStatus(t.id, nextStatus(t.status)); }} title="Move to the next status" style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }}>
        <Status s={t.status} />
      </button>) },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Work" title="Tasks" sub="Everything the team has to do, each task tied to the record it is about. Tasks raised by agents say so; people own them."
        right={<Btn kind="secondary" icon={I.users} onClick={() => S.setTab("Work", "team")}>Team plan</Btn>} />
      <Grid min={150} gap={10}>
        <Kpi label="Open" value={String(s.tasks.filter(t => t.status !== "Done").length)} sub={"across " + D.STAFF.length + " people"} onClick={() => { setView("open"); setWho("all"); }} />
        <Kpi label="Due today" value={String(s.tasks.filter(t => t.status !== "Done" && t.due === D.DEMO.today).length)} sub="Thursday 19 Nov" onClick={() => setView("today")} />
        <Kpi label="Overdue" tone="bad" value={String(s.tasks.filter(t => t.status !== "Done" && t.due < D.DEMO.today).length)} sub="past their due date" onClick={() => setView("overdue")} />
        <Kpi label="Waiting" value={String(s.tasks.filter(t => t.status === "Waiting").length)} sub="blocked on someone" onClick={() => setView("waiting")} />
        <Kpi label="Yours" tone="accent" value={String(mine.length)} sub="Graham Hogan" onClick={() => { setWho(ME); setView("open"); }} />
      </Grid>

      {mine.length > 0 && who === "all" && (
        <Card title="On your plate, Graham" sub="Decisions only you can make." right={<Btn kind="ghost" size="sm" onClick={() => S.setTab("Work", "approvals")}>All approvals</Btn>}>
          <Grid min={260} gap={8}>
            {mine.map(t => (
              <div key={t.id} onClick={() => S.openRecord("task", t.id)} className="ixx" style={{ padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", cursor: "pointer" }}>
                <Row gap={8}><Badge tone={t.priority === "High" ? "bad" : "warn"}>{t.priority}</Badge><span style={{ fontSize: 11.5, color: "var(--dim)" }}>{dueLabel(t)}</span></Row>
                <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 8 }}>{t.title}</div>
                <div style={{ marginTop: 6 }}><RelatedLink r={t.related} /></div>
              </div>
            ))}
          </Grid>
        </Card>
      )}

      <Card flush>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icon d={I.plus} size={15} color="var(--accent)" />
          <TextInput value={title} onChange={setTitle} onEnter={add} placeholder="Add a task and press Enter" style={{ flex: "1 1 240px" }} />
          <SelectBox value={owner} onChange={setOwner} options={D.STAFF.map(p => [p.id, p.name] as [string, string])} title="Owner" />
          <SelectBox value={newDept} onChange={setNewDept} options={DEPTS.map(d => [d, d] as [string, string])} title="Department" />
          <Seg size="sm" items={[["High", "High"], ["Medium", "Medium"], ["Low", "Low"]]} value={prio} onChange={setPrio} />
          <Btn kind="primary" size="md" onClick={add} disabled={!title.trim()}>Add</Btn>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "12px 16px" }}>
          <Seg items={[["open", "Open", views.open.length], ["today", "Due today", views.today.length], ["overdue", "Overdue", views.overdue.length], ["waiting", "Waiting", views.waiting.length], ["done", "Done", views.done.length]]} value={view} onChange={setView} />
          <span style={{ flex: 1 }} />
          <SelectBox value={dept} onChange={setDept} options={[["all", "All departments"] as [string, string]].concat(DEPTS.map(d => [d, d] as [string, string]))} />
          <SearchBox value={q} onChange={setQ} placeholder="Search tasks" style={{ width: 220 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 16px 12px" }}>
          <Chip active={who === "all"} onClick={() => setWho("all")} count={s.tasks.filter(t => t.status !== "Done").length}>Everyone</Chip>
          {D.STAFF.map(p => <Chip key={p.id} active={who === p.id} onClick={() => setWho(p.id)} count={s.tasks.filter(t => t.owner === p.id && t.status !== "Done").length}>{p.first}</Chip>)}
        </div>
        <Table cols={cols} rows={rows} rowKey={t => t.id} onRow={t => S.openRecord("task", t.id)} minWidth={920}
          empty={<Empty title="Nothing in this view" sub="Try another filter, or add a task above." />}
          footer={rows.length + " tasks · click a status to move it on · every change is written to Activity"} />
      </Card>
    </Page>
  );
}

/* ── Team Plan ──────────────────────────────────────────────────────────── */

function TeamPlan() {
  const s = S.useHogan();
  const [week, setWeek] = S.useUi<string>("work.week", D.DEMO.weekStart);
  const days = [0, 1, 2, 3, 4].map(i => addDays(week, i));
  const open = s.tasks.filter(t => t.status !== "Done");
  const overdue = (id: string) => open.filter(t => t.owner === id && t.due < D.DEMO.today);
  return (
    <Page>
      <PageHeader eyebrow="Work" title="Team plan" sub="Who is doing what this week: tasks by due date and, for the sales team, their planned visits and calls."
        right={<Seg items={[[D.DEMO.weekStart, "This week · 16 to 20 Nov"], [D.DEMO.nextWeekStart, "Next week · 23 to 27 Nov"]]} value={week} onChange={setWeek} />} />
      <Card flush>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 1040 }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px repeat(5,1fr) 150px", background: "var(--surface-faint)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ ...label, padding: "10px 14px" }}>Person</div>
              {days.map(d => <div key={d} style={{ ...label, padding: "10px 10px", color: d === D.DEMO.today ? "var(--accent)" : "var(--faint)" }}>{dayDate(d)}{d === D.DEMO.today ? " · today" : ""}</div>)}
              <div style={{ ...label, padding: "10px 10px" }}>Load</div>
            </div>
            {D.STAFF.map(p => {
              const mineOpen = open.filter(t => t.owner === p.id);
              const late = overdue(p.id);
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "200px repeat(5,1fr) 150px", borderBottom: "1px solid var(--border)", minHeight: 74 }}>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    <Person id={p.id} size={26} />
                    {late.length > 0 && week === D.DEMO.weekStart && <span style={{ fontSize: 11, color: "var(--bad)" }}>{late.length} overdue carried in</span>}
                  </div>
                  {days.map(d => {
                    const ts = s.tasks.filter(t => t.owner === p.id && t.due === d);
                    const acts = s.activities.filter(a => a.rep === p.id && a.date === d);
                    return (
                      <div key={d} style={{ padding: "8px 7px", borderLeft: "1px solid var(--border)", background: d === D.DEMO.today ? "var(--accent-faint)" : undefined, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        {ts.map(t => (
                          <button key={t.id} onClick={() => S.openRecord("task", t.id)} className="ixz" title={t.title}
                            style={{ textAlign: "left", padding: "5px 7px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", fontSize: 11.5, color: t.status === "Done" ? "var(--faint)" : "var(--ink)",
                              textDecoration: t.status === "Done" ? "line-through" : undefined, borderLeft: "3px solid " + (t.priority === "High" ? "var(--bad)" : t.priority === "Medium" ? "var(--warn)" : "var(--border-strong)"),
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.title}
                          </button>
                        ))}
                        {acts.length > 0 && (
                          <button onClick={() => S.nav("Sales", "planner", { "sales.rep": p.id })} className="ix3" title="Open in the weekly planner"
                            style={{ textAlign: "left", border: 0, background: "none", padding: "2px 2px", cursor: "pointer", fontSize: 11, color: "var(--dim)" }}>
                            {acts.length} sales {acts.length === 1 ? "activity" : "activities"}{acts.some(a => a.status === "Missed") ? " · " + acts.filter(a => a.status === "Missed").length + " missed" : ""}
                          </button>
                        )}
                        {ts.length === 0 && acts.length === 0 && <span style={{ fontSize: 11, color: "var(--faint)", padding: "4px 2px" }}>·</span>}
                      </div>
                    );
                  })}
                  <div style={{ padding: "12px 12px", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--body)" }}>{mineOpen.length} open task{mineOpen.length === 1 ? "" : "s"}</span>
                    <Progress value={mineOpen.length} max={6} tone={mineOpen.length >= 5 ? "warn" : "accent"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <Grid cols="1fr 1fr" gap={14} style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))" }}>
        <Card title="Overdue across the team" sub="Carried into this week. Each one links to its record.">
          {open.filter(t => t.due < D.DEMO.today).length === 0 ? <Empty title="Nothing overdue" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {open.filter(t => t.due < D.DEMO.today).sort((a, b) => a.due.localeCompare(b.due)).map(t => (
                <div key={t.id} onClick={() => S.openRecord("task", t.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, cursor: "pointer" }}>
                  <Avatar id={t.owner} size={22} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                  <span style={{ fontSize: 11.5, color: "var(--bad)" }}>{daysAgo(t.due)}d</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Waiting on someone else" sub="Blocked tasks and what they are waiting for.">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {open.filter(t => t.status === "Waiting").map(t => (
              <div key={t.id} onClick={() => S.openRecord("task", t.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, cursor: "pointer" }}>
                <Avatar id={t.owner} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{t.note || t.related?.label}</div>
                </div>
              </div>
            ))}
            {open.filter(t => t.status === "Waiting").length === 0 && <Empty title="Nothing blocked" />}
          </div>
        </Card>
      </Grid>
    </Page>
  );
}

/* ── Approvals ──────────────────────────────────────────────────────────── */

function ApprovalCard({ a }: { a: D.Approval }) {
  const approver = D.staffById(a.approver);
  const ref = a.ref.type === "transfer" ? "transfer" : a.ref.type;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", background: "var(--surface)", border: "1px solid " + (a.status === "Awaiting" ? "var(--border)" : "var(--border)"), borderRadius: "var(--r-md,16px)", minWidth: 0 }}>
      <Row gap={8} wrap>
        <Badge tone="accent">{a.kind}</Badge>
        <Status s={a.status === "Awaiting" ? "Awaiting " + (approver?.first || "") : a.status} />
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{a.id} · raised {date(a.raised, false)}</span>
      </Row>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px" }}>{a.title}</div>
      <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>{a.detail}</div>
      <Row gap={14} wrap style={{ fontSize: 12, color: "var(--dim)" }}>
        <span>Requested by <b style={{ color: "var(--body)", fontWeight: 500 }}>{a.requestedBy.startsWith("agent") ? "an agent" : D.staffById(a.requestedBy)?.name || a.requestedBy}</b></span>
        {a.value ? <span>Value <b style={{ color: "var(--body)", fontWeight: 500 }}>{eur(a.value)}</b></span> : null}
        <span>Record <RecLink type={ref} id={a.ref.id} /></span>
      </Row>
      {a.status === "Awaiting" ? (
        <Row gap={8} wrap>
          <Btn kind="primary" icon={I.check} onClick={() => S.decideApproval(a.id, true, a.approver)}>Approve as {approver?.first}</Btn>
          <Btn kind="secondary" onClick={() => S.decideApproval(a.id, false, a.approver)}>Reject</Btn>
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Recorded against {approver?.name}. Agents never approve.</span>
        </Row>
      ) : (
        <div style={{ fontSize: 12, color: "var(--faint)" }}>{a.status} by {D.staffById(a.decidedBy || "")?.name || a.decidedBy} · {a.decidedAt}</div>
      )}
    </div>
  );
}

function Approvals() {
  const s = S.useHogan();
  const [view, setView] = S.useUi<string>("work.approvals", "mine");
  const lists: Record<string, D.Approval[]> = {
    mine: s.approvals.filter(a => a.status === "Awaiting" && a.approver === ME),
    others: s.approvals.filter(a => a.status === "Awaiting" && a.approver !== ME),
    decided: s.approvals.filter(a => a.status !== "Awaiting"),
  };
  const list = lists[view] || [];
  return (
    <Page>
      <PageHeader eyebrow="Work" title="Approvals" sub="Requests waiting on a person. Agents and colleagues propose; the named approver decides, and the decision is written to Activity."
        right={<Seg items={[["mine", "Awaiting you", lists.mine.length], ["others", "Awaiting others", lists.others.length], ["decided", "Decided", lists.decided.length]]} value={view} onChange={setView} />} />
      <Notice tone="info" title="Human approval for anything with an effect">
        Stock transfers, purchase orders over €5,000, credit notes, discounts and supplier bill holds all need a named person. Nothing here posts to accounting or moves money.
      </Notice>
      {list.length === 0 ? (
        <Card><Empty title={view === "mine" ? "Nothing waiting on you" : view === "others" ? "Nothing waiting on others" : "No decisions yet"} sub="New requests land here as they are raised." /></Card>
      ) : (
        <Grid min={340} gap={12}>{list.map(a => <ApprovalCard key={a.id} a={a} />)}</Grid>
      )}
    </Page>
  );
}

/* ── Drawer views: task, approval, staff ────────────────────────────────── */

function TaskRecord({ id }: { id: string }) {
  const s = S.useHogan();
  const t = s.tasks.find(x => x.id === id);
  if (!t) return <Empty title="Task not found" />;
  return (
    <div>
      <RecordHead kind={"Task · " + t.id} title={t.title} status={t.status} sub={t.note} />
      <KV style={{ marginTop: 18 }} items={[
        ["Owner", <Person id={t.owner} size={22} />], ["Due", dueLabel(t)], ["Priority", t.priority], ["Department", t.dept],
        ["Created by", t.createdBy?.startsWith("agent") ? "Agent (proposed)" : D.staffById(t.createdBy || "")?.name || "Imported from current ERP (demo)"],
        ["Related record", <RelatedLink r={t.related} />],
      ]} />
      <RecordSection title="Status">
        <Row gap={6} wrap>{STATUSES.map(st => <Btn key={st} size="sm" kind={t.status === st ? "accent" : "secondary"} onClick={() => S.setTaskStatus(t.id, st)}>{st}</Btn>)}</Row>
      </RecordSection>
      <RecordSection title="Reassign">
        <SelectBox value={t.owner} onChange={v => { S.patch(st => ({ tasks: st.tasks.map(x => x.id === t.id ? { ...x, owner: v as D.StaffId } : x) })); S.toast("Reassigned to " + (D.staffById(v)?.name || v) + "."); }}
          options={D.STAFF.map(p => [p.id, p.name] as [string, string])} />
      </RecordSection>
      {t.related && <div style={{ marginTop: 18 }}><Btn kind="primary" icon={I.arrow} onClick={() => openRelated(t.related)}>Open {t.related.label.split(" · ")[0]}</Btn></div>}
    </div>
  );
}

function ApprovalRecord({ id }: { id: string }) {
  const s = S.useHogan();
  const a = s.approvals.find(x => x.id === id);
  if (!a) return <Empty title="Approval not found" />;
  return <div><RecordHead kind={"Approval · " + a.kind} title={a.title} status={a.status} /><div style={{ marginTop: 16 }}><ApprovalCard a={a} /></div></div>;
}

function StaffRecord({ id }: { id: string }) {
  const s = S.useHogan();
  const p = D.staffById(id);
  if (!p) return <Empty title="Person not found" />;
  const tasks = s.tasks.filter(t => t.owner === id && t.status !== "Done");
  const acts = s.activities.filter(a => a.rep === id && a.date >= D.DEMO.weekStart && a.date <= addDays(D.DEMO.weekStart, 4));
  return (
    <div>
      <RecordHead kind={p.fictional ? "Team member · fictional" : "Team member"} title={p.name} sub={p.role + (p.territory ? " · " + p.territory : "")} />
      <KV style={{ marginTop: 18 }} items={[["Department", p.dept], ["Based", p.base], ["Open tasks", String(tasks.length)], ["This week's sales activities", p.seller ? String(acts.length) : "n/a"], ["Contact", "Demo placeholder"], ["Access", p.id === "GH" ? "Admin" : p.dept === "Sales" ? "Sales" : "Standard"]]} />
      <RecordSection title="Open tasks">
        {tasks.length ? tasks.map(t => (
          <div key={t.id} onClick={() => S.openRecord("task", t.id)} className="ix11" style={{ display: "flex", gap: 10, padding: "8px 8px", borderRadius: 10, cursor: "pointer" }}>
            <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span><span style={{ fontSize: 12, color: "var(--dim)" }}>{weekday(t.due)} {date(t.due, false)}</span>
          </div>)) : <div style={{ fontSize: 13, color: "var(--dim)" }}>No open tasks.</div>}
      </RecordSection>
    </div>
  );
}

S.registerRecordView("task", TaskRecord, "Task");
S.registerRecordView("approval", ApprovalRecord, "Approval");
S.registerRecordView("staff", StaffRecord, "Person");

export default function Work({ tab }: { tab?: string }) {
  if (tab === "team") return <TeamPlan />;
  if (tab === "approvals") return <Approvals />;
  return <Tasks />;
}
