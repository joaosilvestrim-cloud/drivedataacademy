"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* Modelos 3D dos benefícios da assinatura, todos procedurais: nenhum arquivo
   externo, só geometria do Three.js. Cada modelo gira devagar, inclina para o
   ponteiro e dá um pulso ao clique. O "4D" é o tempo: toda cena tem uma parte
   que se move sozinha (cronômetro, engrenagens, seta, pontos da comunidade). */

export type Modelo =
  | "agenda" | "gravacoes" | "ferramentas" | "treinamentos" | "materiais" | "certificados"
  | "comunidade" | "ranking" | "vitrine" | "mentoria" | "parcerias";

export type Controle = { x: number; y: number; hover: boolean; pulso: number; reduzido: boolean };

const VERDE = "#34e8a0";
const TEAL = "#2ee6d6";
const AZUL = "#3b9dff";
const ESCURO = "#0b1220";
const CLARO = "#e4edf8";
const OURO = "#fbbf24";
const VERMELHO = "#ff5c5c";

function Mat({ cor, brilho = 0, opacidade = 1, metal = 0.2, aspereza = 0.35 }: { cor: string; brilho?: number; opacidade?: number; metal?: number; aspereza?: number }) {
  return (
    <meshStandardMaterial
      color={cor}
      emissive={cor}
      emissiveIntensity={brilho}
      metalness={metal}
      roughness={aspereza}
      transparent={opacidade < 1}
      opacity={opacidade}
    />
  );
}

/* Plataforma comum: rotação lenta, inclinação pelo ponteiro, pulso no clique. */
function Palco({ controle, children, giro = 0.35 }: { controle: MutableRefObject<Controle>; children: React.ReactNode; giro?: number }) {
  const g = useRef<THREE.Group>(null);
  const base = useRef(0);
  useFrame((_, dt) => {
    const c = controle.current;
    const grp = g.current;
    if (!grp) return;
    if (!c.reduzido) base.current += dt * giro * (c.hover ? 0.35 : 1);
    const alvoY = base.current + c.x * 0.55;
    const alvoX = -c.y * 0.4;
    grp.rotation.y += (alvoY - grp.rotation.y) * Math.min(1, dt * 6);
    grp.rotation.x += (alvoX - grp.rotation.x) * Math.min(1, dt * 6);
    if (c.pulso > 0) c.pulso = Math.max(0, c.pulso - dt * 2.2);
    const s = 1 + Math.sin(c.pulso * Math.PI) * 0.14 + (c.hover ? 0.05 : 0);
    grp.scale.setScalar(grp.scale.x + (s - grp.scale.x) * Math.min(1, dt * 8));
  });
  return <group ref={g}>{children}</group>;
}

function useTempo(controle: MutableRefObject<Controle>) {
  const t = useRef(0);
  useFrame((_, dt) => { if (!controle.current.reduzido) t.current += dt; });
  return t;
}

// ---------------- modelos ----------------

function Agenda({ c }: { c: MutableRefObject<Controle> }) {
  const halo = useRef<THREE.Mesh>(null);
  const anel = useRef<THREE.Mesh>(null);
  const t = useTempo(c);
  useFrame(() => {
    const k = 1 + Math.sin(t.current * 3) * 0.25;
    halo.current?.scale.setScalar(k);
    if (anel.current) anel.current.rotation.z = -t.current * 0.9;
  });
  const dias = useMemo(() => Array.from({ length: 12 }, (_, i) => [-0.5 + (i % 4) * 0.34, 0.12 - Math.floor(i / 4) * 0.3] as const), []);
  return (
    <group>
      <mesh position={[0, -0.05, 0]}><boxGeometry args={[1.6, 1.4, 0.28]} /><Mat cor={ESCURO} metal={0.1} aspereza={0.6} /></mesh>
      <mesh position={[0, 0.58, 0]}><boxGeometry args={[1.6, 0.34, 0.3]} /><Mat cor={AZUL} brilho={0.25} /></mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.3, 12]} /><Mat cor={CLARO} /></mesh>
      ))}
      {dias.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.15]}><boxGeometry args={[0.22, 0.18, 0.04]} /><Mat cor={i === 6 ? VERDE : "#1c2740"} brilho={i === 6 ? 0.6 : 0} /></mesh>
      ))}
      <mesh ref={halo} position={[dias[6][0], dias[6][1], 0.2]}><sphereGeometry args={[0.2, 16, 12]} /><Mat cor={VERDE} brilho={1} opacidade={0.25} /></mesh>
      <mesh ref={anel} rotation={[0.35, 0, 0]}><torusGeometry args={[1.35, 0.03, 8, 64, Math.PI * 1.5]} /><Mat cor={TEAL} brilho={0.8} /></mesh>
      <mesh position={[0.85, 0.75, 0.25]}><sphereGeometry args={[0.09, 12, 10]} /><Mat cor={VERMELHO} brilho={1.2} /></mesh>
    </group>
  );
}

