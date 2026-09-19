import { extrairRelatorio } from "./extrair";
import { auditar } from "./regras";

self.onmessage = async (evento: MessageEvent<{ arquivo: File }>) => {
  try {
    const arquivo=evento.data.arquivo;
    self.postMessage({etapa:"Lendo o arquivo no seu navegador"});
    const buffer=await arquivo.arrayBuffer();
    self.postMessage({etapa:"Extraindo páginas e modelo"});
    const relatorio=extrairRelatorio(arquivo.name,new Uint8Array(buffer));
    self.postMessage({etapa:"Aplicando regras e montando o mapa"});
    const laudo=auditar(relatorio);
    const hash=await crypto.subtle.digest("SHA-256",buffer);
    const assinatura=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    self.postMessage({laudo,assinatura});
  } catch(e) {self.postMessage({erro:e instanceof Error?e.message:"Não foi possível abrir este arquivo. Confirme o formato no Power BI."});}
};
