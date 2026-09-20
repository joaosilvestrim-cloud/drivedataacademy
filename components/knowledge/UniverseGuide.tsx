"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import styles from './universe.module.css';

export default function UniverseGuide({isDemo}:{isDemo:boolean}) {
  const tr = usarTraducao();
  return <>
    <h2 id="universe-help-title">{tr("Seu aprendizado, visto de outro jeito.")}</h2>
    <p id="universe-help-description">{tr("O Knowledge Universe 4D transforma suas atividades na plataforma em um mapa de competências. Você explora o que já desenvolveu, acompanha sua evolução e encontra possibilidades para continuar aprendendo.")}</p>
    {isDemo && <p className={styles.guideNotice}>{tr("Você está na demonstração: o perfil e as atividades são fictícios. Aqui, experimentar não altera seu histórico acadêmico.")}</p>}
    <div className={styles.guideGrid}>
      <section><h3>{tr("O que estou vendo?")}</h3><dl className={styles.guideLegend}>
        <div><dt>{tr("Núcleos e cores")}</dt><dd>{tr("Agrupam grandes áreas, como Dados, Gestão e IA.")}</dd></div>
        <div><dt>{tr("Estrelas com nome")}</dt><dd>{tr("São competências. Quanto maior a estrela, maior o domínio evidenciado.")}</dd></div>
        <div><dt>{tr("Linhas")}</dt><dd>{tr("Mostram relações entre conhecimentos. Selecione uma estrela para destacar suas conexões.")}</dd></div>
        <div><dt>{tr("Estrelas vazias")}</dt><dd>{tr("São oportunidades: ainda não há pontuação registrada para aquela competência.")}</dd></div>
      </dl><p>{tr("As pequenas estrelas ao fundo compõem o cenário. Elas não representam notas ou atividades.")}</p></section>
      <section><h3>{tr("O que significa meu score?")}</h3><p>O <strong>{tr("domínio evidenciado")}</strong> {tr("vai de 0 a 100 e reúne progresso, avaliações e atividades práticas conforme os critérios de cada competência. Concluir um curso contribui para essa pontuação, mas não garante domínio completo.")}</p><p><strong>{tr("68/100 em DAX")}</strong>{tr(", por exemplo, significa 68 pontos nos critérios cadastrados. Não significa conhecer exatamente 68% de tudo que existe sobre DAX.")}</p><p>{tr("Ao selecionar uma competência, abra")} <strong>{tr("“Como este score é calculado”")}</strong> e <strong>{tr("“Evidências neste período”")}</strong> {tr("para entender seu resultado. Repetir a mesma evidência não soma pontos indefinidamente.")}</p></section>
      <section><h3>{tr("Score e atualidade são diferentes")}</h3><p>{tr("O score mostra o domínio que você demonstrou. A")} <strong>{tr("atualidade")}</strong> {tr("indica há quanto tempo houve uma evidência validada. O brilho ao redor da estrela e sua pulsação acompanham essa recência.")}</p><p>{tr("Com o tempo, a atualidade pode diminuir. Isso é um convite à revisão: a passagem do tempo, por si só, não retira seu score, seus certificados ou suas conquistas.")}</p></section>
      <section><h3>{tr("Por que 4D?")}</h3><p>{tr("Você explora o mapa em")} <strong>3D</strong>{tr(". A quarta dimensão é o")} <strong>{tr("tempo")}</strong>{tr(": arraste a linha do tempo ou clique em")} <strong>{tr("“Reproduzir minha evolução”")}</strong> {tr("para acompanhar as mudanças registradas.")}</p><p>{isDemo?tr("Na demonstração, você acompanha a evolução de um aluno fictício."):tr("Avaliações e certificados antigos usam suas datas registradas. Quando não conhecemos as datas do progresso antigo, ele aparece a partir da importação. Por isso, a linha do tempo pode não mostrar toda a sua trajetória anterior.")}</p></section>
    </div>
    <section className={styles.guideNext}><h3>{tr("Como desenvolver meu universo?")}</h3><ol>
      <li><strong>{tr("Estude os treinamentos associados.")}</strong> {tr("O progresso e as avaliações alimentam as competências configuradas para cada curso.")}</li>
      <li><strong>{tr("Coloque o conhecimento em prática.")}</strong> {tr("Exercícios, desafios e revisões validados pela equipe também contribuem.")} {isDemo?tr("A aba Desafios permite experimentar um exercício fictício."):tr("Nesta versão, a equipe registra essas evidências; você as consulta na aba Desafios.")}</li>
      <li><strong>{tr("Explore seus próximos passos.")}</strong> {tr("“Próximas conexões” mostra requisitos que você já atende. Estar pronto para começar uma competência ainda não significa dominá-la. “Caminhos” apresenta uma sequência de aprendizagem.")}</li>
    </ol><p>{tr("Seu mapa considera as evidências disponíveis na plataforma. Uma competência sem pontuação não significa que você não a conhece — pode significar que ainda não temos um registro desse conhecimento.")}</p></section>
    <section className={styles.guideControls}><h3>{tr("Comece por uma estrela")}</h3><p>{tr("Arraste para girar; use a roda do mouse ou o gesto de pinça no celular para aproximar. No computador, arraste com o botão direito para mover a câmera. Clique em uma competência para ver seus detalhes. Use a busca, os filtros ou o modo")} <strong>{tr("Lista")}</strong>{tr(", que também permite explorar pelo teclado.")}</p><p>{tr("Os resultados seguem regras da plataforma, sem avaliação por inteligência artificial.")}</p></section>
  </>;
}
