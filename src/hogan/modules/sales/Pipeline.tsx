/* Sales · Pipeline: stage board and list, conversion, and the opportunity that needs attention. */

import { useState, type DragEvent } from "react";
import * as D from "../../data";
import { nav, openOpps, openRecord, overdueFollowups, pipelineValue, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Grid, I, Icon, Kpi, Notice, Page, PageHeader, Row, SearchBox, Seg, SelectBox, Table, label, match, type Col } from "../../ui";
import { HBars } from "../../charts";
import { date, daysAgo, eur, eurK } from "../../fmt";
import { OPEN_STAGES, STAGE_PROB, actionText, followTitle, closedOpps, fullName, firstName, isOverdue, neglected, overdueBy, plannedFor, setStage, useWidth, weighted, winRate, dayLabel } from "./lib";
import { DuePill, QuietPill, SchedulePanel } from "./parts";

type View = "board" | "list";

export default function Pipeline() {
  const s = useHogan();
  const [view, setView] = useUi<View>("sales.pipeView", "board");
  const [owner, setOwner] = useUi<string>("sales.pipeOwner", "all");
  const [q, setQ] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [ref, w] = useWidth();
  const open = openOpps(s);
  const overdue = overdueFollowups(s);
  const wr = winRate(s);
  const list = open.filter(o => (owner === "all" || o.owner === owner) && (!onlyOverdue || isOverdue(o)) && match(q, o.title, o.id, o.interest, D.accountById(o.account)?.name));
  const filtered = list.length !== open.length;

  return (
    <Page>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <PageHeader eyebrow="Sales · Pipeline" title="Pipeline"
          sub={open.length + " open opportunities · " + eur(pipelineValue(s)) + " in the pipeline · " + overdue.length + " follow-ups overdue. " + (view === "board" ? "Drag a card to another stage to move it." : "Change a stage inline in the list.")}
          right={<>
            <SearchBox value={q} onChange={setQ} placeholder="Search opportunities" style={{ width: w < 640 ? "100%" : 220 }} />
            <SelectBox title="Owner" value={owner} onChange={setOwner} options={[["all", "All owners"], ...D.SELLERS.map(id => [id, fullName(id) + (D.staffById(id)?.fictional ? " (fictional)" : "")] as [string, string])]} />
            <Seg<View> value={view} onChange={setView} items={[["board", "Board"], ["list", "List"]]} />
          </>} />

        <Grid min={w < 640 ? 140 : 170} gap={10}>
          <Kpi label="Open opportunities" value={open.length} sub={filtered ? list.length + " match the filters" : "Lead to negotiation"} />
          <Kpi label="Pipeline value" demo value={eur(pipelineValue(s))} sub={filtered ? eur(list.reduce((a, o) => a + o.value, 0)) + " shown" : "All open stages"} />
          <Kpi label="Weighted by stage" demo value={eur(weighted(open))} sub="Value × stage probability" />
          <Kpi label="Overdue follow-ups" value={overdue.length} tone={overdue.length ? "warn" : "ok"} sub={eur(overdue.reduce((a, o) => a + o.value, 0)) + " at risk"} onClick={() => nav("Sales", "followups")} />
          <Kpi label="Win rate this quarter" value={wr.rate + "%"} sub={wr.won.length + " won · " + wr.lost.length + " lost"} />
        </Grid>

        <Attention narrow={w < 640} />

        <Row gap={8} wrap>
          <button onClick={() => setOnlyOverdue(!onlyOverdue)} className={onlyOverdue ? undefined : "ixa"}
            style={{ height: 28, padding: "0 11px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: "var(--r-ctl,9px)", cursor: "pointer", fontSize: 12,
              background: onlyOverdue ? "var(--bad-soft)" : "var(--surface-2)", border: "1px solid " + (onlyOverdue ? "var(--bad-soft)" : "var(--border)"), color: onlyOverdue ? "var(--bad)" : "var(--body)" }}>
            <Icon d={I.alert} size={12} />Overdue only <span style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>{overdue.length}</span>
          </button>
          {filtered && <Btn kind="ghost" size="sm" icon={I.x} onClick={() => { setOwner("all"); setQ(""); setOnlyOverdue(false); }}>Clear filters</Btn>}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--faint)" }}>Demo data. Stage probabilities: {OPEN_STAGES.map(st => st + " " + STAGE_PROB[st] + "%").join(" · ")}</span>
        </Row>

        {view === "board" ? <Board list={list} w={w} /> : <ListView list={list} />}

        <div style={{ display: "grid", gridTemplateColumns: w >= 900 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <Sources />
          <Closed />
        </div>
      </div>
    </Page>
  );
}

/* ── The opportunity that most needs attention (Story C) ────────────────── */

function Attention({ narrow }: { narrow: boolean }) {
  const s = useHogan();
  const [scheduling, setScheduling] = useState(false);
  const spot = neglected(null, s)[0];
  if (!spot) return <Notice tone="ok" title="No neglected opportunities">Every open opportunity has had contact in the last two weeks and a current next step.</Notice>;
  const acc = D.accountById(spot.account);
  const p = plannedFor(spot.id, s)[0];
  return (
    <div style={{ padding: "16px 18px", borderRadius: "var(--card-r,18px)", background: "var(--surface)", border: "1px solid var(--warn-soft)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ width: 34, height: 34, flex: "none", borderRadius: 11, background: "var(--warn-soft)", color: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={I.alert} size={17} /></span>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Row gap={8} wrap>
            <span style={{ ...label, color: "var(--accent)" }}>Sales Agent · needs attention</span>
            {isOverdue(spot) && <Badge tone="bad">Follow-up overdue {overdueBy(spot)} days</Badge>}
            <Badge tone={daysAgo(spot.lastActivity) >= 14 ? "bad" : "warn"}>Last activity {daysAgo(spot.lastActivity)} days ago</Badge>
          </Row>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px", marginTop: 7, color: "var(--ink)" }}>{acc?.name}: {spot.title}</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4, lineHeight: 1.55 }}>
            {eur(spot.value)} · owner {fullName(spot.owner)} · {spot.stage} · last activity {date(spot.lastActivity, false)} · next action "{actionText(spot.nextAction)}" was due {date(spot.nextDue, false)}.
            {p ? " " + firstName(p.rep) + " has a follow-up planned " + (dayLabel(p.date) === "Today" ? "today" : dayLabel(p.date)) + " at " + p.time + "." : " No follow-up is planned yet."}
          </div>
        </div>
        <Row gap={8} wrap style={{ flex: narrow ? "1 1 100%" : "none" }}>
          <Btn size="sm" onClick={() => openRecord("opp", spot.id)}>Open opportunity</Btn>
          <Btn size="sm" icon={I.calendar} onClick={() => setScheduling(!scheduling)}>{scheduling ? "Close" : "Schedule follow-up"}</Btn>
          <Btn kind="accent" size="sm" icon={I.arrow} onClick={() => nav("Sales", "planner", { "sales.planRep": spot.owner, "sales.planWeek": "this" })}>{firstName(spot.owner)}'s week</Btn>
        </Row>
      </div>
      {scheduling && <SchedulePanel key={spot.id} title={followTitle(spot)} rep={spot.owner} account={spot.account} opp={spot.id} priority="High" note={"Scheduled from the pipeline. Quiet " + daysAgo(spot.lastActivity) + " days."} onDone={() => setScheduling(false)} onCancel={() => setScheduling(false)} />}
    </div>
  );
}

/* ── Board ──────────────────────────────────────────────────────────────── */

const STAGE_TONE: Record<string, string> = {
  Lead: "var(--faint)", Qualified: "var(--info,#7FB8C9)", "Product Discussion": "var(--accent)", "Clinical Evaluation": "var(--warn)", Quotation: "var(--ok)", Negotiation: "var(--ok)",
};

function Board({ list, w }: { list: D.Opportunity[]; w: number }) {
  const s = useHogan();
  const spot = neglected(null, s)[0]?.id;
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const cols = w >= 1000 ? "repeat(6,minmax(0,1fr))" : w >= 620 ? "repeat(3,minmax(0,1fr))" : "minmax(0,1fr)";
  const drop = (stage: D.Stage) => (e: DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || drag; setOver(null); setDrag(null); if (id) setStage(id, stage); };
  const zone = (stage: string) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== stage) setOver(stage); },
    onDragLeave: () => setOver(o => (o === stage ? null : o)),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10, alignItems: "start" }}>
        {OPEN_STAGES.map(stage => {
          const items = list.filter(o => o.stage === stage).sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || b.value - a.value);
          const hot = over === stage;
          return (
            <div key={stage} {...zone(stage)} onDrop={drop(stage)}
              style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: 8, borderRadius: 16, background: hot ? "var(--accent-faint)" : "var(--surface-faint)",
                border: "1px " + (hot ? "dashed var(--accent-line)" : "solid var(--border)"), transition: "background .15s var(--ease),border-color .15s var(--ease)", minHeight: 120 }}>
              <div style={{ padding: "4px 4px 2px" }}>
                <Row gap={6}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: STAGE_TONE[stage], flex: "none" }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{items.length}</span>
                </Row>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{eur(items.reduce((a, o) => a + o.value, 0))} · {STAGE_PROB[stage]}%</div>
              </div>
              {items.map(o => <OppCard key={o.id} o={o} spot={o.id === spot} dragging={drag === o.id} onDrag={setDrag} />)}
              {items.length === 0 && <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "10px 6px", textAlign: "center" }}>{hot ? "Drop to move here" : "No opportunities"}</div>}
            </div>
          );
        })}
      </div>
      <ClosedDrop drag={drag} over={over} zone={zone} drop={drop} />
    </div>
  );
}

