import { tr } from "@/lib/i18n/traduzir-servidor";
import RaioX from "@/app/conta/ferramentas/raio-x/RaioX";
export function generateMetadata() {
  return {title:tr("Demonstração do Raio-X | DriveData Academy"),robots:{index:false,follow:false}};
}
export default function DemoRaioX(){return <main className="min-h-screen bg-ink-900 px-4 py-8 sm:px-8"><RaioX demoInicial/></main>;}
