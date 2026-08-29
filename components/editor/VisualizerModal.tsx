"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { buildPreview } from "@/lib/editor/buildPreview";
import Modal from "./Modal";

export default function VisualizerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const doc = useEditor((s) => s.doc);
  const html = useMemo(() => buildPreview(doc), [doc]);
  const [fundo, setFundo] = useState<"claro" | "escuro">("escuro");

  function baixarHtml() {
    const nome = (doc.nome.trim() || "visual").replace(/[^A-Za-z0-9_]/g, "_");
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} titulo="Visualizar" wide>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={baixarHtml} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background">
            <Download className="h-4 w-4" /> Baixar HTML
          </button>
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            {(["claro", "escuro"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFundo(f)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize ${
                  fundo === f ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                Fundo {f}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex items-center justify-center rounded-xl border border-border p-6"
          style={{ background: fundo === "escuro" ? "#0b1220" : "#eef2f7", minHeight: 380 }}
        >
          <iframe
            title="visualizar"
            sandbox=""
            srcDoc={html}
            style={{ width: doc.card.w + 60, height: doc.card.h + 60, background: "transparent" }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          É assim que vai aparecer no Power BI (o card tem fundo transparente).
        </p>
      </div>
    </Modal>
  );
}
