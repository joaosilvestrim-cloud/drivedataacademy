import type { Catalog, Competency, Dimension, Evidence, Requirement, Score } from './types';

export const WEIGHTS: Record<Dimension, number> = { learning: 25, assessment: 35, exercise: 15, challenge: 20, retention: 5 };
export const LABELS: Record<Dimension, string> = { learning: 'Aprendizagem', assessment: 'Avaliações', exercise: 'Exercícios', challenge: 'Desafios', retention: 'Revisões' };
export const DAY = 86400000;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function level(score: number) {
  return score === 0 ? 'Sem evidências' : score < 25 ? 'Em descoberta' : score < 50 ? 'Fundamentos' : score < 80 ? 'Intermediário' : score < 100 ? 'Avançado' : 'Rubrica completa';
}
export function freshness(at: string | null, asOf: string, halfLife: number): number | null {
  if (!at) return null;
  if (!Number.isFinite(halfLife) || halfLife <= 0) throw new Error('Meia-vida inválida');
  return Math.round(100 * 2 ** (-Math.max(0, Date.parse(asOf) - Date.parse(at)) / DAY / halfLife));
}
// Pure, bounded and replayable. Inputs are versioned fixtures in the prototype;
// production will supply only server-validated evidence through a repository.
export function calculate(comp: Competency, events: Evidence[], asOf: string, weights = WEIGHTS): Score {
  const time = Date.parse(asOf);
  if (!Number.isFinite(time)) throw new Error('Data inválida');
  const seen = new Set<string>();
  const evidence = events.filter(e => e.competency === comp.id && Date.parse(e.at) <= time && Date.parse(e.effectiveAt??e.at)<=time && (!e.invalidatedAt || Date.parse(e.invalidatedAt) > time))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))
    .filter(e => {
      if (seen.has(e.id) || !Number.isFinite(e.units) || e.units < 0 || !Number.isFinite(e.quality) || e.quality < 0 || e.quality > 1 || !(e.dimension in WEIGHTS)) return false;
      seen.add(e.id); return true;
    });
  // Retention is credited only for qualified observations >= 7 days apart.
  let lastReview = -Infinity;
  const accepted = evidence.filter(e => {
    if (e.dimension !== 'retention') return true;
    const at = Date.parse(e.at);
    if (!e.qualified || at - lastReview < 7 * DAY) return false;
    lastReview = at; return true;
  });
  const parts = {} as Record<Dimension, number>;
  for (const dim of Object.keys(WEIGHTS) as Dimension[]) {
    if (!Number.isFinite(comp.targets[dim]) || comp.targets[dim] <= 0) throw new Error('Alvo inválido');
    const groups = new Map<string, number>();
    for (const e of accepted.filter(e => e.dimension === dim)) groups.set(e.group, Math.max(groups.get(e.group) ?? 0, e.units * e.quality));
    parts[dim] = weights[dim] * clamp([...groups.values()].reduce((a, b) => a + b, 0) / comp.targets[dim]);
  }
  const advanced = ['assessment', 'challenge'].every(dim => accepted.some(e => e.dimension === dim && e.advanced && e.qualified && e.units>0 && e.quality >= .8));
  const raw = Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0));
  const capped = Math.min(raw, advanced ? 100 : 79);
  const score = capped >= 100 ? 100 : Math.floor(capped);
  const qualified = accepted.filter(e => e.qualified);
  return { id: comp.id, score, raw: capped, level: level(capped), parts, advanced,
    freshness: freshness(qualified.at(-1)?.at ?? null, asOf, comp.halfLifeDays),
    lastActivity: accepted.at(-1)?.at ?? null, evidence: accepted, ready: false, readiness: 0 };
}
export function readiness(rule: Requirement, scores: Record<string, Score>): number {
  if ('competency' in rule) return rule.minimum > 0 ? clamp((scores[rule.competency]?.raw ?? 0) / rule.minimum) : 1;
  if ('all' in rule) return rule.all.length ? Math.min(...rule.all.map(r => readiness(r, scores))) : 0;
  return rule.any.length ? Math.max(...rule.any.map(r => readiness(r, scores))) : 0;
}
export function universe(catalog: Catalog, events: Evidence[], asOf: string): Record<string, Score> {
  const scores = Object.fromEntries(catalog.competencies.map(c => [c.id, calculate(c, events, asOf, catalog.weights ?? WEIGHTS)]));
  for (const unlock of catalog.unlocks) {
    if (!scores[unlock.target]) continue;
    const r = readiness(unlock.rule, scores);
    scores[unlock.target].readiness = r;
    scores[unlock.target].ready = r >= 1;
  }
  return scores;
}
export function achievements(catalog: Catalog, events: Evidence[], asOf: string, history: {at:string;catalog:Catalog}[] = []) {
  const times = [...new Set([...events.map(e=>e.effectiveAt??e.at),...history.map(v=>v.at)].filter(at=>Date.parse(at)<=Date.parse(asOf)))].sort();
  const found = new Map<string, { id: string; label: string; at: string; competency: string }>();
  for (const at of times) {
    const active=history.filter(v=>v.at<=at).at(-1)?.catalog??history[0]?.catalog??catalog;
    const scores = universe(active, events, at);
    for (const c of active.competencies) {
      for (const threshold of [50, 80, 100]) {
        const id = `${c.id}:${threshold}`;
        if (scores[c.id].raw >= threshold && !found.has(id)) found.set(id, { id, label: `${c.name} · ${threshold}`, at, competency: c.id });
      }
    }
  }
  return [...found.values()].sort((a, b) => b.at.localeCompare(a.at));
}
