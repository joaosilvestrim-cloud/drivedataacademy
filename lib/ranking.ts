export const MEDAL_TYPES = [
  {key:'gold',name:'Ouro',caption:'Liderança da comunidade',range:'1º lugar',min:1,max:1},
  {key:'silver',name:'Prata',caption:'Conhecimento que inspira',range:'2º lugar',min:2,max:2},
  {key:'bronze',name:'Bronze',caption:'Contribuição que transforma',range:'3º lugar',min:3,max:3},
  {key:'emerald',name:'Esmeralda',caption:'Entre os 10 primeiros',range:'4º ao 10º lugar',min:4,max:10},
  {key:'sapphire',name:'Safira',caption:'Construindo conhecimento',range:'A partir do 11º lugar',min:11,max:Infinity},
] as const;

export function medalTier(rank:number){
  return MEDAL_TYPES.find(t=>Number.isSafeInteger(rank)&&rank>=t.min&&rank<=t.max)??null;
}

// One ordering for the ranking, profile and chat. Equal scores retain the
// existing ranking behavior (the source order); no new tie-break/reward rule.
export function rankUsers(totals:Record<string,number>){
  return Object.entries(totals).map(([id,pts])=>({id,pts})).sort((a,b)=>b.pts-a.pts);
}
export function ranksForUsers(ranked:ReturnType<typeof rankUsers>,ids:string[]):Record<string,number|null>{
  const wanted=new Set(ids);const result:Record<string,number|null>={};
  ids.forEach(id=>{result[id]=null;});
  ranked.forEach((r,index)=>{if(wanted.has(r.id))result[r.id]=index+1;});
  return result;
}
export function validMedalIds(input:unknown):string[]{
  if(!Array.isArray(input)||input.length>200)throw new Error('Informe até 200 participantes.');
  if(input.some(id=>typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw new Error('Participante inválido.');
  return Array.from(new Set(input as string[]));
}
