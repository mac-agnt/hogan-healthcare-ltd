/* Invoice and bank-line detail views. Used by the record drawer (registered in
   Finance.tsx) and by the Receivables and Reconciliation work pages. Agents only
   draft and suggest; every committing button is Margaret's explicit action. */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { type HState, matchBank, nav, openRecord, sendReminder, toast, useHogan } from "../../store";
import { Avatar, Badge, Btn, DemoBadge, Empty, I, Icon, KV, Notice, Person, RecLink, RecordHead, RecordSection, SelectBox, Timeline, TONE, label } from "../../ui";
import { TODAY, addDays, date, dayDate, daysAgo, eur, longDate } from "../../fmt";
import { FIN, accName, accountInDesc, bankCandidates, bankHints, daysOver, invoiceAdvice, partPayments } from "./derive";
import { codeBankLine, flagBankLine, notePartPayment, raiseTask, rejectSuggestion, resolveBankLine } from "./actions";
import { Src } from "./kit";

/* ── Reminder draft ────────────────────────────────────────────────────── */

export function draftFor(inv: D.Invoice, s: HState) {
  const acc = D.accountById(inv.account);
  const d = daysOver(inv);
  const hints = bankHints(inv, s);
  const parts = partPayments(inv, s);
  const paidPart = parts.reduce((a, t) => a + t.amount, 0);
  const n = inv.reminders + 1;
  const subject = inv.id + " · " + eur(inv.amount - paidPart) + " now " + d + " days overdue" + (n > 1 ? " (reminder " + n + ")" : "");
  const body: string[] = ["Dear Accounts team,"];
  body.push("Our invoice " + inv.id + " for " + eur(inv.amount) + ", issued on " + longDate(inv.issued) + " and due on " + longDate(inv.due) + ", is now " + d + " days overdue."
    + (inv.lastReminder ? " We last wrote to you about it on " + longDate(inv.lastReminder) + "." : ""));
  if (paidPart) body.push("Thank you for your payment of " + eur(paidPart) + ", which we have noted against this invoice. The balance of " + eur(inv.amount - paidPart) + " remains due.");
  else if (hints.named) body.push("We received " + eur(hints.named.amount) + " from " + (acc?.name || "you") + " on " + longDate(hints.named.date) + " without a remittance reference. If that payment was for " + inv.id + ", please let us know and we will apply it, leaving " + eur(inv.amount - hints.named.amount) + " due.");
  body.push("If payment is already on its way, please ignore this note. Otherwise we would be grateful for payment, or a remittance date, by " + longDate(addDays(TODAY, 8)) + ".");
  body.push("Kind regards,\nMargaret Duff\nOffice Manager, Hogan Healthcare Ltd");
  return { to: "Accounts team, " + (acc?.name || inv.account), subject, body, text: "Subject: " + subject + "\n\n" + body.join("\n\n") };
}

