"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { svgDeInner } from "@/lib/editor/icones";
import { CATEGORIAS_ICONE } from "@/lib/editor/iconeCategorias";

const LIMITE = 168; // teto de ícones renderizados por vez (performance)

interface Props {
  valorAtual?: string;
  cor: string;
  stroke: number;
  onPick: (nome: string, inner: string) => void;
}

export default function IconePicker({ valorAtual, cor, stroke, onPick }: Props) {
  const [icones, setIcones] = useState<Record<string, string> | null>(null);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todos");

  // carrega a base de ícones (≈340 KB) só quando o picker aparece
  useEffect(() => {
    let vivo = true;
    import("@/lib/editor/lucideIconsData").then((m) => { if (vivo) setIcones(m.LUCIDE_ICONS); });
    return () => { vivo = false; };
  }, []);

  const nomes = useMemo(() => (icones ? Object.keys(icones) : []), [icones]);

  const filtrados = useMemo(() => {
    if (!icones) return [];
    const q = busca.trim().toLowerCase().replace(/\s+/g, "-");
    let lista = nomes;
    if (q) lista = lista.filter((n) => n.includes(q));
    else if (cat !== "todos") {
      const c = CATEGORIAS_ICONE.find((x) => x.id === cat);
      if (c) lista = lista.filter((n) => c.re.test(n));
    }
    return lista;
  }, [icones, nomes, busca, cat]);

  const visiveis = filtrados.slice(0, LIMITE);
  const cinza = "var(--foreground)";

  return (
    <div className="flex flex-col gap-2">
      {/* busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ícone… ex.: 'foguete', 'coração', 'gráfico'"
          className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-7 text-xs focus:border-viz focus:outline-none"
        />
        {busca && (
          <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>

      {/* categorias — faixa de rolagem horizontal (economiza altura) */}
      {!busca && (
        <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1 [scrollbar-width:thin]">
          <button onClick={() => setCat("todos")} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${cat === "todos" ? "bg-viz text-white" : "bg-background text-muted hover:text-foreground"}`}>Todos</button>
          {CATEGORIAS_ICONE.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${cat === c.id ? "bg-viz text-white" : "bg-background text-muted hover:text-foreground"}`}>{c.label}</button>
          ))}
        </div>
      )}

      {/* grid */}
      {!icones ? (
        <p className="py-6 text-center text-xs text-muted">Carregando ícones…</p>
      ) : visiveis.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Nenhum ícone encontrado.</p>
      ) : (
        <>
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-border bg-background/40 p-1.5">
            {visiveis.map((n) => (
              <button
                key={n}
                title={n}
                onClick={() => onPick(n, icones[n])}
                className={`flex aspect-square items-center justify-center rounded-md border p-1 transition-colors ${valorAtual === n ? "border-viz bg-viz/10" : "border-transparent hover:border-viz/50 hover:bg-surface"}`}
                dangerouslySetInnerHTML={{ __html: svgDeInner(icones[n], cinza, stroke, "78%") }}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted">
            {filtrados.length > LIMITE ? `Mostrando ${LIMITE} de ${filtrados.length} — refine a busca.` : `${filtrados.length} ícone${filtrados.length === 1 ? "" : "s"}.`}
          </p>
        </>
      )}
    </div>
  );
}