function Gravacoes({ c }: { c: MutableRefObject<Controle> }) {
  const filme = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => { if (filme.current) filme.current.rotation.z = t.current * 0.6; });
  const dentes = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.85, 0.85, 0.26, 48]} /><Mat cor={ESCURO} metal={0.1} aspereza={0.6} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}><torusGeometry args={[0.85, 0.05, 12, 48]} /><Mat cor={AZUL} brilho={0.5} /></mesh>
      <mesh position={[0.08, 0, 0.16]} rotation={[Math.PI / 2, Math.PI / 2, 0]}><cylinderGeometry args={[0.42, 0.42, 0.14, 3]} /><Mat cor={VERDE} brilho={0.7} /></mesh>
      <group ref={filme}>
        <mesh><torusGeometry args={[1.3, 0.045, 8, 64]} /><Mat cor={TEAL} brilho={0.4} opacidade={0.9} /></mesh>
        {dentes.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0]} rotation={[0, 0, a]}><boxGeometry args={[0.14, 0.08, 0.08]} /><Mat cor={CLARO} /></mesh>
        ))}
      </group>
    </group>
  );
}

function Engrenagem({ raio, dentes, cor, pos, sentido, c }: { raio: number; dentes: number; cor: string; pos: [number, number, number]; sentido: number; c: MutableRefObject<Controle> }) {
  const g = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => { if (g.current) g.current.rotation.z = t.current * 0.8 * sentido + (sentido < 0 ? Math.PI / dentes : 0); });
  const angs = useMemo(() => Array.from({ length: dentes }, (_, i) => (i / dentes) * Math.PI * 2), [dentes]);
  return (
    <group ref={g} position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[raio, raio, 0.26, 32]} /><Mat cor={cor} brilho={0.15} metal={0.5} aspereza={0.3} /></mesh>
      {angs.map((a) => (
        <mesh key={a} position={[Math.cos(a) * (raio + 0.1), Math.sin(a) * (raio + 0.1), 0]} rotation={[0, 0, a]}><boxGeometry args={[0.24, 0.2, 0.26]} /><Mat cor={cor} metal={0.5} aspereza={0.3} /></mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[raio * 0.35, raio * 0.35, 0.3, 24]} /><Mat cor={ESCURO} /></mesh>
    </group>
  );
}

function Ferramentas({ c }: { c: MutableRefObject<Controle> }) {
  return (
    <group position={[0, -0.1, 0]}>
      <Engrenagem raio={0.62} dentes={10} cor={VERDE} pos={[-0.55, 0.2, 0]} sentido={1} c={c} />
      <Engrenagem raio={0.42} dentes={7} cor={AZUL} pos={[0.68, -0.28, 0]} sentido={-1.43} c={c} />
    </group>
  );
}