export function ReminderDraft({ inv, compact }: { inv: D.Invoice; compact?: boolean }) {
  const s = useHogan();
  const dr = draftFor(inv, s);
  const today = inv.lastReminder === TODAY;
  if (today) {
    const ev = s.events.find(e => e.ref === inv.id && e.date === TODAY && /^Reminder sent/.test(e.title));
    return (
      <div style={{ display: "flex", gap: 11, padding: "12px 14px", borderRadius: "var(--r-md,14px)", background: "var(--ok-soft)", border: "1px solid var(--ok-soft)" }}>
        <span style={{ color: "var(--ok)", marginTop: 1 }}><Icon d={I.check} size={16} stroke={2.2} /></span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>Reminder {inv.reminders} logged today{ev ? " at " + ev.time : ""} by Margaret Duff</div>
          Demo: nothing was emailed. If {inv.id} is still unpaid on {longDate(addDays(TODAY, 7))}, the Finance Agent will draft the next one for Margaret to review.
        </div>
      </div>
    );
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(dr.text); toast("Draft copied. Nothing has been sent.", "info"); }
    catch { toast("Copy is not available in this browser. Select the text instead.", "warn"); }
  };
  return (
    <div style={{ border: "1px dashed var(--accent-line)", borderRadius: "var(--r-md,14px)", background: "var(--accent-faint)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px dashed var(--accent-line)" }}>
        <Avatar id="agent:finance" size={22} />
        <span style={{ ...label, color: "var(--accent)", flex: 1 }}>AI draft · not sent</span>
        <Badge tone="neutral">For Margaret to review</Badge>
      </div>
      <div style={{ padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, color: "var(--body)", maxHeight: compact ? 260 : undefined, overflowY: compact ? "auto" : undefined, userSelect: "text" }}>
        <div style={{ fontSize: 11.5, color: "var(--dim)" }}>To: {dr.to}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600, margin: "3px 0 10px" }}>{dr.subject}</div>
        {dr.body.map((p, i) => <p key={i} style={{ margin: "0 0 9px", whiteSpace: "pre-line" }}>{p}</p>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderTop: "1px dashed var(--accent-line)" }}>
        <span style={{ flex: 1, minWidth: 160, fontSize: 11.5, color: "var(--dim)" }}>Drafted by the Finance Agent. Margaret decides whether to send it. In this demo nothing is emailed.</span>
        <Btn size="sm" kind="ghost" icon={I.doc} onClick={copy}>Copy text</Btn>
        <Btn size="sm" kind="primary" icon={I.mail} disabled={today || inv.status === "Paid"} onClick={() => sendReminder(inv.id, "MD")}
          title="Margaret's action. Logs the reminder against the invoice; the demo sends nothing.">{today ? "Reminder logged today" : "Send reminder " + (inv.reminders + 1)}</Btn>
      </div>
    </div>
  );
}

/* ── Invoice detail ────────────────────────────────────────────────────── */

function AgeBar({ inv }: { inv: D.Invoice }) {
  const terms = Math.max(1, Math.round((Date.parse(inv.due) - Date.parse(inv.issued)) / 86400000));
  const over = daysOver(inv);
  const elapsed = inv.status === "Open" ? Math.max(0, daysAgo(inv.issued)) : terms;
  const total = terms + over;
  const tone = over > 30 ? "bad" : "warn";
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 10, overflow: "hidden", gap: 2, background: "var(--track)" }}>
        <div style={{ width: (Math.min(elapsed, terms) / total) * 100 + "%", background: "#7FB8C9", transformOrigin: "left", animation: "sweep .7s var(--ease) both" }} />
        {inv.status === "Open" && <div style={{ flex: 1 }} />}
        {over > 0 && <div style={{ width: (over / total) * 100 + "%", background: TONE[tone].fg, transformOrigin: "left", animation: "sweep .7s var(--ease) .15s both" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)", marginTop: 6, gap: 8 }}>
        <span>Issued {date(inv.issued, false)}</span>
        <span>Due {date(inv.due, false)} · {terms}-day terms</span>
        <span style={{ color: over ? TONE[tone].fg : undefined }}>{inv.status === "Paid" ? "Paid " + date(inv.paid || "", false) : over ? over + " days overdue" : (() => { const d = Math.max(0, -daysAgo(inv.due)); return d === 0 ? "Due today" : "Due in " + d + (d === 1 ? " day" : " days"); })()}</span>
      </div>
    </div>
  );
}

