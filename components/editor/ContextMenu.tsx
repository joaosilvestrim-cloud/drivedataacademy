"use client";

import { useEffect, type ReactNode } from "react";
import {
  Copy, ClipboardPaste, CopyPlus, BringToFront, SendToBack,
  Lock, Unlock, Group, Ungroup, Star, Trash2, EyeOff,
} from "lucide-react";
import { useEditor, elementosAtivos } from "@/lib/editor/store";

export interface MenuCtx {
  x: number;
  y: number;
  id: string;
}

function Item({ icon, label, atalho, onClick, danger }: { icon: ReactNode; label: string; atalho?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] ${danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-viz/10"}`}
    >
      <span className="flex h-4 w-4 items-center justify-center text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {atalho && <span className="font-mono text-[10px] text-muted">{atalho}</span>}
    </button>
  );
}

export default function ContextMenu({ menu, onClose }: { menu: MenuCtx | null; onClose: () => void }) {
  const selectedIds = useEditor((s) => s.selectedIds);
  const el = useEditor((s) => (menu ? elementosAtivos(s).find((e) => e.id === menu.id) : undefined));
  const temColado = useEditor((s) => !!s.elementoCopiado);

  useEffect(() => {
    if (!menu) return;
    const fechar = () => onClose();
    window.addEventListener("pointerdown", fechar);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("blur", fechar);
    return () => {
      window.removeEventListener("pointerdown", fechar);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("blur", fechar);
    };
  }, [menu, onClose]);

  if (!menu || !el) return null;
  const st = useEditor.getState();
  const multi = selectedIds.length > 1;
  const agrupado = !!el.grupo;
  const run = (fn: () => void) => () => { fn(); onClose(); };

  // mantém o menu dentro da janela
  const x = Math.min(menu.x, window.innerWidth - 210);
  const y = Math.min(menu.y, window.innerHeight - 360);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-52 rounded-xl border border-border bg-surface p-1 shadow-2xl"
      style={{ left: x, top: y }}
    >
      <Item icon={<CopyPlus className="h-4 w-4" />} label="Duplicar" atalho="Ctrl+D" onClick={run(() => st.duplicarSelecionado())} />
      <Item icon={<Copy className="h-4 w-4" />} label="Copiar" atalho="Ctrl+C" onClick={run(() => st.copiarElemento(el.id))} />
      <Item icon={<ClipboardPaste className="h-4 w-4" />} label="Colar" atalho="Ctrl+V" onClick={run(() => st.colarElemento())} />
      {temColado ? null : null}
      <div className="my-1 h-px bg-border" />
      <Item icon={<BringToFront className="h-4 w-4" />} label="Trazer para frente" onClick={run(() => st.zOrder(el.id, "frente"))} />
      <Item icon={<SendToBack className="h-4 w-4" />} label="Enviar para trás" onClick={run(() => st.zOrder(el.id, "tras"))} />
      <div className="my-1 h-px bg-border" />
      {multi && (
        <>
          <Item icon={<Group className="h-4 w-4" />} label="Agrupar" atalho="Ctrl+G" onClick={run(() => st.agrupar())} />
          <Item icon={<Ungroup className="h-4 w-4" />} label="Desagrupar" onClick={run(() => st.desagrupar())} />
        </>
      )}
      {!multi && agrupado && (
        <Item icon={<Ungroup className="h-4 w-4" />} label="Desagrupar" onClick={run(() => st.desagrupar())} />
      )}
      <Item icon={el.bloqueado ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />} label={el.bloqueado ? "Desbloquear" : "Bloquear"} onClick={run(() => st.toggleBloqueio(el.id))} />
      <Item icon={<EyeOff className="h-4 w-4" />} label="Ocultar" onClick={run(() => st.toggleVisivel(el.id))} />
      <Item icon={<Star className="h-4 w-4" />} label="Salvar como favorito" onClick={run(() => { const n = window.prompt("Nome do componente favorito:", el.nome); if (n) st.salvarFavorito(n, el); })} />
      <div className="my-1 h-px bg-border" />
      <Item icon={<Trash2 className="h-4 w-4" />} label="Excluir" atalho="Del" danger onClick={run(() => st.removerSelecionados())} />
    </div>
  );
}
