import test from 'node:test';
import assert from 'node:assert/strict';
import {providers,validateModelConfig} from '../lib/providers.ts';
import {localEvidence} from '../lib/tutor-policy.ts';
test('all configured providers and an explicitly allowed compatible domain validate',()=>{
 for(const p of providers.filter(p=>p.id!=='compatible'))assert.equal(validateModelConfig({...p,provider:p.id}).baseUrl,p.baseUrl);
 assert.equal(validateModelConfig({provider:'compatible',baseUrl:'https://models.example.com/v1/',textModel:'model-v1',visionModel:''},'models.example.com').baseUrl,'https://models.example.com/v1');
});
test('unknown destinations, credentials in URL and local IPs cannot receive keys',()=>{
 for(const baseUrl of ['http://api.deepseek.com/v1','https://untrusted.example/v1','https://key@api.deepseek.com/v1','https://api.deepseek.com/v1?key=secret','https://127.0.0.1/v1','https://localhost/v1','https://[::1]/v1'])
 assert.throws(()=>validateModelConfig({provider:'compatible',baseUrl,textModel:'valid',visionModel:''},'127.0.0.1,localhost,[::1]'));
});
test('filename-only hits cannot become evidence; external context is bounded',()=>{
 const values=[{id:'scan',title:'scan.pdf',page:1,snippet:'only filename',quality:'filename_only'},...Array.from({length:6},()=>({id:'d',title:'book.pdf',page:2,snippet:'x'.repeat(2000),quality:'text'}))];
 const result=localEvidence(values);assert.equal(result.length,4);assert(result.every(x=>x.snippet.length<=500));
 assert.deepEqual(localEvidence([{id:'d',title:'book',page:-1,snippet:'x',quality:'text'}]),[]);
});

