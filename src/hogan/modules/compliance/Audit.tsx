/* Compliance · Audit History: an append-only trail built from activity
   events, stock movements and approvals, plus who may approve what. */

import { useMemo, useState } from "react";
import * as D from "../../data";
import { TODAY, addDays } from "../../fmt";
import { openRecord, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Grid, I, Icon, Kpi, Page, PageHeader, Row, SearchBox, Seg, SelectBox, Table, match, type Col, type Tone } from "../../ui";
import { dd } from "../inventory/bits";
import { whereName } from "../inventory/model";
import { RegNotice } from "./common";
import { PERMISSIONS } from "./model";

type Kind = "Activity" | "Movement" | "Approval";
type Entry = { key: string; date: string; time: string; kind: Kind; actor: string; actorId?: string; stream: "people" | "ai" | "data"; title: string; note: string; ref?: string; refType?: string; tone: Tone };
type KindF = "all" | Kind;
type Period = "today" | "7" | "30" | "all";

const nameToId = (name: string) => D.STAFF.find(x => x.name === name)?.id;

export default function Audit() {
  const s = useHogan();
  const [kind, setKind] = useUi<KindF>("compliance.audit.kind", "all");
  const [who, setWho] = useUi("compliance.audit.who", "all");
  const [period, setPeriod] = useUi<Period>("compliance.audit.period", "30");
  const [q, setQ] = useUi("compliance.audit.q", "");
  const [limit, setLimit] = useState(120);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    s.events.forEach(e => out.push({ key: e.id, date: e.date, time: e.time, kind: "Activity", actor: e.actor, actorId: nameToId(e.actor), stream: e.stream, title: e.title, note: e.note, ref: e.ref, refType: e.refType,
      tone: e.stream === "ai" ? "info" : e.stream === "data" ? "neutral" : e.status === "awaiting" ? "warn" : "ok" }));
    s.movements.forEach(m => out.push({ key: m.id, date: m.date, time: m.time, kind: "Movement", actor: D.staffById(m.by)?.name || m.by, actorId: D.staffById(m.by)?.id, stream: "people",
      title: m.type + ": " + m.qty + " × " + m.sku, note: "Lot " + m.lot + (m.serial ? " · SN " + m.serial : "") + " · " + whereName(m.from) + " → " + whereName(m.to) + " · " + m.ref + (m.finRef ? " · " + m.finRef : ""),
      ref: m.id, refType: "movement", tone: "accent" }));
    s.approvals.forEach(a => {
      const req = a.requestedBy.startsWith("agent") ? "Pulse agent" : D.staffById(a.requestedBy)?.name || a.requestedBy;
      out.push({ key: a.id + "-r", date: a.raised, time: "", kind: "Approval", actor: req, actorId: D.staffById(a.requestedBy)?.id, stream: a.requestedBy.startsWith("agent") ? "ai" : "people",
        title: "Requested: " + a.title, note: a.kind + " · approver " + (D.staffById(a.approver)?.name || a.approver), ref: a.ref.id, refType: a.ref.type, tone: "warn" });
      if (a.decidedAt) out.push({ key: a.id + "-d", date: a.decidedAt.slice(0, 10), time: a.decidedAt.slice(11), kind: "Approval", actor: D.staffById(a.decidedBy || "")?.name || a.decidedBy || "", actorId: a.decidedBy,
        stream: "people", title: a.status + ": " + a.title, note: a.kind + " · human decision", ref: a.ref.id, refType: a.ref.type, tone: a.status === "Approved" ? "ok" : "bad" });
    });
    return out.sort((x, y) => (y.date + (y.time || "00:00")).localeCompare(x.date + (x.time || "00:00")));
  }, [s.events, s.movements, s.approvals]);

  const since = period === "today" ? TODAY : period === "all" ? "" : addDays(TODAY, -Number(period));
  const shown = entries.filter(e => (kind === "all" || e.kind === kind)
    && (who === "all" || (who === "agents" ? e.stream === "ai" : who === "systems" ? e.stream === "data" : e.actorId === who))
    && (!since || (period === "today" ? e.date === TODAY : e.date > since))
    && match(q, e.title, e.note, e.actor, e.ref));
  const today = entries.filter(e => e.date === TODAY);
  const people = new Set(today.filter(e => e.stream === "people").map(e => e.actor)).size;
  const decisions = entries.filter(e => e.kind === "Approval" && e.key.endsWith("-d")).length;

  const cols: Col<Entry>[] = [
    { key: "when", label: "When", w: "0.72fr", sort: e => e.date + e.time, render: e => (
      <div style={{ fontVariantNumeric: "tabular-nums" }}>
        <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{e.date === TODAY ? "Today" : dd(e.date, false)}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{e.time || "logged"}</div>
      </div>) },
    { key: "kind", label: "Type", w: "0.72fr", sort: e => e.kind, render: e => <Badge tone={e.tone}>{e.kind === "Activity" ? (e.stream === "ai" ? "Agent" : e.stream === "data" ? "System" : "Activity") : e.kind}</Badge> },
    { key: "who", label: "Who", w: "1.1fr", sort: e => e.actor, render: e => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Avatar id={e.actorId || (e.stream === "ai" ? "agent" : e.actor)} size={22} />
        <span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.actor}</span>
      </span>) },
    { key: "what", label: "What", w: "minmax(200px,3fr)", render: e => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
        <div title={e.note} style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.note}</div>
      </div>) },
    { key: "ref", label: "Record", w: "0.8fr", render: e => e.ref && e.refType && e.refType !== "page"
      ? <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--accent)" }}>{e.ref.split("|").pop()}</span>
      : <span style={{ color: "var(--faint)", fontSize: 12 }}>n/a</span> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Audit History"
        sub="Every action in one append-only trail: people, Pulse agents and system imports, stock movements and approval decisions. Entries are written by actions and cannot be edited or deleted here." />
      <RegNotice compact />

      <Grid min={150} gap={12}>
        <Kpi label="Entries in the trail" value={entries.length.toLocaleString("en-IE")} sub={s.movements.length + " movements · " + s.events.length + " activity"} />
        <Kpi label="Logged today" value={today.length} sub={people + " people acted today"} onClick={() => setPeriod("today")} />
        <Kpi label="Approval decisions" value={decisions} sub={s.approvals.filter(a => a.status === "Awaiting").length + " still awaiting a person"} onClick={() => setKind("Approval")} />
        <Kpi label="Agent actions" value={entries.filter(e => e.stream === "ai").length} sub="Proposals and flags only" onClick={() => setWho("agents")} />
      </Grid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <Card flush pad={14} style={{ flex: "2.4 1 600px", minWidth: 0 }} title={"Trail · " + shown.length + " entries"}
          sub="Newest first. Click an entry to open its record."
          right={<Badge tone="neutral" style={{ gap: 5 }}><Icon d={I.lock} size={11} />Append-only</Badge>}>
          <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Row wrap gap={8}>
              <SearchBox value={q} onChange={v => { setQ(v); setLimit(120); }} placeholder="Search action, person, SKU or reference" style={{ flex: "1 1 240px" }} />
              <SelectBox value={who} onChange={v => { setWho(v); setLimit(120); }} title="Person" options={[["all", "Everyone"], ...D.STAFF.map(x => [x.id, x.name] as [string, string]), ["agents", "Pulse agents"], ["systems", "System imports"]]} />
            </Row>
            <Row wrap gap={8}>
              <Seg<KindF> size="sm" value={kind} onChange={v => { setKind(v); setLimit(120); }} items={[["all", "All"], ["Activity", "Activity"], ["Movement", "Stock movements"], ["Approval", "Approvals"]]} />
              <Seg<Period> size="sm" value={period} onChange={v => { setPeriod(v); setLimit(120); }} items={[["today", "Today"], ["7", "7 days"], ["30", "30 days"], ["all", "All time"]]} />
            </Row>
          </div>
          <Table<Entry> cols={cols} rows={shown.slice(0, limit)} rowKey={e => e.key} dense minWidth={660}
            onRow={e => { if (e.ref && e.refType && e.refType !== "page") openRecord(e.refType, e.ref); }}
            footer={shown.length > limit
              ? <Row gap={10}><span>Showing {limit} of {shown.length}.</span><Btn size="sm" onClick={() => setLimit(limit + 120)}>Show 120 more</Btn></Row>
              : <span>{shown.length} entries. Demo trail: activity before 19 November is seeded demo history.</span>} />
        </Card>

        <Card pad={16} style={{ flex: "1 1 320px", minWidth: 0 }} title="Access and approvals" sub="Who can approve what in this demo. Sensitive actions always need a named person.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {PERMISSIONS.map((p, i) => (
              <div key={p.k} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.k}</span>
                  {p.sensitive && <Badge tone="warn" style={{ gap: 5 }}><Icon d={I.lock} size={10} />Human only</Badge>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                  {p.who.map(id => <span key={id} title={D.staffById(id)?.name + ", " + D.staffById(id)?.role} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--body)", marginRight: 6 }}><Avatar id={id} size={20} />{p.who.length <= 2 ? D.staffById(id)?.name : D.staffById(id)?.first}</span>)}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 5 }}>{p.note}</div>
              </div>
            ))}
            <div style={{ padding: "12px 12px", marginTop: 8, borderRadius: 12, background: "var(--accent-faint)", border: "1px solid var(--accent-line)", display: "flex", gap: 10 }}>
              <Avatar id="agent" size={22} />
              <div style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.5 }}>
                <b style={{ fontWeight: 600, color: "var(--ink)" }}>Pulse agents propose only.</b> They draft transfers, flag exceptions and suggest next steps. They cannot approve, post, pay, close an exception or sign off a document.
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>Demo permission model. A production system would enforce these roles in a validated access-control layer.</div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
