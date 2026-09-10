// Educational simulation. All money is rounded to cents; no real market forecasts.
export type Difficulty = 'guided' | 'standard' | 'expert';
export type Area = 'sales' | 'stock' | 'finance' | 'operations';
export interface Decision { price:number; marketing:number; order:number; express:boolean; team:number }
export interface Delivery { quantity:number; value:number; round:number }
export interface Round {
  round:number; day:number; decision:Decision; event:string; demand:number; sold:number; lost:number;
  revenue:number; costOfGoods:number; overhead:number; profit:number; cash:number; stock:number;
  satisfaction:number; service:number; receipts:number; purchase:number; notes:string[];
}
export interface State {
  difficulty:Difficulty; day:number; cash:number; stock:number; inventoryValue:number;
  satisfaction:number; profit:number; revenue:number; sold:number; demand:number;
  deliveries:Delivery[]; history:Round[];
}
export const LEVELS:Record<Difficulty,{label:string;cash:number;target:number;description:string}> = {
  guided:{label:'Explorador',cash:36000,target:16000,description:'Mais reserva de caixa para experimentar.'},
  standard:{label:'Gestor',cash:26000,target:22000,description:'Equilibre crescimento, caixa e atendimento.'},
  expert:{label:'Estrategista',cash:19000,target:26000,description:'Menos caixa e maior meta de resultado.'},
};
export const DEFAULT_DECISION:Decision={price:55,marketing:600,order:450,express:false,team:1};
export const EVENTS = [
  {name:'Uma nova gestão',headline:'A demanda está estável. Seu desafio é vender com margem e preservar o atendimento.',demand:1,cost:34},
  {name:'Concorrência em promoção',headline:'Um concorrente lançou descontos. A procura pela sua loja cai 12% neste ciclo.',demand:.88,cost:34},
  {name:'Semana de maior procura',headline:'Um evento no bairro aumenta a procura em 22%. Planeje estoque e atendimento.',demand:1.22,cost:34},
  {name:'Pressão nos fornecedores',headline:'Novas compras custam R$ 38 por unidade. O estoque já comprado mantém seu custo.',demand:1,cost:38},
  {name:'Vitrine do bairro',headline:'O comércio local ganha visibilidade: a procura sobe 12%.',demand:1.12,cost:36},
  {name:'Fechamento do mês',headline:'Últimos cinco dias. Compras normais chegarão depois da missão; cuide do caixa.',demand:.95,cost:34},
] as const;
const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function initial(difficulty:Difficulty):State {
  if(!Object.hasOwn(LEVELS,difficulty))throw new Error('Nível inválido.');
  return {difficulty,day:0,cash:LEVELS[difficulty].cash,stock:500,inventoryValue:17000,satisfaction:75,profit:0,revenue:0,sold:0,demand:0,deliveries:[],history:[]};
}
export function validateDecision(input:unknown):Decision {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Decisão inválida.');
  const d=input as Decision;
  for(const [key,min,max,step] of [['price',40,80,1],['marketing',0,2400,100],['order',0,1000,25],['team',0,3,1]] as const) {
    if(typeof d[key]!=='number'||!Number.isFinite(d[key])||d[key]<min||d[key]>max||d[key]%step!==0)throw new Error('Revise os valores da decisão.');
  }
  if(typeof d.express!=='boolean')throw new Error('Entrega inválida.');
  return {price:d.price,marketing:d.marketing,order:d.order,express:d.express,team:d.team};
}
export function quote(state:State,decision:Decision) {
  const d=validateDecision(decision),event=EVENTS[Math.min(5,state.history.length)];
  const unitCost=money(event.cost*(d.express?1.15:1));
  const purchase=money(d.order*unitCost);
  const overhead=3250+d.marketing+d.team*750;
  return {unitCost,purchase,overhead,upfront:money(purchase+overhead),capacity:(80+20*d.team)*5};
}
export function advance(state:State,input:unknown):State {
  if(state.day>=30)throw new Error('Esta missão já foi concluída. Comece uma nova estratégia.');
  const decision=validateDecision(input),round=state.history.length,event=EVENTS[round];
  const budget=quote(state,decision);
  if(budget.upfront>state.cash)throw new Error('O caixa não cobre compras e custos deste ciclo. Reduza a compra, divulgação ou equipe.');
  const next:State={...state,deliveries:state.deliveries.map(d=>({...d})),history:[...state.history]};
  let receipts=0;
  for(const delivery of next.deliveries.filter(d=>d.round<=round)) {next.stock+=delivery.quantity;next.inventoryValue=money(next.inventoryValue+delivery.value);receipts+=delivery.quantity;}
  next.deliveries=next.deliveries.filter(d=>d.round>round);
  if(decision.order) {
    if(decision.express) {next.stock+=decision.order;next.inventoryValue=money(next.inventoryValue+budget.purchase);receipts+=decision.order;}
    else next.deliveries.push({quantity:decision.order,value:budget.purchase,round:round+1});
  }
  const demand=Math.round(5*85*event.demand*Math.pow(55/decision.price,1.6)*(1+.14*Math.log1p(decision.marketing/300))*(.65+state.satisfaction/200));
  const sold=Math.min(demand,next.stock,budget.capacity),lost=demand-sold;
  const available=next.stock;
  const costOfGoods=money(sold*(next.stock?next.inventoryValue/next.stock:0));
  next.stock-=sold;next.inventoryValue=money(Math.max(0,next.inventoryValue-costOfGoods));
  const revenue=money(sold*decision.price),profit=money(revenue-costOfGoods-budget.overhead);
  next.cash=money(state.cash-budget.upfront+revenue);
  next.profit=money(state.profit+profit);next.revenue=money(state.revenue+revenue);next.sold+=sold;next.demand+=demand;
  const service=demand?sold/demand:1;
  next.satisfaction=money(clamp(state.satisfaction+(service>=.95?4:-(1-service)*28)-(decision.price>70?2:0),0,100));
  next.day=state.day+5;
  const notes:string[]=[];
  if(lost)notes.push(`${lost} vendas não atendidas: ${available<demand?'estoque insuficiente':''}${available<demand&&budget.capacity<demand?' e ':''}${budget.capacity<demand?'limite da equipe':''}. Vendas perdidas reduzem a satisfação.`);
  else notes.push('Toda a procura foi atendida. A satisfação ganhou 4 pontos, antes do ajuste por preço.');
  if(decision.price!==55)notes.push(`Preço de R$ ${decision.price}: ${decision.price>55?'aumenta a receita por unidade, mas reduz':'estimula'} a procura em relação ao preço de referência de R$ 55.`);
  if(decision.marketing)notes.push(`Divulgação de R$ ${decision.marketing} aumenta a procura, mas entra como despesa integral deste ciclo.`);
  if(decision.order)notes.push(decision.express?'Entrega expressa entrou neste ciclo com acréscimo de 15% no custo de compra.':round===5?'Esta compra chegará após o dia 30. O valor ficou comprometido em estoque em trânsito.':'Compra normal paga agora e disponível no início do próximo ciclo.');
  if(profit<0)notes.push('A margem das vendas não cobriu os custos deste ciclo. Compare preço, custo dos produtos e despesas.');
  notes.push('Compra de estoque reduz caixa imediatamente; só os produtos vendidos entram no custo do resultado.');
  next.history.push({round:round+1,day:next.day,decision,event:event.name,demand,sold,lost,revenue,costOfGoods,overhead:budget.overhead,profit,cash:next.cash,stock:next.stock,satisfaction:next.satisfaction,service:money(service*100),receipts,purchase:budget.purchase,notes});
  return next;
}
export function replay(difficulty:Difficulty,decisions:Decision[]) {return decisions.reduce((state,d)=>advance(state,d),initial(difficulty));}
export function reference(difficulty:Difficulty,rounds=6):State {
  let state=initial(difficulty);
  for(let i=0;i<Math.min(6,rounds);i++) {
    const d={...DEFAULT_DECISION};
    while(quote(state,d).upfront>state.cash&&d.order>0)d.order-=25;
    if(quote(state,d).upfront>state.cash) {d.marketing=0;d.team=0;}
    if(quote(state,d).upfront>state.cash)break;
    state=advance(state,d);
  }
  return state;
}
export function goals(state:State) {
  const level=LEVELS[state.difficulty];
  return [{name:'Resultado acumulado',value:state.profit,target:level.target,unit:'money',met:state.profit>=level.target},
    {name:'Caixa preservado',value:state.cash,target:level.cash,unit:'money',met:state.cash>=level.cash},
    {name:'Satisfação dos clientes',value:state.satisfaction,target:70,unit:'points',met:state.satisfaction>=70}];
}
