'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Catalog, Score, Vec3 } from '@/lib/knowledge/types';

interface Props { catalog: Catalog; scores: Record<string, Score>; visible: string[]; selected: string | null; onSelect: (id: string) => void; onArea: (id: string) => void; reduced: boolean; reset: number; zoom: number;
  /* Modo cinema, da página pública do portfólio: cada esfera nasce com uma
     ignição e cada conexão se desenha. Opcional e desligado por padrão, para
     o /universo dos alunos continuar exatamente como era. */
  cinema?: boolean;
  /** Câmera orbitando sozinha, enquanto a carreira toca. */
  girando?: boolean;
  /* Objetos da carreira desenhados por cima da constelação (planetas, nave,
     cometas...), e as posições deles para o enquadramento incluir. Só a
     página pública usa. */
  extras?: React.ReactNode;
  pontosExtras?: Vec3[] }

// Salto elástico: passa um pouco do tamanho final e assenta, como algo que acende.
const elastico = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);

/* Brilho de estrela: um degradê radial desenhado uma vez e reaproveitado por
   todas as esferas acesas. Somado ao fundo (blending aditivo), é o que faz a
   constelação parecer luz e não bolinha. */
let texturaBrilho: THREE.CanvasTexture | null = null;
export function brilho(): THREE.CanvasTexture {
  if (texturaBrilho) return texturaBrilho;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.55)');
  r.addColorStop(.45, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  texturaBrilho = new THREE.CanvasTexture(c); texturaBrilho.colorSpace = THREE.SRGBColorSpace;
  return texturaBrilho;
}

/* Faz o conteúdo nascer: de quase zero ao tamanho real, com o salto. Conta o
   tempo a partir de quando monta, e a esfera monta quando a competência
   acende no quadro. */
