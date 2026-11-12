"use client";
import { useRef, useState } from "react";
import { LoopSimulation, verifyLoopReplay, type LoopSnapshot } from "@/lib/watchtowers/loop-simulation";
import type { WatchtowerLocale } from "@/lib/watchtowers/content";

export const loopCopy = {
  en: {
    title: "04 · Shared loop limit", badge: "ILLUSTRATIVE SIMULATION", objective: "Objective: cross the fictional river by completing one synthetic tool action.",
    boundary: "This interactive browser model is separate from the enforcement gateway. It uses fictional agents, a serialized browser reservation and a separate in-memory destination ledger. It makes no network requests, runs no AI model and proves no hosted security guarantee.",
    attempts: "Shared attempts consumed", retries: "Allowed retries", cost: "Cumulative estimated cost", policy: "Current fictional policy", estimate: "Illustrative cost estimate only; no model tokens, real spend or observed billing.",
    retryState: "Agent 1's tool failed. Its reservation still consumed one shared slot; retry uses the same policy.", handoffReady: "Two attempts failed. One shared slot remains: hand control to agent 2 without creating a new budget.", raceReady: "Agent 2 inherited the same remaining slot. Launch both agents together; only one can reserve it.",
    retry: "Run agent 1 failing attempt", handoff: "Hand control to agent 2", race: "Race two agents for the final slot", after: "Request another synthetic action", timeout: "Simulate lost destination acknowledgement", stop: "Activate simulated emergency stop", recovery: "Authorize simulated recovery", reconcile: "Reconcile UNKNOWN without retry", reset: "Reset fictional scenario", replay: "Verify hash-linked Replay", verified: "Replay hashes verified", notVerified: "Replay has not been checked", effects: "Independently read synthetic destination effects", unknown: "UNKNOWN — reconcile before retry or recovery", ready: "Ready. Start with two failed attempts; handoff preserves the shared limit.", stopped: "Emergency stop effective. New requests are denied. Existing external effects cannot be undone.", used: "The three shared slots are exhausted; switching agents or tools does not refill them.", journal: "Decisions and Replay", inspect: "Inspect complete synthetic records", preparing: "Recording synthetic evidence…", error: "The simulation could not complete. Reset and try again.",
  },
  es: {
    title: "04 · Límite compartido del bucle", badge: "SIMULACIÓN ILUSTRATIVA · ILLUSTRATIVE SIMULATION", objective: "Objetivo: cruzar el río ficticio completando una acción sintética de herramienta.",
    boundary: "Este modelo interactivo del navegador está separado del gateway de ejecución. Usa agentes ficticios, reservas serializadas y un registro de destino independiente en memoria. No envía solicitudes de red, no ejecuta IA ni acredita garantías de seguridad alojada.",
    attempts: "Intentos compartidos consumidos", retries: "Reintentos permitidos", cost: "Coste estimado acumulado", policy: "Política ficticia vigente", estimate: "Solo una estimación ilustrativa: sin tokens de modelo, gasto real ni facturación observada.",
    retryState: "La herramienta del agente 1 ha fallado. La reserva consume un permiso compartido; el reintento aplica la misma política.", handoffReady: "Han fallado dos intentos. Queda un permiso compartido: pase el control al agente 2 sin crear otro presupuesto.", raceReady: "El agente 2 hereda el mismo permiso restante. Lance ambos agentes a la vez; solo uno puede reservarlo.",
    retry: "Ejecutar intento fallido del agente 1", handoff: "Pasar el control al agente 2", race: "Disputar el último permiso entre dos agentes", after: "Solicitar otra acción sintética", timeout: "Simular la pérdida de confirmación del destino", stop: "Activar parada de emergencia simulada", recovery: "Autorizar recuperación simulada", reconcile: "Conciliar UNKNOWN sin reintentar", reset: "Reiniciar escenario ficticio", replay: "Verificar Replay encadenado por hash", verified: "Hashes de Replay verificados", notVerified: "Replay todavía no verificado", effects: "Efectos sintéticos leídos por separado en el destino", unknown: "UNKNOWN — conciliar antes de reintentar o recuperar", ready: "Preparado. Comience con dos intentos fallidos; el relevo conserva el límite compartido.", stopped: "Parada de emergencia efectiva. Se deniegan solicitudes nuevas. Los efectos externos existentes no pueden deshacerse.", used: "Los tres permisos compartidos están agotados; cambiar de agente o herramienta no los repone.", journal: "Decisiones y Replay", inspect: "Examinar registros sintéticos completos", preparing: "Registrando pruebas sintéticas…", error: "La simulación no pudo completarse. Reinicie e inténtelo de nuevo.",
  },
} as const;
const initial = (): LoopSnapshot => new LoopSimulation().snapshot();

