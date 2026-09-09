export type Dimension = 'learning' | 'assessment' | 'exercise' | 'challenge' | 'retention';
export type Vec3 = [number, number, number];
export interface Area { id: string; name: string; color: string; position: Vec3 }
export interface Competency {
  id: string; name: string; area: string; parent?: string; description: string;
  position: Vec3; targets: Record<Dimension, number>; halfLifeDays: number;
}
export interface Relation { source: string; target: string; strength: number }
export type Requirement = { competency: string; minimum: number } | { all: Requirement[] } | { any: Requirement[] };
export interface Unlock { target: string; rule: Requirement }
export interface Evidence {
  id: string; competency: string; dimension: Dimension; group: string;
  units: number; quality: number; at: string; label: string; course?: string;
  qualified?: boolean; advanced?: boolean; completed?: boolean;
  courseId?: string; courseSlug?: string; assessmentScore?: number; imported?: boolean; invalidatedAt?: string; effectiveAt?: string;
}
export interface Score {
  id: string; score: number; raw: number; level: string;
  parts: Record<Dimension, number>; freshness: number | null; lastActivity: string | null;
  evidence: Evidence[]; advanced: boolean; ready: boolean; readiness: number;
}
export interface Catalog {
  version: string; areas: Area[]; competencies: Competency[]; relations: Relation[];
  unlocks: Unlock[]; path: string[];
  weights?: Record<Dimension, number>;
}
export interface CourseMapping { courseId: string; competency: string; weight: number; credits: number; group: string; advanced: boolean }
export interface KnowledgeDocument extends Catalog { mappings: CourseMapping[] }
export interface CatalogVersion { id: string; published_at: string; document: KnowledgeDocument }
export interface ActivityRecord {
  id: string; sequence: number; course_id: string | null; kind: string; source_key: string;
  payload: Record<string, unknown>; occurred_at: string; recorded_at: string;
  precision: 'exact' | 'baseline' | 'imported'; catalog_version: string | null;
}
export interface UniverseData {
  mode: 'live' | 'demo'; catalog: Catalog; events: Evidence[]; start: string; end: string;
  history?: { at: string; catalog: Catalog }[];
  training?: { id: string; title: string; slug: string; competencies: string[] }[];
}
