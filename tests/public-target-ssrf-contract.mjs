import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3247;
const runtimeDir = path.join(root, 'runtime-test-baseline-ssrf');
fs.rmSync(runtimeDir, { recursive: true, force: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', NV0_RUNTIME_DIR: runtimeDir, NV0_FALLBACK_RUNTIME_DIR: runtimeDir, NV0_TARGET_FETCH_ENABLED: 'true', NV0_SCAN_PROVIDER: 'builtin', NV0_PAYMENT_PROVIDER: 'demo', NV0_ENABLE_TURNSTILE: 'false', NV0_EXPOSE_INTERNAL_PUBLIC_APIS: 'false' }, stdio: 'ignore' });
async function stop() { if (child.exitCode !== null) return; await new Promise(resolve => { const timer=setTimeout(()=>{ try{ child.kill('SIGKILL'); }catch{} resolve(); },1000); child.once('exit',()=>{clearTimeout(timer);resolve();}); try{child.kill('SIGTERM');}catch{resolve();} }); }
async function request(target) { const res = await fetch(`${base}/api/public/diagnose`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }) }); return { status: res.status, data: await res.json().catch(()=>({})) }; }
try {
  for (let i=0;i<60;i+=1) { try { const res=await fetch(`${base}/readyz`); if(res.ok) break; } catch {} await wait(150); }
  const blocked = ['http://127.0.0.1:3247/healthz','http://localhost:3247','http://169.254.169.254/latest/meta-data','http://2130706433/','http://10.0.0.1/','http://example.local/','http://service.internal/','ftp://example.com/','javascript:alert(1)'];
  for (const target of blocked) { const result=await request(target); assert.equal(result.status, 400, `${target} must be rejected`); assert.equal(result.data.ok, false, target); }
  const valid=await request('https://example.com'); assert.equal(valid.status, 200); assert.equal(valid.data.ok, true);
  console.log(JSON.stringify({ ok: true, blockedTargets: blocked.length, validTargets: 1 }, null, 2));
} finally { await stop(); fs.rmSync(runtimeDir,{recursive:true,force:true}); }
