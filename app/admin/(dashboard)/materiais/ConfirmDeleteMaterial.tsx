"use client";

import { deleteMaterial } from "./actions";

export default function ConfirmDeleteMaterial({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteMaterial}
      onSubmit={(e) => {
        if (!confirm(`Excluir o material "${title}"? Os leads já capturados são mantidos.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-400">
        Excluir
      </button>
    </form>
  );
}
