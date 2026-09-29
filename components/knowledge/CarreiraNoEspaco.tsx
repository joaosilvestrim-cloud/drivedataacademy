"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Label, brilho } from "./UniverseCanvas";
import type { UniversoPublico } from "@/lib/knowledge/publico";
import type { Vec3 } from "@/lib/knowledge/types";

/* A carreira no espaço, por cima da constelação de competências.

   Cada objeto é um tipo de fato real, e a metáfora explica sozinha o que ele
   é:
     planeta       projeto: orbita as competências que provou; o tamanho vem
                   da duração, os anéis do tamanho do time
     lua           certificado: gira em volta da competência que certifica
     nave e rota   trajetória profissional, emprego a emprego, em ordem
     nebulosa      setor de negócio onde a pessoa trabalhou
     cometa        conquista, com a data em que aconteceu
     sinal         recomendação escrita por um colega
     em formação   o que a pessoa estuda na Academy agora
     estrela-guia  o objetivo, com linhas até o que o cargo pede

   Tudo respeita a linha do tempo: um objeto só existe a partir da própria
   data, então o play conta a carreira na ordem em que ela aconteceu. */

export type Selecao =
  | { tipo: "planeta"; id: string }
  | { tipo: "lua"; id: string }
  | { tipo: "parada"; id: string }
  | { tipo: "cometa"; id: string }
  | { tipo: "sinal"; id: string }
  | { tipo: "formacao"; id: string }
  | { tipo: "guia" };

const v = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