function Aparece({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  const grupo = useRef<THREE.Group>(null);
  const nasceu = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ativo || !grupo.current) return;
    if (nasceu.current === null) nasceu.current = clock.elapsedTime;
    const k = Math.min(1, (clock.elapsedTime - nasceu.current) / 1.1);
    grupo.current.scale.setScalar(Math.max(0.001, elastico(k)));
  });
  return <group ref={grupo} scale={ativo ? 0.001 : 1}>{children}</group>;
}
export function Label({ text, position, color = '#e4edf8', size = 1.65 }: { text: string; position: Vec3; color?: string; size?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '500 32px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#040a18'; ctx.shadowBlur = 10; ctx.fillStyle = color; ctx.fillText(text, 256, 48, 500);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[size * 2, size * .375, 1]} renderOrder={5}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}
function Controls({ selected, catalog, reset, zoom, girando, cinema, visible, pontosExtras }: Pick<Props, 'selected' | 'catalog' | 'reset' | 'zoom' | 'girando' | 'cinema' | 'visible' | 'pontosExtras'>) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement); controls.current = orbit;
    orbit.enableDamping = true; orbit.dampingFactor = .07; orbit.minDistance = 5; orbit.maxDistance = 72;
    const changed = () => invalidate();
    orbit.target.set(0, -.6, 0); orbit.addEventListener('change', changed);
    return () => { orbit.removeEventListener('change', changed); orbit.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => { camera.position.set(0, 1.5, 23); controls.current?.target.set(0, -.6, 0); controls.current?.update(); invalidate(); }, [reset, camera, invalidate]);
  useEffect(() => {
    const node = catalog.competencies.find(c => c.id === selected);
    if (node) { controls.current?.target.set(node.position[0] * .45, node.position[1] * .45, node.position[2] * .45); controls.current?.update(); invalidate(); }
  }, [selected, catalog, invalidate]);
  const previousZoom = useRef(zoom);
  useEffect(() => {
    const orbit = controls.current; if (!orbit) return;
    const factor = Math.pow(.8, zoom - previousZoom.current); previousZoom.current = zoom;
    const offset = camera.position.clone().sub(orbit.target).multiplyScalar(factor);
    offset.setLength(THREE.MathUtils.clamp(offset.length(), 5, 72)); camera.position.copy(orbit.target).add(offset); orbit.update(); invalidate();
  }, [zoom, camera, invalidate]);
  useEffect(() => {
    const orbit = controls.current; if (!orbit) return;
    orbit.autoRotate = !!girando; orbit.autoRotateSpeed = .55; invalidate();
  }, [girando, invalidate]);

  /* Enquadramento. No modo cinema a câmera vai até a constelação acesa, em
     vez de ficar no centro do catálogo inteiro: uma carreira concentrada em
     dados aparecia pequena e encostada num canto. A cada quadro novo ela
     reenquadra devagar; depois larga o controle para quem está girando. */
  const desejo = useRef<{ alvo: THREE.Vector3; dist: number } | null>(null);
  const chaveVisiveis = (visible ?? []).join('|') + '#' + (pontosExtras ?? []).map(p => p.join(',')).join('|');
  useEffect(() => {
    if (!cinema) return;
    const pts = [
      ...catalog.competencies.filter(c => (visible ?? []).includes(c.id)).map(c => new THREE.Vector3(...c.position)),
      ...(pontosExtras ?? []).map(p => new THREE.Vector3(...p)),
    ];
    if (!pts.length) return;
    const centro = pts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const raio = Math.max(2.2, ...pts.map(p => p.distanceTo(centro)));
    desejo.current = { alvo: centro, dist: THREE.MathUtils.clamp(raio * 2.4 + 5, 8, 58) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinema, catalog, chaveVisiveis, reset]);
  useFrame(() => {
    const orbit = controls.current; const d = desejo.current;
    if (!orbit || !d) return;
    orbit.target.lerp(d.alvo, .045);
    const offset = camera.position.clone().sub(orbit.target);
    const novo = THREE.MathUtils.lerp(offset.length(), d.dist, .045);
    offset.setLength(novo); camera.position.copy(orbit.target).add(offset);
    if (orbit.target.distanceTo(d.alvo) < .01 && Math.abs(novo - d.dist) < .02) desejo.current = null;
  });
  useFrame((_, delta) => controls.current?.update(delta));
  return null;
}
function Connection({ a, b, color, opacity, cinema = false }: { a: Vec3; b: Vec3; color: string; opacity: number; cinema?: boolean }) {
  /* No modo cinema a conexão é um arco, não uma reta: o meio sobe em direção
     à câmera e se afasta do centro. Retas entre áreas distantes cruzavam a
     constelação inteira; arcos passam por cima e deixam o desenho legível.
     E o arco se desenha, ponto a ponto, depois que as esferas acendem. */
  const PONTOS = 40;
  const geometry = useMemo(() => {
    if (!cinema) return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const meio = va.clone().add(vb).multiplyScalar(.5);
    const para = meio.clone().setY(meio.y * .6).normalize().multiplyScalar(va.distanceTo(vb) * .18);
    meio.add(para).add(new THREE.Vector3(0, 0, va.distanceTo(vb) * .22));
    const g = new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(va, meio, vb).getPoints(PONTOS));
    g.setDrawRange(0, 0);
    return g;
  }, [a, b, cinema]);
  const nasceu = useRef<number | null>(null);
  const pronto = useRef(!cinema);
  useFrame(({ clock }) => {
    if (pronto.current) return;
    if (nasceu.current === null) nasceu.current = clock.elapsedTime;
    // Espera a esfera acender antes de começar a desenhar.
    const k = Math.min(1, Math.max(0, (clock.elapsedTime - nasceu.current - .35) / 1.1));
    geometry.setDrawRange(0, Math.ceil((1 - Math.pow(1 - k, 3)) * (PONTOS + 1)));
    if (k >= 1) pronto.current = true;
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  const object = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity })), [geometry,color,opacity]);
  useEffect(() => () => { (object.material as THREE.Material).dispose(); }, [object]);
  return <primitive object={object} />;
}
function Node({ position, color, score, focused, dim, label, onClick, reduced, cinema = false }: { position: Vec3; color: string; score: Score; focused: boolean; dim: boolean; label: string; onClick: () => void; reduced: boolean; cinema?: boolean }) {
  const halo = useRef<THREE.Mesh>(null);
  const onda = useRef<THREE.Mesh>(null);
  const nasceu = useRef<number | null>(null);
  const radius = .10 + Math.sqrt(Math.max(0, score.score || 0) / 100) * .21;
  const ignicao = cinema && !reduced;
  useFrame(({ clock }) => {
    if (halo.current && !reduced) halo.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.8 + position[0]) * .08 * ((score.freshness ?? 0) / 100));
    // A onda de luz: uma casca que se expande e apaga quando a esfera acende.
    if (!ignicao || !onda.current || !onda.current.visible) return;
    if (nasceu.current === null) nasceu.current = clock.elapsedTime;
    const k = Math.min(1, (clock.elapsedTime - nasceu.current) / 1.5);
    onda.current.scale.setScalar(1 + (1 - Math.pow(1 - k, 2)) * 7);
    (onda.current.material as THREE.MeshBasicMaterial).opacity = .55 * (1 - k);
    if (k >= 1) onda.current.visible = false;
  });
  const opacity = dim ? .15 : score.score === 0 ? .4 : .95;
  return <group position={position}>
    {ignicao && <mesh ref={onda} raycast={() => {}}><sphereGeometry args={[Math.max(.2, radius), 24, 16]} /><meshBasicMaterial color={color} transparent opacity={.55} depthWrite={false} /></mesh>}
    <Aparece ativo={ignicao}>
    {cinema && score.score > 0 && <sprite scale={[radius * 7.5, radius * 7.5, 1]} raycast={() => {}}><spriteMaterial map={brilho()} color={color} transparent opacity={dim ? .06 : .6} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>}
    <mesh onClick={e => { e.stopPropagation(); onClick(); }} onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <sphereGeometry args={[Math.max(.20, radius), 24, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} wireframe={score.score === 0} />
    </mesh>
    <mesh ref={halo}>
      <sphereGeometry args={[radius * 1.8, 20, 12]} />
      <meshBasicMaterial color={color} transparent opacity={dim ? .01 : .035 + .07 * ((score.freshness ?? 0) / 100)} depthWrite={false} />
    </mesh>
    {focused && <mesh><ringGeometry args={[radius + .12, radius + .145, 64]} /><meshBasicMaterial color="#ffffff" transparent opacity={.9} side={THREE.DoubleSide} /></mesh>}
    {!dim && <Label text={label} position={[0, -radius - (cinema ? .42 : .33), 0]} color={score.score ? (cinema ? '#f1f6fb' : '#dbe8f5') : '#8393ac'} size={cinema ? 1.75 : 1.25} />}
    </Aparece>
  </group>;
}
function StarLayer({ layer, reduced }: { layer: number; reduced: boolean }) {
  const field = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>>(null);
  const elapsed = useRef(0);
  const stars = useMemo(() => {
    const points = new Float32Array(300 * 3);
    const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 300; i++) {
      const seed = i + layer * 300;
      points[i*3] = (rand(seed+1)-.5)*65;
      points[i*3+1] = (rand(seed+2001)-.5)*42;
      points[i*3+2] = (rand(seed+4001)-.5)*5;
    }
    return points;
  }, [layer]);
  useFrame((_, delta) => {
    if (!field.current || reduced || document.hidden) return;
    // Advance only while visible; resuming a background tab never jumps ahead.
    elapsed.current += Math.min(delta, .05);
    const t = elapsed.current;
    field.current.rotation.z = t * (.009 + layer * .006);
    field.current.position.x = (Math.sin(t * .055 + layer) - Math.sin(layer)) * .45;
    field.current.position.y = (Math.sin(t * .04 + layer * 2) - Math.sin(layer * 2)) * .3;
    field.current.material.opacity = .34 + layer * .055 + Math.sin(t * .6 + layer * 2) * .055;
  });
  return <points ref={field} position={[0,0,-23+layer*6]} raycast={() => {}}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars,3]} /></bufferGeometry>
    <pointsMaterial size={.023+layer*.006} color={layer === 2 ? '#c1d6eb' : '#91adce'} transparent opacity={.34+layer*.055} depthWrite={false} sizeAttenuation />
  </points>;
}
function Scene(props: Props) {
  const { catalog, scores, visible, selected, onSelect, onArea, reduced } = props;
  const cinema = !!props.cinema && !reduced;
  const selectedArea = catalog.competencies.find(c => c.id === selected)?.area;
  const connected = new Set(catalog.relations.filter(r => r.source === selected || r.target === selected).flatMap(r => [r.source, r.target]));
  return <>
    <Controls {...props} />
    {[0,1,2].map(layer => <StarLayer key={layer} layer={layer} reduced={reduced} />)}
    {catalog.areas.filter(area => catalog.competencies.some(c => c.area === area.id && visible.includes(c.id))).map(area => <group key={area.id} position={area.position}><Aparece ativo={cinema}>
      <mesh onClick={e => { e.stopPropagation(); onArea(area.id); }}><sphereGeometry args={[cinema ? .3 : .48,32,24]} /><meshBasicMaterial color={area.color} transparent opacity={cinema ? .07 : .13} /></mesh>
      <mesh><sphereGeometry args={[cinema ? .09 : .20,24,16]} /><meshBasicMaterial color={area.color} transparent opacity={cinema ? .7 : 1} /></mesh>
      {(cinema ? [.55] : [.68,.85]).map(r => <mesh key={r} rotation={[.25,.25,0]}><ringGeometry args={[r,r+.009,96]} /><meshBasicMaterial color={area.color} transparent opacity={cinema ? .14 : .22} side={THREE.DoubleSide} /></mesh>)}
      <Label text={area.name.toLocaleUpperCase('pt-BR')} color={area.color} position={[0,.95,0]} size={1.7} />
    </Aparece></group>)}
    {catalog.competencies.filter(c => visible.includes(c.id)).map(c => {
      const area = catalog.areas.find(a => a.id === c.area)!;
      return <Connection key={`area-${c.id}`} a={area.position} b={c.position} color={area.color} opacity={selected && selectedArea !== c.area ? .018 : cinema ? .06 : .1} cinema={false} />;
    })}
    {catalog.relations.filter(r => visible.includes(r.source) && visible.includes(r.target)).map(r => {
      const a = catalog.competencies.find(c => c.id === r.source)!; const b = catalog.competencies.find(c => c.id === r.target)!;
      const active = scores[a.id].score > 0 && scores[b.id].score > 0;
      const focused = r.source === selected || r.target === selected;
      return <Connection key={`${r.source}-${r.target}`} a={a.position} b={b.position} color={catalog.areas.find(area => area.id === a.area)!.color} opacity={focused ? .85 : selected ? .04 : cinema ? .32 + r.strength * .2 : active ? .16 + r.strength * .1 : .045} cinema={cinema} />;
    })}
    {catalog.competencies.filter(c => visible.includes(c.id)).map(c => <Node key={c.id} position={c.position} color={catalog.areas.find(a => a.id === c.area)!.color} label={c.name} score={scores[c.id]} focused={c.id === selected} dim={!!selected && c.id !== selected && !connected.has(c.id)} onClick={() => onSelect(c.id)} reduced={reduced} cinema={cinema} />)}
  </>;
}
export default function UniverseCanvas(props: Props) {
  const [active, setActive] = useState(true);
  useEffect(() => { const change = () => setActive(!document.hidden); document.addEventListener('visibilitychange', change); return () => { document.removeEventListener('visibilitychange', change); document.body.style.cursor = ''; }; }, []);
  return <Canvas camera={{ position: [0,1.5,23], fov: 42 }} dpr={[1,1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} frameloop={props.reduced || !active ? 'demand' : 'always'} onPointerMissed={() => { document.body.style.cursor = ''; }}>
    <Scene {...props} />
    {props.extras}
  </Canvas>;
}