export function InvoiceDetail({ id, variant = "drawer" }: { id: string; variant?: "drawer" | "panel" }) {
  const s = useHogan();
  const inv = s.invoices.find(i => i.id === id);
  if (!inv) return <Empty title={"Invoice " + id + " not found"} sub="It may have been removed from the demo data." icon={I.doc} />;
  const acc = D.accountById(inv.account);
  const adv = invoiceAdvice(inv, s);
  const hints = bankHints(inv, s);
  const parts = partPayments(inv, s);
  const panel = variant === "panel";
  const events = s.events.filter(e => e.ref === id || (e.note || "").includes(id)).slice(0, 8)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const seed = D.INVOICES.find(i => i.id === id);
  const history = [
    { when: date(inv.issued), title: "Invoice issued", sub: eur(inv.amount) + " to " + accName(inv.account) + ", payment terms " + (acc?.terms || "30 days"), tone: "neutral" as const, icon: I.doc },
    { when: date(inv.due), title: "Payment due", tone: "neutral" as const, icon: I.calendar },
    ...(seed?.lastReminder ? [{ when: date(seed.lastReminder), title: seed.reminders === 1 ? "Reminder 1 sent" : "Reminder " + seed.reminders + " sent (earlier dates not held in the demo)", sub: "By Margaret Duff", tone: "warn" as const, icon: I.mail }] : []),
    ...events.map(e => ({ when: date(e.date) + " · " + e.time, title: e.title, sub: e.note, tone: e.stream === "ai" ? "accent" as const : "ok" as const, icon: e.stream === "ai" ? I.agent : I.check })),
    ...(inv.status === "Paid" ? [{ when: date(inv.paid || TODAY), title: "Paid in full", tone: "ok" as const, icon: I.check }] : []),
  ];
  return (
    <div>
      {!panel && (
        <RecordHead kind="Customer invoice" title={<>{inv.id} · {eur(inv.amount)}</>} status={inv.status}
          sub={<><RecLink type="account" id={inv.account}>{accName(inv.account)}</RecLink> · owner Margaret Duff</>} right={<DemoBadge />} />
      )}
      <KV cols={panel ? 2 : 3} style={{ marginTop: panel ? 0 : 16 }} items={[
        ["Customer", <RecLink type="account" id={inv.account}>{acc?.name || inv.account}</RecLink>],
        ["Amount", <b style={{ fontWeight: 600 }}>{eur(inv.amount)}</b>],
        ["Days overdue", inv.status === "Overdue" ? <span style={{ color: daysOver(inv) > 30 ? "var(--bad)" : "var(--warn)", fontWeight: 600 }}>{daysOver(inv)}</span> : inv.status === "Paid" ? "Paid" : "Not due"],
        ["Owner", <Person id={inv.owner} size={20} sub="" />],
        ["Reminders", inv.reminders ? inv.reminders + " · last " + date(inv.lastReminder || "", false) : inv.status === "Paid" ? "None" : "None yet"],
        ["Account manager", D.staffById(acc?.owner || "")?.name || ""],
      ]} />
      <div style={{ marginTop: 14 }}><AgeBar inv={inv} /></div>

      <RecordSection title="Suggested next step">
        <Notice tone={adv.tone === "neutral" ? "info" : adv.tone} title={adv.text}>
          {adv.kind === "check" && hints.named && <>{hints.named.id} ({eur(hints.named.amount)}, {dayDate(hints.named.date)}) arrived from {accName(inv.account)} with no reference. Confirm with the customer before reminder {inv.reminders + 1}, so the reminder asks for the right balance.</>}
          {adv.kind === "check" && !hints.named && hints.sameAmount && <>{hints.sameAmount.id} is for exactly {eur(inv.amount)} but carries no reference. Match it if the customer confirms.</>}
          {adv.kind === "match" && hints.suggested && <>{hints.suggested.id} for {eur(hints.suggested.amount)} on {dayDate(hints.suggested.date)} matches this invoice ({hints.suggested.confidence}% confidence). {hints.suggested.note}</>}
          {adv.kind === "remind" && <>No reply since {inv.lastReminder ? date(inv.lastReminder, false) : "the due date"}. The draft below is ready for Margaret to check and send.</>}
          {adv.kind === "call" && <>{inv.reminders} reminder{inv.reminders === 1 ? "" : "s"} sent and {daysOver(inv)} days overdue. A phone call to their accounts team usually moves faster than another email.</>}
          {adv.kind === "wait" && <>A reminder went out on {date(inv.lastReminder || "", false)}. Give it a week before following up.</>}
          {(adv.kind === "none" || adv.kind === "paid") && <>Nothing to do on this invoice today.</>}
        </Notice>
        {hints.suggested && hints.suggested.amount >= inv.amount && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Btn size="sm" kind="accent" icon={I.check} onClick={() => matchBank(hints.suggested!.id, inv.id)} title="Margaret's action. Marks the invoice paid in the demo; nothing is posted to accounting.">Match {hints.suggested.id} and mark paid</Btn>
            <Btn size="sm" kind="ghost" onClick={() => openRecord("bank", hints.suggested!.id)}>Open bank line</Btn>
          </div>
        )}
        {hints.named && !parts.length && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Btn size="sm" kind="secondary" onClick={() => notePartPayment(hints.named!.id, inv.id)} title="Records the credit against this invoice. Allocation happens in the accounting system.">Note {eur(hints.named.amount)} as part payment</Btn>
            <Btn size="sm" kind="ghost" onClick={() => openRecord("bank", hints.named!.id)}>Open {hints.named.id}</Btn>
          </div>
        )}
        {parts.map(t => (
          <div key={t.id} style={{ marginTop: 10, fontSize: 12.5, color: "var(--body)" }}>
            <Badge tone="ok" style={{ marginRight: 8 }}>Part payment noted</Badge>
            <RecLink type="bank" id={t.id} /> {eur(t.amount)} on {date(t.date, false)}. {eur(inv.amount - t.amount)} still open until allocated in the accounts.
          </div>
        ))}
      </RecordSection>

      {inv.status !== "Paid" && (
        <RecordSection title="Reminder" right={<Src k="erp" />}>
          {inv.status === "Overdue" ? <ReminderDraft inv={inv} compact={panel} />
            : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Not due until {longDate(inv.due)}. The Finance Agent drafts a reminder only once an invoice is overdue.</div>}
        </RecordSection>
      )}

      {!panel && (
        <RecordSection title="History">
          <Timeline dense items={history} />
        </RecordSection>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
        <Btn size="sm" icon={I.user} onClick={() => openRecord("account", inv.account)}>Open account</Btn>
        {panel ? <Btn size="sm" kind="ghost" icon={I.external} onClick={() => openRecord("invoice", inv.id)}>Full record</Btn>
          : <Btn size="sm" kind="ghost" onClick={() => nav("Finance", "ar", { "finance.arFocus": inv.id, "finance.arView": inv.status === "Overdue" ? "overdue" : inv.status === "Paid" ? "paid" : "open", "finance.arNever": false })}>Go to receivables</Btn>}
      </div>
    </div>
  );
}

