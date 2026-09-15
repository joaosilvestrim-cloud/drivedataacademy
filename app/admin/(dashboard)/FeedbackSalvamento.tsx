"use client";

import { useEffect, useRef, useState } from "react";
import "./feedback-salvamento.css";

/* Retorno visual de todo formulário do admin, sem mexer em cada tela.
   1. Ao enviar um formulário, o botão clicado ganha um indicador girando e
      fica travado contra clique duplo.
   2. Enquanto a ação do servidor roda, aparece "Salvando…" no canto.
   3. Quando termina, vira "Salvo" ou a mensagem de erro que a própria ação
      devolveu (?error=). O fim é detectado pela requisição da ação do Next,
      identificada pelo cabeçalho Next-Action. */

type Estado = { fase: "rodando" | "ok" | "erro"; texto: string } | null;

function verbos(rotulo: string) {
  const t = rotulo.toLowerCase();
  if (/exclu|remov|apag|revog/.test(t)) return { rodando: "Excluindo…", ok: "Excluído" };
  if (/reenvi|envi/.test(t)) return { rodando: "Enviando…", ok: "Enviado" };
  if (/liber/.test(t)) return { rodando: "Liberando…", ok: "Liberado" };
  if (/consult/.test(t)) return { rodando: "Consultando…", ok: "Consulta concluída" };
  if (/public|despublic/.test(t)) return { rodando: "Atualizando…", ok: "Atualizado" };
  if (/cri|adicion|nov/.test(t)) return { rodando: "Criando…", ok: "Criado" };
  return { rodando: "Salvando…", ok: "Salvo" };
}

function mensagemDeRedirect(url: string | null): { erro: string | null; ok: string | null } {
  if (!url) return { erro: null, ok: null };
  try {
    const u = new URL(url, window.location.origin);
    return { erro: u.searchParams.get("error"), ok: u.searchParams.get("ok") };
  } catch {
    return { erro: null, ok: null };
  }
}

export default function FeedbackSalvamento() {
  const [estado, setEstado] = useState<Estado>(null);
  const ultimo = useRef<{ botao: HTMLElement | null; quando: number; verbos: ReturnType<typeof verbos> } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Marca o botão que disparou o envio. Captura, para rodar antes do React.
    function aoEnviar(e: Event) {
      const ev = e as SubmitEvent;
      const form = ev.target as HTMLFormElement | null;
      if (!form || form.dataset.semFeedback !== undefined) return;
      const botao = (ev.submitter as HTMLElement | null) ?? form.querySelector<HTMLElement>('button[type="submit"], button:not([type])');
      if (botao?.dataset.salvando !== undefined) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const rotulo = (botao?.textContent || "").trim();
      ultimo.current = { botao, quando: Date.now(), verbos: verbos(rotulo) };
    }
    document.addEventListener("submit", aoEnviar, true);

    // Observa as requisições das ações do servidor.
    const fetchOriginal = window.fetch;
    let emAndamento = 0;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let ehAcao = false;
      try { ehAcao = new Headers(init?.headers).has("next-action"); } catch { /* cabeçalhos exóticos */ }
      const origem = ultimo.current && Date.now() - ultimo.current.quando < 3000 ? ultimo.current : null;
      if (!ehAcao || !origem) return fetchOriginal(input, init);

      ultimo.current = null;
      const botao = origem.botao;
      emAndamento++;
      if (timer.current) clearTimeout(timer.current);
      if (botao) { botao.dataset.salvando = ""; botao.setAttribute("aria-busy", "true"); }
      setEstado({ fase: "rodando", texto: origem.verbos.rodando });

      const finalizar = (fase: "ok" | "erro", texto: string) => {
        emAndamento = Math.max(0, emAndamento - 1);
        if (botao && botao.isConnected) {
          delete botao.dataset.salvando;
          botao.removeAttribute("aria-busy");
          if (fase === "ok") {
            botao.dataset.salvo = "";
            setTimeout(() => { if (botao.isConnected) delete botao.dataset.salvo; }, 1600);
          }
        }
        setEstado({ fase, texto });
        timer.current = setTimeout(() => { if (emAndamento === 0) setEstado(null); }, fase === "erro" ? 6000 : 2600);
      };

      try {
        const res = await fetchOriginal(input, init);
        // Ação que redireciona não volta com res.ok: o que vale é a mensagem
        // do redirect (?error= ou ?ok=) e, sem ela, só status 400+ é falha.
        const { erro, ok } = mensagemDeRedirect(res.headers.get("x-action-redirect"));
        if (erro) finalizar("erro", erro);
        else if (ok) finalizar("ok", ok);
        else if (res.status >= 400) finalizar("erro", "Não foi possível concluir. Tente de novo.");
        else finalizar("ok", origem.verbos.ok);
        return res;
      } catch (err) {
        finalizar("erro", "Sem conexão com o servidor. Tente de novo.");
        throw err;
      }
    };

    return () => {
      document.removeEventListener("submit", aoEnviar, true);
      window.fetch = fetchOriginal;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="fs-area" aria-live="polite" role="status">
      {estado && (
        <div className={`fs-toast fs-${estado.fase}`}>
          <span className="fs-icone" aria-hidden="true">
            {estado.fase === "rodando" ? <span className="fs-giro" /> : estado.fase === "ok" ? "✓" : "!"}
          </span>
          <span className="fs-texto">{estado.texto}</span>
        </div>
      )}
    </div>
  );
}
