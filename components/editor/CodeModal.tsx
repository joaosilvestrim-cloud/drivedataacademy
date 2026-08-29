"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Download, ExternalLink } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { generateDax } from "@/lib/editor/generateDax";
import Modal from "./Modal";

const PASSOS = [
  <>No Power BI, adicione o visual <strong>HTML Content</strong> (Obter mais visuais → AppSource → busque &quot;HTML Content&quot;).</>,
  <>Crie uma <strong>nova medida</strong> na sua tabela e cole a DAX copiada aqui.</>,
  <>Arraste essa medida para o campo <strong>Values</strong> do visual HTML Content.</>,
];

export default function CodeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const dax = useMemo(() => generateDax(doc), [doc]);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(dax);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  function baixar(ext: "dax" | "txt") {
    const nome = (doc.nome.trim() || "medida").replace(/[^A-Za-z0-9_]/g, "_");
    const blob = new Blob([dax], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} titulo="Código DAX" wide>
      <div className="flex max-h-[calc(90vh-3rem)] flex-col p-4">
        <div className="mb-3 rounded-xl border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Como usar no Power BI</p>
            <a href="https://appsource.microsoft.com/product/power-bi-visuals/wa200002486" target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] font-medium text-viz-dark hover:underline">
              HTML Content no AppSource <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <ol className="flex flex-col gap-1.5">
            {PASSOS.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-viz text-[10px] font-bold text-white">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mb-2 flex items-center justify-end gap-2">
          <button onClick={() => baixar("dax")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background">
            <Download className="h-4 w-4" /> .dax
          </button>
          <button onClick={() => baixar("txt")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background">
            <Download className="h-4 w-4" /> .txt
          </button>
          <button onClick={copiar} className="flex items-center gap-1.5 rounded-lg bg-viz px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-viz-dark">
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado!" : "Copiar DAX"}
          </button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-[#e2e8f0]">
          {dax}
        </pre>
      </div>
    </Modal>
  );
}
