import styles from './universe.module.css';

export default function UniverseGuide({isDemo}:{isDemo:boolean}) {
  return <>
    <h2 id="universe-help-title">Seu aprendizado, visto de outro jeito.</h2>
    <p id="universe-help-description">O Knowledge Universe 4D transforma suas atividades na plataforma em um mapa de competências. Você explora o que já desenvolveu, acompanha sua evolução e encontra possibilidades para continuar aprendendo.</p>
    {isDemo && <p className={styles.guideNotice}>Você está na demonstração: o perfil e as atividades são fictícios. Aqui, experimentar não altera seu histórico acadêmico.</p>}
    <div className={styles.guideGrid}>
      <section><h3>O que estou vendo?</h3><dl className={styles.guideLegend}>
        <div><dt>Núcleos e cores</dt><dd>Agrupam grandes áreas, como Dados, Gestão e IA.</dd></div>
        <div><dt>Estrelas com nome</dt><dd>São competências. Quanto maior a estrela, maior o domínio evidenciado.</dd></div>
        <div><dt>Linhas</dt><dd>Mostram relações entre conhecimentos. Selecione uma estrela para destacar suas conexões.</dd></div>
        <div><dt>Estrelas vazias</dt><dd>São oportunidades: ainda não há pontuação registrada para aquela competência.</dd></div>
      </dl><p>As pequenas estrelas ao fundo compõem o cenário. Elas não representam notas ou atividades.</p></section>
      <section><h3>O que significa meu score?</h3><p>O <strong>domínio evidenciado</strong> vai de 0 a 100 e reúne progresso, avaliações e atividades práticas conforme os critérios de cada competência. Concluir um curso contribui para essa pontuação, mas não garante domínio completo.</p><p><strong>68/100 em DAX</strong>, por exemplo, significa 68 pontos nos critérios cadastrados. Não significa conhecer exatamente 68% de tudo que existe sobre DAX.</p><p>Ao selecionar uma competência, abra <strong>“Como este score é calculado”</strong> e <strong>“Evidências neste período”</strong> para entender seu resultado. Repetir a mesma evidência não soma pontos indefinidamente.</p></section>
      <section><h3>Score e atualidade são diferentes</h3><p>O score mostra o domínio que você demonstrou. A <strong>atualidade</strong> indica há quanto tempo houve uma evidência validada. O brilho ao redor da estrela e sua pulsação acompanham essa recência.</p><p>Com o tempo, a atualidade pode diminuir. Isso é um convite à revisão: a passagem do tempo, por si só, não retira seu score, seus certificados ou suas conquistas.</p></section>
      <section><h3>Por que 4D?</h3><p>Você explora o mapa em <strong>3D</strong>. A quarta dimensão é o <strong>tempo</strong>: arraste a linha do tempo ou clique em <strong>“Reproduzir minha evolução”</strong> para acompanhar as mudanças registradas.</p><p>{isDemo?'Na demonstração, você acompanha a evolução de um aluno fictício.':'Avaliações e certificados antigos usam suas datas registradas. Quando não conhecemos as datas do progresso antigo, ele aparece a partir da importação. Por isso, a linha do tempo pode não mostrar toda a sua trajetória anterior.'}</p></section>
    </div>
    <section className={styles.guideNext}><h3>Como desenvolver meu universo?</h3><ol>
      <li><strong>Estude os treinamentos associados.</strong> O progresso e as avaliações alimentam as competências configuradas para cada curso.</li>
      <li><strong>Coloque o conhecimento em prática.</strong> Exercícios, desafios e revisões validados pela equipe também contribuem. {isDemo?'A aba Desafios permite experimentar um exercício fictício.':'Nesta versão, a equipe registra essas evidências; você as consulta na aba Desafios.'}</li>
      <li><strong>Explore seus próximos passos.</strong> “Próximas conexões” mostra requisitos que você já atende. Estar pronto para começar uma competência ainda não significa dominá-la. “Caminhos” apresenta uma sequência de aprendizagem.</li>
    </ol><p>Seu mapa considera as evidências disponíveis na plataforma. Uma competência sem pontuação não significa que você não a conhece — pode significar que ainda não temos um registro desse conhecimento.</p></section>
    <section className={styles.guideControls}><h3>Comece por uma estrela</h3><p>Arraste para girar; use a roda do mouse ou o gesto de pinça no celular para aproximar. No computador, arraste com o botão direito para mover a câmera. Clique em uma competência para ver seus detalhes. Use a busca, os filtros ou o modo <strong>Lista</strong>, que também permite explorar pelo teclado.</p><p>Os resultados seguem regras da plataforma, sem avaliação por inteligência artificial.</p></section>
  </>;
}