// Cor estável por setor, derivada do nome. Mesmo setor, mesma cor em todo universo.
function corDoSetor(setor: string): string {
  let h = 0;
  for (const ch of setor.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 70%, 62%)`;
}

/* Onde cada coisa fica. Função pura, usada também pelo enquadramento da
   câmera, para a nave e a estrela-guia entrarem no quadro. */
export function layoutDaCarreira(d: UniversoPublico, acesas: string[]) {
  const comp = new Map(d.catalog.competencies.map((c) => [c.id, c]));
  const base = acesas.length ? acesas : d.catalog.competencies.map((c) => c.id);
  const pts = base.map((id) => comp.get(id)).filter(Boolean).map((c) => v(c!.position));
  const centro = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, pts.length));
  const raio = Math.max(3, ...pts.map((p) => p.distanceTo(centro)));

  const planetas = new Map<string, Vec3>();
  (d.planetas ?? []).forEach((pl, i) => {
    const ps = pl.competencias.map((id) => comp.get(id)).filter(Boolean).map((c) => v(c!.position));
    const meio = ps.length ? ps.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ps.length) : centro.clone();
    let dir = meio.clone().sub(centro).setZ(0);
    if (dir.length() < 0.5) dir = new THREE.Vector3(Math.cos(i * 2.1), Math.sin(i * 2.1), 0);
    dir.normalize().applyAxisAngle(new THREE.Vector3(0, 0, 1), (i % 3 - 1) * 0.5);
    const pos = meio.add(dir.multiplyScalar(2.2)).add(new THREE.Vector3(0, 0, 1.4 + (i % 2) * 0.6));
    planetas.set(pl.id, [pos.x, pos.y, pos.z]);
  });

  // A rota da nave: uma elipse por trás da constelação, do primeiro emprego ao atual.
  const trajeto = [...(d.trajetoria ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const paradas = new Map<string, Vec3>();
  trajeto.forEach((t, k) => {
    const frac = trajeto.length > 1 ? k / (trajeto.length - 1) : 0.5;
    const ang = THREE.MathUtils.degToRad(210 - frac * 240);
    paradas.set(t.id, [centro.x + Math.cos(ang) * (raio + 4.5), centro.y + Math.sin(ang) * (raio * 0.75 + 3), centro.z - 2.5]);
  });

  // Cometas no alto, em ordem de data da esquerda para a direita.
  const cometasOrd = [...(d.conquistas ?? [])].sort((a, b) => a.at.localeCompare(b.at));
  const cometas = new Map<string, Vec3>();
  cometasOrd.forEach((c, k) => {
    const frac = cometasOrd.length > 1 ? k / (cometasOrd.length - 1) : 0.5;
    cometas.set(c.id, [centro.x - raio + frac * raio * 2, centro.y + raio + 2.4, centro.z - 1]);
  });

  const guia: Vec3 = [centro.x + raio * 0.9 + 3, centro.y + raio * 0.7 + 3, centro.z - 4];

  // Nebulosas: uma por setor, atrás dos planetas e paradas daquele setor.
  const porSetor = new Map<string, THREE.Vector3[]>();
  for (const pl of d.planetas ?? []) if (pl.setor && planetas.get(pl.id)) (porSetor.get(pl.setor.toLowerCase()) ?? porSetor.set(pl.setor.toLowerCase(), []).get(pl.setor.toLowerCase())!).push(v(planetas.get(pl.id)!));
  for (const t of trajeto) if (t.setor && paradas.get(t.id)) (porSetor.get(t.setor.toLowerCase()) ?? porSetor.set(t.setor.toLowerCase(), []).get(t.setor.toLowerCase())!).push(v(paradas.get(t.id)!));
  const nebulosas = [...porSetor.entries()].map(([setor, ps]) => {
    const m = ps.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ps.length);
    return { setor, pos: [m.x, m.y, m.z - 1.5] as Vec3, escala: 5 + ps.length * 1.5 };
  });

  const todos: Vec3[] = [...planetas.values(), ...paradas.values(), ...cometas.values(), ...(d.guia ? [guia] : [])];
  return { comp, centro, raio, planetas, paradas, trajeto, cometas, guia, nebulosas, todos };
}

function Surgir({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ativo || !g.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const k = Math.min(1, (clock.elapsedTime - t0.current) / 1.1);
    const e = k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    g.current.scale.setScalar(Math.max(0.001, e));
  });
  return <group ref={g} scale={ativo ? 0.001 : 1}>{children}</group>;
}

function Linha({ a, b, cor, opacidade }: { a: Vec3; b: Vec3; cor: string; opacidade: number }) {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([v(a), v(b)]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: opacidade, depthWrite: false }));
  }, [a, b, cor, opacidade]);
  useEffect(() => () => { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }, [obj]);
  return <primitive object={obj} />;
}

const clicavel = (onClick: () => void) => ({
  onClick: (e: any) => { e.stopPropagation(); onClick(); },
  onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = "pointer"; },
  onPointerOut: () => { document.body.style.cursor = ""; },
});

function Planeta({ pos, cor, raio, aneis, titulo, cinema, onClick }: { pos: Vec3; cor: string; raio: number; aneis: number; titulo: string; cinema: boolean; onClick: () => void }) {
  const giro = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (giro.current) giro.current.rotation.y += dt * 0.25; });
  return (
    <group position={pos}>
      <Surgir ativo={cinema}>
        <sprite scale={[raio * 6, raio * 6, 1]} raycast={() => {}}>
          <spriteMaterial map={brilho()} color={cor} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <mesh ref={giro} {...clicavel(onClick)}>
          <sphereGeometry args={[raio, 32, 24]} />
          <meshStandardMaterial color={cor} roughness={0.55} metalness={0.15} emissive={cor} emissiveIntensity={0.18} />
        </mesh>
        {Array.from({ length: aneis }, (_, k) => (
          <mesh key={k} rotation={[1.25, 0.2, 0.3]} raycast={() => {}}>
            <ringGeometry args={[raio * (1.45 + k * 0.28), raio * (1.45 + k * 0.28) + 0.035, 72]} />
            <meshBasicMaterial color={cor} transparent opacity={0.45 - k * 0.1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
        <Label text={titulo.length > 30 ? `${titulo.slice(0, 28)}…` : titulo} position={[0, -raio - 0.45, 0]} color="#f4f7fb" size={1.6} />
      </Surgir>
    </group>
  );
}

function Lua({ centro, fase, onClick }: { centro: Vec3; fase: number; onClick: () => void }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    const a = clock.elapsedTime * 0.6 + fase;
    m.current.position.set(centro[0] + Math.cos(a) * 0.72, centro[1] + Math.sin(a) * 0.45, centro[2] + Math.sin(a) * 0.5);
  });
  return (
    <mesh ref={m} {...clicavel(onClick)}>
      <sphereGeometry args={[0.085, 16, 12]} />
      <meshStandardMaterial color="#e8eef6" roughness={0.9} emissive="#9fb3c8" emissiveIntensity={0.25} />
    </mesh>
  );
}

function Nave({ rota, reduzido }: { rota: Vec3[]; reduzido: boolean }) {
  const g = useRef<THREE.Group>(null);
  const alvo = rota.at(-1)!;
  useFrame(() => {
    if (!g.current) return;
    const atual = g.current.position;
    const destino = v(alvo);
    if (reduzido) atual.copy(destino);
    else atual.lerp(destino, 0.04);
    const antes = rota.length > 1 ? v(rota[rota.length - 2]) : destino.clone().add(new THREE.Vector3(-1, 0, 0));
    const dir = destino.clone().sub(antes).normalize();
    g.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.lengthSq() ? dir : new THREE.Vector3(0, 1, 0));
  });
  return (
    <group ref={g} position={rota[0]}>
      <sprite scale={[1.6, 1.6, 1]} raycast={() => {}}>
        <spriteMaterial map={brilho()} color="#7fe9ff" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh raycast={() => {}}>
        <coneGeometry args={[0.13, 0.42, 16]} />
        <meshStandardMaterial color="#dff7ff" emissive="#7fe9ff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Cometa({ pos, titulo, cinema, onClick }: { pos: Vec3; titulo: string; cinema: boolean; onClick: () => void }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  // Entra riscando o céu, da direita para a esquerda, e para no lugar.
  useFrame(({ clock }) => {
    if (!g.current) return;
    if (!cinema) { g.current.position.set(...pos); return; }
    if (t0.current === null) t0.current = clock.elapsedTime;
    const k = Math.min(1, (clock.elapsedTime - t0.current) / 1.3);
    const e = 1 - Math.pow(1 - k, 3);
    g.current.position.set(pos[0] + (1 - e) * 9, pos[1] + (1 - e) * 3, pos[2]);
  });
  const cauda = useMemo<[Vec3, Vec3]>(() => [[0, 0, 0], [1.3, 0.45, 0]], []);
  return (
    <group ref={g} position={cinema ? [pos[0] + 9, pos[1] + 3, pos[2]] : pos}>
      <Linha a={cauda[0]} b={cauda[1]} cor="#ffe7a8" opacidade={0.55} />
      <sprite scale={[1.1, 1.1, 1]} {...clicavel(onClick)}>
        <spriteMaterial map={brilho()} color="#ffe29a" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <Label text={titulo.length > 34 ? `${titulo.slice(0, 32)}…` : titulo} position={[0, -0.55, 0]} color="#ffe9b8" size={1.45} />
    </group>
  );
}

function Sinal({ pos, onClick }: { pos: Vec3; onClick: () => void }) {
  const aneis = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    aneis.current.forEach((m, k) => {
      if (!m) return;
      const t = (clock.elapsedTime * 0.5 + k / 3) % 1;
      m.scale.setScalar(0.4 + t * 2.2);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    });
  });
  return (
    <group position={pos}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(el) => { if (el) aneis.current[k] = el; }} raycast={() => {}}>
          <ringGeometry args={[0.3, 0.33, 48]} />
          <meshBasicMaterial color="#8ff3d6" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <mesh {...clicavel(onClick)}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshBasicMaterial color="#8ff3d6" />
      </mesh>
    </group>
  );
}

/* Aderência a uma vaga: anel verde pulsando em volta do que a vaga pede e
   o aluno já provou, estrela fantasma no que a vaga pede e ainda falta. */
function AnelDaVaga({ pos }: { pos: Vec3 }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
    ref.current.scale.set(t, t, t);
    ref.current.lookAt(ref.current.parent!.worldToLocal(new THREE.Vector3(0, 0, 60)));
  });
  return (
    <group position={pos}>
      <mesh ref={ref} raycast={() => {}}>
        <torusGeometry args={[0.55, 0.035, 8, 48]} />
        <meshBasicMaterial color="#6dffb0" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function CarreiraNoEspaco({
  dados,
  acesas,
  ate,
  cinema,
  reduzido,
  onSelect,
  aoPosicionar,
  vaga = null,
}: {
  dados: UniversoPublico;
  acesas: string[];
  /** Momento da linha do tempo, em ms. Objeto com data depois disso ainda não existe. */
  ate: number;
  cinema: boolean;
  reduzido: boolean;
  onSelect: (s: Selecao) => void;
  /** Onde estão os objetos visíveis agora, para a câmera enquadrar junto com as estrelas. */
  aoPosicionar?: (pontos: Vec3[]) => void;
  /** Competências pedidas por uma vaga colada pelo visitante, com o que o aluno já provou. */
  vaga?: { id: string; tem: boolean }[] | null;
}) {
  const lay = useMemo(() => layoutDaCarreira(dados, acesas), [dados, acesas]);
  const ja = (iso: string | null | undefined) => !!iso && Date.parse(iso) <= ate;

  const chave = [
    ...(dados.planetas ?? []).filter((p) => ja(p.at)).map((p) => p.id),
    ...(dados.trajetoria ?? []).filter((t) => ja(t.inicio)).map((t) => t.id),
    ...(dados.conquistas ?? []).filter((c) => ja(c.at)).map((c) => c.id),
    dados.guia ? "guia" : "",
  ].join("|");
  useEffect(() => {
    if (!aoPosicionar) return;
    const pts: Vec3[] = [];
    for (const p of dados.planetas ?? []) if (ja(p.at) && lay.planetas.get(p.id)) pts.push(lay.planetas.get(p.id)!);
    for (const t of dados.trajetoria ?? []) if (ja(t.inicio) && lay.paradas.get(t.id)) pts.push(lay.paradas.get(t.id)!);
    for (const c of dados.conquistas ?? []) if (ja(c.at) && lay.cometas.get(c.id)) pts.push(lay.cometas.get(c.id)!);
    if (dados.guia && ate >= Date.now() - 60_000) pts.push(lay.guia);
    aoPosicionar(pts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, lay]);
  const acesasSet = new Set(acesas);
  const corDaComp = (id: string) => {
    const c = lay.comp.get(id);
    return dados.catalog.areas.find((a) => a.id === c?.area)?.color ?? "#9fe7ff";
  };

  const planetasVivos = (dados.planetas ?? []).filter((p) => ja(p.at) && lay.planetas.get(p.id));
  const rota = lay.trajeto.filter((t) => ja(t.inicio)).map((t) => lay.paradas.get(t.id)!);

  return (
    <>
      {/* Luz só para os planetas: as estrelas usam material que não recebe luz. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 10, 12]} intensity={1.1} />

      {lay.nebulosas.map((n) => (
        <group key={n.setor} position={n.pos}>
          <sprite scale={[n.escala, n.escala * 0.7, 1]} raycast={() => {}}>
            <spriteMaterial map={brilho()} color={corDoSetor(n.setor)} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <Label text={n.setor.charAt(0).toUpperCase() + n.setor.slice(1)} position={[0, n.escala * 0.32, 0]} color={corDoSetor(n.setor)} size={1.5} />
        </group>
      ))}

      {planetasVivos.map((p) => {
        const pos = lay.planetas.get(p.id)!;
        const raio = 0.26 + Math.min(36, p.duracao ?? 6) / 36 * 0.3;
        const aneis = p.time && p.time > 1 ? Math.min(3, Math.ceil(Math.log2(p.time))) : 0;
        const cor = p.setor ? corDoSetor(p.setor) : corDaComp(p.competencias[0] ?? "");
        return (
          <group key={p.id}>
            {p.competencias.filter((c) => acesasSet.has(c)).map((c) => (
              <Linha key={c} a={pos} b={lay.comp.get(c)!.position} cor={cor} opacidade={0.16} />
            ))}
            <Planeta pos={pos} cor={cor} raio={raio} aneis={aneis} titulo={p.titulo} cinema={cinema} onClick={() => onSelect({ tipo: "planeta", id: p.id })} />
          </group>
        );
      })}

      {(dados.luas ?? []).filter((l) => ja(l.at) && lay.comp.get(l.competencia)).map((l, i) => (
        <Lua key={l.id} centro={lay.comp.get(l.competencia)!.position} fase={i * 2.4} onClick={() => onSelect({ tipo: "lua", id: l.id })} />
      ))}

      {rota.length > 0 && (
        <>
          {rota.slice(1).map((p, k) => <Linha key={k} a={rota[k]} b={p} cor="#7fe9ff" opacidade={0.35} />)}
          {lay.trajeto.filter((t) => ja(t.inicio)).map((t) => {
            const pos = lay.paradas.get(t.id)!;
            return (
              <group key={t.id} position={pos}>
                <mesh {...clicavel(() => onSelect({ tipo: "parada", id: t.id }))}>
                  <torusGeometry args={[0.2, 0.03, 8, 32]} />
                  <meshBasicMaterial color="#7fe9ff" transparent opacity={0.8} />
                </mesh>
                <Label text={t.cargo.length > 30 ? `${t.cargo.slice(0, 28)}…` : t.cargo} position={[0, -0.5, 0]} color="#bff3ff" size={1.4} />
                {t.organizacao && <Label text={t.organizacao} position={[0, -0.85, 0]} color="#7fa7b8" size={1.2} />}
              </group>
            );
          })}
          <Nave rota={rota} reduzido={reduzido} />
        </>
      )}

      {(dados.conquistas ?? []).filter((c) => ja(c.at) && lay.cometas.get(c.id)).map((c) => (
        <Cometa key={c.id} pos={lay.cometas.get(c.id)!} titulo={c.titulo} cinema={cinema} onClick={() => onSelect({ tipo: "cometa", id: c.id })} />
      ))}

      {(dados.sinais ?? []).map((s) => {
        const pos = (s.projeto && lay.planetas.get(s.projeto)) || ([lay.centro.x, lay.centro.y, lay.centro.z + 1] as Vec3);
        const planeta = s.projeto ? (dados.planetas ?? []).find((p) => p.id === s.projeto) : null;
        if (planeta && !ja(planeta.at)) return null;
        const offset: Vec3 = [pos[0] + 0.7, pos[1] + 0.6, pos[2]];
        return <Sinal key={s.id} pos={offset} onClick={() => onSelect({ tipo: "sinal", id: s.id })} />;
      })}

      {Object.entries(dados.formacao ?? {}).filter(([id]) => !acesasSet.has(id) && lay.comp.get(id)).map(([id]) => {
        const c = lay.comp.get(id)!;
        return (
          <group key={id} position={c.position}>
            <mesh {...clicavel(() => onSelect({ tipo: "formacao", id }))}>
              <sphereGeometry args={[0.2, 12, 8]} />
              <meshBasicMaterial color={corDaComp(id)} wireframe transparent opacity={0.55} />
            </mesh>
            <Label text={`${c.name} · em formação`} position={[0, -0.5, 0]} color="#9fb3c8" size={1.3} />
          </group>
        );
      })}

      {vaga && (
        <group>
          {vaga.filter((r) => r.tem && lay.comp.get(r.id)).map((r) => (
            <AnelDaVaga key={r.id} pos={lay.comp.get(r.id)!.position} />
          ))}
          {vaga.filter((r) => !r.tem && lay.comp.get(r.id)).map((r) => (
            <group key={r.id} position={lay.comp.get(r.id)!.position}>
              <mesh raycast={() => {}}>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshBasicMaterial color="#ff9d7a" wireframe transparent opacity={0.5} />
              </mesh>
              <Label text={`${lay.comp.get(r.id)!.name} · a vaga pede`} position={[0, -0.5, 0]} color="#ffb59a" size={1.3} />
            </group>
          ))}
        </group>
      )}

      {!vaga && dados.guia && ate >= Date.now() - 60_000 && (
        <group>
          {dados.guia.requeridas.map((r) => {
            const c = lay.comp.get(r.id);
            if (!c) return null;
            return <Linha key={r.id} a={lay.guia} b={c.position} cor="#ffd27a" opacidade={r.tem ? 0.45 : 0.14} />;
          })}
          {dados.guia.requeridas.filter((r) => !r.tem && !acesasSet.has(r.id) && lay.comp.get(r.id)).map((r) => (
            <group key={r.id} position={lay.comp.get(r.id)!.position}>
              <mesh raycast={() => {}}>
                <sphereGeometry args={[0.18, 10, 8]} />
                <meshBasicMaterial color="#ffd27a" wireframe transparent opacity={0.35} />
              </mesh>
              <Label text={lay.comp.get(r.id)!.name} position={[0, -0.45, 0]} color="#c9a860" size={1.25} />
            </group>
          ))}
          <group position={lay.guia}>
            <sprite scale={[3.2, 3.2, 1]} {...clicavel(() => onSelect({ tipo: "guia" }))}>
              <spriteMaterial map={brilho()} color="#ffd27a" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <Label text={`Objetivo: ${dados.guia.titulo}`} position={[0, -1, 0]} color="#ffe2a6" size={1.8} />
          </group>
        </group>
      )}
    </>
  );
}
