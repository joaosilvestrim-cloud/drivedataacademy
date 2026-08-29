"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LayoutTemplate } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { buildPreview } from "@/lib/editor/buildPreview";
import { criarTemplate } from "@/app/actions/admin";
import Modal from "./Modal";

export default function TemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");
  const [premium, setPremium] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (open) {
      setOk(false);
      setErro(null);
      setNome((n) => n || (doc.nome && doc.nome !== "MEU_VISUAL" ? doc.nome : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function criar() {
    if (!nome.trim()) return setErro("Dê um nome ao template.");
    setEnviando(true);
    setErro(null);
    const res = await criarTemplate({ nome: nome.trim(), descricao: desc, premium, formato: "custom", definicao: doc });
    setEnviando(false);
    if (!res.ok) return setErro(res.error);
    setOk(true);
  }

  return (
    <Modal open={open} onClose={onClose} titulo="Salvar como template" wide>
      {ok ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-semibold">Template criado!</p>
          <p className="max-w-xs text-sm text-muted">Já aparece na galeria para os alunos começarem a partir dele.</p>
          <button onClick={onClose} className="mt-1 rounded-lg bg-viz px-4 py-2 text-sm font-medium text-white hover:bg-viz-dark">Fechar</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          {/* Preview ao vivo */}
          <div className="sm:w-56 sm:shrink-0">
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-[#0b1220] sm:h-full sm:min-h-[200px]">
              <iframe title="Prévia" sandbox="" srcDoc={buildPreview(doc)} className="h-full w-full" style={{ background: "transparent", pointerEvents: "none" }} />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted">É assim que o template vai aparecer.</p>
          </div>

          {/* Campos */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nome <span className="text-red-500">*</span></span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Card de faturamento" className="rounded-md border border-border bg-surface px-3 py-2 focus:border-viz focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Descrição <span className="text-muted">(opcional)</span></span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Uma linha sobre para que serve o template." className="resize-none rounded-md border border-border bg-surface px-3 py-2 focus:border-viz focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="h-4 w-4 accent-viz" />
              <span>Exclusivo de assinantes <span className="text-muted">(premium)</span></span>
            </label>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <button onClick={criar} disabled={enviando || !nome.trim()} className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-viz py-2.5 font-medium text-white transition-colors hover:bg-viz-dark disabled:opacity-50">
              <LayoutTemplate className="h-4 w-4" /> {enviando ? "Criando…" : "Criar template"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