export function LoopLimitDemo({ locale }: { locale: WatchtowerLocale }) {
  const copy = loopCopy[locale];
  const model = useRef<LoopSimulation | null>(null);
  const [state, setState] = useState(initial);
  const [timeout, setTimeoutMode] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const getModel = () => model.current ?? (model.current = new LoopSimulation());
  async function act(work: (simulation: LoopSimulation) => Promise<unknown>) {
    setBusy(true); setMessage(""); setVerified(false);
    try { await work(getModel()); setState(getModel().snapshot()); }
    catch { setMessage(copy.error); }
    finally { setBusy(false); }
  }
  function reset() { model.current = new LoopSimulation(); setState(model.current.snapshot()); setTimeoutMode(false); setMessage(""); setVerified(false); }
  return <section className="watchtower-demo loop-limit-demo" aria-labelledby="loop-limit-title" id="loop-limit">
    <p className="watchtower-notice">{copy.badge}</p>
    <h2 id="loop-limit-title">{copy.title}</h2><p>{copy.objective}</p><p className="watchtower-caption">{copy.boundary}</p>
    <dl className="loop-metrics"><div><dt>{copy.attempts}</dt><dd data-testid="loop-used">{state.used} / 3</dd></div><div><dt>{copy.retries}</dt><dd>2</dd></div><div><dt>{copy.cost}</dt><dd data-testid="loop-cost">{(state.estimatedCostMicros / 1_000_000).toFixed(3)} USD</dd></div></dl>
    <p>{copy.policy}: <code>{state.policy.version}</code> · <code>{state.policy.quotaScope}</code> · 3 {locale === "es" ? "llamadas totales" : "total calls"} · 0.003 USD {locale === "es" ? "máximo estimado" : "estimated cap"}.</p><p className="watchtower-caption">{copy.estimate}</p>
    <div className="loop-controls">
      <button type="button" disabled={busy || state.stopped || state.used >= 2} onClick={() => void act(s => s.attempt("agent-1", `failed-attempt-${state.used + 1}`))}>{copy.retry}</button>
      <button type="button" disabled={busy || state.stopped || state.used !== 2 || state.handedOff} onClick={() => void act(s => s.handoff())}>{copy.handoff}</button>
      <label className="loop-timeout"><input type="checkbox" checked={timeout} disabled={busy || state.used >= 3} onChange={event => setTimeoutMode(event.target.checked)} />{copy.timeout}</label>
      <button type="button" className="brand-primary-action" disabled={busy || state.stopped || !state.handedOff || state.used !== 2} onClick={() => void act(s => s.race(timeout))}>{copy.race}</button>
      <button type="button" disabled={busy || (!state.stopped && state.used < 3)} onClick={() => void act(s => s.attempt("agent-2", `extra-request-${state.events.length}`, "COMPLETE"))}>{copy.after}</button>
      <button type="button" disabled={busy || state.stopped} onClick={() => void act(s => s.stop())}>{copy.stop}</button>
      <button type="button" disabled={busy || !state.unknown.length} onClick={() => void act(s => s.reconcile())}>{copy.reconcile}</button>
      <button type="button" disabled={busy || !state.stopped || Boolean(state.unknown.length)} onClick={() => void act(s => s.recover())}>{copy.recovery}</button>
      <button type="button" disabled={busy || !state.events.length} onClick={() => void act(async s => { setVerified(await verifyLoopReplay(s.snapshot().events)); })}>{copy.replay}</button>
      <button type="button" disabled={busy} onClick={reset}>{copy.reset}</button>
    </div>
    <div role="status" aria-live="polite" aria-atomic="true" className="watchtower-results">
      <p>{busy ? copy.preparing : message || (state.unknown.length ? copy.unknown : state.stopped ? copy.stopped : state.used >= 3 ? copy.used : state.handedOff ? copy.raceReady : state.used === 2 ? copy.handoffReady : state.used === 1 ? copy.retryState : copy.ready)}</p>
      <p>{copy.effects}: <strong data-testid="loop-effects">{state.unknown.length ? "UNKNOWN" : state.observed ?? 0}</strong></p><p data-testid="loop-verification">{verified ? copy.verified : copy.notVerified}</p>
    </div>
    <h3>{copy.journal}</h3><ol className="loop-journal" data-testid="loop-journal">{state.events.map(event => <li key={event.digest}><strong>{event.kind}</strong> · {String(event.details.agent ?? event.details.operator ?? "")}{event.details.decision ? <> · <strong>{String(event.details.decision)}</strong> · {String(event.details.reason)}</> : null}{event.details.outcome ? <> · {String(event.details.outcome)}</> : null}<p><code>{event.digest}</code></p></li>)}</ol>
    <details className="watchtower-technical"><summary>{copy.inspect}</summary><pre tabIndex={0} data-testid="loop-records">{JSON.stringify(state.events, null, 2)}</pre></details>
  </section>;
}