function Treinamentos({ c }: { c: MutableRefObject<Controle> }) {
  const borla = useRef<THREE.Group>(null);
  const etiqueta = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => {
    if (borla.current) borla.current.rotation.z = Math.sin(t.current * 2.2) * 0.35;
    if (etiqueta.current) { etiqueta.current.position.y = 0.95 + Math.sin(t.current * 1.6) * 0.1; etiqueta.current.rotation.y = Math.sin(t.current * 0.8) * 0.3; }
  });
  return (
    <group position={[0, -0.25, 0]}>
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.62, 0.68, 0.55, 32]} /><Mat cor={ESCURO} metal={0.1} aspereza={0.6} /></mesh>
      <mesh position={[0, 0.08, 0]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[1.9, 0.09, 1.9]} /><Mat cor={AZUL} brilho={0.2} /></mesh>
      <mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.07, 12, 10]} /><Mat cor={OURO} brilho={0.5} /></mesh>
      <group ref={borla} position={[0, 0.16, 0]}>
        <mesh position={[0.72, -0.2, 0.72]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} /><Mat cor={OURO} brilho={0.4} />
        </mesh>
        <mesh position={[0.72, -0.62, 0.72]}><cylinderGeometry args={[0.06, 0.09, 0.22, 10]} /><Mat cor={OURO} brilho={0.5} /></mesh>
      </group>
      <group ref={etiqueta} position={[0.9, 0.95, 0.2]}>
        <mesh><boxGeometry args={[0.62, 0.36, 0.06]} /><Mat cor={VERDE} brilho={0.7} /></mesh>
        <mesh position={[-0.22, 0, 0.04]}><cylinderGeometry args={[0.05, 0.05, 0.08, 12]} /><Mat cor={ESCURO} /></mesh>
        <mesh position={[0.08, 0, 0.04]}><boxGeometry args={[0.26, 0.05, 0.02]} /><Mat cor={ESCURO} /></mesh>
        <mesh position={[0.08, 0.09, 0.04]}><boxGeometry args={[0.18, 0.04, 0.02]} /><Mat cor={ESCURO} /></mesh>
      </group>
    </group>
  );
}

function Materiais({ c }: { c: MutableRefObject<Controle> }) {
  const seta = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => { if (seta.current) seta.current.position.y = 0.75 + Math.abs(Math.sin(t.current * 2.4)) * 0.22; });
  return (
    <group position={[0, -0.35, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.15, 0]} rotation={[0, (i - 1) * 0.18, 0]}>
          <boxGeometry args={[1.5, 0.12, 1.05]} /><Mat cor={i === 2 ? "#1c2740" : ESCURO} metal={0.1} aspereza={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.37, 0]}><boxGeometry args={[1.2, 0.02, 0.8]} /><Mat cor={AZUL} brilho={0.4} /></mesh>
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.39, -0.1]}><boxGeometry args={[0.2, 0.01, 0.35]} /><Mat cor={VERDE} brilho={0.5} /></mesh>
      ))}
      <group ref={seta} position={[0, 0.75, 0]}>
        <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.09, 0.09, 0.55, 12]} /><Mat cor={VERDE} brilho={0.7} /></mesh>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.28, 0.4, 16]} /><Mat cor={VERDE} brilho={0.7} /></mesh>
      </group>
    </group>
  );
}

function Certificados({ c }: { c: MutableRefObject<Controle> }) {
  const anel = useRef<THREE.Mesh>(null);
  const selo = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => {
    if (anel.current) { anel.current.rotation.y = t.current * 0.7; anel.current.rotation.x = 0.5; }
    if (selo.current) selo.current.rotation.z = Math.sin(t.current * 1.8) * 0.2;
  });
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 1.9, 32]} /><Mat cor={CLARO} metal={0} aspereza={0.7} /></mesh>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.3, 0.06, 10, 32]} /><Mat cor={"#c9d3e4"} aspereza={0.7} /></mesh>
      ))}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.45, 32]} /><Mat cor={AZUL} brilho={0.2} /></mesh>
      <group ref={selo} position={[0.2, -0.35, 0.3]}>
        <mesh position={[0, -0.25, 0]}><boxGeometry args={[0.16, 0.5, 0.03]} /><Mat cor={VERMELHO} /></mesh>
        <mesh position={[0.14, -0.25, 0]}><boxGeometry args={[0.16, 0.5, 0.03]} /><Mat cor={VERMELHO} /></mesh>
        <mesh position={[0.07, -0.5, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.06, 24]} /><Mat cor={OURO} brilho={0.6} metal={0.6} aspereza={0.25} /></mesh>
      </group>
      <mesh ref={anel}><torusGeometry args={[1.35, 0.025, 8, 64]} /><Mat cor={VERDE} brilho={0.8} /></mesh>
    </group>
  );
}

