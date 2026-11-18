/* Home's right-hand widget rail for Hogan Healthcare OS.
   The centre column stays clean (greeting, ask box, chat); everything Graham
   wants at a glance lives here, read live from the demo store. */

import { type ReactNode } from "react";
import AgentFace from "../components/AgentFace";
import * as D from "./data";
import * as S from "./store";
import { eur, eurK, num, addDays } from "./fmt";
import { Avatar, I, Icon, Progress, Status, TONE, label, type Tone } from "./ui";

export const HOME_WIDGETS: [string, string][] = [
  ["health", "Business health"], ["attention", "Needs your attention"], ["briefing", "Morning briefing"], ["quick", "Quick actions"],
  ["stock", "Hospital stock warnings"], ["dispatch", "Today's dispatches"], ["plan", "This week's sales plan"], ["workload", "Team workload"], ["activity", "Recent business activity"],
];

function W({ title, meta, children, right, onTitle }: { title: string; meta?: ReactNode; children: ReactNode; right?: ReactNode; onTitle?: () => void }) {
  return (
    <section style={{ flex: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", overflow: "hidden", animation: "glassIn .5s var(--ease) both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 16px 9px" }}>
        <button onClick={onTitle} disabled={!onTitle} className={onTitle ? "ix3" : undefined}
          style={{ flex: 1, minWidth: 0, textAlign: "left", border: 0, background: "none", padding: 0, cursor: onTitle ? "pointer" : "default", color: "var(--ink)", fontSize: 13.5, fontWeight: 600, letterSpacing: "-.2px", display: "flex", alignItems: "center", gap: 6 }}>
          {title}
          {onTitle && <Icon d={I.chevron} size={11} color="var(--faint)" />}
        </button>
        {meta && <span style={{ ...label, fontSize: 9, flex: "none" }}>{meta}</span>}
        {right}
      </div>
      <div style={{ padding: "0 16px 14px" }}>{children}</div>
    </section>
  );
}

function Dot({ tone }: { tone: Tone }) {
  return <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: TONE[tone].fg, marginTop: 6 }} />;
}

