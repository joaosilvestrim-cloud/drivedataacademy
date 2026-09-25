"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MascotPoll } from "@/lib/mascot-poll";
import { usarTraducao } from "@/lib/i18n/usarTraducao";
import Mascot from "./Mascot";
import styles from "./mascot-name-poll.module.css";

const DISMISSED = "mascot-name-poll:dismissed";
function dismissed() { try { return sessionStorage.getItem(DISMISSED) === "1"; } catch { return false; } }
function remember() { try { sessionStorage.setItem(DISMISSED, "1"); } catch {} }

export function MascotPollCard({ poll, onVote, onClose }: {
  poll: MascotPoll; onVote: (optionId: string) => Promise<void>; onClose: () => void;
}) {
  const tr = usarTraducao();
  const [selected, setSelected] = useState(poll.myVote ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const results = !editing && (!!poll.myVote || poll.closed);
  const name = poll.options.find(option => option.id === selected)?.label;
  async function vote() {
    if (!selected || saving) return;
    setSaving(true); setError("");
    try { await onVote(selected); setEditing(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Não consegui registrar seu voto. Tente de novo."); }
    finally { setSaving(false); }
  }
  return (
    <section className={styles.card} role="dialog" aria-labelledby="mascot-poll-title"
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
      <button className={styles.close} onClick={onClose} aria-label={tr("Fechar votação")}>×</button>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{tr("UMA ESCOLHA DA COMUNIDADE")}</span>
        <div className={styles.headingRow}>
          <div><p className={styles.hello}>{tr("Ei, só falta meu nome.")}</p>
            <h2 id="mascot-poll-title">{tr(results ? "Você faz parte da minha história." : "Como você vai me chamar?")}</h2></div>
          <Mascot realistic className={styles.portrait} />
        </div>
        <p className={styles.intro}>{tr(poll.closed ? "Votação encerrada. Obrigado por participar!" : results
          ? "Seu voto está salvo. Veja os favoritos da turma." : "Cinco nomes, uma nova identidade. Quem decide é você.")}</p>
      </header>
      <div className={styles.body}>
        {results ? (
          <div className={styles.results} aria-label={tr("Resultado da votação")}>
            {poll.options.map((option, index) => (
              <div className={styles.result} key={option.id} data-mine={option.id === poll.myVote}>
                <div className={styles.resultLabels}><span><b className={styles.number}>0{index + 1}</b><strong>{option.label}</strong>
                  {option.id === poll.myVote && <small>{tr("MEU VOTO")}</small>}</span>
                  <b>{option.percent === null ? "—" : `${option.percent}%`}</b></div>
                {option.percent !== null && <div className={styles.track}><span style={{ width: `${option.percent}%` }} /></div>}
              </div>
            ))}
            <p className={styles.total} role="status">{poll.total === null ? tr("Seu voto foi registrado. O resultado será divulgado pela equipe.") : `${poll.total} ${tr(poll.total === 1 ? "voto registrado" : "votos registrados")}`}</p>
          </div>
        ) : (
          <fieldset className={styles.choices} disabled={saving}>
            <legend className="sr-only">{tr("Escolha o nome do mascote")}</legend>
            {poll.options.map((option, index) => (
              <label className={styles.option} key={option.id} data-selected={selected === option.id}>
                <input type="radio" name="mascot-name" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} />
                <span className={styles.number}>0{index + 1}</span>
                <span className={styles.optionText}><strong>{option.label}</strong><small>{tr(option.description ?? "")}</small></span>
                <span className={styles.radio} aria-hidden="true">{selected === option.id ? "✓" : ""}</span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className={styles.error} role="alert">{tr(error)}</p>}
      </div>
      <footer className={styles.footer}>
        {results ? <>
          <button className={styles.submit} onClick={onClose}>{tr("Combinado!")} <span aria-hidden="true">✓</span></button>
          {!poll.closed && <button className={styles.change} onClick={() => setEditing(true)}>{tr("Trocar meu voto")}</button>}
        </> : <>
          <button className={styles.submit} onClick={vote} disabled={!selected || saving}>
            {saving ? tr("Registrando voto…") : name ? `${tr("Votar em")} ${name}` : tr("Escolha seu favorito")} <span aria-hidden="true">↗</span>
          </button>
          <p>{tr("Um voto por conta. Você pode mudar de ideia.")}</p>
        </>}
      </footer>
    </section>
  );
}

export default function MascotNamePoll({ chatOpen, onVisibilityChange, onAvailabilityChange }: {
  chatOpen: boolean; onVisibilityChange: (visible: boolean) => void; onAvailabilityChange: (available: boolean) => void;
}) {
  const tr = usarTraducao();
  const reduced = useReducedMotion();
  const [poll, setPoll] = useState<MascotPoll | null>(null);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const initialAttempt = useRef(false);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const visible = open && !chatOpen && !!poll;
  useEffect(() => { onVisibilityChange(visible); }, [visible, onVisibilityChange]);
  useEffect(() => { onAvailabilityChange(!!poll); }, [poll, onAvailabilityChange]);
  useEffect(() => {
    if (chatOpen) { setOpen(false); remember(); }
  }, [chatOpen]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/mascot/poll", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (response.ok) setPoll((await response.json()).poll); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!poll || initialAttempt.current) return;
    initialAttempt.current = true;
    const explicit = new URLSearchParams(window.location.search).get("nome-mascote") === "1";
    if (!explicit && (poll.myVote || poll.closed || dismissed())) return;
    const timer = window.setTimeout(() => {
      if (!chatOpenRef.current && (explicit || !dismissed())) setOpen(true);
    }, explicit ? 100 : 6000);
    return () => window.clearTimeout(timer);
  }, [poll]);
  // Cancel the invitation while chatting; it must never reappear behind the chat.
  useEffect(() => { if (chatOpen) initialAttempt.current = true; }, [chatOpen]);

  function close() { setOpen(false); remember(); trigger.current?.focus(); }
  async function reopen() {
    setOpen(true);
    try {
      const response = await fetch("/api/mascot/poll", { cache: "no-store" });
      if (response.ok) setPoll((await response.json()).poll);
    } catch { /* Keep the last known poll; submitting still checks current availability. */ }
  }
  async function vote(optionId: string) {
    const response = await fetch("/api/mascot/poll", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionId }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Não consegui registrar seu voto. Tente de novo.");
    setPoll(body.poll); remember();
  }
  if (!poll) return null;
  return <>
    {!chatOpen && <button ref={trigger} className={styles.invite} onClick={() => visible ? close() : void reopen()}
      aria-expanded={visible} aria-controls="mascot-name-balloon">
      <span aria-hidden="true">{poll.myVote ? "✓" : "?"}</span>{tr(poll.closed ? "Resultado da votação" : poll.myVote ? "Meu voto" : "Escolha meu nome")}
    </button>}
    <AnimatePresence>
      {visible && <motion.div id="mascot-name-balloon" className={styles.balloon}
        initial={{ opacity: 0, y: reduced ? 0 : 18, scale: reduced ? 1 : .95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 8 }}
        transition={{ duration: reduced ? .1 : .35, ease: [.16, 1, .3, 1] }}>
        <MascotPollCard poll={poll} onVote={vote} onClose={close} />
      </motion.div>}
    </AnimatePresence>
  </>;
}
