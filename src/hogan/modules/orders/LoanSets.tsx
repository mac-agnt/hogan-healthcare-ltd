/* Orders · Loan Sets: surgical instrument sets lent to hospitals for a
   procedure. Hospital and procedure date only: no patient data is held.
   The public website's request form is not connected; requests are logged
   here by hand. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, dayDate, daysBetween, plural } from "../../fmt";
import { addTask, getState, log, openRecord, patch, setLoanSetStatus, setQxStatus, setTaskStatus, toast, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, I, Kpi, Notice, Page, PageHeader, Row, SelectBox, Status, TONE, Table, TextInput, label, type Col, type Tone } from "../../ui";
import { Stack, Two } from "./kit";
import { accName, clean } from "./common";

export const hospitalOf = (l: D.LoanSet) => (l.requestedBy ? accName(l.requestedBy) : "");
export function whereIs(loc: string): string {
  if (loc === "DLM") return "Main stockroom";
  return D.locById(loc)?.short || loc;
}
const STATUS_TONE: Record<D.LoanSet["status"], Tone> = { Available: "ok", Requested: "warn", Dispatched: "accent", "At hospital": "info", "Returned: inspection": "warn", Decontamination: "warn" };

function closeSetTasks(id: string) {
  getState().tasks.filter(t => t.related?.id === id && t.status !== "Done").forEach(t => setTaskStatus(t.id, "Done"));
}

export function dispatchSet(l: D.LoanSet) {
  setLoanSetStatus(l.id, "Dispatched", { location: "In transit" });
  closeSetTasks(l.id);
}
export function deliverSet(l: D.LoanSet) {
  const acc = l.requestedBy ? D.accountById(l.requestedBy) : undefined;
  setLoanSetStatus(l.id, "At hospital", { location: acc?.locId || acc?.name || "At hospital" });
}
export function returnSet(l: D.LoanSet) {
  setLoanSetStatus(l.id, "Returned: inspection", { location: "DLM", inspection: "Awaiting decontamination certificate" });
}
export function certificateIn(l: D.LoanSet) {
  patch(s => ({ loanSets: s.loanSets.map(x => (x.id === l.id ? { ...x, inspection: "Count check required" } : x)) }));
  log({ stream: "people", actor: "John Culkin", title: "Decontamination certificate filed for " + l.id, note: l.name + ". Count check next.", status: "completed", ref: l.id, refType: "loanset" });
  getState().qx.filter(q => q.ref === l.id && q.status !== "Closed").forEach(q => setQxStatus(q.id, "Closed", "JC"));
  toast("Certificate filed for " + l.id + ". Count check next.");
}
export function completeInspection(l: D.LoanSet) {
  setLoanSetStatus(l.id, "Available", { location: "DLM", inspection: "Inspected & sealed", requestedBy: undefined, procedureDate: undefined, dispatchBy: undefined, returnBy: undefined });
}
export function logRequest(setId: string, account: string, procedure: string) {
  const l = getState().loanSets.find(x => x.id === setId);
  if (!l) return;
  const dispatchBy = addDays(procedure, -1) < TODAY ? TODAY : addDays(procedure, -1);
  setLoanSetStatus(setId, "Requested", { requestedBy: account, procedureDate: procedure, dispatchBy, returnBy: addDays(procedure, 3) });
  addTask({ title: "Prepare " + l.name + " for " + accName(account), owner: "JC", due: dispatchBy, priority: "Medium", dept: "Operations",
    related: { type: "loanset", id: setId, label: setId + " · procedure " + date(procedure, false) }, status: "Not started", createdBy: "SO" });
}

/** The next action for a set, shared by the table and the drawer. */
export function SetAction({ l, onAllocate, size = "sm" }: { l: D.LoanSet; onAllocate?: () => void; size?: "sm" | "md" }) {
  if (l.status === "Requested") return <Btn size={size} kind="primary" icon={I.truck} onClick={() => dispatchSet(l)}>Dispatch</Btn>;
  if (l.status === "Dispatched") return <Btn size={size} kind="secondary" icon={I.hospital} onClick={() => deliverSet(l)}>Delivered</Btn>;
  if (l.status === "At hospital") return <Btn size={size} kind="secondary" icon={I.back} onClick={() => returnSet(l)}>Mark returned</Btn>;
  if (l.inspection === "Awaiting decontamination certificate") return <Btn size={size} kind="accent" icon={I.doc} onClick={() => certificateIn(l)}>Certificate received</Btn>;
  if (l.status === "Returned: inspection" || l.status === "Decontamination") return <Btn size={size} kind="primary" icon={I.shield} onClick={() => completeInspection(l)}>Complete inspection</Btn>;
  if (l.status === "Available" && onAllocate) return <Btn size={size} kind="ghost" icon={I.plus} onClick={onAllocate}>Allocate</Btn>;
  return null;
}