export default function HomeRail({ edit }: { edit?: boolean }) {
  const s = S.useHogan();
  const [shown, setShown] = S.useUi<string[]>("home.widgets", HOME_WIDGETS.map(w => w[0]));
  const on = (k: string) => shown.includes(k);
  const remove = (k: string) => setShown(shown.filter(x => x !== k));
  const k = S.healthKpis(s);
  const al = S.alerts(s);
  const lows = S.lowSiteLines(s);
  const verify = s.stock.filter(l => l.status === "Verify");
  const expiring = S.expiringLines(90, s).filter(l => l.loc !== "DLM" || l.status !== "Quarantine");
  const so47 = S.orderById("SO-1047", s);
  const dispatches = s.orders.filter(o => o.id === "SO-1047" || o.status === "Packed" || o.status === "Awaiting courier" || (o.status === "Dispatched" && o.dispatched === D.DEMO.today))
    .sort((a, b) => (a.id === "SO-1047" ? -1 : b.id === "SO-1047" ? 1 : a.status.localeCompare(b.status)));
  const weekEnd = addDays(D.DEMO.weekStart, 4);
  const thisWeek = s.activities.filter(a => a.date >= D.DEMO.weekStart && a.date <= weekEnd);
  const openTasks = S.openTasks(s);
  const close = (k2: string) => edit ? <button onClick={() => remove(k2)} title="Remove widget" className="ixd" style={{ width: 22, height: 22, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface-2)", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={I.x} size={10} stroke={2.4} /></button> : undefined;

  return (
    <>
      {edit && HOME_WIDGETS.some(w => !on(w[0])) && (
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: "var(--card-r,18px)" }}>
          <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Add a widget</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
            {HOME_WIDGETS.filter(w => !on(w[0])).map(w => (
              <button key={w[0]} onClick={() => setShown(shown.concat([w[0]]))} className="ixe" style={{ height: 28, padding: "0 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 11.5, color: "var(--body)", cursor: "pointer" }}>
                <span style={{ color: "var(--accent)" }}>+</span> {w[1]}
              </button>
            ))}
          </div>
        </div>
      )}

      {on("health") && (
        <W title="Business health" meta="NOV TO DATE · DEMO" onTitle={() => S.nav("Dashboard", "exec")} right={close("health")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {[
              ["Revenue", eur(k.revenue), "1 to 19 Nov", "neutral", () => S.nav("Dashboard", "exec")],
              ["Est. EBITDA", eur(k.ebitda), D.FIN.ebitdaMargin + "% margin", "neutral", () => S.nav("Finance", "profit")],
              ["Open orders", num(k.openOrders), eur(S.openOrders(s).reduce((a, o) => a + D.orderValue(o), 0)), "neutral", () => S.nav("Orders", "overview")],
              ["Stock units", num(k.units), num(S.centralUnits(s)) + " central · " + num(S.hospitalUnits(s)) + " hospitals", "neutral", () => S.nav("Inventory", "locations")],
              ["Open opportunities", num(k.openOpps), eurK(S.pipelineValue(s)) + " pipeline", "neutral", () => S.nav("Sales", "pipeline")],
              ["Overdue follow-ups", num(k.overdueFollowups), k.overdueFollowups ? "needs a plan" : "all current", k.overdueFollowups ? "warn" : "ok", () => S.nav("Sales", "followups")],
            ].map(([l, v, sub, tone, go]) => (
              <button key={l as string} onClick={go as () => void} className="ixx"
                style={{ textAlign: "left", padding: "10px 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,11px)", cursor: "pointer", minWidth: 0, transition: "transform .2s var(--ease),border-color .2s var(--ease)" }}>
                <div style={{ ...label, fontSize: 8.5 }}>{l as string}</div>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5, color: tone === "warn" ? "var(--warn)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v as string}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub as string}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 9, lineHeight: 1.45 }}>Fictional demonstration figures, not Hogan Healthcare performance.</div>
        </W>
      )}

      {on("attention") && (
        <W title="Needs your attention" meta={al.filter(a => !a.done).length + " OPEN"} right={close("attention")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {al.map(a => (
              <div key={a.id} onClick={a.go} className="ix11" style={{ display: "flex", gap: 10, padding: "8px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer", opacity: a.done ? 0.72 : 1 }}>
                {a.done ? <span style={{ color: "var(--ok)", marginTop: 2 }}><Icon d={I.check} size={13} stroke={2.4} /></span> : <Dot tone={a.tone} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink)", textDecoration: a.done ? "line-through" : undefined, textDecorationColor: "var(--faint)" }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.4 }}>{a.sub}</div>
                </div>
                <span style={{ flex: "none", fontSize: 11, color: a.done ? "var(--ok)" : "var(--accent)", marginTop: 2 }}>{a.done ? "Done" : a.cta}</span>
              </div>
            ))}
          </div>
        </W>
      )}

      {on("briefing") && (
        <W title="Morning briefing" meta="07:02 · BRIEFING AGENT" onTitle={() => S.setUi("agents.focus", "briefing")} right={close("briefing")}>
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <span style={{ flex: "none", marginTop: 2 }}><AgentFace shape="crown-pebble" state="complete" tint="#191c1f" size="30" /></span>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--body)" }}>{S.briefing(s)}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
            {[["Harbour stock", () => S.nav("Inventory", "replenish", { "inventory.focus": "HH-OR-204" })], ["SO-1047", () => S.nav("Orders", "picking", { "orders.pick": "SO-1047" })], ["Follow-ups", () => S.nav("Sales", "followups")]].map(([l, go]) => (
              <button key={l as string} onClick={go as () => void} className="ixa" style={{ height: 26, padding: "0 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--body)", cursor: "pointer" }}>{l as string}</button>
            ))}
          </div>
        </W>
      )}

      {on("quick") && (
        <W title="Quick actions" right={close("quick")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              [I.plus, "Create sales order", () => S.nav("Orders", "new")],
              [I.scan, "Scan stock", () => S.nav("Inventory", "scanning")],
              [I.hospital, "Check hospital inventory", () => S.nav("Inventory", "hospital")],
              [I.users, "Review sales team", () => S.nav("Sales", "planner")],
            ].map(([ic, l, go]) => (
              <button key={l as string} onClick={go as () => void} className="ixa"
                style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,11px)", cursor: "pointer", fontSize: 12, color: "var(--body)", textAlign: "left" }}>
                <span style={{ color: "var(--accent)" }}><Icon d={ic as string} size={14} /></span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l as string}</span>
              </button>
            ))}
            <button onClick={() => { const ta = document.querySelector<HTMLTextAreaElement>("textarea[placeholder^='Ask Pulse']"); if (ta) { ta.focus(); ta.scrollIntoView({ block: "center", behavior: "smooth" }); } }} className="ixp"
              style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 36, border: 0, borderRadius: 999, background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <Icon d={I.agent} size={14} /> Ask Pulse
            </button>
          </div>
        </W>
      )}

      {on("stock") && (
        <W title="Hospital stock warnings" meta={(lows.length + verify.length) + " LINES"} onTitle={() => S.nav("Inventory", "hospital")} right={close("stock")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {lows.map(({ line, suggested, pending }) => (
              <div key={line.id} onClick={() => S.openRecord("product", line.sku)} className="ix11" style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer" }}>
                <Dot tone={line.sku === "HH-OR-204" ? "warn" : "info"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{D.locById(line.loc)?.short} · {line.sku}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{line.qty} on hand, par {line.min} · {pending ? pending.id + " awaiting approval" : "suggest +" + suggested}</div>
                </div>
                <Progress value={line.qty} max={line.min || 1} tone="warn" style={{ width: 42 }} />
              </div>
            ))}
            {verify.map(l => (
              <div key={l.id} onClick={() => S.openRecord("product", l.sku)} className="ix11" style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer" }}>
                <Dot tone="bad" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{D.locById(l.loc)?.short} · {l.sku}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>Count variance to verify</div>
                </div>
              </div>
            ))}
            {expiring.slice(0, 2).map(l => (
              <div key={l.id} onClick={() => S.openRecord("lot", l.sku + "|" + l.lot)} className="ix11" style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer" }}>
                <Dot tone="neutral" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{D.locById(l.loc)?.short} · {l.sku}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>Lot {l.lot} expires {l.expiry}</div>
                </div>
              </div>
            ))}
          </div>
        </W>
      )}

      {on("dispatch") && (
        <W title="Today's dispatches" meta={dispatches.length + " ORDERS"} onTitle={() => S.nav("Orders", "dispatch")} right={close("dispatch")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {dispatches.slice(0, 6).map(o => {
              const p = S.orderProgress(o);
              return (
                <div key={o.id} onClick={() => o.id === "SO-1047" ? S.nav("Orders", "picking", { "orders.pick": o.id }) : S.openRecord("order", o.id)} className="ix11"
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink)", width: 62, flex: "none" }}>{o.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{D.accountById(o.account)?.name}</div>
                    {o.id === "SO-1047" && <div style={{ fontSize: 10.5, color: p.scanned < p.total ? "var(--warn)" : "var(--ok)" }}>{p.scanned}/{p.total} scanned · Sharon</div>}
                  </div>
                  <Status s={o.id === "SO-1047" && o.status === "Picking" ? "Picking" : o.status === "Packed" ? "Ready" : o.status} />
                </div>
              );
            })}
          </div>
        </W>
      )}

      {on("plan") && (
        <W title="This week's sales plan" meta="16 to 20 NOV" onTitle={() => S.nav("Sales", "planner")} right={close("plan")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {D.SELLERS.map(id => {
              const mine = thisWeek.filter(a => a.rep === id);
              const done = mine.filter(a => a.status === "Done").length, missed = mine.filter(a => a.status === "Missed").length;
              return (
                <button key={id} onClick={() => S.nav("Sales", "planner", { "sales.rep": id })} className="ix11" style={{ display: "flex", alignItems: "center", gap: 10, border: 0, background: "none", padding: "4px 6px", margin: "0 -6px", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                  <Avatar id={id} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{D.staffById(id)?.first}</span>
                      <span style={{ fontSize: 10.5, color: "var(--faint)" }}>{done}/{mine.length} done{missed ? " · " + missed + " missed" : ""}</span>
                    </div>
                    <Progress value={done} max={mine.length || 1} h={4} style={{ marginTop: 5 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </W>
      )}

      {on("workload") && (
        <W title="Team workload" meta={openTasks.length + " OPEN TASKS"} onTitle={() => S.nav("Work", "team")} right={close("workload")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            {D.STAFF.map(p => {
              const n = openTasks.filter(t => t.owner === p.id).length;
              const late = openTasks.filter(t => t.owner === p.id && t.due < D.DEMO.today).length;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar id={p.id} size={22} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.first}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: late ? "var(--warn)" : "var(--ink)" }}>{n}</span>
                </div>
              );
            })}
          </div>
        </W>
      )}

      {on("activity") && (
        <W title="Recent business activity" meta="LIVE" onTitle={() => S.nav("Activity")} right={close("activity")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {s.events.filter(e => e.date === D.DEMO.today).slice(0, 6).map(e => (
              <div key={e.id} style={{ display: "flex", gap: 9 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, flex: "none", marginTop: 6, background: e.stream === "ai" ? "var(--accent)" : e.stream === "data" ? "#7FB8C9" : "#D9C27A" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>{e.title}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", marginTop: 2 }}>{e.actor} · {e.time}{e.demo ? " · demo sync" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </W>
      )}
      <div style={{ flex: "none", height: 4 }} />
    </>
  );
}

