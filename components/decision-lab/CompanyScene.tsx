'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Area} from '@/lib/decision-lab/engine';

const AREAS:{id:Area;label:string;position:[number,number,number];color:string;height:number}[]=[
  {id:'sales',label:'VENDAS',position:[-4,0,3.8],color:'#ff8e6e',height:2.2},
  {id:'stock',label:'ESTOQUE',position:[4,0,3.8],color:'#8aaeff',height:2.5},
  {id:'finance',label:'FINANCEIRO',position:[-4,0,-3.8],color:'#65dfc5',height:5},
  {id:'operations',label:'OPERAÇÕES',position:[4,0,-3.8],color:'#e9bd69',height:3.2},
];
function Label({text,color,position}:{text:string;color:string;position:[number,number,number]}) {
  const map=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;
    const c=canvas.getContext('2d')!;c.fillStyle='#101e2bee';c.beginPath();c.roundRect(16,8,480,80,16);c.fill();c.strokeStyle=color+'88';c.lineWidth=2;c.stroke();c.fillStyle=color;c.font='600 46px Segoe UI';c.textAlign='center';c.fillText(text,256,59);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  },[text,color]);
  useEffect(()=>()=>map.dispose(),[map]);
  return <sprite position={position} scale={[5.2,1,1]}><spriteMaterial map={map} depthTest={false}/></sprite>;
}
function Box({position,size,color,...props}:{position:[number,number,number];size:[number,number,number];color:string;metalness?:number}) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.5} {...props}/></mesh>;
}
function Building({area,selected,onSelect,stock}:{area:typeof AREAS[number];selected:boolean;onSelect:()=>void;stock:number}) {
  const {height:h,color,id}=area;
  return <group position={area.position} onClick={e=>{e.stopPropagation();onSelect();}}>
    <Box position={[0,.08,0]} size={[5.8,.16,5.4]} color={selected?'#325458':'#243240'}/>
    <Box position={[0,h/2+.2,0]} size={[3.9,h,3.2]} color={id==='finance'?'#264c59':'#354859'} metalness={.25}/>
    <Box position={[0,h+.26,0]} size={[4.15,.2,3.5]} color={color}/>
    {[0,1,2].map(x=>Array.from({length:id==='finance'?4:2},(_,y)=><Box key={`${x}-${y}`} position={[-1.25+x*1.2,.8+y*(id==='finance'?1.05:.7),1.62]} size={[.7,.42,.035]} color={selected?color:'#6c92a0'}/>))}
    {id==='sales'&&<><Box position={[0,1.65,1.95]} size={[4.3,.25,1.2]} color={color}/><Box position={[0,.7,1.65]} size={[.6,1.3,.1]} color="#132933"/></>}
    {id==='stock'&&<>{[0,1,2].map(i=><Box key={i} position={[-1.3+i*1.3,.75,1.63]} size={[1,1.2,.06]} color="#141e2a"/>)}{Array.from({length:Math.min(9,Math.ceil(stock/100))},(_,i)=><Box key={i} position={[-1.8+(i%3)*.7,.4+Math.floor(i/3)*.65,2.25]} size={[.6,.6,.6]} color="#b79460"/>)}</>}
    {id==='operations'&&[0,1].map(i=><Box key={i} position={[-1+i*2,h+.65,0]} size={[.8,.65,1.4]} color="#7896a6"/>)}
    {id==='finance'&&<Box position={[0,h+.85,0]} size={[1.4,1,1.4]} color="#3b6970"/>}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.19,0]}><ringGeometry args={[3.05,selected?3.13:3.08,64]}/><meshBasicMaterial color={color} transparent opacity={selected ? .85 : .2}/></mesh>
    <Label text={area.label} color={color} position={[0,h+1.95,0]}/>
  </group>;
}
function Vehicle({offset,color,reduced}:{offset:number;color:string;reduced:boolean}) {
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(!ref.current||reduced)return;const t=(clock.elapsedTime*.055+offset)%1;const a=t*4;const edge=Math.floor(a),v=(a-edge)*17-8.5;ref.current.position.set(edge===0?v:edge===1?8.5:edge===2?-v:-8.5,.3,edge===0?-8.5:edge===1?v:edge===2?8.5:-v);ref.current.rotation.y=edge%2?Math.PI/2:0;});
  return <group ref={ref} position={[-8.5+offset*17,.3,-8.5]}><Box position={[0,.15,0]} size={[1,.35,.5]} color={color}/><Box position={[.08,.45,0]} size={[.5,.3,.45]} color="#b8d0d5"/>{[-.3,.3].map(x=>[-.27,.27].map(z=><mesh key={`${x}-${z}`} position={[x,0,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.14,.14,.09,8]}/><meshStandardMaterial color="#101920"/></mesh>))}</group>;
}
function Controls({reset,zoom,reduced}:{reset:number;zoom:number;reduced:boolean}) {
  const {camera,gl,invalidate,size}=useThree();const ref=useRef<OrbitControls|null>(null);const lastZoom=useRef(zoom);
  useEffect(()=>{const c=new OrbitControls(camera,gl.domElement);ref.current=c;c.minDistance=14;c.maxDistance=44;c.maxPolarAngle=1.35;c.minPolarAngle=.25;c.enableDamping=!reduced;c.target.set(0,1,0);const changed=()=>invalidate();c.addEventListener('change',changed);c.update();return()=>{c.removeEventListener('change',changed);c.dispose();ref.current=null;};},[camera,gl,invalidate,reduced]);
  useEffect(()=>{camera.position.set(17,16,19).multiplyScalar(size.width<520?1.35:1);ref.current?.target.set(0,1,0);ref.current?.update();invalidate();},[reset,camera,invalidate,size.width]);
  useEffect(()=>{const c=ref.current;if(!c)return;const delta=zoom-lastZoom.current;lastZoom.current=zoom;const offset=camera.position.clone().sub(c.target).multiplyScalar(Math.pow(.85,delta));offset.setLength(THREE.MathUtils.clamp(offset.length(),14,44));camera.position.copy(c.target).add(offset);c.update();invalidate();},[zoom,camera,invalidate]);
  useFrame(()=>ref.current?.update());return null;
}
export default function CompanyScene({area,onArea,stock,reduced,reset,zoom}:{area:Area;onArea:(area:Area)=>void;stock:number;reduced:boolean;reset:number;zoom:number}) {
  const [hidden,setHidden]=useState(false);
  useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);change();return()=>document.removeEventListener('visibilitychange',change);},[]);
  return <Canvas shadows dpr={[1,1.5]} camera={{position:[17,16,19],fov:43}} frameloop={reduced||hidden?'demand':'always'} gl={{antialias:true,alpha:true}}>
    <ambientLight intensity={1.6}/><hemisphereLight args={['#bdddeb','#172735',1.4]}/><directionalLight position={[6,18,8]} intensity={2.2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15}/>
    <Controls reset={reset} zoom={zoom} reduced={reduced}/>
    <Box position={[0,-.35,0]} size={[20,.6,20]} color="#172836"/>
    <Box position={[0,-.02,0]} size={[18,.08,18]} color="#32404b"/>
    <Box position={[0,.04,0]} size={[1.7,.07,17]} color="#13232f"/><Box position={[0,.045,0]} size={[17,.07,1.7]} color="#13232f"/>
    {Array.from({length:11},(_,i)=><group key={i}><Box position={[0,.09,-7.5+i*1.5]} size={[.07,.01,.6]} color="#65747a"/><Box position={[-7.5+i*1.5,.095,0]} size={[.6,.01,.07]} color="#65747a"/></group>)}
    {AREAS.map(a=><Building key={a.id} area={a} selected={area===a.id} onSelect={()=>onArea(a.id)} stock={stock}/>)}
    {[-7.2,7.2].map(x=>[-6,-2,2,6].map(z=><group key={`${x}-${z}`} position={[x,0,z]}><mesh position={[0,.55,0]} castShadow><cylinderGeometry args={[.1,.14,1.1,7]}/><meshStandardMaterial color="#806a53"/></mesh><mesh position={[0,1.3,0]} castShadow><icosahedronGeometry args={[.58,1]}/><meshStandardMaterial color="#417d6a"/></mesh></group>))}
    <Vehicle offset={.05} color="#ff9f69" reduced={reduced}/><Vehicle offset={.55} color="#72d8c2" reduced={reduced}/><Vehicle offset={.8} color="#8caff1" reduced={reduced}/>
  </Canvas>;
}
