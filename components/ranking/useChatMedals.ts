'use client';
import {useEffect,useState} from 'react';
import {chatMedals} from '@/app/conta/comunidade/actions';

export function useChatMedals(ids:string[],initial:Record<string,number|null>){
  const [ranks,setRanks]=useState(initial);
  const key=Array.from(new Set(ids)).sort().join(',');
  useEffect(()=>{
    let active=true,running=false;
    const wanted=key?key.split(','):[];
    const refresh=async()=>{
      if(running||document.hidden||!wanted.length)return;
      running=true;
      try{
        const next:Record<string,number|null>={};
        for(let i=0;i<wanted.length;i+=200){const result=await chatMedals(wanted.slice(i,i+200));if(!active)return;Object.assign(next,result.ranks);}
        if(active)setRanks(next);
      }catch{/* Preserve the last server-confirmed snapshot and retry next time. */}
      finally{running=false;}
    };
    const initialTimer=setTimeout(()=>void refresh(),1200);
    const timer=setInterval(()=>void refresh(),30000);
    const visible=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',visible);
    return()=>{active=false;clearTimeout(initialTimer);clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[key]);
  return ranks;
}
