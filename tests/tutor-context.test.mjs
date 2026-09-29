import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the real route with only the Cloudflare runtime and upstream network replaced.
const runtime=`export const env={}; export const owner=()=>{throw Error('Login must not be required');};
export class HttpError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const json=request=>request.json();export const failure=e=>Response.json({error:e.message},{status:e.status||500});`;
const dataUrl=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
let source=fs.readFileSync(new URL('../app/api/tutor/route.ts',import.meta.url),'utf8');
source=source.replace(/from '(@\/lib\/[^']+)'/g,(_,specifier)=>{
 const target=specifier==='@/lib/server'?dataUrl(runtime):new URL('../lib/'+specifier.split('/').at(-1)+'.ts',import.meta.url).href;
 return 'from '+JSON.stringify(target);
});
const {POST}=await import(dataUrl(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText));
const base={key:'fixture-only-test-key',config:{provider:'deepseek',baseUrl:'https://api.deepseek.com/v1/chat/completions',textModel:'deepseek-chat',visionModel:''},text:'请依据内置资料复习',topic:'cache'};
const request=body=>new Request('http://localhost/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,...body})});

test('lesson and practice accept no PDF import, use server-owned sources and the correct DeepSeek endpoint',async t=>{
 const sent=[];
 t.mock.method(globalThis,'fetch',async(url,init)=>{sent.push({url,body:JSON.parse(init.body)});return Response.json({choices:[{message:{content:'早觉雨大人，测试回答。'}}]});});
 for(const mode of ['lesson','practice']){
  const response=await POST(request({mode,evidence:[]}));
  assert.equal(response.status,200);
  assert.equal((await response.json()).verification.lean_status,'not_run');
 }
 for(const item of sent){
  assert.equal(item.url,'https://api.deepseek.com/v1/chat/completions');
  assert.match(item.body.messages[1].content,/Cache：地址拆分/);
  assert.match(item.body.messages[1].content,/2010年计算机408/);
  assert.match(item.body.messages[1].content,/原创整理而非PDF原文/);
 }
});
test('optional private excerpts still require consent before any external request',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('must not be called');});
 const response=await POST(request({mode:'lesson',evidence:[{id:'test',title:'private.pdf',page:1,quality:'text',snippet:'private note'}],evidenceConsent:false}));
 assert.equal(response.status,400);assert.match((await response.json()).error,/允许将这些本地短摘录/);assert.equal(calls,0);
});
