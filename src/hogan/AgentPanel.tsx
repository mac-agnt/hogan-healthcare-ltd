/* The right-hand panel on the Agents page: what the selected agent is for,
   what it is connected to, what it sees right now, what it recommends, the
   drafts waiting for a person, and its recent history. Everything reads live
   demo state, so it changes as the demo moves. Agents only ever propose. */

import { type ReactNode } from "react";
import * as D from "./data";
import * as S from "./store";
import { daysAgo, eur } from "./fmt";
import { Badge, Btn, I, Icon, Progress, label, type Tone } from "./ui";

type Obs = { text: ReactNode; tone: Tone; go?: () => void };
type Draft = { title: string; detail: string; cta: string; run: () => void; done?: boolean; doneLabel?: string };
type Spec = { purpose: string; connected: [string, string, string][]; obs: Obs[]; recs: string[]; drafts: Draft[]; evidence: { k: string; v: number; note: string }[]; actor: string; noteKey?: string };

function spec(id: string, s: S.HState): Spec {
  const lows = S.lowSiteLines(s);
  const fu = S.overdueFollowups(s);
  const ov = S.overdueInvoices(s);
  const so = S.orderById("SO-1047", s)!;
  const prog = S.orderProgress(so);
  const tr = s.transfers.find(t => t.sku === "HH-OR-204" && t.to === "HAR" && t.status !== "Rejected");
  const harbour = s.stock.filter(l => l.sku === "HH-OR-204" && l.loc === "HAR").reduce((a, l) => a + l.qty, 0);
  const bill = s.bills.find(b => b.id === "BILL-2034")!;
  const recs = S.reorderRecs(s);
  const qxOpen = s.qx.filter(q => q.status !== "Closed");
  const propsAC = s.proposals.filter(p => p.rep === "AC");
  switch (id) {
    case "stock": return {
      actor: "Stock & Traceability Agent", noteKey: "stock",
      purpose: "Keeps hospital consignment stock at par, watches expiring lots and count variances, and can show where any lot went.",
      connected: [["location", "HAR", "Harbour"], ["product", "HH-OR-204", "HH-OR-204"], ["lot", "HH-OR-204|L2603-204A", "Lot L2603-204A"], ["location", "DLM", "Main stockroom"]],
      obs: [
        ...lows.map(l => ({ text: <>{D.locById(l.line.loc)?.short}: {l.line.sku} at {l.line.qty}, par {l.line.min}{l.pending ? " · " + l.pending.id + " awaiting John" : ""}</>, tone: (l.line.sku === "HH-OR-204" ? "warn" : "info") as Tone, go: () => S.openRecord("product", l.line.sku) })),
        ...(harbour >= 6 ? [{ text: <>Harbour back to {harbour} on HH-OR-204 after {tr?.id}</>, tone: "ok" as Tone, go: () => tr && S.openRecord("transfer", tr.id) }] : []),
        ...S.expiringLines(60, s).slice(0, 2).map(l => ({ text: <>{D.locById(l.loc)?.short}: lot {l.lot} expires {l.expiry}</>, tone: "neutral" as Tone, go: () => S.openRecord("lot", l.sku + "|" + l.lot) })),
        ...s.stock.filter(l => l.status === "Verify").map(l => ({ text: <>{D.locById(l.loc)?.short}: count variance on {l.sku}</>, tone: "bad" as Tone, go: () => S.nav("Inventory", "counts") })),
      ],
      recs: ["Top up Harbour with 3 × HH-OR-204 from lot L2609-204B (first to expire, Aug 2031).", "Swap Riverpark's short-dated probes for central stock before 31 Dec.", "Recount HH-SM-114 at Eastgate with the practice manager present."],
      drafts: [{ title: "Transfer 3 × HH-OR-204 to Harbour", detail: "Main stockroom 6 → 3 · Harbour 4 → 7. Needs John Culkin's approval.",
        cta: tr ? (tr.status === "Completed" ? "Done" : "Approve as John") : "Raise transfer", done: tr?.status === "Completed", doneLabel: tr?.id + " completed",
        run: () => { if (!tr) S.proposeTransfer({ sku: "HH-OR-204", to: "HAR", qty: 3, by: "agent:stock" }); else if (tr.status === "Awaiting approval") S.approveTransfer(tr.id, "JC"); } }],
      evidence: [{ k: "Usage signal", v: 0.9, note: "2 used at Harbour since 9 Oct" }, { k: "Stock accuracy", v: 0.82, note: "1 open count variance" }],
    };
    case "sales": return {
      actor: "Sales Agent",
      purpose: "Prioritises follow-ups, spots opportunities and accounts that have gone quiet, and drafts each rep's week for approval.",
      connected: [["opp", "OPP-301", "Pinewood €16,800"], ["opp", "OPP-303", "Lakeside €13,400"], ["staff", "AC", "Aileen Cahalane"], ["account", "A-PIN", "Pinewood Orthopaedics"]],
      obs: [
        { text: <>{fu.length} overdue follow-ups worth {eur(fu.reduce((a, o) => a + o.value, 0))}</>, tone: fu.length ? "warn" : "ok", go: () => S.nav("Sales", "followups") },
        ...fu.slice(0, 3).map(o => ({ text: <>{D.accountById(o.account)?.name}: {eur(o.value)}, quiet {daysAgo(o.lastActivity)} days</>, tone: "info" as Tone, go: () => S.openRecord("opp", o.id) })),
        { text: <>{S.quietOpps(14, s).length} opportunities with no activity for two weeks or more</>, tone: "neutral", go: () => S.nav("Sales", "pipeline") },
      ],
      recs: ["Aileen calls Pinewood today: the evaluation feedback is 19 days old.", "Rory rebooks the Lakeside quote call missed on Monday.", "Clodagh moves Ardmore's pricing call to Friday morning."],
      drafts: [{ title: "Draft Aileen's week (w/c 23 Nov)", detail: propsAC.length ? propsAC.length + " suggested activities waiting in the Weekly Planner." : "Builds a proposed Mon to Fri plan from her overdue follow-ups and quiet accounts.",
        cta: propsAC.length ? "Review in planner" : "Draft plan", run: () => { if (!propsAC.length) S.generatePlan("AC", D.DEMO.nextWeekStart); S.nav("Sales", "planner", { "sales.rep": "AC", "sales.week": D.DEMO.nextWeekStart }); } }],
      evidence: [{ k: "Follow-up data", v: 0.92, note: "every opportunity has a next step" }, { k: "Visit logging", v: 0.7, note: "3 visits not logged this week" }],
    };
    case "orders": return {
      actor: "Order Flow Agent",
      purpose: "Finds incomplete orders, missing scans and dispatch bottlenecks before they miss a courier.",
      connected: [["order", "SO-1047", "SO-1047"], ["order", "SO-1023", "SO-1023"], ["order", "SO-1024", "SO-1024"], ["staff", "SO", "Sharon O'Mongain"]],
      obs: [
        { text: <>SO-1047: {prog.scanned}/{prog.total} lines scanned{prog.scanned === prog.total ? " · ready" : ""}</>, tone: prog.scanned === prog.total ? "ok" : "bad", go: () => S.nav("Orders", "picking", { "orders.pick": "SO-1047" }) },
        { text: <>{s.orders.filter(o => o.status === "Picking").length} orders picking · {s.orders.filter(o => o.status === "Packed").length} packed · {s.orders.filter(o => o.status === "Awaiting courier").length} awaiting courier</>, tone: "info", go: () => S.nav("Orders", "dispatch") },
        { text: <>{s.orders.filter(o => o.status === "Issue").length} orders with an issue</>, tone: "warn", go: () => S.nav("Orders", "dispatch") },
      ],
      recs: ["Finish SO-1047's two scans before 15:00 to make the 16:00 courier.", "Book the 12:00 collection for the four packed orders.", "Chase South Dublin's purchasing for SO-1023's PO number."],
      drafts: [{ title: "Finish SO-1047", detail: "Arthrosamid pack needs lot and expiry; battery pack needs a serial. Sharon scans them.", cta: prog.scanned === prog.total ? "Open order" : "Open picking", done: prog.scanned === prog.total, doneLabel: "All lines scanned",
        run: () => S.nav("Orders", "picking", { "orders.pick": "SO-1047" }) }],
      evidence: [{ k: "Scan coverage", v: 0.86, note: "lot and serial captured on scanned lines" }, { k: "Courier data", v: 0.6, note: "courier status entered by hand" }],
    };
    case "finance": return {
      actor: "Finance Agent", noteKey: "finance",
      purpose: "Reviews unpaid invoices, bank matches, margins and anomalies. Drafts reminders and tasks; never posts, pays or approves.",
      connected: [["invoice", "INV-6128", "INV-6128"], ["bill", "BILL-2034", "BILL-2034"], ["staff", "MD", "Margaret Duff"], ["account", "A-HAR", "Harbour"]],
      obs: [
        { text: <>{ov.length} invoices overdue, {eur(S.overdueTotal(s))}</>, tone: "warn", go: () => S.nav("Finance", "ar") },
        { text: <>BILL-2034: billed 14, ordered and received 12 ({bill.status})</>, tone: bill.status === "Under review" ? "info" : "bad", go: () => S.openRecord("bill", "BILL-2034") },
        { text: <>{s.bank.filter(b => b.state === "Suggested match").length} bank lines with a suggested match</>, tone: "info", go: () => S.nav("Finance", "recon") },
      ],
      recs: ["Margaret sends the INV-6128 reminder to Harbour's accounts team.", "Ask Aquila for a credit note of €580 and hold that part of BILL-2034.", "Confirm the Blackrock payment against INV-6097."],
      drafts: [
        { title: "Review task for BILL-2034", detail: "Creates Margaret's task and a hold for Graham to approve. No financial posting.", cta: bill.status === "Under review" ? "Open bill" : "Create task", done: bill.status === "Under review", doneLabel: "Review task created",
          run: () => { if (bill.status !== "Under review") S.createBillReviewTask("BILL-2034"); else S.openRecord("bill", "BILL-2034"); } },
        { title: "Reminder for INV-6128", detail: "Drafted for Margaret. Pulse does not send it.", cta: "Open invoice", run: () => S.openRecord("invoice", "INV-6128") },
      ],
      evidence: [{ k: "Ledger data", v: 0.55, note: "accounting integration not yet verified" }, { k: "Bank feed", v: 0.45, note: "partial feed, demo" }],
    };
    case "purchasing": return {
      actor: "Purchasing Agent", noteKey: "purchasing",
      purpose: "Suggests purchase orders and stock transfers from real stock needs, and checks each bill against its order and receipt.",
      connected: [["po", "PO-341", "PO-341"], ["po", "PO-337", "PO-337"], ["po", "PO-333", "PO-333"], ["supplier", "HAL", "Halcyon"]],
      obs: [
        { text: <>{recs.length} central lines below reorder point</>, tone: recs.length ? "warn" : "ok", go: () => S.nav("Purchasing", "reorder") },
        { text: <>PO-341 waiting on Graham ({eur(D.poValue(s.pos.find(p => p.id === "PO-341")!))})</>, tone: "info", go: () => S.openRecord("po", "PO-341") },
        { text: <>PO-333 late: 2 tibial nails outstanding</>, tone: "bad", go: () => S.openRecord("po", "PO-333") },
      ],
      recs: recs.slice(0, 3).map(r => "Order " + r.suggested + " × " + r.product.sku + " from " + r.supplier.name + " (" + eur(r.cost) + ")."),
      drafts: [{ title: "Purchase orders from reorder list", detail: recs.length + " lines grouped by supplier. Over €5,000 goes to Graham.", cta: "Open reorder list", run: () => S.nav("Purchasing", "reorder") }],
      evidence: [{ k: "Lead times", v: 0.8, note: "from the last 12 months of receipts" }, { k: "Demand", v: 0.74, note: "usage plus open orders" }],
    };
    case "quality": return {
      actor: "Quality & Compliance Agent",
      purpose: "Highlights missing documents, traceability gaps and audit work. Flags only: every regulatory decision is a person's.",
      connected: [["qx", "QX-031", "QX-031"], ["doc", "QD-009", "QD-009"], ["grn", "GRN-0412", "GRN-0412"], ["doc", "QD-002", "SOP-QA-11"]],
      obs: qxOpen.slice(0, 4).map(q => ({ text: <>{q.title}</>, tone: (q.severity === "High" ? "bad" : q.severity === "Medium" ? "warn" : "neutral") as Tone, go: () => S.openRecord("qx", q.id) })),
      recs: ["Chase Nordfix for the two declarations of conformity before more stock ships.", "Second-person check on GRN-0412's hand-keyed lots.", "Run a simulated drill on HH-OR-204 lot L2603-204A to exercise SOP-QA-11."],
      drafts: [{ title: "Simulated traceability drill", detail: "HH-OR-204 lot L2603-204A. Exercise only: no recall exists.", cta: "Open drill", run: () => S.nav("Inventory", "trace") }],
      evidence: [{ k: "Document coverage", v: 0.88, note: "2 SKUs missing a DoC" }, { k: "UDI capture", v: 0.93, note: "2 labels keyed by hand" }],
    };
    case "ops": return {
      actor: "Ops Watchdog",
      purpose: "Sits across orders, tasks and integrations and says when something has stopped moving.",
      connected: [["order", "SO-1047", "SO-1047"], ["order", "SO-1025", "SO-1025"], ["grn", "GRN-0412", "GRN-0412"], ["task", "T-107", "Courier booking"]],
      obs: [
        { text: <>SO-1047 {prog.scanned < prog.total ? "at risk for the 16:00 courier" : "ready, courier at 16:00"}</>, tone: prog.scanned < prog.total ? "bad" : "ok", go: () => S.nav("Orders", "picking", { "orders.pick": "SO-1047" }) },
        { text: <>{s.tasks.filter(t => t.status !== "Done" && t.due < D.DEMO.today).length} tasks overdue across the team</>, tone: "warn", go: () => S.nav("Work", "tasks", { "work.view": "overdue" }) },
        { text: <>ERP and bank connections are demo only, not yet verified</>, tone: "neutral", go: () => S.nav("Settings") },
      ],
      recs: ["Sharon finishes SO-1047 before booking the four packed orders.", "Graham clears the overdue sales follow-ups in Friday's review."],
      drafts: [{ title: "Book the 12:00 collection", detail: "SO-1025 to SO-1028 packed since yesterday.", cta: "Open dispatch", run: () => S.nav("Orders", "dispatch") }],
      evidence: [{ k: "Event coverage", v: 0.78, note: "orders, tasks, stock; ERP events simulated" }],
    };
    default: return {
      actor: "Briefing Agent",
      purpose: "Reads the whole business every morning and tells Graham the few things that matter, with links straight to them.",
      connected: [["location", "HAR", "Harbour"], ["order", "SO-1047", "SO-1047"], ["opp", "OPP-301", "Pinewood"], ["invoice", "INV-6128", "INV-6128"]],
      obs: S.alerts(s).map(a => ({ text: a.title, tone: a.done ? "ok" : a.tone, go: a.go })),
      recs: [S.briefing(s)],
      drafts: [{ title: "Friday team review pack", detail: "Pipeline, missed commitments and next week's drafts for Graham's review with the sales team.", cta: "Open planner", run: () => S.nav("Sales", "planner") }],
      evidence: [{ k: "Sources read", v: 0.84, note: "stock, orders, sales, finance (demo)" }],
    };
  }
}

