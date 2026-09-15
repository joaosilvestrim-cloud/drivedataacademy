"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import "./menu-imersivo.css";

/* Menu imersivo dos benefícios da assinatura. Portado do protótipo do Codex:
   duas colunas de itens, uma cena 3D em CSS no centro para cada item, um
   hipercubo 4D projetado no canvas de fundo e o painel de detalhes embaixo.
   O React monta o DOM e o script original, adaptado, cuida do resto: seleção,
   conexões luminosas, paralaxe do ponteiro e o botão de pausar movimento. */

type Item = { title: string; group: string; tag: string; desc: string; chips: string[] };

const ITENS: Item[] = [
  { title: "Agenda ao vivo", group: "APRENDER", tag: "Toda semana", desc: "Lives, workshops e mentorias com quem faz dados de verdade no mercado. Você acompanha a próxima pelo cronômetro e entra com um clique.", chips: ["Lives", "Workshops", "Mentorias"] },
  { title: "Gravações", group: "APRENDER", tag: "No seu ritmo", desc: "Perdeu o horário? Cada encontro fica gravado na sua agenda para assistir quando puder.", chips: ["Rever encontros", "Aprender no seu ritmo"] },
  { title: "Ferramentas", group: "PRATICAR", tag: "Do aprendizado à aplicação", desc: "Knowledge Universe 4D, DataFlow Lab, Decision Lab e a ferramenta de visuais. Recursos para aplicar o que aprendeu no seu trabalho.", chips: ["Knowledge Universe 4D", "DataFlow Lab", "Decision Lab", "Visuais"] },
  { title: "Treinamentos com preço de assinante", group: "APRENDER", tag: "Condição exclusiva de assinante", desc: "Os treinamentos completos saem por um valor especial, pago uma vez só. O curso fica com você, com aulas, materiais e avaliação.", chips: ["Aulas", "Materiais", "Avaliação"] },
  { title: "Materiais prontos", group: "PRATICAR", tag: "Acelere seus projetos", desc: "Cases reais, arquivos de Power BI e aceleradores para baixar dentro dos treinamentos e adaptar ao seu projeto.", chips: ["Cases reais", "Power BI", "Aceleradores"] },
  { title: "Certificados", group: "CRESCER", tag: "Reconheça sua evolução", desc: "Comprovação das competências que você desenvolveu, com carga horária e o seu nome.", chips: ["Competências", "Carga horária"] },
  { title: "Comunidade", group: "CONECTAR", tag: "Evolua em comunidade", desc: "Troca de experiências e dúvidas com outros profissionais, em canais por assunto.", chips: ["Trocas", "Profissionais de dados", "Canais por assunto"] },
  { title: "Ranking e prêmios", group: "CRESCER", tag: "Sua contribuição tem valor", desc: "Sua participação vira pontos. Quem mais contribui aparece no topo e o primeiro lugar leva prêmio.", chips: ["Participação", "Pontos", "Reconhecimento"] },
  { title: "Vitrine de talentos", group: "CRESCER", tag: "Mostre o que você faz", desc: "Seu perfil, suas skills e seus projetos à mostra para a rede DriveData.", chips: ["Perfil", "Skills", "Projetos"] },
  { title: "Mentoria com especialistas", group: "CONECTAR", tag: "Conte com quem está no mercado", desc: "Agende uma conversa com o time para destravar um desafio do seu dia a dia.", chips: ["Especialistas", "Desafios reais"] },
  { title: "Parcerias e negócios", group: "CONECTAR", tag: "Faça parte do ecossistema B2B", desc: "Oportunidades de participar do ecossistema B2B da DriveData: revenda, projetos e time.", chips: ["Revenda", "Projetos", "Time"] },
];

const n = (k: number) => String(k + 1).padStart(2, "0");
const B = ({ q }: { q: number }) => <>{Array.from({ length: q }, (_, i) => <b key={i} />)}</>;

