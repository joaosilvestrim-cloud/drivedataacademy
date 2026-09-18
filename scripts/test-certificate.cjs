const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const filename=path.resolve('components/CertificateView.tsx');
const mod=new Module(filename);mod.paths=Module._nodeModulePaths(path.dirname(filename));
const original=mod.require.bind(mod);
mod.require=id=>id==='./certificate.module.css'?{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}:original(id);
mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const Certificate=mod.exports.default;
const base={studentName:'Maria Oliveira',courseTitle:'Engenharia de Dados',dateLabel:'18 de setembro de 2026',workload:'40 horas',code:'DDA-TESTE',host:'academy.drivedata.com.br'};
const render=props=>renderToStaticMarkup(React.createElement(Certificate,{...base,...props}));
test('uses supplied student, course, workload, date and both configured signatures',()=>{
 const html=render({assinaturas:[{nome:'Tamires Cavani',cargo:'Head de Negócios',url:'/tamires.png'},{nome:'Reed Lopes',cargo:'Head de Dados e IA',url:'/reed.png'}]});
 for(const value of [...Object.values(base),'Tamires Cavani','Reed Lopes','/tamires.png','/reed.png'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('PROPOSTA VISUAL'));assert.ok(!html.includes('SEM VALIDADE'));
});
test('live participation does not claim course completion and handles absent workload/signatures',()=>{
 const html=render({headline:'Certificado de Participação',achievementLabel:'participou da transmissão ao vivo',workload:null,assinaturas:[]});
 assert.ok(html.includes('Certificado de Participação'));assert.ok(html.includes('participou da transmissão ao vivo'));
 assert.ok(!html.includes('concluiu com êxito'));assert.ok(!html.includes('Carga horária'));assert.ok(!html.includes('Assinatura de'));
});
test('revoked, expired and demonstration status survive inside the printable document',()=>{
 for(const [status,label] of [['revoked','CERTIFICADO REVOGADO'],['expired','CERTIFICADO EXPIRADO'],['preview','MODELO DEMONSTRATIVO / SEM VALIDADE']])assert.ok(render({status}).includes(label));
});
test('verification link uses the exact same URL provided to the QR generator',()=>{
 const url='https://academy.drivedata.com.br/certificado/DDA-TESTE';
 const html=render({qrSvg:'<svg viewBox="0 0 10 10"></svg>',verificationUrl:url});
 assert.ok(html.includes(`href="${url}"`));assert.ok(html.includes('Verificar autenticidade'));
});
test('long strings are preserved, escaped and receive adaptive sizing',()=>{
 const name='Maria de Albuquerque '.repeat(5),course='Dados & análise <avançada> '.repeat(6);
 const html=render({studentName:name,courseTitle:course});
 assert.ok(html.includes(name));assert.ok(html.includes('Dados &amp; análise &lt;avançada&gt;'));
 assert.ok(html.includes('--name-size:2.5cqw'));assert.ok(html.includes('--course-size:1.65cqw'));
});
