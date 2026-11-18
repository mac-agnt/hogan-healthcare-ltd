/* Compliance · Exceptions: quality exceptions on a three-column board.
   Agents can raise and annotate exceptions; only a named person moves or closes one. */

import { useState } from "react";
import * as D from "../../data";
import { daysAgo } from "../../fmt";
import { nav, openRecord, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Empty, Grid, I, Kpi, Notice, Page, PageHeader, RecLink, Row, Seg, SelectBox } from "../../ui";
import { RegNotice, setQx } from "./common";

type St = D.QualityException["status"];
const COLS: { st: St; title: string; sub: string }[] = [
  { st: "Open", title: "Open", sub: "Raised, not yet being worked" },
  { st: "In review", title: "In review", sub: "Owner investigating" },
  { st: "Closed", title: "Closed", sub: "Closed by a named person" },
];
const SEV_TONE = { High: "bad", Medium: "warn", Low: "neutral" } as const;

export default function Exceptions() {
  const s = useHogan();
  const [kind, setKind] = useUi("compliance.qx.kind", "all");
  const [sev, setSev] = useUi("compliance.qx.sev", "all");
  const [confirm, setConfirm] = useState("");
  const kinds = Array.from(new Set(s.qx.map(q => q.kind)));
  const list = s.qx.filter(q => (kind === "all" || q.kind === kind) && (sev === "all" || q.severity === sev));
  const open = s.qx.filter(q => q.status !== "Closed");
  const closedToday = s.events.filter(e => e.refType === "qx" && e.title.endsWith("Closed") && e.date === D.DEMO.today).length;

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Exceptions"
        sub="Documentation, traceability, expiry, stock, complaint and loan-set exceptions. Each has a named owner; moving or closing one is recorded as a human decision." />
      <RegNotice compact />

      <Grid min={150} gap={12}>
        <Kpi label="Open or in review" value={open.length} tone={open.length ? "warn" : "ok"} sub={open.filter(q => q.status === "In review").length + " in review"} />
        <Kpi label="High severity" value={open.filter(q => q.severity === "High").length} tone={open.some(q => q.severity === "High") ? "bad" : "ok"} sub={open.filter(q => q.severity === "High").map(q => q.id).join(" · ") || "None open"} />
        <Kpi label="Oldest open" value={open.length ? Math.max(...open.map(q => daysAgo(q.raised))) + " days" : "None"} sub={open.slice().sort((a, b) => a.raised.localeCompare(b.raised))[0]?.id || ""} />
        <Kpi label="Closed today" value={closedToday} tone={closedToday ? "ok" : undefined} sub="By a named person" />
      </Grid>

      <Notice tone="info" icon={I.lock} title="Human decision required">
        Pulse agents can raise an exception and suggest the next step. Starting a review, closing or reopening an exception is done by a person and logged with their name. Patient-level data is never attached.
      </Notice>

      <Row wrap gap={8}>
        <Seg<string> size="sm" value={kind} onChange={setKind} items={[["all", "All kinds", s.qx.length], ...kinds.map(k => [k, k, s.qx.filter(q => q.kind === k).length] as [string, string, number])]} />
        <SelectBox value={sev} onChange={setSev} title="Severity" options={[["all", "Any severity"], ["High", "High"], ["Medium", "Medium"], ["Low", "Low"]]} />
      </Row>

      <Grid min={300} gap={14}>
        {COLS.map(c => {
          const items = list.filter(q => q.status === c.st).sort((a, b) => (a.severity === b.severity ? a.raised.localeCompare(b.raised) : ["High", "Medium", "Low"].indexOf(a.severity) - ["High", "Medium", "Low"].indexOf(b.severity)));
          return (
            <div key={c.st} style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, padding: 10, borderRadius: "var(--card-r,18px)", background: "var(--surface-faint)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</span>
                <Badge tone={c.st === "Closed" ? "ok" : c.st === "In review" ? "warn" : "neutral"}>{items.length}</Badge>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{c.sub}</span>
              </div>
              {items.length ? items.map(q => (
                <Card key={q.id} pad={14} onClick={() => openRecord("qx", q.id)} style={{ animation: "fadeUp .3s var(--ease) both" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <Row gap={6} wrap>
                      <Badge tone={SEV_TONE[q.severity]}>{q.severity}</Badge>
                      <Badge>{q.kind}</Badge>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--accent)" }}>{q.id}</span>
                    </Row>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>{q.detail}</div>
                    <Row gap={8} wrap>
                      <Avatar id={q.owner} size={20} />
                      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{D.staffById(q.owner)?.first} · raised {daysAgo(q.raised)}d ago · </span>
                      <span onClick={e => e.stopPropagation()} style={{ fontSize: 11.5 }}><RecLink type={q.refType} id={q.ref} /></span>
                    </Row>
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                      {confirm === q.id ? (
                        <>
                          <span style={{ fontSize: 12, color: "var(--body)", flex: "1 1 100%" }}>Close {q.id} as John Culkin? This is recorded in the audit trail.</span>
                          <Btn size="sm" kind="primary" icon={I.check} onClick={() => { setQx(q.id, "Closed"); setConfirm(""); }}>Confirm close</Btn>
                          <Btn size="sm" kind="ghost" onClick={() => setConfirm("")}>Cancel</Btn>
                        </>
                      ) : q.status === "Open" ? (
                        <>
                          <Btn size="sm" kind="accent" icon={I.arrow} onClick={() => setQx(q.id, "In review")}>Start review as John Culkin</Btn>
                          {q.kind === "Stock" && <Btn size="sm" kind="ghost" onClick={() => nav("Inventory", "counts")}>Stock counts</Btn>}
                          {q.kind === "Documentation" && <Btn size="sm" kind="ghost" onClick={() => nav("Compliance", "docs")}>Documents</Btn>}
                        </>
                      ) : q.status === "In review" ? (
                        <>
                          <Btn size="sm" kind="primary" icon={I.check} onClick={() => setConfirm(q.id)}>Close as John Culkin</Btn>
                          <Btn size="sm" kind="ghost" onClick={() => setQx(q.id, "Open")}>Back to open</Btn>
                        </>
                      ) : (
                        <Btn size="sm" kind="ghost" icon={I.refresh} onClick={() => setQx(q.id, "Open")}>Reopen</Btn>
                      )}
                    </div>
                  </div>
                </Card>
              )) : <Empty title={c.st === "Closed" ? "Nothing closed yet" : "Nothing here"} sub={c.st === "Closed" ? "Exceptions closed by a person appear here." : "No exceptions match the filters."} />}
            </div>
          );
        })}
      </Grid>
    </Page>
  );
}
