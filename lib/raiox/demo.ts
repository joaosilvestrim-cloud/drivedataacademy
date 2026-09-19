import { auditar } from "./regras";
import type { Relatorio, Visual } from "./tipos";

export function laudoExemplo() {
  const visual=(id:string,tipo:string,x:number,y:number,largura:number,altura:number):Visual=>({id,tipo,x,y,largura,altura,campos:[],tituloProprio:true,tituloVisivel:true,temFiltroProprio:false});
  const r:Relatorio={arquivo:"Vendas-exemplo.pbit",formato:"pbit",modeloLido:true,tabelas:["dCalendario","fVendas","dProduto"],temTabelaDeDatas:true,temVisualCustomizado:false,colunasCalculadas:[],relacionamentos:[],medidas:[{nome:"Margem percentual",tabela:"Medidas",dax:"[Lucro] / [Receita]",formato:"0.0%"}],paginas:[{id:"visao-geral",nome:"Visão geral",largura:1280,altura:720,visuais:[visual("receita","card",40,40,360,150),visual("pedidos","card",460,40,360,150),visual("ticket","card",880,40,360,150),visual("receita-mes","lineChart",40,240,800,420),visual("meta","gauge",650,350,590,300)]},{id:"detalhe",nome:"Página 1",largura:1280,altura:720,visuais:[visual("tabela","tableEx",40,40,1300,600)]}]};
  return auditar(r);
}