function OppCard({ o, spot, dragging, onDrag }: { o: D.Opportunity; spot: boolean; dragging: boolean; onDrag: (id: string | null) => void }) {
  const acc = D.accountById(o.account);
  const late = isOverdue(o);
  const quiet = daysAgo(o.lastActivity);
  const flag = spot;
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData("text/plain", o.id); e.dataTransfer.effectAllowed = "move"; onDrag(o.id); }} onDragEnd={() => onDrag(null)}
      onClick={() => openRecord("opp", o.id)} className="ixx" title={o.title + " · " + (acc?.name || "") + " · drag to change stage"}
      style={{ padding: "10px 10px 9px", borderRadius: 12, background: flag ? "var(--bad-soft)" : "var(--surface)", border: "1px solid " + (flag ? "var(--bad)" : late && quiet >= 14 ? "var(--bad-soft)" : late ? "var(--warn-soft)" : "var(--border)"),
        cursor: "grab", display: "flex", flexDirection: "column", gap: 7, opacity: dragging ? 0.45 : 1, transition: "transform .18s var(--ease),border-color .18s var(--ease),opacity .15s" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.title}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc?.name}</div>
      <Row gap={6}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{eurK(o.value)}</span>
        <Avatar id={o.owner} size={20} />
      </Row>
      <Row gap={5} wrap>
        {flag && <Badge tone="bad" title="Flagged by the Sales Agent">Needs attention</Badge>}
        <QuietPill since={o.lastActivity} />
        {late && <Badge tone="bad">Overdue {overdueBy(o)}d</Badge>}
      </Row>
    </div>
  );
}

