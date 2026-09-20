import { tr } from "@/lib/i18n/traduzir-servidor";
import DecisionLab from '@/components/decision-lab/DecisionLab';
export function generateMetadata(){return {title:`Decision Lab · ${tr('Demonstração')}`,description:tr('Assuma uma empresa fictícia e teste suas decisões em 30 dias simulados.')};}
export default function DecisionLabDemoPage(){return <DecisionLab userId="demo" demo/>;}
