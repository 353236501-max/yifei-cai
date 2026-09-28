import test from 'node:test';
import assert from 'node:assert/strict';
import {modelKey,modelRequest} from '../lib/model-request.ts';
import {validateModelConfig} from '../lib/providers.ts';

test('DeepSeek pasted endpoint is normalized; a mismatched provider cannot receive the key',()=>{
 for(const suffix of ['', '/', '/v1', '/v1/', '/chat/completions', '/v1/chat/completions', '/models']){
  const config=validateModelConfig({provider:'deepseek',baseUrl:'https://api.deepseek.com'+suffix,textModel:'deepseek-chat',visionModel:''});
  assert.equal(config.baseUrl,'https://api.deepseek.com'+(suffix.startsWith('/v1')?'/v1':''));
 }
 assert.throws(()=>validateModelConfig({provider:'deepseek',baseUrl:'https://api.siliconflow.cn/v1',textModel:'deepseek-chat',visionModel:''}));
 assert.equal(modelKey('  test-key-123  ','fallback-key'),'test-key-123');
 assert.throws(()=>modelKey('Bearer test-key-123','fallback-key'));
 assert.throws(()=>modelKey('invalid','fallback-key'));
});

test('model requests distinguish errors, do not echo secrets, and parse success',async(t)=>{
 let impl;
 t.mock.method(globalThis,'fetch',async(url,init)=>{assert.equal(init.redirect,'error');assert(init.signal);return impl(url,init)});
 impl=async()=>Response.json({choices:[{message:{content:'ok'}}]});
 assert.equal((await modelRequest('https://api.deepseek.com/chat/completions',{},'DeepSeek')).choices[0].message.content,'ok');
 for(const status of [401,402,403,404,429,503]){
  impl=async()=>new Response('secret-key-and-private-prompt',{status});
  await assert.rejects(modelRequest('https://api.deepseek.com/models',{},'DeepSeek'),e=>e.message.includes(`HTTP ${status}`)&&!e.message.includes('secret-key'));
 }
 impl=async()=>{throw new TypeError('fetch failed with private details')};
 await assert.rejects(modelRequest('https://api.siliconflow.cn/v1/models',{},'硅基流动'),e=>e.message.includes('硅基流动')&&!e.message.includes('DeepSeek')&&!e.message.includes('private details'));
 impl=async()=>{throw new DOMException('timeout','TimeoutError')};
 await assert.rejects(modelRequest('https://api.deepseek.com/models',{},'DeepSeek',20_000),/20 秒/);
 impl=async()=>new Response('<html>gateway failure</html>');
 await assert.rejects(modelRequest('https://api.deepseek.com/models',{},'DeepSeek'),/无法解析/);
});
