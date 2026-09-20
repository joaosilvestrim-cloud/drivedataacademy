"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Download, FileSearch, History, ListChecks, Loader2, ScanLine, ShieldCheck, Upload, X } from "lucide-react";
import { chaveAchado, LIMITE_ARQUIVO, NOME_DIMENSAO, type Laudo, type LaudoSalvo, type Plano, type EstadoRevisao } from "@/lib/raiox/tipos";
import { compararLaudos, nomeProjeto, type ResumoHistorico } from "@/lib/raiox/historico";
import { nomeDoVisual } from "@/lib/raiox/regras";
import { laudoExemplo } from "@/lib/raiox/demo";
import { abrirLaudo, salvarLaudo, salvarPlano } from "./actions";
import s from "./raiox.module.css";

const severidade = { alta: "Prioridade alta", media: "Revisar", baixa: "Oportunidade" };
const data = (iso:string) => new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(iso));
const resumoDe = (v:LaudoSalvo):ResumoHistorico => ({id:v.id,criadoEm:v.criadoEm,projeto:v.projeto,arquivo:v.laudo.arquivo,nota:v.laudo.nota,parcial:v.laudo.parcial,versao:v.laudo.versao || "1.0.0"});
function baixar(nome:string,conteudo:string,tipo:string) {const url=URL.createObjectURL(new Blob([conteudo],{type:tipo}));const a=document.createElement("a");a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function RaioX({nome="Raio-X do Dashboard",historicoInicial=[],demoInicial=false}:{nome?:string;historicoInicial?:ResumoHistorico[];demoInicial?:boolean}) {
  const tr = usarTraducao();
  const [ativo,setAtivo]=useState<LaudoSalvo|null>(null);
  const [historico,setHistorico]=useState(historicoInicial);
  const [aba,setAba]=useState<"diagnostico"|"plano"|"historico">("diagnostico");
  const [entrada,setEntrada]=useState(true);
  const [projeto,setProjeto]=useState("");
  const [etapa,setEtapa]=useState("");
  const [erro,setErro]=useState("");
  const [mensagem,setMensagem]=useState("");
  const [ocupado,setOcupado]=useState(false);
  const [demo,setDemo]=useState(false);
  const [arrastando,setArrastando]=useState(false);
  const [selecionado,setSelecionado]=useState("");
  const [paginaId,setPaginaId]=useState("");
  const [visualId,setVisualId]=useState("");
  const [dimensao,setDimensao]=useState("");
  const [prioridade,setPrioridade]=useState("");
  const [busca,setBusca]=useState("");
  const [anterior,setAnterior]=useState<LaudoSalvo|null>(null);
  const workerRef=useRef<Worker|null>(null);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const detalhe=useRef<HTMLElement>(null);
  const resultado=useRef<HTMLDivElement>(null);
  const trava=useRef(false);

  function parar(){workerRef.current?.terminate();workerRef.current=null;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;setEtapa("");}
  useEffect(()=>()=>{workerRef.current?.terminate();if(timerRef.current)clearTimeout(timerRef.current);},[]);
  useEffect(()=>{if(demoInicial)exemplo();},[demoInicial]); // dados fictícios, sem consulta ou gravação

  function mostrar(v:LaudoSalvo,exemplo=false) {setAtivo(v);setDemo(exemplo);setEntrada(false);setAba("diagnostico");setPaginaId(v.laudo.achados[0]?.alvo?.paginaId||v.laudo.paginas?.[0]?.id||"");setSelecionado(v.laudo.achados[0]?chaveAchado(v.laudo.achados[0]):"");setDimensao("");setPrioridade("");setBusca("");setVisualId("");setAnterior(null);setMensagem("");setErro("");}
  function exemplo(){if(ocupado||workerRef.current)return;const laudo=laudoExemplo();mostrar({id:"exemplo",criadoEm:new Date().toISOString(),projeto:"Vendas (exemplo)",assinatura:"",laudo,plano:{}},true);}
  function analisar(file:File) {
    if(workerRef.current||trava.current)return;
    setErro("");setMensagem("");
    if(!/\.(pbix|pbit)$/i.test(file.name)||file.size>LIMITE_ARQUIVO||!file.size){setErro("Escolha um .pbix ou .pbit válido de até 300 MB. Para reduzir o tamanho, exporte como .pbit.");return;}
    try {
      const w=new Worker(new URL("../../../../lib/raiox/analise.worker.ts",import.meta.url));
      workerRef.current=w;setEtapa("Preparando a análise local");
      timerRef.current=setTimeout(()=>{parar();setErro("A leitura demorou mais de um minuto. Tente exportar o relatório como .pbit ou dividir o arquivo.");},60000);
      w.onmessage=(event:MessageEvent<{etapa?:string;laudo?:Laudo;assinatura?:string;erro?:string}>)=>{
        if(workerRef.current!==w)return;
        if(event.data.etapa){setEtapa(event.data.etapa);return;}
        parar();
        if(event.data.erro){setErro(event.data.erro);return;}
        if(event.data.laudo){const l=event.data.laudo;mostrar({id:"",criadoEm:new Date().toISOString(),projeto:projeto.trim()||nomeProjeto(file.name),assinatura:event.data.assinatura||"",laudo:l,plano:{}});setTimeout(()=>resultado.current?.focus(),0);}
      };
      w.onerror=()=>{if(workerRef.current!==w)return;parar();setErro("A análise foi interrompida. Tente novamente com um arquivo menor ou exportado como .pbit.");};
      w.postMessage({arquivo:file});
    } catch {parar();setErro("Seu navegador não conseguiu iniciar a análise. Recarregue a página e tente novamente.");}
  }

  async function guardar() {
    if(!ativo||demo||trava.current)return;trava.current=true;setOcupado(true);setErro("");
    try {const r=await salvarLaudo(ativo.laudo,ativo.projeto,ativo.assinatura);if(!r.ok){setErro(r.erro);return;}let salvo=r.salvo;
      if(Object.keys(ativo.plano).length){const p=await salvarPlano(salvo.id,ativo.plano);salvo={...salvo,plano:ativo.plano};if(!p.ok)setErro(p.erro);}
      setAtivo(salvo);setHistorico(h=>[resumoDe(salvo),...h.filter(x=>x.id!==salvo.id)].slice(0,30));setMensagem(r.mensagem);
    } catch {setErro("O salvamento foi interrompido. Tente novamente; a mesma versão não será duplicada.");} finally{trava.current=false;setOcupado(false);}
  }
  async function abrir(id:string,comparar=false) {
    if(trava.current||workerRef.current)return;trava.current=true;setOcupado(true);setErro("");
    try {const r=await abrirLaudo(id);if(!r.ok){setErro(r.erro);return;}if(comparar){if(!ativo||!compararLaudos(ativo,r.salvo)){setErro("Compare versões diferentes do mesmo projeto, com as mesmas dimensões avaliadas e a mesma versão de regras.");return;}setAnterior(r.salvo);setAba("diagnostico");}else mostrar(r.salvo);
    }catch{setErro("Não foi possível carregar o histórico. Tente novamente.");}finally{trava.current=false;setOcupado(false);}
  }
  async function atualizarPlano(plano:Plano) {
    if(!ativo||trava.current)return;
    if(!ativo.id||demo){setAtivo({...ativo,plano});setMensagem("Plano atualizado nesta sessão. Salve o diagnóstico ou exporte para conservar sua revisão.");return;}
    trava.current=true;setOcupado(true);setErro("");
    try{const r=await salvarPlano(ativo.id,plano);if(r.ok){setAtivo({...ativo,plano});setMensagem("Plano salvo. Os ajustes serão confirmados por uma nova análise.");}else setErro(r.erro);}catch{setErro("Não foi possível guardar a alteração do plano. Tente novamente.");}finally{trava.current=false;setOcupado(false);}
  }
  const laudo=ativo?.laudo;
  const lista=useMemo(()=>laudo?.achados.filter(a=>(!dimensao||a.dimensao===dimensao)&&(!prioridade||a.severidade===prioridade)&&(!busca||`${a.titulo} ${a.onde} ${a.porque}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase())))||[],[laudo,dimensao,prioridade,busca]);
  const achado=lista.find(a=>chaveAchado(a)===selecionado)||lista[0];
  const pagina=laudo?.paginas?.find(p=>p.id===paginaId)||laudo?.paginas?.[0];
  const comparacao=ativo&&anterior?compararLaudos(ativo,anterior):null;
  const plano=ativo?.plano||{};
  const itensPlano=laudo?.achados.filter(a=>plano[chaveAchado(a)])||[];
  const busy=ocupado||!!etapa;

  function escolher(chave:string){setSelecionado(chave);const a=laudo?.achados.find(a=>chaveAchado(a)===chave);if(a?.alvo)setPaginaId(a.alvo.paginaId);setVisualId("");}
  function escolherVisual(id:string){setVisualId(id);const a=laudo?.achados.find(a=>a.alvo?.paginaId===pagina?.id&&a.alvo?.visuais.includes(id));if(a){setDimensao("");setPrioridade("");setBusca("");setSelecionado(chaveAchado(a));}}

  return <div className={s.root}>
    <div className={s.screenOnly}>
      <Link href="/conta/ferramentas" className={s.back}><ArrowLeft size={15}/> {tr("Todas as ferramentas")}</Link>
      <header className={s.header}><div><p className={s.eyebrow}>{tr("POWER BI / DIAGNÓSTICO")}</p><h1>{nome}</h1><p className={s.subtitle}>{tr("Encontre pontos de atenção, entenda as evidências e organize sua próxima revisão.")}</p></div><span className={s.private}><ShieldCheck size={18}/> {tr("Análise no navegador")}</span></header>
      <div className={s.introActions}>{ativo&&<button disabled={busy} onClick={()=>setEntrada(!entrada)}><Upload size={16}/>{entrada?"Fechar seleção":"Analisar outra versão"}</button>}<button onClick={exemplo} disabled={busy}><ScanLine size={16}/>{tr("Explorar exemplo")}</button><button onClick={()=>setAba("historico")} disabled={busy}><History size={16}/>{tr("Histórico")} <span>{historico.length}</span></button></div>
      {demo&&<p className={s.demo}>{tr("Demonstração com dados fictícios. As interações do exemplo ficam apenas nesta sessão.")}</p>}
      {entrada&&<section className={`${s.upload} ${arrastando?s.dragging:""}`} data-tour="raiox-upload" onDragOver={e=>{e.preventDefault();if(!busy)setArrastando(true);}} onDragLeave={()=>setArrastando(false)} onDrop={e=>{e.preventDefault();setArrastando(false);if(!busy&&e.dataTransfer.files[0])analisar(e.dataTransfer.files[0]);}}>
        <div className={s.uploadIcon}><FileSearch size={27}/></div><h2>{tr("Um novo olhar para o seu relatório")}</h2><p>{tr("Arraste seu arquivo aqui ou escolha no computador.")}</p>
        <input ref={input} type="file" accept=".pbix,.pbit" hidden onChange={e=>{if(e.target.files?.[0])analisar(e.target.files[0]);e.target.value="";}}/>
        <button className={s.primary} disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>{etapa?"Analisando…":"Escolher .pbix ou .pbit"}</button><small>{tr("Até 300 MB. Para relatórios grandes, prefira .pbit.")}</small>
        <label className={s.projectInput}>{tr("Projeto para comparar versões")}<input value={projeto} onChange={e=>setProjeto(e.target.value)} maxLength={100} disabled={busy} placeholder={tr("Ex.: Vendas da empresa (opcional)")}/><small>{tr("Use o mesmo nome nas próximas análises. Se ficar vazio, usamos o nome do arquivo.")}</small></label>
        <div className={s.formats} data-tour="raiox-pbit"><div><b>.pbix</b><span>{tr("Páginas, visuais e organização.")}</span></div><div><b>.pbit</b><span>{tr("Inclui também o modelo e as medidas legíveis.")}</span></div></div>
        <p className={s.privacy}>{tr("O arquivo não é enviado. Ao escolher salvar, o laudo guarda nomes, achados e o mapa estrutural. Fórmulas e linhas de dados não fazem parte do histórico.")}</p>
      </section>}
      {etapa&&<div className={s.processing} role="status"><Loader2 size={20} className={s.spin}/><span>{etapa}…</span><button onClick={()=>{parar();setMensagem("Análise cancelada. O resultado anterior foi mantido.");}}>{tr("Cancelar")}</button></div>}
      {erro&&<p className={s.error} role="alert">{erro}</p>}{mensagem&&<p className={s.message} role="status">{mensagem}</p>}
    </div>

    {laudo&&ativo&&<div ref={resultado} tabIndex={-1} className={s.result}>
      <section className={s.score} data-tour="raiox-nota"><div className={s.scoreRing} style={{"--score":`${laudo.nota}%`} as React.CSSProperties}><strong>{laudo.nota}</strong><span>{tr("de 100")}</span></div><div className={s.scoreText}><p className={s.eyebrow}>{laudo.parcial?"COBERTURA DO RELATÓRIO":"RELATÓRIO E MODELO"} · REGRAS {laudo.versao||"1.0.0"}</p><h2>{ativo.projeto}</h2><p>{laudo.arquivo} · {laudo.resumo.paginas} páginas · {laudo.resumo.visuais} visuais · {laudo.achados.length} {tr("pontos de atenção")}</p><small>{tr("A nota resume as regras aplicáveis. Não certifica os números de negócio nem mede o tempo de execução.")}</small></div><div className={`${s.scoreActions} ${s.screenOnly}`}><button disabled={busy||demo||!!ativo.id} className={s.primary} onClick={guardar}><Check size={16}/>{ativo.id&&!demo?"No histórico":"Salvar diagnóstico"}</button><button onClick={()=>baixar("raio-x-diagnostico.json",JSON.stringify(ativo,null,2),"application/json")}><Download size={16}/>{tr("Exportar JSON")}</button><button onClick={()=>window.print()}>{tr("Imprimir / PDF")}</button></div></section>
      <div className={`${s.dimensions} ${s.screenOnly}`}>{["estrutura","design","clareza","modelo","dax"].map(d=>{const n=laudo.notas.find(n=>n.dimensao===d);return <button key={d} aria-pressed={dimensao===d} onClick={()=>{setDimensao(dimensao===d?"":d);setAba("diagnostico");setSelecionado("");}}><span>{NOME_DIMENSAO[d as keyof typeof NOME_DIMENSAO]}</span><strong>{n?.completa?n.nota:"—"}</strong><small>{n?.completa?`${n.achados} pontos de atenção`:n?.motivo||"Exporte como .pbit"}</small><span className={s.track}><span style={{width:`${n?.completa?n.nota:0}%`}}/></span></button>;})}</div>
      {laudo.parcial&&<p className={`${s.coverage} ${s.screenOnly}`}>{tr("Modelo e DAX não foram avaliados por completo. No Power BI, use")} <b>{tr("Arquivo → Exportar → Modelo do Power BI (.pbit)")}</b>{tr(". O template pode conter nomes e valores nos metadados, embora não inclua as linhas do modelo.")}</p>}
      <nav className={`${s.tabs} ${s.screenOnly}`} aria-label={tr("Seções do diagnóstico")}>{([['diagnostico','Explorar diagnóstico'],['plano',`Plano de ação (${itensPlano.length})`],['historico','Histórico e comparação']] as const).map(([id,label])=><button key={id} aria-pressed={aba===id} onClick={()=>setAba(id)}>{label}</button>)}</nav>
      {comparacao&&<section className={`${s.comparison} ${s.screenOnly}`}><div><p className={s.eyebrow}>{tr("MESMO PROJETO · MESMA COBERTURA")}</p><h3>{comparacao.diferenca>=0?"+":""}{comparacao.diferenca} pontos em relação a {data(anterior!.criadoEm)}</h3><p>{comparacao.resolvidos.length} resolvidos · {comparacao.persistentes.length} persistentes · {comparacao.novos.length} novos</p></div><button aria-label={tr("Fechar comparação")} onClick={()=>setAnterior(null)}><X size={17}/></button>{comparacao.resolvidos.length>0&&<details><summary>{tr("Ver o que deixou de aparecer")}</summary><ul>{comparacao.resolvidos.map(a=><li key={chaveAchado(a)}>{a.titulo} — {a.onde}</li>)}</ul></details>}</section>}

      {aba==="diagnostico"&&<div className={s.screenOnly}>
        <div className={s.filters}><label>{tr("Buscar no diagnóstico")}<input type="search" placeholder={tr("Página, medida ou problema")} value={busca} onChange={e=>setBusca(e.target.value)}/></label><label>{tr("Dimensão")}<select value={dimensao} onChange={e=>setDimensao(e.target.value)}><option value="">{tr("Todas")}</option>{Object.entries(NOME_DIMENSAO).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>{tr("Prioridade")}<select value={prioridade} onChange={e=>setPrioridade(e.target.value)}><option value="">{tr("Todas")}</option>{Object.entries(severidade).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label></div>
        <div className={s.workspace}>
          <div>
            <section className={s.map}><div className={s.mapHead}><h3>{tr("Mapa do relatório")}</h3>{pagina&&<label><span className={s.srOnly}>{tr("Página")}</span><select value={pagina.id} onChange={e=>{setPaginaId(e.target.value);setVisualId("");}}>{laudo.paginas?.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>}</div>
              {pagina?<><div className={s.canvas} style={{aspectRatio:Math.max(.7,Math.min(2.4,pagina.largura/pagina.altura))}} aria-label={`Mapa estrutural de ${pagina.nome}`}>
                {pagina.visuais.map((v,i)=>{const relacionados=laudo.achados.filter(a=>a.alvo?.paginaId===pagina.id&&a.alvo.visuais.includes(v.id));const aceso=visualId===v.id||(!visualId&&achado?.alvo?.paginaId===pagina.id&&achado.alvo.visuais.includes(v.id));const x=Math.max(0,Math.min(98,v.x/pagina.largura*100)),y=Math.max(0,Math.min(96,v.y/pagina.altura*100));return <button key={v.id} aria-label={`${i+1}. ${nomeDoVisual(v.tipo)}. ${relacionados.length} pontos de atenção${v.oculto?'. Oculto':''}`} aria-pressed={!!aceso} className={`${s.visual} ${relacionados.length?s.visualIssue:""} ${v.oculto?s.visualHidden:""}`} style={{left:`${x}%`,top:`${y}%`,width:`${Math.max(2,Math.min(100-x,v.largura/pagina.largura*100))}%`,height:`${Math.max(4,Math.min(100-y,v.altura/pagina.altura*100))}%`}} onClick={()=>escolherVisual(v.id)}><span>{i+1}</span>{v.largura/pagina.largura>.15&&v.altura/pagina.altura>.12&&<small>{nomeDoVisual(v.tipo)}</small>}{relacionados.length>0&&<b>{relacionados.length}</b>}</button>;})}
              </div><label className={s.visualSelect}>{tr("Localizar visual")}<select value={visualId} onChange={e=>escolherVisual(e.target.value)}><option value="">{tr("Escolha um elemento")}</option>{pagina.visuais.map((v,i)=><option value={v.id} key={v.id}>{i+1}. {nomeDoVisual(v.tipo)}{v.oculto?" (oculto)":""}</option>)}</select></label><p className={s.mapNote}>{visualId&&!laudo.achados.some(a=>a.alvo?.paginaId===pagina.id&&a.alvo.visuais.includes(visualId))?"Nenhum achado localizado neste elemento pelas regras aplicadas.":"Selecione um elemento para localizar seus achados. O mapa mostra a estrutura, não os gráficos reais."}</p></>:<p className={s.empty}>{tr("Este laudo antigo não possui mapa. Analise o arquivo novamente para gerar uma versão atualizada.")}</p>}
            </section>
            <div className={s.listHeading}><h3>{tr("Pontos de atenção")}</h3><span>{lista.length} de {laudo.achados.length}</span></div>
            <div className={s.findings} data-tour="raiox-achados">{lista.map(a=><button key={chaveAchado(a)} aria-pressed={achado===a} onClick={()=>escolher(chaveAchado(a))}><span className={s.severity} data-level={a.severidade}/><span><b>{a.titulo}</b><small>{NOME_DIMENSAO[a.dimensao]} · {tr(severidade[a.severidade])} · {a.onde}</small></span><ChevronRight size={16}/></button>)}{!lista.length&&<p className={s.empty}>{tr(laudo.achados.length?"Nenhum ponto corresponde aos filtros.":"Nenhum ponto de atenção nas regras aplicadas. Confira a cobertura: isso não certifica todos os aspectos do relatório.")}</p>}</div>
          </div>
          <section ref={detalhe} className={s.inspector} aria-label={tr("Detalhes do achado")}><p className={s.eyebrow}>{tr("INSPECIONAR E REVISAR")}</p>{achado?<><span className={s.badge} data-level={achado.severidade}>{tr(severidade[achado.severidade])} · {NOME_DIMENSAO[achado.dimensao]}</span><h3 aria-live="polite">{achado.titulo}</h3><p className={s.location}>{achado.onde}</p><h4>{tr("Por que revisar")}</h4><p>{achado.porque}</p><h4>{tr("Como revisar no Power BI")}</h4><p className={s.guidance}>{achado.comoArrumar}</p><button className={s.primary} disabled={busy} onClick={()=>{const k=chaveAchado(achado);const novo={...plano};if(novo[k])delete novo[k];else novo[k]="pendente";void atualizarPlano(novo);}}><ListChecks size={17}/>{tr(plano[chaveAchado(achado)]?"Remover do plano":"Adicionar ao plano")}</button><small>{tr("A marcação manual organiza a revisão. A nota só muda após uma nova análise.")}</small>{achado.regra==="sem_tabela_datas"&&<Link href="/conta/ferramentas/forja" className={s.related}>{tr("Abrir a Forja DAX")} <ArrowRight size={15}/></Link>}<Link href="/conta/comunidade/power-bi" className={s.related}>{tr("Tirar uma dúvida na comunidade")} <ArrowRight size={15}/></Link></>:<p className={s.empty}>{tr("Selecione um ponto de atenção para ver sua evidência e orientação.")}</p>}</section>
        </div>
      </div>}
      {aba==="plano"&&<section className={`${s.plan} ${s.screenOnly}`}><p className={s.eyebrow}>{tr("DA ANÁLISE À AÇÃO")}</p><h2>{tr("Sua próxima revisão")}</h2><p>{itensPlano.filter(a=>plano[chaveAchado(a)]==="ajustado").length} de {itensPlano.length} {tr("ajustes marcados. A confirmação depende de uma nova análise.")}</p>{itensPlano.map(a=><div className={s.planRow} key={chaveAchado(a)}><div><b>{a.titulo}</b><small>{a.onde}</small></div><label><span className={s.srOnly}>{tr("Estado de")} {a.titulo}</span><select disabled={busy} value={plano[chaveAchado(a)]} onChange={e=>void atualizarPlano({...plano,[chaveAchado(a)]:e.target.value as EstadoRevisao})}><option value="pendente">{tr("Pendente")}</option><option value="revisando">{tr("Em revisão")}</option><option value="ajustado">{tr("Ajustado — aguarda análise")}</option></select></label><button disabled={busy} aria-label={`Remover ${a.titulo} do plano`} onClick={()=>{const novo={...plano};delete novo[chaveAchado(a)];void atualizarPlano(novo);}}><X size={17}/></button></div>)}{!itensPlano.length&&<p className={s.empty}>{tr("Abra os achados do diagnóstico e escolha “Adicionar ao plano”.")}</p>}{!ativo.id&&<p className={s.mapNote}>{tr("Este plano está apenas nesta sessão. Salve o diagnóstico ou exporte o JSON para conservá-lo.")}</p>}</section>}
      <section className={s.printOnly}><h2>{tr("Diagnóstico e plano de revisão")}</h2>{laudo.notas.map(n=><p key={n.dimensao}>{NOME_DIMENSAO[n.dimensao]}: {n.completa?n.nota:n.motivo||"Não avaliado"}</p>)}{laudo.achados.map(a=><article key={chaveAchado(a)}><h3>{a.titulo}</h3><p>{a.onde} · {tr(severidade[a.severidade])}</p><p>{a.porque}</p><p>{a.comoArrumar}</p>{plano[chaveAchado(a)]&&<p>{tr("Revisão:")} {plano[chaveAchado(a)]} (informada pelo usuário)</p>}</article>)}</section>
    </div>}
    {aba==="historico"&&<section className={`${s.history} ${s.screenOnly}`} data-tour="raiox-historico"><p className={s.eyebrow}>{tr("SEU TRABALHO, VERSÃO A VERSÃO")}</p><h2>{tr("Histórico de diagnósticos")}</h2><p>{tr("Últimos 30 laudos. Compare versões do mesmo projeto com a mesma cobertura e regras.")}</p>{historico.map(h=><div className={s.historyRow} key={h.id}><strong>{h.nota}</strong><div><b>{h.projeto}</b><small>{h.arquivo} · {data(h.criadoEm)} · {h.parcial?"relatório":"relatório e modelo"} · v{h.versao}</small></div><button disabled={busy} onClick={()=>void abrir(h.id)}>{tr("Abrir")}</button>{ativo&&!demo&&ativo.id!==h.id&&ativo.projeto.trim().toLocaleLowerCase()===h.projeto.trim().toLocaleLowerCase()&&ativo.laudo.versao===h.versao&&<button disabled={busy} onClick={()=>void abrir(h.id,true)}>{tr("Comparar")}</button>}</div>)}{!historico.length&&<p className={s.empty}>{tr("Você ainda não tem diagnósticos salvos. Ao terminar uma análise, escolha “Salvar diagnóstico”.")}</p>}</section>}
    <details className={`${s.help} ${s.screenOnly}`}><summary>{tr("Como interpretar o diagnóstico e proteger os metadados")}</summary><p>{tr("As regras procuram sinais em páginas, visuais, modelo e DAX. Achados são orientações de revisão, não uma validação dos resultados de negócio. Não executamos consultas nem medimos desempenho real.")}</p><p>{tr("PBIX permite revisar a estrutura do relatório. PBIT pode disponibilizar também o modelo. Dimensões sem evidência ficam sem nota. Para exportar um PBIT, abra Arquivo → Exportar → Modelo do Power BI.")}</p><p>{tr("A análise acontece no navegador. Você escolhe se deseja salvar o laudo, que contém nomes e o mapa estrutural. Se esses metadados forem confidenciais, mantenha a análise local. Nenhuma fórmula ou linha de dados é enviada no salvamento.")}</p><p>{tr("Para comparar versões, informe o mesmo nome de projeto. A comparação exige as mesmas dimensões avaliadas e a mesma versão das regras. Uma análise local registra participação autodeclarada, não proficiência comprovada.")}</p></details>
  </div>;
}