function Comunidade({ c }: { c: MutableRefObject<Controle> }) {
  const n = 5;
  const nos = useRef<(THREE.Mesh | null)[]>([]);
  const linhas = useRef<THREE.LineSegments>(null);
  const t = useTempo(c);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * n * 6), 3));
    return g;
  }, []);
  useFrame(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = t.current * 0.5 + (i / n) * Math.PI * 2;
      const r = 1.05 + Math.sin(t.current * 1.3 + i) * 0.15;
      const p = new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.4 + i) * 0.45, Math.sin(a) * r);
      nos.current[i]?.position.copy(p);
      pts.push(p);
    }
    const arr = geo.attributes.position.array as Float32Array;
    let k = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      arr[k++] = pts[i].x; arr[k++] = pts[i].y; arr[k++] = pts[i].z;
      arr[k++] = pts[j].x; arr[k++] = pts[j].y; arr[k++] = pts[j].z;
    }
    geo.setDrawRange(0, k / 3);
    geo.attributes.position.needsUpdate = true;
  });
  const cores = [VERDE, TEAL, AZUL, VERDE, TEAL];
  return (
    <group>
      <mesh><sphereGeometry args={[0.32, 24, 18]} /><Mat cor={CLARO} brilho={0.2} /></mesh>
      {cores.map((cor, i) => (
        <mesh key={i} ref={(m) => { nos.current[i] = m; }}><sphereGeometry args={[0.2, 18, 14]} /><Mat cor={cor} brilho={0.6} /></mesh>
      ))}
      <lineSegments ref={linhas} geometry={geo}><lineBasicMaterial color={TEAL} transparent opacity={0.45} /></lineSegments>
    </group>
  );
}

function Ranking({ c }: { c: MutableRefObject<Controle> }) {
  const trofeu = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => { if (trofeu.current) { trofeu.current.rotation.y = t.current * 1.2; trofeu.current.position.y = 0.95 + Math.sin(t.current * 2) * 0.06; } });
  const blocos: [number, number, string][] = [[-0.62, 0.55, AZUL], [0, 0.85, VERDE], [0.62, 0.4, TEAL]];
  return (
    <group position={[0, -0.55, 0]}>
      {blocos.map(([x, h, cor]) => (
        <mesh key={x} position={[x, h / 2, 0]}><boxGeometry args={[0.58, h, 0.7]} /><Mat cor={cor} brilho={0.15} /></mesh>
      ))}
      <group ref={trofeu} position={[0, 0.95, 0]}>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.24, 0.24, 0.06, 20]} /><Mat cor={OURO} metal={0.7} aspereza={0.25} brilho={0.3} /></mesh>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.05, 0.08, 0.24, 12]} /><Mat cor={OURO} metal={0.7} aspereza={0.25} brilho={0.3} /></mesh>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.3, 0.14, 0.42, 24]} /><Mat cor={OURO} metal={0.7} aspereza={0.25} brilho={0.4} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.34, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.035, 8, 20]} /><Mat cor={OURO} metal={0.7} aspereza={0.25} brilho={0.3} /></mesh>
        ))}
      </group>
    </group>
  );
}

