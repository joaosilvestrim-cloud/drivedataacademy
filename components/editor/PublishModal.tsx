"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Share2 } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { buildPreview } from "@/lib/editor/buildPreview";
import { publicarVisual } from "@/app/actions/community";
import Modal from "./Modal";

const SUGESTOES = ["kpi", "vendas", "financeiro", "rh", "gauge", "glass", "dark", "tabela"];

export default function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");
  const [tagsTexto, setTagsTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // ao abrir, prefill com o nome do visual e zera o estado
  useEffect(() => {
    if (open) {
      setOk(false);
      setErro(null);
      setNome((n) => n || (doc.nome && doc.nome !== "MEU_VISUAL" ? doc.nome : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tags = [...new Set(tagsTexto.split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))].slice(0, 6);

  function toggleTag(t: string) {
    setTagsTexto((cur) => {
      const arr = cur.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
      const nova = arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t];
      return nova.join(", ");
    });
  }

  async function publicar() {
    if (!nome.trim()) return setErro("Dê um nome ao seu visual.");
    setEnviando(true);
    setErro(null);
    const res = await publicarVisual({ nome: nome.trim(), descricao: desc, doc, tags });
    setEnviando(false);
    if (!res.ok) return setErro(res.error);
    setOk(true);
  }

  return (
    <Modal open={open} onClose={onClose} titulo="Publicar na comunidade" wide>
      {ok ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-semibold">Publicado na comunidade!</p>
          <p className="max-w-xs text-sm text-muted">Outros membros já podem ver, votar e usar o seu visual como ponto de partida.</p>
          <Link href="/comunidade" className="mt-1 rounded-lg bg-viz px-4 py-2 text-sm font-medium text-white hover:bg-viz-dark">Ver na comunidade</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          {/* Preview ao vivo */}
          <div className="sm:w-56 sm:shrink-0">
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-[#0b1220] sm:h-full sm:min-h-[200px]">
              <iframe title="Prévia" sandbox="" srcDoc={buildPreview(doc)} className="h-full w-full" style={{ background: "transparent", pointerEvents: "none" }} />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted">É assim que vai aparecer.</p>
          </div>

          {/* Campos */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nome <span className="text-red-500">*</span></span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Card de faturamento" className="rounded-md border border-border px-3 py-2 focus:border-viz focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Descrição <span className="text-muted">(opcional)</span></span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Conte em uma linha para que serve esse visual." className="resize-none rounded-md border border-border px-3 py-2 focus:border-viz focus:outline-none" />
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTag(t)} className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${tags.includes(t) ? "border-viz bg-viz text-white" : "border-border text-muted hover:border-viz/50"}`}>#{t}</button>
                ))}
              </div>
              <input value={tagsTexto} onChange={(e) => setTagsTexto(e.target.value)} placeholder="ou digite: kpi, vendas…" className="mt-1 rounded-md border border-border px-3 py-2 text-sm focus:border-viz focus:outline-none" />
              {tags.length > 0 && <span className="text-[11px] text-muted">{tags.length}/6 selecionadas</span>}
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <button onClick={publicar} disabled={enviando || !nome.trim()} className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-viz py-2.5 font-medium text-white transition-colors hover:bg-viz-dark disabled:opacity-50">
              <Share2 className="h-4 w-4" /> {enviando ? "Publicando…" : "Publicar na comunidade"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