function Cenas() {
  return (
    <div className="dd-core-perspective">
      <div className="dd-core-object">
        <div className="dd-scene dd-scene-live" data-scene="0" aria-hidden="true">
          <div className="dd-vinyl"><div className="dd-vinyl-label">ON<br /><b>AIR</b></div></div>
          <div className="dd-live-ticket"><span>ENCONTROS</span><strong>AO VIVO</strong><div className="dd-waveform"><B q={15} /></div></div>
        </div>
        <div className="dd-scene dd-scene-replay" data-scene="1" aria-hidden="true" hidden>
          <div className="dd-reel dd-reel-back"><span>SEU ACERVO</span></div><div className="dd-reel dd-reel-mid"><span>WORKSHOPS</span></div>
          <div className="dd-reel dd-reel-front"><span>GRAVAÇÕES</span><strong>RE:<br />PLAY</strong><div className="dd-filmstrip"><B q={8} /></div></div>
        </div>
        <div className="dd-scene dd-scene-lab" data-scene="2" aria-hidden="true" hidden>
          <div className="dd-lab-base"><span>LAB</span></div><div className="dd-lab-column dd-col-a" /><div className="dd-lab-column dd-col-b" /><div className="dd-lab-column dd-col-c" /><div className="dd-lab-orbit" />
          <div className="dd-lab-label">DADOS<br /><b>EM AÇÃO.</b></div>
        </div>
        <div className="dd-scene dd-scene-books" data-scene="3" aria-hidden="true" hidden>
          <div className="dd-book dd-book-back"><span>03</span><b>APLICAR</b></div><div className="dd-book dd-book-mid"><span>02</span><b>PRATICAR</b></div>
          <div className="dd-book dd-book-front"><span>01 / DRIVEDATA</span><strong>VÁ<br />ALÉM.</strong><small>TREINAMENTOS</small></div>
        </div>
        <div className="dd-scene dd-scene-material" data-scene="4" aria-hidden="true" hidden>
          <div className="dd-sheet dd-sheet-back" /><div className="dd-sheet dd-sheet-mid" />
          <div className="dd-sheet dd-sheet-front"><span>DO ARQUIVO AO PROJETO</span><strong>CASE<br />ABERTO.</strong><div className="dd-paper-bars"><B q={5} /></div><small>POWER BI · MATERIAIS</small></div>
        </div>
        <div className="dd-scene dd-scene-certificate" data-scene="5" aria-hidden="true" hidden>
          <div className="dd-credential"><div className="dd-credential-top">DRIVEDATA <span>ACADEMY</span></div><div className="dd-credential-line" /><span className="dd-credential-label">COMPETÊNCIAS</span><strong>Você<br />chegou<br />até aqui.</strong><div className="dd-credential-seal">DD</div><small>CERTIFICADO</small></div>
        </div>
        <div className="dd-scene dd-scene-community" data-scene="6" aria-hidden="true" hidden>
          <div className="dd-word-orbit" /><div className="dd-word dd-word-a">TROCAR.</div><div className="dd-word dd-word-b">CRIAR.</div><div className="dd-word dd-word-c">CRESCER.</div><div className="dd-word-center">JUNTO.</div>
        </div>
        <div className="dd-scene dd-scene-ranking" data-scene="7" aria-hidden="true" hidden>
          <div className="dd-podium dd-podium-two"><span>2</span></div><div className="dd-podium dd-podium-one"><span>1</span></div><div className="dd-podium dd-podium-three"><span>3</span></div>
          <div className="dd-ranking-type">FAÇA A<br /><b>DIFERENÇA.</b></div>
        </div>
        <div className="dd-scene dd-scene-talent" data-scene="8" aria-hidden="true" hidden>
          <div className="dd-gallery dd-gallery-back"><span>SKILLS</span><div className="dd-gallery-orb" /></div>
          <div className="dd-gallery dd-gallery-front"><span>SEU PRÓXIMO CAPÍTULO</span><strong>EM<br />VITRINE.</strong><div className="dd-gallery-art"><B q={3} /></div><small>PROJETOS · TALENTOS</small></div>
        </div>
        <div className="dd-scene dd-scene-mentoring" data-scene="9" aria-hidden="true" hidden>
          <div className="dd-lens dd-lens-back"><span>DESAFIO</span></div><div className="dd-lens dd-lens-front"><span>DIREÇÃO</span></div>
          <div className="dd-mentoring-type">OUTRO<br /><b>OLHAR.</b></div>
        </div>
        <div className="dd-scene dd-scene-partners" data-scene="10" aria-hidden="true" hidden>
          <div className="dd-link-ring dd-link-one" /><div className="dd-link-ring dd-link-two" />
          <div className="dd-partner-type">IDEIAS QUE<br /><b>SE ENCONTRAM.</b></div>
        </div>
      </div>
    </div>
  );
}

