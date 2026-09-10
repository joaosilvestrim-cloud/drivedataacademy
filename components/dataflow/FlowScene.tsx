'use client';
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

const POS:[number,number,number][]=[[-6,0,2],[-3,0,-2],[0,0,2],[3,0,-2],[6,0,2]];
const COLORS=['#63dbe4','#a8a0ff','#f7c379','#63edc0','#78aaff'];
const LABELS=['01 FONTES','02 LIMPEZA','03 FILTRO','04 JUNÇÃO','05 SQL'];
function Label({text}:{text:string}) {
  const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#eaf6ff';ctx.font='600 44px Segoe UI';ctx.textAlign='center';ctx.fillText(text,256,58);return new THREE.CanvasTexture(canvas);},[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <sprite position={[0,2.7,0]} scale={[4.2,.79,1]}><spriteMaterial map={texture} depthTest={false}/></sprite>;
}
function Tube({a,b,active,progress}:{a:number;b:number;active:boolean;progress:number}) {
  const curve=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(...POS[a]).add(new THREE.Vector3(0,.8,0)),new THREE.Vector3((POS[a][0]+POS[b][0])/2,1.1,(POS[a][2]+POS[b][2])/2),new THREE.Vector3(...POS[b]).add(new THREE.Vector3(0,.8,0))]),[a,b]);
  return <group><mesh><tubeGeometry args={[curve,32,.045,8,false]}/><meshBasicMaterial color={active?COLORS[b]:'#254456'} transparent opacity={active?.8:.4}/></mesh>{Array.from({length:9},(_,i)=>{const p=curve.getPoint(((i/9)+progress)%1);return <mesh key={i} position={p}><sphereGeometry args={[.075,8,8]}/><meshBasicMaterial color={active?COLORS[b]:'#35586b'}/></mesh>;})}</group>;
}
function Controls({reset,reduced}:{reset:number;reduced:boolean}) {
  const {camera,gl,size,invalidate}=useThree();const controls=useRef<OrbitControls>();
  useEffect(()=>{const c=new OrbitControls(camera,gl.domElement);controls.current=c;c.enableDamping=!reduced;c.minDistance=9;c.maxDistance=38;c.maxPolarAngle=1.45;c.target.set(0,.7,0);const changed=()=>invalidate();c.addEventListener('change',changed);return()=>{c.removeEventListener('change',changed);c.dispose();};},[camera,gl,invalidate,reduced]);
  useEffect(()=>{camera.position.set(4,9,13).multiplyScalar(size.width<520?1.15:1);controls.current?.target.set(0,.7,0);controls.current?.update();invalidate();},[camera,reset,size.width,invalidate]);
  useFrame(()=>controls.current?.update());return null;
}
export default function FlowScene({selected,onSelect,counts,time,reset,reduced}:{selected:number;onSelect:(n:number)=>void;counts:number[];time:number;reset:number;reduced:boolean}) {
  return <Canvas dpr={[1,1.5]} camera={{position:[4,9,13],fov:42}} frameloop={reduced?'demand':'always'} fallback={<p>Use a visão 2D para explorar este fluxo.</p>}>
    <color attach="background" args={['#081522']}/><fog attach="fog" args={['#081522',28,65]}/>
    <ambientLight intensity={1.7}/><pointLight position={[0,9,2]} intensity={70} color="#9dcaff"/><directionalLight position={[-5,10,7]} intensity={2}/>
    <Controls reset={reset} reduced={reduced}/><gridHelper args={[44,44,'#204050','#122a3a']} position={[0,-.1,0]}/>
    {[0,1,2,3].map(i=><Tube key={i} a={i} b={i+1} active={time>=i*25} progress={Math.min(1,Math.max(0,(time-i*25)/25))*.95}/>)}
    {POS.map((pos,i)=><group key={i} position={pos} onClick={e=>{e.stopPropagation();onSelect(i);}}>
      <mesh position={[0,.12,0]}><cylinderGeometry args={[1.35,1.48,.24,6]}/><meshStandardMaterial color={selected===i?COLORS[i]:'#20384a'} metalness={.65} roughness={.3}/></mesh>
      <mesh position={[0,1,0]} rotation={[0,Math.PI/6,0]}><cylinderGeometry args={[.83,.83,1.55,i===0?32:6]}/><meshStandardMaterial color={COLORS[i]} transparent opacity={selected===i?.8:.4} metalness={.5} roughness={.2} emissive={COLORS[i]} emissiveIntensity={selected===i?.3:.07}/></mesh>
      {[.4,1,1.6].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.9,.025,8,40]}/><meshBasicMaterial color={COLORS[i]}/></mesh>)}
      <mesh position={[0,1,0]}><octahedronGeometry args={[selected===i?.42:.27]}/><meshBasicMaterial color={COLORS[i]}/></mesh>
      <Label text={`${LABELS[i]} · ${counts[i]??'—'}`}/>
    </group>)}
  </Canvas>;
}