export function InvoiceRecord({ id }: { id: string }) { return <InvoiceDetail id={id} variant="drawer" />; }

/* ── Bank line detail and actions ──────────────────────────────────────── */

const COST_CODES = FIN.opexLines.map(l => l.k);

export function bankTone(st: D.BankTxn["state"]): "ok" | "warn" | "bad" | "info" {
  return st === "Matched" ? "ok" : st === "Exception" ? "bad" : st === "Unmatched" ? "warn" : "info";
}

/** The decision buttons for one bank line, by state. */
export function BankActions({ t, size = "sm", showOpen }: { t: D.BankTxn; size?: "sm" | "md"; showOpen?: boolean }) {
  const s = useHogan();
  const [picked, setCode] = useState<{ id: string; code: string } | null>(null);
  const code = picked && picked.id === t.id ? picked.code : /fuel|card|travel|toll|parking/i.test(t.desc) ? (COST_CODES.find(c => /^Vehicles/.test(c)) || COST_CODES[0]) : /software|subscription/i.test(t.desc) ? (COST_CODES.find(c => /^Systems/.test(c)) || COST_CODES[0]) : COST_CODES[0];
  const cands = bankCandidates(t, s);
  const credit = t.amount > 0;
  const inv = t.suggest ? s.invoices.find(i => i.id === t.suggest) : undefined;
  const out: ReactNode[] = [];
  if (t.state === "Suggested match" && inv) {
    out.push(inv.amount <= t.amount
      ? <Btn key="m" size={size} kind="accent" icon={I.check} onClick={() => matchBank(t.id, inv.id)} title="Margaret's action. Marks the invoice paid in the demo; nothing is posted.">Match {inv.id}</Btn>
      : <Btn key="p" size={size} kind="accent" onClick={() => notePartPayment(t.id, inv.id)}>Note part payment</Btn>);
    out.push(<Btn key="r" size={size} kind="ghost" onClick={() => rejectSuggestion(t.id)}>Not a match</Btn>);
  } else if (t.state === "Unmatched" && credit) {
    const exact = cands.find(c => c.kind === "invoice" && c.exact);
    const named = cands.find(c => c.kind === "invoice" && !c.exact && c.why.startsWith("Named"));
    if (exact) out.push(<Btn key="e" size={size} kind="accent" icon={I.check} onClick={() => matchBank(t.id, exact.id)} title="Margaret's action. Marks the invoice paid in the demo.">Match {exact.id}</Btn>);
    else if (named) out.push(<Btn key="n" size={size} kind="secondary" onClick={() => notePartPayment(t.id, named.id)} title="Records the credit against the invoice; the balance stays open.">Part payment on {named.id}</Btn>);
    out.push(<Btn key="f" size={size} kind="ghost" onClick={() => flagBankLine(t.id, "Needs a remittance advice from the customer before it can be matched.")}>Flag</Btn>);
  } else if (t.state === "Unmatched") {
    out.push(<SelectBox key="c" value={code} onChange={v => setCode({ id: t.id, code: v })} options={COST_CODES.map(c => [c, c] as [string, string])} style={{ height: size === "sm" ? 28 : 34, fontSize: 12, maxWidth: 190 }} title="Cost code" />);
    out.push(<Btn key="k" size={size} kind="accent" onClick={() => codeBankLine(t.id, code)} title="Margaret's action. Records the cost code; the posting is made in the accounts.">Code it</Btn>);
  } else if (t.state === "Exception") {
    const bill = cands.find(c => c.kind === "bill");
    if (!credit && bill) {
      out.push(<Btn key="t" size={size} kind="secondary" onClick={() => raiseTask({ title: "Check who released " + eur(-t.amount) + " to " + bill.who + " while " + bill.id + " is on hold", owner: "GH", dueIn: 1, priority: "High", ref: { type: "bank", id: t.id, label: t.id + " · " + eur(t.amount) }, note: t.note })}>Ask Graham</Btn>);
      out.push(<Btn key="ok" size={size} kind="ghost" onClick={() => resolveBankLine(t.id, "Confirmed by Margaret as a part payment of the undisputed amount on " + bill.id + ".")}>Confirm as part payment</Btn>);
    } else {
      out.push(<Btn key="t" size={size} kind="secondary" onClick={() => raiseTask({ title: "Confirm possible duplicate payment with " + (accountInDesc(t.desc)?.name || "the customer") + " and arrange a refund", owner: "MD", dueIn: 2, priority: "High", ref: { type: "bank", id: t.id, label: t.id + " · " + eur(t.amount) }, note: t.note })}>Raise refund task</Btn>);
      out.push(<Btn key="ok" size={size} kind="ghost" onClick={() => resolveBankLine(t.id, "Checked by Margaret: a separate payment, not a duplicate.")}>Not a duplicate</Btn>);
    }
  }
  if (showOpen) out.push(<Btn key="o" size={size} kind="ghost" icon={I.external} onClick={() => openRecord("bank", t.id)} title="Open the bank line" />);
  return <>{out}</>;
}