function ClosedDrop({ drag, over, zone, drop }: { drag: string | null; over: string | null; zone: (s: string) => object; drop: (s: D.Stage) => (e: DragEvent) => void }) {
  const s = useHogan();
  const wr = winRate(s);
  const box = (stage: "Won" | "Lost", n: number, v: number, recent: D.Opportunity[]) => {
    const hot = over === stage;
    const tone = stage === "Won" ? "ok" : "bad";
    return (
      <div {...zone(stage)} onDrop={drop(stage)}
        style={{ flex: "1 1 260px", minWidth: 0, padding: "12px 14px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          background: hot ? "var(--" + tone + "-soft)" : "var(--surface-faint)", border: "1px " + (drag ? "dashed var(--" + tone + ")" : "solid var(--border)"), transition: "background .15s var(--ease)" }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--" + tone + "-soft)", color: "var(--" + tone + ")", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon d={stage === "Won" ? I.check : I.x} size={14} stroke={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{drag ? "Drop to mark " + stage.toLowerCase() : stage + " this quarter"}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n} · {eur(v)} · latest {recent.map(o => D.accountById(o.account)?.name.split(" ")[0]).join(", ")}</div>
        </div>
      </div>
    );
  };
  return (
    <Row gap={10} wrap align="stretch">
      {box("Won", wr.won.length, wr.wonValue, wr.won.slice().sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)).slice(0, 3))}
      {box("Lost", wr.lost.length, wr.lostValue, wr.lost.slice().sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)).slice(0, 3))}
      <div style={{ flex: "0 1 200px", padding: "12px 14px", borderRadius: 14, background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
        <div style={label}>Conversion this quarter</div>
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, letterSpacing: "-.5px" }}>{wr.rate}%</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)" }}>by count · {Math.round((wr.wonValue / Math.max(1, wr.wonValue + wr.lostValue)) * 100)}% by value</div>
      </div>
    </Row>
  );
}

