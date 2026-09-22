import { IDIOMA_PADRAO, type Idioma } from "./idioma";

/* Os textos da área do aluno, em três idiomas.

   O português é a fonte da verdade: ele define as chaves, e as outras línguas
   preenchem as mesmas chaves. Quando faltar uma tradução, a tela mostra o
   português em vez de quebrar ou de mostrar a chave crua, que é pior para
   quem está usando.

   Organização por área da tela (menu, comum, e depois cada página), para o
   arquivo continuar legível enquanto cresce. */

const pt = {
  menu: {
    buscarTela: "Buscar tela",
    grupos: { assistir: "Assistir", praticar: "Praticar", conviver: "Conviver", conta: "Minha conta" },
    itens: {
      meusCursos: "Meus cursos",
      cursos: "Cursos",
      agenda: "Agenda",
      gravacoes: "Gravações",
      ebooks: "Ebooks",
      certificados: "Certificados",
      ferramentas: "Ferramentas",
      novidades: "Novidades",
      comunidade: "Comunidade",
      portfolio: "Portfólio",
      ranking: "Ranking",
      vitrine: "Vitrine",
      enquete: "Enquete",
      sugestoes: "Sugestões",
      perfil: "Perfil",
      assinatura: "Assinatura",
      parceria: "Parceria & Negócios",
      ajuda: "Ajuda",
      mentoria: "Agendar mentoria",
    },
    emBreve: "em breve",
    inicio: "Início",
    grupoWhats: "Grupo de avisos",
    grupoWhatsSub: "no WhatsApp",
    sair: "Sair",
    paleta: {
      titulo: "Para onde você quer ir?",
      vazio: "Nenhuma tela com esse nome.",
      grupoFerramentas: "Ferramentas",
    },
    avisoComunidade: {
      naoLidas: (n: number) => `${n} ${n === 1 ? "mensagem nova que você ainda não viu" : "mensagens novas que você ainda não viu"}`,
      aguardando: (n: number) => `${n} ${n === 1 ? "mensagem de aluno aguarda" : "mensagens de alunos aguardam"} resposta`,
    },
    cursosAVenda: (n: number) => `${n} ${n === 1 ? "treinamento à venda" : "treinamentos à venda"}`,
  },

  faixa: {
    regiao: "Próximos eventos",
    titulo: "Próximos eventos",
    agora: "AO VIVO AGORA",
    emMinutos: (n: number) => `em ${n} min`,
    hoje: (hora: string) => `hoje ${hora}`,
    amanha: (hora: string) => `amanhã ${hora}`,
    live: "live",
    mentoria: "mentoria",
    emBreve: "em breve",
  },

  comum: {
    voltar: "Voltar",
    copiar: "Copiar",
    copiado: "Copiado",
    fechar: "Fechar",
    salvar: "Salvar",
    cancelar: "Cancelar",
    buscar: "Buscar",
    limpar: "limpar",
    proximo: "Próximo",
    anterior: "Anterior",
    carregando: "Carregando...",
    idioma: "Idioma",
  },
};

/* Estrutura profunda igual à do português. Tipar como "typeof pt" garante,
   em tempo de compilação, que ninguém esqueça uma chave ao traduzir. */
type Textos = typeof pt;

