import type { Metadata } from 'next';
import UniverseExperience from '@/components/knowledge/UniverseExperience';

export const metadata: Metadata = { title: 'Knowledge Universe 4D · DriveData Academy', description: 'Explore uma demonstração do universo de competências em 3D e acompanhe a evolução no tempo.', robots: { index: false, follow: false } };
// Public fictional demo: deliberately does not access student data or AI services.
export default function UniverseDemoPage() { return <UniverseExperience />; }