export default function MenuImersivo() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".dd-node"));
    const motionButton = q<HTMLButtonElement>(".dd-motion");
    const object = q<HTMLDivElement>(".dd-core-object");
    const space = q<HTMLElement>(".dd-space");
    const canvas = q<HTMLCanvasElement>(".dd-cosmos");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let selected = 0;
    const state = { motion: !matchMedia("(prefers-reduced-motion: reduce)").matches, depth: 1, connections: true };
    let width = 0, height = 0, cx = 0, cy = 0, mobile = false, points: { x: number; y: number }[] = [], active = true, t = 0, last = performance.now(), px = 0, py = 0, tx = 0, ty = 0;

    function select(i: number) {
      selected = i;
      const d = ITENS[i];
      buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
      q(".dd-detail-overline").textContent = `${n(i)} / ${d.group}`;
      q(".dd-detail h2").textContent = d.title;
      q(".dd-detail-tag").textContent = d.tag;
      q(".dd-detail-body p").textContent = d.desc;
      q(".dd-detail-chips").replaceChildren(...d.chips.map((x) => { const s = document.createElement("span"); s.textContent = x; return s; }));
      q(".dd-core-caption>span").textContent = n(i);
      q(".dd-core-caption strong").textContent = d.title;
      root!.querySelectorAll<HTMLElement>(".dd-scene").forEach((scene, j) => {
        scene.getAnimations().forEach((a) => a.cancel());
        scene.hidden = j !== i;
        if (j === i && state.motion) scene.animate([
          { transform: "translate3d(0,26px,-90px) rotateY(-32deg) scale(.80)" },
          { transform: "translate3d(0,-4px,12px) rotateY(4deg) scale(1.02)", offset: 0.73 },
          { transform: "translate3d(0,0,0) rotateY(0deg) scale(1)" },
        ], { duration: 650, easing: "cubic-bezier(.22,.72,.2,1)" });
      });
      measure();
      draw();
    }

    function apply() {
      root!.dataset.motion = state.motion ? "on" : "off";
      root!.querySelectorAll<HTMLElement>(".dd-scene").forEach((s) => s.getAnimations().forEach((a) => (state.motion ? a.play() : a.pause())));
      motionButton.setAttribute("aria-pressed", String(!state.motion));
      q(".dd-motion span").textContent = state.motion ? "Pausar movimento" : "Ativar movimento";
      (q<HTMLElement>(".dd-motion .dd-ic-pause")).hidden = !state.motion;
      (q<HTMLElement>(".dd-motion .dd-ic-play")).hidden = state.motion;
      if (!state.motion) buttons.forEach((b) => (b.style.transform = ""));
      draw();
    }

    const onMotion = () => { state.motion = !state.motion; apply(); };
    motionButton.addEventListener("click", onMotion);

    const clicks = buttons.map((b, i) => { const h = () => select(i); b.addEventListener("click", h); return h; });
    const moves = buttons.map((b) => {
      const move = (e: PointerEvent) => {
        if (!state.motion || e.pointerType === "touch") return;
        const r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        b.style.setProperty("--mx", `${x * 100}%`);
        b.style.setProperty("--my", `${y * 100}%`);
        b.style.transform = `perspective(650px) rotateX(${(0.5 - y) * 10 * state.depth}deg) rotateY(${(x - 0.5) * 13 * state.depth}deg) translateY(-3px)`;
      };
      const leave = () => (b.style.transform = "");
      b.addEventListener("pointermove", move);
      b.addEventListener("pointerleave", leave);
      return { move, leave };
    });
    const spaceMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = space.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const spaceLeave = () => { tx = ty = 0; };
    space.addEventListener("pointermove", spaceMove);
    space.addEventListener("pointerleave", spaceLeave);

    function measure() {
      const r = space.getBoundingClientRect();
      width = r.width; height = r.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobile = width < 565;
      const cr = q(".dd-core").getBoundingClientRect();
      cx = cr.left - r.left + cr.width / 2;
      cy = cr.top - r.top + cr.height * 0.43;
      points = buttons.map((b, i) => { const br = b.getBoundingClientRect(); return { x: i < 5 ? br.right - r.left : br.left - r.left, y: br.top - r.top + br.height / 2 }; });
      draw();
    }

    // Hipercubo 4D: 16 vértices, arestas entre os que diferem em um único bit.
    const vertices: number[][] = [];
    for (let k = 0; k < 16; k++) vertices.push([0, 1, 2, 3].map((b) => (k & (1 << b) ? 1 : -1)));
    const edges: [number, number][] = [];
    for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) { const d = i ^ j; if ((d & (d - 1)) === 0) edges.push([i, j]); }
    function rotate4(v: number[], a: number, b: number, angle: number) { const s = Math.sin(angle), c = Math.cos(angle), x = v[a], y = v[b]; v[a] = x * c - y * s; v[b] = x * s + y * c; }
    function project(v: number[]) {
      const p = v.slice();
      rotate4(p, 0, 3, t * 0.15 + 0.4); rotate4(p, 1, 2, t * 0.09 + 0.65); rotate4(p, 1, 3, t * 0.065); rotate4(p, 0, 2, 0.3 + px * 0.2);
      const f = 2.9 / (3.4 - p[3]);
      const x = p[0] * f, y = p[1] * f, z = p[2] * f;
      const persp = 3.9 / (4.7 - z);
      const size = mobile ? 63 : Math.min(75, width * 0.087);
      return { x: cx + x * persp * size, y: cy + y * persp * size, z };
    }

    function draw() {
      if (!ctx || !width) return;
      ctx.clearRect(0, 0, width, height);
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, mobile ? 175 : 235);
      g.addColorStop(0, "rgba(25,186,183,.13)"); g.addColorStop(0.5, "rgba(10,112,159,.065)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
      const graphicHeight = mobile ? 270 : height;
      for (let i = 0; i < 105; i++) {
        const x = (((Math.sin(i * 127.13) * 43758.5453) % 1 + 1) % 1) * width;
        const y = (((Math.sin(i * 311.71) * 15731.743) % 1 + 1) % 1) * graphicHeight;
        const alpha = 0.1 + 0.17 * (0.5 + 0.5 * Math.sin(t * 0.6 + i));
        ctx.fillStyle = `rgba(118,209,225,${alpha})`;
        ctx.beginPath(); ctx.arc(x + px * 3, y + py * 2, i % 7 === 0 ? 1.1 : 0.6, 0, Math.PI * 2); ctx.fill();
      }
      // Conexões curvas: os rótulos ficam parados e legíveis, só a linha se move.
      if (!mobile && state.connections) points.forEach((p, i) => {
        const side = i < 5 ? -1 : 1;
        const begin = { x: cx + side * 95, y: cy }, end = { x: p.x, y: p.y };
        ctx.beginPath(); ctx.moveTo(begin.x, begin.y);
        ctx.bezierCurveTo(cx + side * 150, begin.y, end.x - side * 55, end.y, end.x, end.y);
        ctx.strokeStyle = i === selected ? "rgba(54,235,186,.65)" : "rgba(66,153,179,.17)";
        ctx.lineWidth = i === selected ? 1.2 : 0.7; ctx.stroke();
        ctx.beginPath(); ctx.arc(end.x, end.y, i === selected ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = i === selected ? "#7dffd5" : "#39727c"; ctx.fill();
        if (i === selected) {
          const u = (t * 0.26) % 1, qq = 1 - u;
          const x = qq * qq * qq * begin.x + 3 * qq * qq * u * (cx + side * 150) + 3 * qq * u * u * (end.x - side * 55) + u * u * u * end.x;
          const y = qq * qq * qq * begin.y + 3 * qq * qq * u * begin.y + 3 * qq * u * u * end.y + u * u * u * end.y;
          ctx.shadowBlur = 12; ctx.shadowColor = "#6affe0"; ctx.fillStyle = "#b5fff0";
          ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      });
      // O hipercubo girando em 4D é projetado em 3D e depois na tela.
      const pv = vertices.map(project);
      edges.forEach(([a, b]) => {
        const v = pv[a], w = pv[b];
        ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(w.x, w.y);
        ctx.strokeStyle = `rgba(78,214,220,${0.04 + (v.z + w.z + 4) * 0.01})`; ctx.lineWidth = 0.7; ctx.stroke();
      });
      pv.forEach((v) => { ctx.fillStyle = "rgba(89,233,224,.6)"; ctx.beginPath(); ctx.arc(v.x, v.y, 1.7, 0, Math.PI * 2); ctx.fill(); });
      for (let j = 0; j < 3; j++) {
        const r = (mobile ? 100 : Math.min(width * 0.135, 132)) + j * 12;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate([-0.5, 0.55, -0.05][j] + px * 0.08);
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * (j === 2 ? 0.78 : 0.39), 0, 0, Math.PI * 2);
        ctx.strokeStyle = ["rgba(72,216,203,.32)", "rgba(53,140,240,.32)", "rgba(139,237,247,.08)"][j]; ctx.lineWidth = j === 2 ? 0.5 : 1; ctx.stroke();
        if (j < 2) {
          const a = t * (j === 0 ? 0.24 : -0.16) + j * 2;
          const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.39;
          ctx.shadowBlur = 18; ctx.shadowColor = j ? "#4fa9ff" : "#48ffd2"; ctx.fillStyle = j ? "#79baff" : "#92ffe0";
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    let raf = 0;
    function animate(now: number) {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.045, (now - last) / 1000);
      last = now;
      if (!active || document.hidden) return;
      if (state.motion) {
        t += dt; px += (tx - px) * 0.055; py += (ty - py) * 0.055;
        object.style.transform = `rotateX(${(-7 - py * 10) * state.depth}deg) rotateY(${(Math.sin(t * 0.42) * 12 + px * 17) * state.depth}deg) translateY(${Math.sin(t * 0.85) * 5 * state.depth}px)`;
        draw();
      }
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(space);
    const visibility = new IntersectionObserver((e) => { active = e[0].isIntersecting; });
    visibility.observe(root);
    if (document.fonts) document.fonts.ready.then(measure);
    apply(); measure();
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      motionButton.removeEventListener("click", onMotion);
      buttons.forEach((b, i) => { b.removeEventListener("click", clicks[i]); b.removeEventListener("pointermove", moves[i].move); b.removeEventListener("pointerleave", moves[i].leave); });
      space.removeEventListener("pointermove", spaceMove);
      space.removeEventListener("pointerleave", spaceLeave);
    };
  }, []);

  const primeiro = ITENS[0];
  const Botao = ({ i }: { i: number }) => (
    <button type="button" className="dd-node" aria-pressed={i === 0} aria-label={ITENS[i].title}>
      <span className="dd-node-number" aria-hidden="true">{n(i)}</span>
      <span className="dd-node-label">{ITENS[i].title}</span>
    </button>
  );

  return (
    <div id="dd-universe" className="dd-full" ref={rootRef} aria-label="Benefícios da assinatura" data-motion="on">
      <main>
        <div className="dd-intro">
          <div className="dd-hero">
            <p className="dd-eyebrow"><span />Assinatura DriveData Academy</p>
            <h1 className="dd-h1">Conhecimento em<br /><em>outra dimensão.</em></h1>
            <p className="dd-lead">Uma assinatura abre a agenda ao vivo, as gravações, a comunidade e as ferramentas. E coloca os treinamentos completos ao seu alcance, com preço de assinante.</p>
            <div className="dd-ctas">
              <Link href="/matricula" className="dd-cta-primary">Quero assinar <ArrowUpRight aria-hidden="true" /></Link>
              <Link href="/entrar" className="dd-cta-secondary">Já sou assinante</Link>
            </div>
          </div>
          <div className="dd-intro-side">
            <p>Selecione um item.<br />Descubra o que ele oferece.</p>
            <button type="button" className="dd-motion" aria-pressed="false">
              <i className="dd-ic-pause" aria-hidden="true"><Pause /></i><i className="dd-ic-play" aria-hidden="true" hidden><Play /></i>
              <span>Pausar movimento</span>
            </button>
          </div>
        </div>
        <section className="dd-space" aria-label="Explore os benefícios da assinatura">
          <canvas className="dd-cosmos" aria-hidden="true" />
          <div className="dd-rail dd-left" aria-label="Aprender e praticar">{[0, 1, 2, 3, 4].map((i) => <Botao key={i} i={i} />)}</div>
          <div className="dd-core" aria-label="Núcleo visual do ecossistema">
            <Cenas />
            <div className="dd-core-caption"><span>01</span><strong>{primeiro.title}</strong></div>
          </div>
          <div className="dd-rail dd-right" aria-label="Conectar e crescer">{[5, 6, 7, 8, 9, 10].map((i) => <Botao key={i} i={i} />)}</div>
        </section>
        <section className="dd-detail" aria-live="polite" aria-atomic="true" aria-label="Detalhes do item selecionado">
          <div className="dd-detail-heading"><span className="dd-detail-overline">01 / {primeiro.group}</span><h2>{primeiro.title}</h2><span className="dd-detail-tag">{primeiro.tag}</span></div>
          <div className="dd-detail-body"><p>{primeiro.desc}</p><div className="dd-detail-chips">{primeiro.chips.map((c) => <span key={c}>{c}</span>)}</div></div>
        </section>
        <footer className="dd-footer">
          <span>Explore os 11 benefícios da assinatura.</span>
          <Link href="/matricula">Conhecer a assinatura <ArrowUpRight aria-hidden="true" /></Link>
        </footer>
      </main>
    </div>
  );
}