const TONE_FG: Record<Tone, string> = { neutral: "var(--faint)", accent: "var(--accent)", ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", info: "var(--info,#7FB8C9)" };

function Block({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 9 }}><span style={{ ...label, flex: 1 }}>{title}</span>{right}</div>
      {children}
    </div>
  );
}

export default function AgentPanel({ id }: { id: string }) {
  const s = S.useHogan();
  const sp = spec(id, s);
  const history = s.events.filter(e => e.actor === sp.actor).slice(0, 5);
  const notes = sp.noteKey ? s.agentNotes.filter(n => n.agent === sp.noteKey) : [];
  return (
    <aside style={{ width: 340, flex: "none", minHeight: 0, overflowY: "auto", borderLeft: "1px solid var(--border)", background: "var(--surface-faint)" }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ ...label }}>Purpose</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--body)", marginTop: 7 }}>{sp.purpose}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11.5, color: "var(--dim)" }}>
          <Icon d={I.shield} size={13} color="var(--accent)" /> Proposes only. A named person approves anything with an effect.
        </div>
      </div>
      <Block title="Connected records">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sp.connected.map(([t, rid, lbl]) => (
            <button key={t + rid} onClick={() => S.openRecord(t, rid)} className="ixa" style={{ height: 26, padding: "0 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--body)", cursor: "pointer" }}>{lbl}</button>
          ))}
        </div>
      </Block>
      <Block title="Observing now" right={<span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)" }}>LIVE</span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sp.obs.map((o, i) => (
            <div key={i} onClick={o.go} className={o.go ? "ix11" : undefined} style={{ display: "flex", gap: 9, padding: "6px 6px", margin: "0 -6px", borderRadius: 9, cursor: o.go ? "pointer" : undefined, fontSize: 12.5, lineHeight: 1.45, color: "var(--body)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: TONE_FG[o.tone], flex: "none", marginTop: 6 }} />
              <span style={{ minWidth: 0 }}>{o.text}</span>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Recommends">
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
          {sp.recs.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
      </Block>
      <Block title="Drafts waiting for a person">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sp.drafts.map((d, i) => (
            <div key={i} style={{ padding: "11px 12px", background: "var(--surface)", border: "1px dashed " + (d.done ? "var(--ok-soft)" : "var(--accent-line)"), borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{d.title}</span>
                {d.done ? <Badge tone="ok">{d.doneLabel || "Done"}</Badge> : <Badge tone="warn">Draft</Badge>}
              </div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>{d.detail}</div>
              {!d.done && <Btn kind="accent" size="sm" style={{ marginTop: 9 }} onClick={d.run}>{d.cta}</Btn>}
            </div>
          ))}
        </div>
      </Block>
      <Block title="Confidence and evidence">
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {sp.evidence.map(e => (
            <div key={e.k}>
              <div style={{ display: "flex", fontSize: 12, color: "var(--body)" }}><span style={{ flex: 1 }}>{e.k}</span><span style={{ fontFamily: "var(--mono)", color: "var(--dim)" }}>{Math.round(e.v * 100)}%</span></div>
              <Progress value={e.v * 100} h={4} style={{ marginTop: 5 }} tone={e.v < 0.6 ? "warn" : "accent"} />
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{e.note}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--faint)" }}>Illustrative scores for the demo. They describe the data the agent can see, not a guarantee.</div>
        </div>
      </Block>
      <Block title="Activity history">
        {notes.length + history.length === 0 ? <div style={{ fontSize: 12, color: "var(--dim)" }}>Nothing recorded yet today.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n, i) => <div key={"n" + i} style={{ fontSize: 12, lineHeight: 1.5, color: "var(--body)" }}><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{n.time} · result </span>{n.text}</div>)}
            {history.map(e => <div key={e.id} style={{ fontSize: 12, lineHeight: 1.5, color: "var(--body)" }}><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{e.time} · </span>{e.title}</div>)}
          </div>
        )}
      </Block>
    </aside>
  );
}
