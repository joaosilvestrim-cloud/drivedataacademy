'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Catalog, Score, Vec3 } from '@/lib/knowledge/types';

interface Props { catalog: Catalog; scores: Record<string, Score>; visible: string[]; selected: string | null; onSelect: (id: string) => void; onArea: (id: string) => void; reduced: boolean; reset: number; zoom: number }
function Label({ text, position, color = '#e4edf8', size = 1.65 }: { text: string; position: Vec3; color?: string; size?: number }) {
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
function Controls({ selected, catalog, reset, zoom }: Pick<Props, 'selected' | 'catalog' | 'reset' | 'zoom'>) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement); controls.current = orbit;
    orbit.enableDamping = true; orbit.dampingFactor = .07; orbit.minDistance = 5; orbit.maxDistance = 38;
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
    offset.setLength(THREE.MathUtils.clamp(offset.length(), 5, 38)); camera.position.copy(orbit.target).add(offset); orbit.update(); invalidate();
  }, [zoom, camera, invalidate]);
  useFrame((_, delta) => controls.current?.update(delta));
  return null;
}
function Connection({ a, b, color, opacity }: { a: Vec3; b: Vec3; color: string; opacity: number }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), [a,b]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const object = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity })), [geometry,color,opacity]);
  useEffect(() => () => { (object.material as THREE.Material).dispose(); }, [object]);
  return <primitive object={object} />;
}
function Node({ position, color, score, focused, dim, label, onClick, reduced }: { position: Vec3; color: string; score: Score; focused: boolean; dim: boolean; label: string; onClick: () => void; reduced: boolean }) {
  const halo = useRef<THREE.Mesh>(null);
  const radius = .10 + Math.sqrt(score.score / 100) * .21;
  useFrame(({ clock }) => { if (halo.current && !reduced) halo.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.8 + position[0]) * .08 * ((score.freshness ?? 0) / 100)); });
  const opacity = dim ? .15 : score.score === 0 ? .4 : .95;
  return <group position={position}>
    <mesh onClick={e => { e.stopPropagation(); onClick(); }} onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <sphereGeometry args={[Math.max(.20, radius), 24, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} wireframe={score.score === 0} />
    </mesh>
    <mesh ref={halo}>
      <sphereGeometry args={[radius * 1.8, 20, 12]} />
      <meshBasicMaterial color={color} transparent opacity={dim ? .01 : .035 + .07 * ((score.freshness ?? 0) / 100)} depthWrite={false} />
    </mesh>
    {focused && <mesh><ringGeometry args={[radius + .12, radius + .145, 64]} /><meshBasicMaterial color="#ffffff" transparent opacity={.9} side={THREE.DoubleSide} /></mesh>}
    {!dim && <Label text={label} position={[0, -radius - .33, 0]} color={score.score ? '#dbe8f5' : '#8393ac'} size={1.25} />}
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
  const selectedArea = catalog.competencies.find(c => c.id === selected)?.area;
  const connected = new Set(catalog.relations.filter(r => r.source === selected || r.target === selected).flatMap(r => [r.source, r.target]));
  return <>
    <Controls {...props} />
    {[0,1,2].map(layer => <StarLayer key={layer} layer={layer} reduced={reduced} />)}
    {catalog.areas.filter(area => catalog.competencies.some(c => c.area === area.id && visible.includes(c.id))).map(area => <group key={area.id} position={area.position}>
      <mesh onClick={e => { e.stopPropagation(); onArea(area.id); }}><sphereGeometry args={[.48,32,24]} /><meshBasicMaterial color={area.color} transparent opacity={.13} /></mesh>
      <mesh><sphereGeometry args={[.20,24,16]} /><meshBasicMaterial color={area.color} /></mesh>
      {[.68,.85].map(r => <mesh key={r} rotation={[.25,.25,0]}><ringGeometry args={[r,r+.009,96]} /><meshBasicMaterial color={area.color} transparent opacity={.22} side={THREE.DoubleSide} /></mesh>)}
      <Label text={area.name.toLocaleUpperCase('pt-BR')} color={area.color} position={[0,.95,0]} size={1.7} />
    </group>)}
    {catalog.competencies.filter(c => visible.includes(c.id)).map(c => {
      const area = catalog.areas.find(a => a.id === c.area)!;
      return <Connection key={`area-${c.id}`} a={area.position} b={c.position} color={area.color} opacity={selected && selectedArea !== c.area ? .018 : .1} />;
    })}
    {catalog.relations.filter(r => visible.includes(r.source) && visible.includes(r.target)).map(r => {
      const a = catalog.competencies.find(c => c.id === r.source)!; const b = catalog.competencies.find(c => c.id === r.target)!;
      const active = scores[a.id].score > 0 && scores[b.id].score > 0;
      const focused = r.source === selected || r.target === selected;
      return <Connection key={`${r.source}-${r.target}`} a={a.position} b={b.position} color={catalog.areas.find(area => area.id === a.area)!.color} opacity={focused ? .75 : selected ? .025 : active ? .16 + r.strength * .1 : .045} />;
    })}
    {catalog.competencies.filter(c => visible.includes(c.id)).map(c => <Node key={c.id} position={c.position} color={catalog.areas.find(a => a.id === c.area)!.color} label={c.name} score={scores[c.id]} focused={c.id === selected} dim={!!selected && c.id !== selected && !connected.has(c.id)} onClick={() => onSelect(c.id)} reduced={reduced} />)}
  </>;
}
export default function UniverseCanvas(props: Props) {
  const [active, setActive] = useState(true);
  useEffect(() => { const change = () => setActive(!document.hidden); document.addEventListener('visibilitychange', change); return () => { document.removeEventListener('visibilitychange', change); document.body.style.cursor = ''; }; }, []);
  return <Canvas camera={{ position: [0,1.5,23], fov: 42 }} dpr={[1,1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} frameloop={props.reduced || !active ? 'demand' : 'always'} onPointerMissed={() => { document.body.style.cursor = ''; }}>
    <Scene {...props} />
  </Canvas>;
}
