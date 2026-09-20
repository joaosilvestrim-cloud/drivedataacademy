"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { Download,X } from "lucide-react";
import type { ItemLiberacao } from "@/lib/carencia-core";

export default function AvisoMateriaisLiberados(){
  const tr = usarTraducao();
  const pathname=usePathname();const router=useRouter();
  const [aviso,setAviso]=useState<{userId:string;itens:ItemLiberacao[]}|null>(null);
  const vistosNaSessao=useRef(new Set<string>());
  useEffect(()=>{
    setAviso(null);
    if(!pathname?.startsWith("/conta")&&!pathname?.startsWith("/aprender"))return;
    let vivo=true;let timer:ReturnType<typeof setTimeout>;let controller:AbortController|null=null;let pendentes=new Set<string>();let buscando=false;
    async function consultar(){
      if(!vivo||buscando||document.hidden)return;
      buscando=true;controller=new AbortController();let espera=60000;
      try{const r=await fetch("/api/materiais/liberacao",{cache:"no-store",signal:controller.signal});if(!r.ok){if(r.status===401)setAviso(null);return;}const d:{userId:string;agora:number;itens:ItemLiberacao[]}=await r.json();if(!vivo)return;
        let vistos:string[]=[];try{const raw=JSON.parse(localStorage.getItem(`materiais-vistos:${d.userId}`)||"[]");if(Array.isArray(raw))vistos=raw.filter(x=>typeof x==="string");}catch{/* Storage indisponível: o aviso continua funcionando. */}
        const novos=d.itens.filter(i=>i.liberado&&!vistos.includes(i.chave)&&!vistosNaSessao.current.has(`${d.userId}:${i.chave}`));
        setAviso(novos.length?{userId:d.userId,itens:novos}:null);
        if(d.itens.some(i=>i.liberado&&pendentes.has(i.chave)))router.refresh();
        pendentes=new Set(d.itens.filter(i=>!i.liberado).map(i=>i.chave));
        const futuro=d.itens.filter(i=>!i.liberado).map(i=>Date.parse(i.liberaEm)-d.agora).filter(n=>n>0);
        if(futuro.length)espera=Math.max(1000,Math.min(60000,Math.min(...futuro)+250));
      }catch{/* Uma falha transitória não bloqueia a navegação nem libera downloads. */}finally{buscando=false;if(vivo){clearTimeout(timer);timer=setTimeout(consultar,espera);}}
    }
    function retomar(){if(!document.hidden){clearTimeout(timer);void consultar();}}
    void consultar();document.addEventListener("visibilitychange",retomar);window.addEventListener("focus",retomar);
    return()=>{vivo=false;clearTimeout(timer);controller?.abort();document.removeEventListener("visibilitychange",retomar);window.removeEventListener("focus",retomar);};
  },[pathname,router]);
  function fechar(){if(!aviso)return;aviso.itens.forEach(i=>vistosNaSessao.current.add(`${aviso.userId}:${i.chave}`));try{const raw=JSON.parse(localStorage.getItem(`materiais-vistos:${aviso.userId}`)||"[]");const antigos=Array.isArray(raw)?raw.filter(x=>typeof x==="string"):[];localStorage.setItem(`materiais-vistos:${aviso.userId}`,JSON.stringify([...new Set([...antigos,...aviso.itens.map(i=>i.chave)])].slice(-3000)));}catch{/* Fechar deve funcionar mesmo com storage bloqueado. */}setAviso(null);}
  if(!aviso)return null;
  const cursos=[...new Map(aviso.itens.map(i=>[i.cursoId,i])).values()];
  return <aside className="fixed bottom-5 left-4 z-[70] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-brand-green/40 bg-ink-800 p-5 text-white shadow-2xl sm:left-6" aria-label={tr("Materiais liberados")}><div className="flex items-start gap-3"><Download className="shrink-0 text-brand-green" size={23}/><div className="min-w-0 flex-1" role="status"><h2 className="font-display text-lg font-semibold">{tr("Seus materiais já estão liberados!")}</h2><p className="mt-1 text-sm text-slate-300">{aviso.itens.length} {aviso.itens.length===1?"arquivo disponível":"arquivos disponíveis"} {tr("para download.")}</p></div><button type="button" aria-label={tr("Fechar aviso de materiais")} onClick={fechar} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-brand-green"><X size={18}/></button></div><ul className="mt-4 space-y-2">{cursos.slice(0,3).map(i=><li key={i.cursoId}><Link href={i.href} onClick={fechar} className="block rounded-xl bg-brand-green/10 px-3 py-3 text-sm font-medium text-brand-green hover:bg-brand-green/20">Acessar {i.curso} →</Link></li>)}</ul>{cursos.length>3&&<Link href="/conta/cursos" onClick={fechar} className="mt-3 block text-sm text-brand-green underline">{tr("Ver todos os meus cursos")}</Link>}</aside>;
}