/* ── List ───────────────────────────────────────────────────────────────── */

function ListView({ list }: { list: D.Opportunity[] }) {
  const cols: Col<D.Opportunity>[] = [
    { key: "title", label: "Opportunity", w: "minmax(220px,2.2fr)", sort: o => o.title, render: o => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", fontFamily: "var(--mono)" }}>{o.id} · {o.interest}</div>
      </div>) },
    { key: "account", label: "Account", w: "minmax(140px,1.2fr)", sort: o => D.accountById(o.account)?.name || "", render: o => <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{D.accountById(o.account)?.name}</span> },
    { key: "stage", label: "Stage", w: "184px", sort: o => OPEN_STAGES.indexOf(o.stage as typeof OPEN_STAGES[number]), render: o => (
      <span onClick={e => e.stopPropagation()}>
        <SelectBox<D.Stage> title="Move stage" value={o.stage} onChange={v => setStage(o.id, v)} style={{ height: 30, fontSize: 12, width: "100%" }}
          options={[...OPEN_STAGES.map(st => [st, st] as [D.Stage, string]), ["Won", "Won (close)"], ["Lost", "Lost (close)"]]} />
      </span>) },
    { key: "value", label: "Value", w: "96px", align: "right", mono: true, sort: o => o.value, render: o => <span style={{ color: "var(--ink)" }}>{eur(o.value)}</span> },
    { key: "owner", label: "Owner", w: "minmax(110px,.9fr)", sort: o => o.owner, render: o => <Row gap={7}><Avatar id={o.owner} size={20} /><span>{firstName(o.owner)}</span></Row> },
    { key: "last", label: "Last activity", w: "110px", sort: o => -daysAgo(o.lastActivity), render: o => <QuietPill since={o.lastActivity} /> },
    { key: "next", label: "Next action", w: "minmax(200px,1.8fr)", sort: o => o.nextDue, render: o => (
      <div style={{ minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{actionText(o.nextAction)}</div>
        <div style={{ marginTop: 3 }}><DuePill o={o} /></div>
      </div>) },
  ];
  return (
    <Card flush pad={0}>
      <Table cols={cols} rows={list} rowKey={o => o.id} onRow={o => openRecord("opp", o.id)} initialSort={{ key: "next", dir: 1 }} minWidth={1040}
        footer={list.length + " opportunities · " + eur(list.reduce((a, o) => a + o.value, 0)) + " · weighted " + eur(weighted(list)) + ". Click a row for details; change the stage inline."} />
    </Card>
  );
}

/* ── Sources and closed deals ───────────────────────────────────────────── */

function Sources() {
  const s = useHogan();
  const open = openOpps(s);
  const rows = D.LEAD_SOURCES.map(ls => {
    const mine = open.filter(o => o.source === ls.source);
    return { ...ls, open: mine.length, value: mine.reduce((a, o) => a + o.value, 0) };
  }).sort((a, b) => b.value - a.value);
  return (
    <Card title="Where the open pipeline comes from" sub="Open value by lead source, with year-to-date lead conversion (demo)">
      <HBars data={rows.map(r => ({ label: r.source, value: r.value, right: eur(r.value), sub: r.open + " open · " + r.won + "/" + r.leads + " won YTD" }))} />
    </Card>
  );
}

function Closed() {
  const s = useHogan();
  const list = closedOpps(s).slice().sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  return (
    <Card title="Closed this quarter" sub={list.length + " opportunities · click one for its history"} flush pad={16}>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {list.map(o => (
          <div key={o.id} className="ix11" onClick={() => openRecord("opp", o.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: "pointer", borderTop: "1px solid var(--border)" }}>
            <Badge tone={o.stage === "Won" ? "ok" : "bad"} style={{ width: 46, justifyContent: "center" }}>{o.stage}</Badge>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{D.accountById(o.account)?.name} · {firstName(o.owner)} · {date(o.lastActivity, false)}</span>
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink)" }}>{eur(o.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
