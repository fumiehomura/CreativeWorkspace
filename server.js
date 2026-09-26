const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = Number(process.env.CW_PORT || 4318);
const APP = __dirname;
const PUBLIC = path.join(APP, 'public');
// Keep user works outside the application/repository directory by default.
// CW_DATA_DIR is used only for explicit local testing and migration scenarios.
const DATA = process.env.CW_DATA_DIR || path.resolve(APP, '..', 'CreativeWorkspaceData');
const PROJECTS = path.join(DATA, 'projects');
const TEMPLATES = path.join(DATA, 'templates');
const CONFIG = path.join(DATA, 'config.json');

const json = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
const id = () => `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
const safeId = value => /^[a-zA-Z0-9_-]+$/.test(value || '') ? value : null;
const now = () => new Date().toISOString();
async function exists(file) { try { await fsp.access(file); return true; } catch { return false; } }
async function read(file, fallback=null) { try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return fallback; } }
async function atomic(file, data) { await fsp.mkdir(path.dirname(file), {recursive:true}); const tmp=`${file}.${process.pid}.tmp`; await fsp.writeFile(tmp, JSON.stringify(data,null,2),'utf8'); await fsp.rename(tmp,file); }
async function copyDir(src,dest){ await fsp.cp(src,dest,{recursive:true,errorOnExist:true}); }

function blankProject(name, type='空のプロジェクト') {
  const stamp=now();
  return {schemaVersion:1,id:id(),name,type,createdAt:stamp,updatedAt:stamp,
    statusLabels:['確定','仮説','未確定','廃案','参考'],
    scenes:[{id:id(),number:'1',name:'最初のシーン',location:'',time:'',characters:[],body:'',stageDirection:'',dialogue:'',productionNotes:'',relatedSettings:[],openQuestions:'',status:'未確定',customFields:{}}],
    settings:[{id:id(),category:'人物',title:'登場人物A',body:'架空のサンプル人物です。',status:'仮説'}],notes:'',backupPolicy:{auto:false,keep:20}};
}
async function writeProject(p,{history=true,reason='保存'}={}){
  const dir=path.join(PROJECTS,p.id); const file=path.join(dir,'project.json'); const before=await read(file);
  p.updatedAt=now(); await atomic(file,p);
  if(history){ const entry={id:id(),at:now(),projectId:p.id,target:'project.json',reason,before,after:p}; await atomic(path.join(dir,'history',`${entry.at.replace(/[:.]/g,'-')}-${entry.id}.json`),entry); }
  return p;
}
async function listProjects(){ if(!await exists(PROJECTS)) return []; const out=[]; for(const d of await fsp.readdir(PROJECTS,{withFileTypes:true})){ if(d.isDirectory()){ const p=await read(path.join(PROJECTS,d.name,'project.json')); if(p) out.push({id:p.id,name:p.name,type:p.type,updatedAt:p.updatedAt,sceneCount:p.scenes?.length||0}); }} return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }
async function listTemplates(){ if(!await exists(TEMPLATES)) return []; const out=[]; for(const f of await fsp.readdir(TEMPLATES)){ if(f.endsWith('.json')){ const t=await read(path.join(TEMPLATES,f)); if(t) out.push(t); }} return out.sort((a,b)=>a.name.localeCompare(b.name,'ja')); }
async function backup(pid){ const p=await read(path.join(PROJECTS,pid,'project.json')); if(!p) throw Error('作品がありません'); const stamp=now().replace(/[:.]/g,'-'); await atomic(path.join(PROJECTS,pid,'backups',`${stamp}.json`),p); if(p.backupPolicy?.auto && p.backupPolicy.keep>0){ const dir=path.join(PROJECTS,pid,'backups'); const files=(await fsp.readdir(dir)).filter(x=>x.endsWith('.json')).sort(); while(files.length>p.backupPolicy.keep) await fsp.unlink(path.join(dir,files.shift())); } return stamp; }
async function init(){
  await Promise.all([fsp.mkdir(PROJECTS,{recursive:true}),fsp.mkdir(TEMPLATES,{recursive:true})]);
  if(!await exists(CONFIG)) await atomic(CONFIG,{version:'0.1.0',telemetry:false,externalNetwork:false,dataDirectory:DATA});
  if((await listTemplates()).length===0){ for(const name of ['脚本','小説','映像企画','ゲーム企画','世界観設定','空のプロジェクト']){ const p=blankProject(name,name); await atomic(path.join(TEMPLATES,`${p.id}.json`),{id:p.id,name,createdAt:now(),content:{type:name,scenes:p.scenes,settings:p.settings,notes:''}}); }}
  if((await listProjects()).length===0){ const p=blankProject('灯台町の手紙（サンプル）','脚本'); p.scenes[0].body='潮の匂いが残る夕暮れ。ミナは古い封筒を机に置く。'; p.scenes[0].stageDirection='窓の外で灯台の光がゆっくり回る。'; await writeProject(p,{history:false}); await backup(p.id); }
}
async function body(req){ const chunks=[]; for await(const c of req){ chunks.push(c); if(chunks.reduce((n,b)=>n+b.length,0)>10_000_000) throw Error('データが大きすぎます'); } return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}; }
function sendFile(res,file){ const ext=path.extname(file); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'}; fs.readFile(file,(e,b)=>{ if(e){res.writeHead(404);res.end('Not found');return;} res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(b);}); }
async function api(req,res,url){
  const seg=url.pathname.split('/').filter(Boolean).slice(1); const method=req.method;
  if(method==='GET' && seg[0]==='projects' && !seg[1]) return json(res,200,await listProjects());
  if(method==='GET' && seg[0]==='projects' && safeId(seg[1]) && !seg[2]) { const p=await read(path.join(PROJECTS,seg[1],'project.json')); return p?json(res,200,p):json(res,404,{error:'作品がありません'}); }
  if(method==='POST' && seg[0]==='projects' && !seg[1]) { const b=await body(req); let p=blankProject(b.name||'名称未設定',b.type); if(b.templateId){ const t=await read(path.join(TEMPLATES,`${safeId(b.templateId)}.json`)); if(t) p={...p,...structuredClone(t.content),id:p.id,name:b.name||`${t.name}の新規作品`,createdAt:now(),updatedAt:now()}; } await writeProject(p,{history:false}); return json(res,201,p); }
  if(method==='PUT' && seg[0]==='projects' && safeId(seg[1])) { const b=await body(req); if(b.id!==seg[1]) return json(res,400,{error:'作品IDが一致しません'}); return json(res,200,await writeProject(b)); }
  if(method==='POST' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='duplicate') { const src=await read(path.join(PROJECTS,seg[1],'project.json')); if(!src)return json(res,404,{error:'作品がありません'}); const b=await body(req); const p=structuredClone(src); p.id=id();p.name=b.name||`${src.name} コピー`;p.createdAt=now();p.updatedAt=now(); await writeProject(p,{history:false}); return json(res,201,p); }
  if(method==='POST' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='backup') return json(res,201,{stamp:await backup(seg[1])});
  if(method==='GET' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='history') { const dir=path.join(PROJECTS,seg[1],'history'); const out=[]; if(await exists(dir)) for(const f of (await fsp.readdir(dir)).sort().reverse().slice(0,100)){ const h=await read(path.join(dir,f)); if(h) out.push(h); } return json(res,200,out); }
  if(method==='POST' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='restore' && safeId(seg[3])) { const dir=path.join(PROJECTS,seg[1],'history'); const file=(await fsp.readdir(dir)).find(f=>f.includes(seg[3])); const h=file&&await read(path.join(dir,file)); if(!h?.before)return json(res,404,{error:'復元対象がありません'}); const current=await read(path.join(PROJECTS,seg[1],'project.json')); await writeProject(current,{history:true,reason:'復元前の保全'}); h.before.id=seg[1]; return json(res,200,await writeProject(h.before,{history:true,reason:'履歴から復元'})); }
  if(method==='GET' && seg[0]==='templates') return json(res,200,await listTemplates());
  if(method==='POST' && seg[0]==='templates') { const b=await body(req); const t={id:id(),name:b.name||'新規テンプレート',createdAt:now(),content:b.content||blankProject('',b.name)}; await atomic(path.join(TEMPLATES,`${t.id}.json`),t); return json(res,201,t); }
  if(method==='PUT' && seg[0]==='templates' && safeId(seg[1])) { const b=await body(req); b.id=seg[1]; await atomic(path.join(TEMPLATES,`${seg[1]}.json`),b); return json(res,200,b); }
  if(method==='DELETE' && seg[0]==='templates' && safeId(seg[1])) { await fsp.unlink(path.join(TEMPLATES,`${seg[1]}.json`)); return json(res,200,{ok:true}); }
  if(method==='POST' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='template') { const p=await read(path.join(PROJECTS,seg[1],'project.json')); const b=await body(req); const fields=b.fields||['type','scenes','settings','notes']; const content={}; for(const f of fields) content[f]=structuredClone(p[f]); const t={id:id(),name:b.name||`${p.name} テンプレート`,createdAt:now(),content}; await atomic(path.join(TEMPLATES,`${t.id}.json`),t); return json(res,201,t); }
  if(method==='GET' && seg[0]==='projects' && safeId(seg[1]) && seg[2]==='export') { const p=await read(path.join(PROJECTS,seg[1],'project.json')); if(!p)return json(res,404,{error:'作品がありません'}); const format=url.searchParams.get('format')||'json'; if(format==='md'){ const md=`# ${p.name}\n\n${p.scenes.map(s=>`## ${s.number}. ${s.name}\n\n${s.body}\n\n${s.stageDirection?`> ${s.stageDirection}\n`:''}`).join('\n')}\n`; res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(p.name+'.md')}`}); return res.end(md); } res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(p.name+'.json')}`}); return res.end(JSON.stringify(p,null,2)); }
  json(res,404,{error:'APIがありません'});
}
const server=http.createServer(async(req,res)=>{ try{ const url=new URL(req.url,`http://${HOST}`); if(url.pathname.startsWith('/api/')) return await api(req,res,url); const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)); const file=path.resolve(PUBLIC,rel); if(!file.startsWith(PUBLIC)) {res.writeHead(403);return res.end();} sendFile(res,file); }catch(e){ console.error(e.message); json(res,500,{error:e.message}); }});
async function start(){ await init(); return new Promise(resolve=>server.listen(PORT,HOST,()=>{console.log(`Creative Workspace: http://${HOST}:${PORT}\nData: ${DATA}`);resolve(server)})); }
if(require.main===module) start();
module.exports={start};
