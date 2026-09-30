"use client";

import { useState } from "react";
import { consultarCep, salvarDadosFiscais } from "../actions";

/* Dados para a nota fiscal, só para quem pagou.

   A nota é emitida no Conta Azul, e o cadastro lá precisa de endereço
   completo e RG. O CEP preenche o resto sozinho; o aluno completa número,
   complemento e RG. Quem pagou pelo Asaas não digita CPF: ele já está lá. */

type Dados = { cpf: string; rg: string; cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };

const campo =
  "w-full rounded-srf border border-tinta/20 bg-papel px-4 py-3 text-[15px] text-tinta placeholder:text-slate-500 outline-none transition-colors hover:border-tinta/35 focus:border-marca";
const rotulo = "block text-sm font-semibold text-obsidian";

const mascaraCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const mascaraCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function DadosFiscais({
  inicial,
  cpfDoPagamento,
  enviadoEm,
  erroEnvio,
}: {
  inicial: Dados;
  /** CPF já informado no pagamento pelo Asaas, mascarado. Sem ele, o aluno digita. */
  cpfDoPagamento: string | null;
  enviadoEm: string | null;
  erroEnvio: string | null;
}) {
  const [d, setD] = useState<Dados>({ ...inicial, cep: mascaraCep(inicial.cep), cpf: mascaraCpf(inicial.cpf) });
  const [buscando, setBuscando] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resposta, setResposta] = useState<{ ok: boolean; texto: string } | null>(null);

  const set = (k: keyof Dados) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "cep" ? mascaraCep(e.target.value) : k === "cpf" ? mascaraCpf(e.target.value) : k === "uf" ? e.target.value.toUpperCase().slice(0, 2) : e.target.value;
    setD((x) => ({ ...x, [k]: v }));
    setResposta(null);
    if (k === "cep" && v.replace(/\D/g, "").length === 8) buscar(v);
  };

  async function buscar(cep: string) {
    setBuscando(true);
    setAvisoCep("");
    const r = await consultarCep(cep);
    setBuscando(false);
    if (!r) return setAvisoCep("Não achei esse CEP. Preencha o endereço à mão.");
    setD((x) => ({ ...x, logradouro: r.logradouro || x.logradouro, bairro: r.bairro || x.bairro, cidade: r.cidade || x.cidade, uf: r.uf || x.uf }));
    setTimeout(() => document.getElementById("nf-numero")?.focus(), 50);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setResposta(null);
    const r = await salvarDadosFiscais(d as unknown as Record<string, string>);
    setSalvando(false);
    setResposta(r.ok ? { ok: true, texto: r.mensagem } : { ok: false, texto: r.erro });
  }

  const quando = enviadoEm ? new Date(enviadoEm).toLocaleDateString("pt-BR") : null;

  return (
    <section id="nota-fiscal" className="mt-6 scroll-mt-6 rounded-[20px] border border-tinta/10 bg-papel p-6 sm:p-8 lg:max-w-[calc(100%-21.5rem)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-obsidian">Dados para nota fiscal</h2>
        {quando && !erroEnvio && <span className="text-xs text-slate-400">enviados para a emissão em {quando}</span>}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Precisa de nota fiscal da sua assinatura? Preencha uma vez. A nota sai com estes dados todo mês.
      </p>

      <form onSubmit={salvar} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-cpf">CPF</label>
            {cpfDoPagamento ? (
              <p className="rounded-srf bg-fog px-4 py-3 font-mono text-sm text-charcoal">{cpfDoPagamento}</p>
            ) : (
              <input id="nf-cpf" value={d.cpf} onChange={set("cpf")} inputMode="numeric" placeholder="000.000.000-00" className={campo} />
            )}
            {cpfDoPagamento && <p className="text-xs text-slate-500">O mesmo que você informou no pagamento.</p>}
          </div>
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-rg">RG</label>
            <input id="nf-rg" value={d.rg} onChange={set("rg")} placeholder="Número do RG" className={campo} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-cep">CEP</label>
            <input id="nf-cep" value={d.cep} onChange={set("cep")} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" className={campo} />
          </div>
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-logradouro">Endereço</label>
            <input id="nf-logradouro" value={d.logradouro} onChange={set("logradouro")} autoComplete="address-line1" placeholder={buscando ? "Buscando pelo CEP..." : "Rua, avenida..."} className={campo} />
          </div>
        </div>
        {avisoCep && <p className="-mt-2 text-xs text-amber-200">{avisoCep}</p>}

        <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-numero">Número</label>
            <input id="nf-numero" value={d.numero} onChange={set("numero")} placeholder="123" className={campo} />
          </div>
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-complemento">Complemento <span className="font-normal text-slate-500">(opcional)</span></label>
            <input id="nf-complemento" value={d.complemento} onChange={set("complemento")} autoComplete="address-line2" placeholder="Apto, bloco..." className={campo} />
          </div>
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-bairro">Bairro</label>
            <input id="nf-bairro" value={d.bairro} onChange={set("bairro")} className={campo} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-cidade">Cidade</label>
            <input id="nf-cidade" value={d.cidade} onChange={set("cidade")} autoComplete="address-level2" className={campo} />
          </div>
          <div className="space-y-1.5">
            <label className={rotulo} htmlFor="nf-uf">UF</label>
            <input id="nf-uf" value={d.uf} onChange={set("uf")} autoComplete="address-level1" placeholder="SP" className={`${campo} uppercase`} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={salvando} className="rounded-full bg-marca-verde px-6 py-2.5 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95 disabled:opacity-50">
            {salvando ? "Salvando..." : "Salvar dados da nota"}
          </button>
          {resposta && <span className={`text-sm ${resposta.ok ? "text-acento" : "text-red-300"}`}>{resposta.texto}</span>}
        </div>
        <p className="text-xs text-slate-500">Usamos estes dados só para emitir a sua nota fiscal. Eles não aparecem para outros alunos.</p>
      </form>
    </section>
  );
}