const en: Textos = {
  menu: {
    buscarTela: "Find a page",
    grupos: { assistir: "Watch", praticar: "Practice", conviver: "Community", conta: "My account" },
    itens: {
      meusCursos: "My courses",
      cursos: "Courses",
      agenda: "Schedule",
      gravacoes: "Recordings",
      ebooks: "Ebooks",
      certificados: "Certificates",
      ferramentas: "Tools",
      novidades: "What's new",
      comunidade: "Community",
      portfolio: "Portfolio",
      ranking: "Leaderboard",
      vitrine: "Directory",
      enquete: "Poll",
      sugestoes: "Suggestions",
      perfil: "Profile",
      assinatura: "Subscription",
      parceria: "Partnerships",
      ajuda: "Help",
      mentoria: "Book mentoring",
    },
    emBreve: "coming soon",
    inicio: "Home",
    grupoWhats: "Announcements group",
    grupoWhatsSub: "on WhatsApp",
    sair: "Sign out",
    paleta: {
      titulo: "Where do you want to go?",
      vazio: "No page with that name.",
      grupoFerramentas: "Tools",
    },
    avisoComunidade: {
      naoLidas: (n: number) => `${n} new ${n === 1 ? "message" : "messages"} you haven't seen`,
      aguardando: (n: number) => `${n} student ${n === 1 ? "message is" : "messages are"} waiting for a reply`,
    },
    cursosAVenda: (n: number) => `${n} ${n === 1 ? "course" : "courses"} available to buy`,
  },

  faixa: {
    regiao: "Upcoming events",
    titulo: "Upcoming events",
    agora: "LIVE NOW",
    emMinutos: (n: number) => `in ${n} min`,
    hoje: (hora: string) => `today ${hora}`,
    amanha: (hora: string) => `tomorrow ${hora}`,
    live: "live",
    mentoria: "mentoring",
    emBreve: "soon",
  },

  comum: {
    voltar: "Back",
    copiar: "Copy",
    copiado: "Copied",
    fechar: "Close",
    salvar: "Save",
    cancelar: "Cancel",
    buscar: "Search",
    limpar: "clear",
    proximo: "Next",
    anterior: "Previous",
    carregando: "Loading...",
    idioma: "Language",
  },
};

const es: Textos = {
  menu: {
    buscarTela: "Buscar pantalla",
    grupos: { assistir: "Ver", praticar: "Practicar", conviver: "Comunidad", conta: "Mi cuenta" },
    itens: {
      meusCursos: "Mis cursos",
      cursos: "Cursos",
      agenda: "Agenda",
      gravacoes: "Grabaciones",
      ebooks: "Ebooks",
      certificados: "Certificados",
      ferramentas: "Herramientas",
      novidades: "Novedades",
      comunidade: "Comunidad",
      portfolio: "Portafolio",
      ranking: "Ranking",
      vitrine: "Directorio",
      enquete: "Encuesta",
      sugestoes: "Sugerencias",
      perfil: "Perfil",
      assinatura: "Suscripción",
      parceria: "Alianzas y Negocios",
      ajuda: "Ayuda",
      mentoria: "Agendar mentoría",
    },
    emBreve: "muy pronto",
    inicio: "Inicio",
    grupoWhats: "Grupo de avisos",
    grupoWhatsSub: "en WhatsApp",
    sair: "Salir",
    paleta: {
      titulo: "¿A dónde quieres ir?",
      vazio: "Ninguna pantalla con ese nombre.",
      grupoFerramentas: "Herramientas",
    },
    avisoComunidade: {
      naoLidas: (n: number) => `${n} ${n === 1 ? "mensaje nuevo que aún no viste" : "mensajes nuevos que aún no viste"}`,
      aguardando: (n: number) => `${n} ${n === 1 ? "mensaje de alumno espera" : "mensajes de alumnos esperan"} respuesta`,
    },
    cursosAVenda: (n: number) => `${n} ${n === 1 ? "curso disponible" : "cursos disponibles"} para comprar`,
  },

  faixa: {
    regiao: "Próximos eventos",
    titulo: "Próximos eventos",
    agora: "EN VIVO AHORA",
    emMinutos: (n: number) => `en ${n} min`,
    hoje: (hora: string) => `hoy ${hora}`,
    amanha: (hora: string) => `mañana ${hora}`,
    live: "en vivo",
    mentoria: "mentoría",
    emBreve: "pronto",
  },

  comum: {
    voltar: "Volver",
    copiar: "Copiar",
    copiado: "Copiado",
    fechar: "Cerrar",
    salvar: "Guardar",
    cancelar: "Cancelar",
    buscar: "Buscar",
    limpar: "limpiar",
    proximo: "Siguiente",
    anterior: "Anterior",
    carregando: "Cargando...",
    idioma: "Idioma",
  },
};

export const TEXTOS: Record<Idioma, Textos> = { pt, en, es };

/** Os textos do idioma pedido. Idioma desconhecido cai no português. */
export function textos(idioma: Idioma): Textos {
  return TEXTOS[idioma] ?? TEXTOS[IDIOMA_PADRAO];
}

export type { Textos };