function Vitrine({ c }: { c: MutableRefObject<Controle> }) {
  const luz = useRef<THREE.PointLight>(null);
  const foco = useRef<THREE.Mesh>(null);
  const t = useTempo(c);
  useFrame(() => {
    const x = Math.sin(t.current * 1.1) * 1.4;
    if (luz.current) luz.current.position.set(x, 1.2, 1.6);
    if (foco.current) foco.current.position.x = x * 0.35;
  });
  return (
    <group>
      <mesh><boxGeometry args={[1.5, 2, 0.12]} /><Mat cor={ESCURO} metal={0.1} aspereza={0.6} /></mesh>
      <mesh position={[0, 0, 0.065]}><boxGeometry args={[1.4, 1.9, 0.005]} /><Mat cor={"#121c30"} /></mesh>
      <mesh ref={foco} position={[0, 0.25, 0.08]}><circleGeometry args={[0.55, 32]} /><Mat cor={TEAL} brilho={0.6} opacidade={0.12} /></mesh>
      <mesh position={[0, 0.42, 0.2]}><sphereGeometry args={[0.28, 24, 18]} /><Mat cor={CLARO} aspereza={0.6} /></mesh>
      <mesh position={[0, -0.12, 0.2]}><cylinderGeometry args={[0.42, 0.5, 0.5, 24]} /><Mat cor={VERDE} brilho={0.3} /></mesh>
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={x} position={[x, -0.62, 0.12]}><boxGeometry args={[0.28, 0.1, 0.04]} /><Mat cor={[AZUL, TEAL, VERDE][i]} brilho={0.5} /></mesh>
      ))}
      <mesh position={[0.55, 0.78, 0.15]}><sphereGeometry args={[0.1, 12, 10]} /><Mat cor={OURO} brilho={0.8} /></mesh>
      <pointLight ref={luz} color={TEAL} intensity={2.5} distance={4} />
    </group>
  );
}

function Mentoria({ c }: { c: MutableRefObject<Controle> }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => {
    if (a.current) a.current.position.y = 0.35 + Math.sin(t.current * 2) * 0.08;
    if (b.current) b.current.position.y = -0.35 + Math.sin(t.current * 2 + Math.PI) * 0.08;
  });
  const bolha = (ref: React.RefObject<THREE.Group>, pos: [number, number, number], cor: string, espelho: number) => (
    <group ref={ref} position={pos}>
      <mesh scale={[1, 0.62, 0.7]}><sphereGeometry args={[0.75, 28, 20]} /><Mat cor={cor} brilho={0.25} /></mesh>
      <mesh position={[espelho * 0.45, -0.42, 0]} rotation={[0, 0, espelho * 0.6]}><coneGeometry args={[0.16, 0.36, 4]} /><Mat cor={cor} brilho={0.25} /></mesh>
      {[-0.25, 0, 0.25].map((x) => (
        <mesh key={x} position={[x, 0, 0.5]}><sphereGeometry args={[0.07, 10, 8]} /><Mat cor={ESCURO} /></mesh>
      ))}
    </group>
  );
  return (
    <group>
      {bolha(a, [-0.55, 0.35, 0], VERDE, -1)}
      {bolha(b, [0.55, -0.35, 0], AZUL, 1)}
    </group>
  );
}

function Parcerias({ c }: { c: MutableRefObject<Controle> }) {
  const g = useRef<THREE.Group>(null);
  const t = useTempo(c);
  useFrame(() => { if (g.current) g.current.rotation.x = Math.sin(t.current * 0.7) * 0.4; });
  return (
    <group ref={g}>
      <mesh position={[-0.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.7, 0.16, 16, 48]} /><Mat cor={VERDE} brilho={0.3} metal={0.4} aspereza={0.3} /></mesh>
      <mesh position={[0.5, 0, 0]}><torusGeometry args={[0.7, 0.16, 16, 48]} /><Mat cor={AZUL} brilho={0.3} metal={0.4} aspereza={0.3} /></mesh>
      <mesh><sphereGeometry args={[0.14, 14, 12]} /><Mat cor={TEAL} brilho={1} /></mesh>
    </group>
  );
}

const MODELOS: Record<Modelo, (p: { c: MutableRefObject<Controle> }) => JSX.Element> = {
  agenda: Agenda, gravacoes: Gravacoes, ferramentas: Ferramentas, treinamentos: Treinamentos, materiais: Materiais,
  certificados: Certificados, comunidade: Comunidade, ranking: Ranking, vitrine: Vitrine, mentoria: Mentoria, parcerias: Parcerias,
};

export default function BeneficioCena({ modelo, controle }: { modelo: Modelo; controle: MutableRefObject<Controle> }) {
  const M = MODELOS[modelo];
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 4.6], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.3} />
      <pointLight position={[-2.5, 1, 2]} color={VERDE} intensity={1.6} />
      <pointLight position={[2.5, -1.5, 1.5]} color={AZUL} intensity={1.2} />
      <Palco controle={controle}>
        <M c={controle} />
      </Palco>
    </Canvas>
  );
}
