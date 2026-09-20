import { tr } from "@/lib/i18n/traduzir-servidor";
import DataFlowLab from '@/components/dataflow/DataFlowLab';
export function generateMetadata(){return {title:`DataFlow Lab · ${tr('Demonstração')}`,description:tr('Investigue o faturamento fantasma em um laboratório interativo de dados.')};}
export default function Page(){return <DataFlowLab demo/>;}
