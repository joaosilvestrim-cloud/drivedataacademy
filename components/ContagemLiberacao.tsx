"use client";
import { tempoRestante,useRelogioServidor } from "@/lib/use-relogio-servidor";
export default function ContagemLiberacao({liberaEm,agoraInicial,compacto=false}:{liberaEm:string;agoraInicial:number;compacto?:boolean}){const agora=useRelogioServidor(agoraInicial);return <span role="timer" aria-label={`Tempo restante para liberação: ${tempoRestante(liberaEm,agora)}`} className={`font-mono tabular-nums ${compacto?"text-xs text-amber-300":"text-2xl text-white"}`}>{tempoRestante(liberaEm,agora)}</span>;}
