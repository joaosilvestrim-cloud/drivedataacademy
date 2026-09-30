import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { knowledgeSummary } from "@/lib/knowledge/summary";

/* Convite para o Universo 4D no perfil: um bloco azul-noite (a faixa escura do
   sistema) com uma constelação desenhada nas cores do logo. */
const LINHAS = [[30, 80, 80, 40], [80, 40, 145, 60], [145, 60, 200, 20], [145, 60, 200, 110], [80, 40, 95, 120], [95, 120, 200, 110], [30, 80, 95, 120], [145, 60, 95, 120]];
const ESTRELAS: [number, number, string][] = [[30, 80, "#13b8ef"], [80, 40, "#5fe06a"], [145, 60, "#5fe06a"], [200, 20, "#13b8ef"], [200, 110, "#0b62cf"], [95, 120, "#5fe06a"]];

export default async function ProfilePreview({ userId, email }: { userId: string; email?: string | null }) {
  let summary = tr("Conheça suas competências e acompanhe como seu conhecimento evolui.");
  const { available, developed } = await knowledgeSummary(userId, email);
  if (available)
    summary = developed
      ? `${developed} competências com evidências registradas. Explore seu histórico e descubra os próximos caminhos.`
      : tr("Seu universo está pronto para receber as primeiras evidências de aprendizagem.");
  return (
    <section className="escuro relative mt-6 overflow-hidden rounded-[20px] bg-noite p-7">
      <svg aria-hidden="true" viewBox="0 0 240 150" className="pointer-events-none absolute -right-2 top-3 h-40 w-60 opacity-80">
        <g stroke="#ffffff" strokeOpacity=".22" strokeWidth=".7">
          {LINHAS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        </g>
        {ESTRELAS.map(([cx, cy, cor], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 2 ? 6 : 3.5} fill={cor} />
        ))}
      </svg>
      <div className="relative max-w-sm">
        <p className="text-sm font-medium text-slate-300">{tr("Meu universo de conhecimento")}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{tr("Knowledge Universe 4D")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {tr("Seus estudos viram um mapa de competências em 3D. A quarta dimensão é o tempo: acompanhe o que você desenvolveu e descubra o que aprender a seguir.")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{summary}</p>
        <Link href="/universo" className="mt-6 inline-flex items-center gap-2 rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95">
          {tr("Explorar meu universo")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
