/* Compliance record drawers: quality document ("doc") and exception ("qx"). */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, daysAgo, daysUntil, rel } from "../../fmt";
import { nav, openRecord, useHogan } from "../../store";
import { Badge, Btn, Empty, I, Icon, KV, Notice, Person, RecLink, RecordHead, RecordSection, Row, Steps, Timeline } from "../../ui";
import { dd, isBlank, isDate } from "../inventory/bits";
import { docActions, runDocAction, setQx, useDocState } from "./common";
import { DOC_TONE, docProducts, docView } from "./model";

export function DocRecord({ id }: { id: string }) {
  const s = useHogan();
  const [st, setSt] = useDocState();
  const base = D.QUALITY_DOCS.find(d => d.id === id);
  if (!base) return <Empty title="Document not found" sub={id} />;
  const d = docView(base, st);
  const products = docProducts(id);
  const sup = d.supplier ? D.supplierById(d.supplier) : undefined;
  const qx = s.qx.filter(q => q.ref === id || (q.refType === "doc" && q.detail.includes(id)));
  const history = s.events.filter(e => e.ref === id);
  const tasks = s.tasks.filter(t => t.related?.id === id);
  const next = isDate(d.nextReview) ? daysUntil(d.nextReview) : null;
  const units = s.stock.filter(l => l.qty > 0 && products.some(p => p.sku === l.sku)).reduce((a, l) => a + l.qty, 0);

  return (
    <div>
      <RecordHead kind={"Quality document · " + d.kind} title={d.title} sub={<span><span style={{ fontFamily: "var(--mono)" }}>{d.id}</span> · fictional document for the demo</span>}
        right={<Badge tone={DOC_TONE[d.status]}>{d.status}</Badge>} />

      <KV cols={3} style={{ marginTop: 16 }} items={[
        ["Version", isBlank(d.version) ? "Not on file" : d.version],
        ["Owner", D.staffById(d.owner)?.name || d.owner],
        ["Supplier", sup ? <RecLink type="supplier" id={sup.id}>{sup.name}</RecLink> : "Internal"],
        ["Last reviewed", isDate(d.reviewed) ? dd(d.reviewed) : "Never"],
        ["Next review", isDate(d.nextReview) ? dd(d.nextReview) : "Not set"],
        ["Due", next === null ? "Not on file" : next < 0 ? Math.abs(next) + " days overdue" : "in " + next + " days"],
      ]} />
      {d.requested && <Notice tone="info" style={{ marginTop: 10 }}>Update requested {rel(d.requested).toLowerCase()} ({dd(d.requested)}). Demo only: nothing is sent.</Notice>}

      <RecordSection title="Decision">
        <Row wrap gap={8}>
          {docActions(d).map(a => <Btn key={a.a} size="sm" kind={a.primary ? "primary" : "secondary"} icon={a.a === "request" ? I.mail : I.check} onClick={() => runDocAction(d, a.a, st, setSt)}>{a.label}</Btn>)}
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Recorded as a human decision with name and time. Pulse agents can flag a review date, never sign one off.</div>
      </RecordSection>

      {products.length > 0 && (
        <RecordSection title={"Covers " + products.length + " device" + (products.length === 1 ? "" : "s") + " · " + units + " units in custody"}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {products.slice(0, 18).map(p => (
              <button key={p.sku} onClick={() => openRecord("product", p.sku)} className="ixa" title={p.name}
                style={{ height: 26, padding: "0 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--body)", fontFamily: "var(--mono)", fontSize: 11.5, cursor: "pointer" }}>{p.sku}</button>
            ))}
            {products.length > 18 && <span style={{ fontSize: 12, color: "var(--faint)", alignSelf: "center" }}>+{products.length - 18} more</span>}
          </div>
        </RecordSection>
      )}

      {qx.length > 0 && (
        <RecordSection title="Linked exceptions">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {qx.map(q => (
              <div key={q.id} onClick={() => openRecord("qx", q.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", fontSize: 12.5 }}>
                <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{q.id}</span>
                <span style={{ flex: 1 }}>{q.title}</span>
                <Badge tone={q.status === "Closed" ? "ok" : q.status === "In review" ? "warn" : "bad"}>{q.status}</Badge>
              </div>
            ))}
          </div>
        </RecordSection>
      )}

      {tasks.length > 0 && (
        <RecordSection title="Follow-up tasks">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map(t => (
              <div key={t.id} onClick={() => openRecord("task", t.id)} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", fontSize: 12.5 }}>
                <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{t.id}</span>
                <span style={{ flex: 1 }}>{t.title}</span>
                <Person id={t.owner} sub={t.status} size={20} />
              </div>
            ))}
          </div>
        </RecordSection>
      )}

      <RecordSection title="Document history">
        <Timeline dense items={[
          ...history.map(e => ({ when: (e.date === TODAY ? "Today" : dd(e.date)) + " · " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: e.stream === "ai" ? "info" as const : "ok" as const })),
          ...(isDate(base.reviewed) ? [{ when: dd(base.reviewed), title: "Reviewed, version " + base.version, sub: "By " + (D.staffById(base.owner)?.name || base.owner) + " (seeded demo history)", tone: "neutral" as const }] : [{ when: "Not on file", title: "No copy held", sub: "Requested from the supplier. See linked exceptions.", tone: "bad" as const }]),
        ]} />
      </RecordSection>
    </div>
  );
}

const STEP: Record<D.QualityException["status"], number> = { Open: 0, "In review": 1, Closed: 2 };

export function QxRecord({ id }: { id: string }) {
  const s = useHogan();
  const [confirm, setConfirm] = useState(false);
  const q = s.qx.find(x => x.id === id);
  if (!q) return <Empty title="Exception not found" sub={id} />;
  const history = s.events.filter(e => e.ref === id);
  const step = STEP[q.status];
  const go: Record<string, () => void> = {
    Stock: () => nav("Inventory", "counts"),
    Expiry: () => nav("Inventory", "live", { "inventory.live.status": "Expiring" }),
    Documentation: () => nav("Compliance", "docs"),
    Traceability: () => nav("Compliance", "udi"),
    Complaint: () => nav("Orders", "returns"),
    "Loan set": () => nav("Orders", "loansets"),
  };

  return (
    <div>
      <RecordHead kind={"Quality exception · " + q.kind} title={q.title} sub={<span><span style={{ fontFamily: "var(--mono)" }}>{q.id}</span> · raised {dd(q.raised)} ({daysAgo(q.raised)} days ago)</span>}
        right={<Badge tone={q.severity === "High" ? "bad" : q.severity === "Medium" ? "warn" : "neutral"}>{q.severity}</Badge>} />

      <div style={{ marginTop: 16 }}>
        <Steps steps={[{ label: "Open", done: step > 0, active: step === 0 }, { label: "In review", done: step > 1, active: step === 1 }, { label: "Closed", done: step === 2, active: step === 2 }]} />
      </div>

      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.55 }}>{q.detail}</div>

      <KV cols={3} style={{ marginTop: 12 }} items={[
        ["Owner", <Person id={q.owner} size={20} />],
        ["Kind", q.kind],
        ["Reference", <RecLink type={q.refType} id={q.ref} />],
      ]} />

      <RecordSection title="Decision">
        {confirm ? (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--accent-line)", background: "var(--accent-faint)" }}>
            <div style={{ fontSize: 13 }}>Close {q.id} as John Culkin? The decision is written to the audit trail with name and time.</div>
            <Row gap={8} style={{ marginTop: 10 }}>
              <Btn size="sm" kind="primary" icon={I.check} onClick={() => { setQx(q.id, "Closed"); setConfirm(false); }}>Confirm close</Btn>
              <Btn size="sm" kind="ghost" onClick={() => setConfirm(false)}>Cancel</Btn>
            </Row>
          </div>
        ) : (
          <Row wrap gap={8}>
            {q.status === "Open" && <Btn size="sm" kind="accent" icon={I.arrow} onClick={() => setQx(q.id, "In review")}>Start review as John Culkin</Btn>}
            {q.status === "In review" && <Btn size="sm" kind="primary" icon={I.check} onClick={() => setConfirm(true)}>Close as John Culkin</Btn>}
            {q.status !== "Open" && <Btn size="sm" kind="ghost" icon={I.refresh} onClick={() => setQx(q.id, "Open")}>{q.status === "Closed" ? "Reopen" : "Back to open"}</Btn>}
            {go[q.kind] && <Btn size="sm" kind="secondary" icon={I.external} onClick={go[q.kind]}>Go to the work</Btn>}
          </Row>
        )}
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <Icon d={I.lock} size={12} />Human decision. Agents can raise and annotate exceptions; they cannot close them. No patient data is attached.
        </div>
      </RecordSection>

      <RecordSection title="History">
        <Timeline dense items={[
          ...history.map(e => ({ when: (e.date === TODAY ? "Today" : dd(e.date)) + " · " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: "ok" as const })),
          { when: dd(q.raised), title: "Raised", sub: "Owner " + (D.staffById(q.owner)?.name || q.owner) + " (seeded demo history)", tone: "warn" as const },
        ]} />
      </RecordSection>
    </div>
  );
}
