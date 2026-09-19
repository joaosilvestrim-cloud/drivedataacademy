"use client";
import { useEffect,useState } from "react";
/** A contagem progride a partir do horário confirmado pelo servidor, sem confiar no relógio do computador. */
export function useRelogioServidor(agoraInicial:number){const [agora,setAgora]=useState(agoraInicial);useEffect(()=>{const inicio=performance.now();setAgora(agoraInicial);const t=setInterval(()=>setAgora(agoraInicial+performance.now()-inicio),1000);return()=>clearInterval(t);},[agoraInicial]);return agora;}
export function tempoRestante(alvo:string,agora:number){const total=Math.max(0,Math.ceil((Date.parse(alvo)-agora)/1000));if(!Number.isFinite(total))return "Data indisponível";if(!total)return "Confirmando liberação…";const dias=Math.floor(total/86400);const horas=Math.floor(total%86400/3600);const min=Math.floor(total%3600/60);const seg=total%60;return `${dias?`${dias}d `:""}${String(horas).padStart(2,"0")}:${String(min).padStart(2,"0")}:${String(seg).padStart(2,"0")}`;}