export function BankDetail({ id, variant = "drawer" }: { id: string; variant?: "drawer" | "panel" }) {
  const s = useHogan();
  const t = s.bank.find(x => x.id === id);
  if (!t) return <Empty title={"Bank line " + id + " not found"} icon={I.euro} />;
  const credit = t.amount > 0;
  const inv = t.suggest ? s.invoices.find(i => i.id === t.suggest) : undefined;
  const cands = bankCandidates(t, s);
  const panel = variant === "panel";
  return (
    <div>
      {!panel && <RecordHead kind={"Bank line " + t.id} title={t.desc} right={<span style={{ display: "flex", gap: 6, alignItems: "center" }}><Badge tone={bankTone(t.state)}>{t.state}</Badge><DemoBadge /></span>} sub={dayDate(t.date) + " · " + (credit ? "money in" : "money out") + " · " + eur(t.amount, Number.isInteger(t.amount) ? 0 : 2)} />}
      {!panel && (
        <Notice tone="warn" title="Bank feed not yet verified" style={{ marginTop: 14 }}>
          This is a demo bank line. Matching here updates the demo only: nothing is posted to Xero or the current ERP.
        </Notice>
      )}
      <KV cols={panel ? 2 : 3} style={{ marginTop: 14 }} items={[
        ["Date", dayDate(t.date)],
        ["Amount", <b style={{ fontWeight: 600, color: credit ? "var(--ok)" : "var(--ink)" }}>{eur(t.amount, Number.isInteger(t.amount) ? 0 : 2)}</b>],
        ["State", <Badge tone={bankTone(t.state)}>{t.state}</Badge>],
        ["Bank reference", <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{t.desc}</span>],
        ["Suggested match", inv ? <RecLink type="invoice" id={inv.id} /> : "None"],
        ["Confidence", t.confidence ? t.confidence + "%" : "Not scored"],
      ]} />
      {t.note && (
        <RecordSection title={t.state === "Matched" ? "Note" : "Why it is here"}>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{t.note}</div>
        </RecordSection>
      )}
      {inv && (
        <RecordSection title="Bank line against invoice">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "6px 14px", fontSize: 12.5, alignItems: "center" }}>
            <span />
            <span style={{ ...label, fontSize: 9 }}>Bank line</span>
            <span style={{ ...label, fontSize: 9 }}>{inv.id}</span>
            {([
              ["Amount", eur(t.amount), eur(inv.amount), t.amount === inv.amount],
              ["Customer", t.desc.replace(/^SEPA (CR|DR) /, ""), accName(inv.account), t.desc.toUpperCase().includes(accName(inv.account).split(" ")[0].toUpperCase())],
              ["Reference", t.desc.includes(inv.id.replace("-", "")) ? inv.id : "Not quoted", inv.id, t.desc.includes(inv.id.replace("-", ""))],
              ["Date", date(t.date, false), "Due " + date(inv.due, false), true],
            ] as [string, string, string, boolean][]).map(([k, a, b, ok]) => (
              <span key={k} style={{ display: "contents" }}>
                <span style={{ color: "var(--dim)" }}>{k}</span>
                <span style={{ color: "var(--ink)", minWidth: 0, overflowWrap: "anywhere" }}>{a}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{b}</span>{k !== "Date" && <Icon d={ok ? I.check : I.x} size={12} color={ok ? "var(--ok)" : "var(--faint)"} stroke={2.4} />}</span>
              </span>
            ))}
          </div>
        </RecordSection>
      )}
      {t.state !== "Matched" && cands.length > 0 && (
        <RecordSection title={credit ? "Possible invoices" : "Related supplier bills"}>
          <div className="hk-list" style={{ display: "flex", flexDirection: "column" }}>
            {cands.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 12.5, borderTop: "1px solid var(--border)" }}>
                <RecLink type={c.kind} id={c.id} />
                <span style={{ flex: 1, minWidth: 0, color: "var(--dim)", lineHeight: 1.4 }}>{c.who} · {c.why}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(c.amount)}</span>
                {c.kind === "invoice" && t.state !== "Exception" && (c.exact
                  ? <Btn size="sm" kind="ghost" onClick={() => matchBank(t.id, c.id)}>Match</Btn>
                  : <Btn size="sm" kind="ghost" onClick={() => notePartPayment(t.id, c.id)} title="Records the credit against the invoice; the balance stays open.">Part pay</Btn>)}
              </div>
            ))}
          </div>
        </RecordSection>
      )}
      {t.state === "Matched" ? (
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--dim)" }}>
          <Icon d={I.check} size={14} color="var(--ok)" />
          {inv ? <>Matched to <RecLink type="invoice" id={inv.id} />.</> : "Reconciled."} Confirmed by a person; nothing posted from Pulse.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
          <BankActions key={t.id} t={t} size="md" />
        </div>
      )}
      {!panel && <div style={{ marginTop: 16, display: "flex", gap: 8 }}><Btn size="sm" kind="ghost" onClick={() => nav("Finance", "recon", { "finance.bank": t.id, "finance.bankView": t.state === "Matched" ? "done" : "todo" })}>Go to reconciliation</Btn></div>}
    </div>
  );
}

export function BankRecord({ id }: { id: string }) { return <BankDetail id={id} variant="drawer" />; }
