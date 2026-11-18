/* Compliance · Quality Documents: fictional document control with a review
   queue. Every review, request or receipt is a named human decision. */

import * as D from "../../data";
import { TODAY, daysUntil, rel } from "../../fmt";
import { openRecord, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, Grid, I, Icon, Kpi, Page, PageHeader, Person, Row, SearchBox, Seg, Table, Timeline, match, type Col } from "../../ui";
import { dd, isBlank, isDate } from "../inventory/bits";
import { RegNotice, docActions, runDocAction, useDocState } from "./common";
import { DOC_RANK, DOC_TONE, allDocs, docProducts, type DocStatus, type DocView } from "./model";

type F = "all" | DocStatus;

export default function Docs() {
  const s = useHogan();
  const [st, setSt] = useDocState();
  const [f, setF] = useUi<F>("compliance.docs.f", "all");
  const [kind, setKind] = useUi("compliance.docs.kind", "all");
  const [q, setQ] = useUi("compliance.docs.q", "");
  const docs = allDocs(st);
  const count = (x: DocStatus) => docs.filter(d => d.status === x).length;
  const queue = docs.filter(d => d.status !== "Current").sort((a, b) => DOC_RANK[a.status] - DOC_RANK[b.status]);
  const kinds = Array.from(new Set(D.QUALITY_DOCS.map(d => d.kind)));
  const shown = docs.filter(d => (f === "all" || d.status === f) && (kind === "all" || d.kind === kind) && match(q, d.id, d.title, d.kind, d.version, D.supplierById(d.supplier || "")?.name));
  const history = s.events.filter(e => e.refType === "doc").slice(0, 8);
  const decidedToday = Object.values(st).filter(o => o.reviewed === TODAY).length;

  const cols: Col<DocView>[] = [
    { key: "id", label: "Ref", w: "0.62fr", sort: d => d.id, render: d => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{d.id}</span> },
    { key: "t", label: "Document", w: "minmax(200px,2.4fr)", sort: d => d.title, render: d => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{d.kind}{d.supplier ? " · " + (D.supplierById(d.supplier)?.name || "") : ""}{docProducts(d.id).length ? " · covers " + docProducts(d.id).length + " device" + (docProducts(d.id).length === 1 ? "" : "s") : ""}</div>
      </div>) },
    { key: "v", label: "Version", w: "0.9fr", render: d => <span style={{ fontSize: 12.5, color: isBlank(d.version) ? "var(--faint)" : "var(--body)" }}>{isBlank(d.version) ? "Not on file" : d.version}</span> },
    { key: "o", label: "Owner", w: "0.9fr", sort: d => d.owner, render: d => <span style={{ fontSize: 12.5 }}>{D.staffById(d.owner)?.name}</span> },
    { key: "r", label: "Reviewed", w: "0.82fr", sort: d => d.reviewed, render: d => <span style={{ fontSize: 12.5, color: isDate(d.reviewed) ? undefined : "var(--faint)" }}>{isDate(d.reviewed) ? dd(d.reviewed, false) : "Never"}</span> },
    { key: "n", label: "Next review", w: "1fr", sort: d => d.nextReview, render: d => {
      if (!isDate(d.nextReview)) return <span style={{ fontSize: 12.5, color: "var(--faint)" }}>Not set</span>;
      const n = daysUntil(d.nextReview);
      return <span style={{ fontSize: 12.5, color: n < 0 ? "var(--bad)" : n <= 60 ? "var(--warn)" : "var(--body)" }}>{dd(d.nextReview, false)}</span>;
    } },
    { key: "s", label: "Status", w: "1fr", sort: d => DOC_RANK[d.status], render: d => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Badge tone={DOC_TONE[d.status]}>{d.status}</Badge>
        {d.requested && <span title={"Requested " + dd(d.requested)} style={{ display: "flex", color: "var(--faint)" }}><Icon d={I.mail} size={13} /></span>}
      </span>) },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Quality Documents"
        sub="SOPs, certificates, declarations of conformity, IFUs and agreements, with review dates and a queue of decisions. Fictional documents and references for the demo." />
      <RegNotice compact />

      <Grid min={140} gap={12}>
        <Kpi label="Documents" value={docs.length} sub={kinds.length + " kinds"} onClick={() => setF("all")} />
        <Kpi label="Current" value={count("Current")} tone="ok" sub={decidedToday ? decidedToday + " decided today" : "In date"} onClick={() => setF("Current")} />
        <Kpi label="Review due" value={count("Review due")} tone={count("Review due") ? "warn" : undefined} sub="Past their review date" onClick={() => setF("Review due")} />
        <Kpi label="Expiring" value={count("Expiring")} tone={count("Expiring") ? "warn" : undefined} sub="Certificates near expiry" onClick={() => setF("Expiring")} />
        <Kpi label="Missing" value={count("Missing")} tone={count("Missing") ? "bad" : "ok"} sub="Not on file" onClick={() => setF("Missing")} />
        <Kpi label="Draft" value={count("Draft")} sub="Awaiting sign-off" onClick={() => setF("Draft")} />
      </Grid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
        <Card pad={14} style={{ flex: "2.2 1 560px", minWidth: 0 }} title={"Needs a decision · " + queue.length} sub="Each action is recorded with the person's name and time. Nothing is sent from the demo.">
          {queue.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 10 }}>
              {queue.map(d => (
                <div key={d.id} style={{ padding: "12px 12px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid " + (d.status === "Missing" ? "var(--bad-soft)" : "var(--border)"), animation: "fadeUp .3s var(--ease) both", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Icon d={I.doc} size={15} color="var(--dim)" style={{ marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div onClick={() => openRecord("doc", d.id)} className="ix3" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", lineHeight: 1.35 }}>{d.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>
                        {d.id} · {d.kind}{isDate(d.nextReview) ? " · " + (daysUntil(d.nextReview) < 0 ? "review was due " + rel(d.nextReview) : (d.kind === "CE certificate" ? "expires " : "review by ") + dd(d.nextReview, false)) : " · not on file"}
                        {d.requested ? " · requested " + rel(d.requested).toLowerCase() : ""}
                      </div>
                    </div>
                    <Badge tone={DOC_TONE[d.status]}>{d.status}</Badge>
                  </div>
                  <Row wrap gap={6} style={{ marginTop: "auto", paddingTop: 10 }}>
                    {docActions(d).map(a => (
                      <Btn key={a.a} size="sm" kind={a.primary ? "primary" : "secondary"} icon={a.a === "request" ? I.mail : I.check} onClick={() => runDocAction(d, a.a, st, setSt)}>{a.label}</Btn>
                    ))}
                  </Row>
                </div>
              ))}
            </div>
          ) : <Empty title="Every document is current" sub="Nothing is waiting for a review decision." />}
        </Card>
        <Card pad={14} style={{ flex: "1 1 300px", minWidth: 0 }} title="Recent document decisions" sub="From the audit trail.">
          {history.length ? (
            <Timeline dense items={history.map(e => ({
              when: (e.date === TODAY ? "Today" : dd(e.date)) + " · " + e.time + " · " + e.actor,
              title: e.title, sub: e.note, tone: e.stream === "ai" ? "info" as const : e.status === "awaiting" ? "warn" as const : "ok" as const,
              onClick: e.ref ? () => openRecord("doc", e.ref!) : undefined,
            }))} />
          ) : <Empty title="No decisions yet today" sub="Reviews, requests and receipts appear here as they are made." icon={I.doc} />}
        </Card>
      </div>

      <Card flush pad={14} title={"Document register · " + shown.length}
        sub="Click a document for its history, the devices it covers and linked exceptions."
        right={<Person id="JC" sub="Quality lead (demo)" size={24} />}>
        <div style={{ padding: "0 14px 12px" }}>
          <Row wrap gap={8}>
            <SearchBox value={q} onChange={setQ} placeholder="Search title, reference, supplier" style={{ flex: "1 1 220px" }} />
            <Seg<string> size="sm" value={kind} onChange={setKind} items={[["all", "All kinds"], ...kinds.map(k => [k, k === "Declaration of conformity" ? "DoC" : k === "CE certificate" ? "CE" : k] as [string, string])]} />
            <Seg<F> size="sm" value={f} onChange={setF} items={[["all", "Any status", docs.length], ["Missing", "Missing", count("Missing")], ["Expiring", "Expiring", count("Expiring")], ["Review due", "Review due", count("Review due")], ["Draft", "Draft", count("Draft")], ["Current", "Current", count("Current")]]} />
          </Row>
        </div>
        <Table<DocView> cols={cols} rows={shown} rowKey={d => d.id} dense minWidth={820} onRow={d => openRecord("doc", d.id)}
          highlight={d => d.status === "Missing"} initialSort={{ key: "s", dir: 1 }}
          footer={<span>Document references are fictional. Demo only: no document management system is connected and nothing is sent to suppliers.</span>} />
      </Card>
    </Page>
  );
}