export function setFlags(l: D.LoanSet): { tone: Tone; text: string } | null {
  if (l.status === "Requested" && l.dispatchBy && l.dispatchBy <= TODAY) return { tone: "bad", text: l.dispatchBy < TODAY ? "Dispatch overdue" : "Dispatch today" };
  if (l.status === "At hospital" && l.returnBy && l.returnBy < TODAY) return { tone: "bad", text: "Return overdue" };
  if (l.status === "Requested" && l.dispatchBy && l.dispatchBy <= addDays(TODAY, 4)) return { tone: "warn", text: "Dispatch " + dayDate(l.dispatchBy) };
  return null;
}

function Schedule({ sets }: { sets: D.LoanSet[] }) {
  const start = addDays(TODAY, -3);
  const span = 15;
  const days = Array.from({ length: span }, (_, i) => addDays(start, i));
  const pos = (d: string) => (Math.max(0, Math.min(span, daysBetween(start, d))) / span) * 100;
  const rows = sets.filter(l => l.dispatchBy && l.returnBy).sort((a, b) => ((a.dispatchBy || "") < (b.dispatchBy || "") ? -1 : 1));
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", alignItems: "end", marginBottom: 6 }}>
          <span style={{ ...label, fontSize: 9 }}>Set · hospital</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + span + ",1fr)" }}>
            {days.map(d => (
              <span key={d} style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 9.5, color: d === TODAY ? "var(--accent)" : "var(--faint)", fontWeight: d === TODAY ? 600 : 400 }}>
                {dayDate(d).slice(0, 1)}<br />{Number(d.slice(8))}
              </span>
            ))}
          </div>
        </div>
        {rows.map(l => {
          const t = TONE[STATUS_TONE[l.status]];
          const a = pos(l.dispatchBy!), b = pos(addDays(l.returnBy!, 1));
          return (
            <div key={l.id} className="ix11" onClick={() => openRecord("loanset", l.id)} style={{ display: "grid", gridTemplateColumns: "190px 1fr", alignItems: "center", padding: "5px 0", borderRadius: 8, cursor: "pointer" }}>
              <Two a={<><span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--accent)" }}>{l.id}</span> {l.name}</>} b={hospitalOf(l)} />
              <div style={{ position: "relative", height: 26 }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: pos(TODAY) + (100 / span) / 2 + "%", width: 1.5, background: "var(--accent-line)" }} />
                <div title={"Dispatch " + date(l.dispatchBy!, false) + " · return " + date(l.returnBy!, false)}
                  style={{ position: "absolute", top: 5, height: 16, left: a + "%", width: Math.max(2, b - a) + "%", borderRadius: 6, background: t.bg, border: "1px solid " + t.fg, transformOrigin: "left", animation: "sweep .6s var(--ease) both" }} />
                {l.procedureDate && (
                  <div title={"Procedure " + date(l.procedureDate, false)} style={{ position: "absolute", top: 3, height: 20, width: 20, marginLeft: -10, left: pos(l.procedureDate) + (100 / span) / 2 + "%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 10, height: 10, transform: "rotate(45deg)", background: t.fg, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <Row gap={14} wrap style={{ marginTop: 10, fontSize: 11.5, color: "var(--dim)" }}>
          <span>Bar: dispatch by to return by</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, transform: "rotate(45deg)", background: "var(--dim)", borderRadius: 1.5 }} />Procedure date</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 1.5, height: 12, background: "var(--accent-line)" }} />Today</span>
        </Row>
      </div>
    </div>
  );
}

export default function LoanSets() {
  const s = useHogan();
  const [form, setForm] = useUi<{ set: string; account: string; date: string }>("orders.loanForm", { set: "", account: "", date: addDays(TODAY, 6) });
  const [msg, setMsg] = useState("");
  const sets = s.loanSets;
  const avail = sets.filter(l => l.status === "Available");
  const formSet = form.set && avail.some(l => l.id === form.set) ? form.set : avail[0]?.id || "";
  const formAcc = form.account || "A-HAR";
  const back = sets.filter(l => l.status === "Returned: inspection" || l.status === "Decontamination");
  const out = sets.filter(l => l.status === "Dispatched" || l.status === "At hospital");
  const req = sets.filter(l => l.status === "Requested");

  const cols: Col<D.LoanSet>[] = [
    { key: "set", label: "Set", w: "minmax(190px,1.5fr)", sort: l => l.id, render: l => <Two a={<><span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{l.id}</span> {l.name}</>} b={l.components.map(c => c.n + " " + clean(c.k).toLowerCase()).join(" · ")} /> },
    { key: "hosp", label: "Hospital", w: "minmax(130px,1fr)", sort: l => hospitalOf(l), render: l => (l.requestedBy ? <Two a={hospitalOf(l)} b={l.procedureDate ? "Procedure " + date(l.procedureDate, false) : undefined} /> : <span style={{ color: "var(--faint)" }}>Not allocated</span>) },
    { key: "dates", label: "Out · back", w: "150px", sort: l => l.dispatchBy || "9", render: l => {
      const f = setFlags(l);
      if (!l.dispatchBy) return <span style={{ color: "var(--faint)" }}>No booking</span>;
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{date(l.dispatchBy, false)} · {l.returnBy ? date(l.returnBy, false) : ""}</div>
          {f && <Badge tone={f.tone} style={{ height: 18, padding: "0 6px", fontSize: 10, marginTop: 3 }}>{f.text}</Badge>}
        </div>
      );
    } },
    { key: "loc", label: "Location", w: "112px", sort: l => whereIs(l.location), render: l => whereIs(l.location) },
    { key: "status", label: "Availability · inspection", w: "minmax(170px,1.1fr)", sort: l => l.status, render: l => (
      <div style={{ minWidth: 0 }}>
        <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>
        <div style={{ fontSize: 11.5, marginTop: 3, color: l.inspection === "Inspected & sealed" ? "var(--ok)" : "var(--warn)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.inspection}</div>
      </div>
    ) },
    { key: "act", label: "", w: "176px", align: "right", render: l => <div onClick={e => e.stopPropagation()}><SetAction l={l} onAllocate={() => { setForm({ ...form, set: l.id }); document.getElementById("ls-intake")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} /></div> },
  ];

  const submit = () => {
    if (!formSet) return;
    if (form.date < TODAY) { setMsg("Pick a procedure date from today on."); return; }
    logRequest(formSet, formAcc, form.date);
    setMsg(formSet + " requested for " + accName(formAcc) + ", procedure " + date(form.date, false) + ". Prep task added for John.");
    setForm({ set: "", account: formAcc, date: form.date });
  };

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="Loan sets"
          sub="Instrument sets lent for a procedure: where each set is, when it has to leave, when it comes back and whether it has been inspected. Hospital and procedure date only, no patient details." />

        <div className="hk-kpis">
          <Kpi label="Available and sealed" value={avail.length} sub={avail.map(l => l.id).join(", ") || "none"} tone="ok" />
          <Kpi label="Requested" value={req.length} sub={req.length ? "Next out " + date(req.map(l => l.dispatchBy || "9").sort()[0], false) : "no requests"} tone={req.some(l => (l.dispatchBy || "9") <= TODAY) ? "bad" : req.length ? "warn" : undefined} />
          <Kpi label="Out at hospitals" value={out.length} sub={out.map(l => l.id + " " + whereIs(l.location)).join(" · ") || "none"} />
          <Kpi label="Back for inspection" value={back.length} sub={back.length ? back.map(l => l.id).join(", ") + " · " + plural(back.filter(l => l.inspection !== "Inspected & sealed").length, "check") + " open" : "all inspected"} tone={back.length ? "warn" : "ok"} />
        </div>

        <Card title="Schedule" sub={"Sets booked between " + date(addDays(TODAY, -3), false) + " and " + date(addDays(TODAY, 11), false)}>
          <Schedule sets={sets} />
        </Card>

        <Card title="All loan sets" sub={sets.length + " sets · click a row for contents and history"} flush>
          <Table cols={cols} rows={sets} rowKey={l => l.id} onRow={l => openRecord("loanset", l.id)} minWidth={940} dense />
        </Card>

        <div className="hk-two">
          <Card id="ls-intake" title="Log a request by hand" sub="Hospital and procedure date only. Do not enter patient details.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(170px,100%),1fr))", gap: 10 }}>
              <div>
                <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Set</div>
                <SelectBox value={formSet} onChange={v => setForm({ ...form, set: v })} options={avail.length ? avail.map(l => [l.id, l.id + " · " + l.name] as [string, string]) : [["", "No set available"]]} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Hospital</div>
                <SelectBox value={formAcc} onChange={v => setForm({ ...form, account: v })} options={D.ACCOUNTS.map(a => [a.id, a.name] as [string, string])} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Procedure date</div>
                <TextInput type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} style={{ width: "100%" }} />
              </div>
            </div>
            <Row gap={10} wrap style={{ marginTop: 14 }}>
              <Btn kind="primary" icon={I.plus} disabled={!formSet || !form.date} onClick={submit}>Log request</Btn>
              <span style={{ fontSize: 12, color: msg.startsWith("Pick") ? "var(--bad)" : "var(--dim)" }}>{msg || (formSet ? "Dispatch the day before, return three days after the procedure." : "Every set is out or in inspection.")}</span>
            </Row>
          </Card>
          <Notice tone="info" title="Website request form: future concept">
            Hogan's public website already has a loan-set request form. Feeding those requests straight into this list is a future concept and is not connected; today they are re-keyed here.
            <div style={{ marginTop: 8 }}><Status s="Not connected" /></div>
          </Notice>
        </div>
      </Stack>
    </Page>
  );
}
