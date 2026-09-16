"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* Campo de senha com o olho de mostrar e esconder. Digitar senha às cegas é a
   maior fonte de erro de login, ainda mais no celular. O botão fica fora da
   ordem de tabulação para não atrapalhar quem usa teclado: a pessoa digita a
   senha e vai direto para o botão de entrar. */

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export default function CampoSenha({ className = "", ...props }: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visivel ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition-colors hover:text-white"
      >
        {visivel ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
    </div>
  );
}
