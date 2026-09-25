import assert from 'node:assert/strict';
const base='http://localhost:5173';
const auth=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=auth.headers.get('set-cookie')?.split(';')[0];assert(cookie,'local sign-in cookie');
const request=(path,options={})=>fetch(base+path,{...options,headers:{Cookie:cookie,...options.headers}});
assert.equal((await fetch(base+'/api/records')).status,401);
assert.equal((await request('/api/records',{method:'POST',headers:{Origin:'https://wrong.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
assert.equal((await request('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'',text:'test'})})).status,400);
const ids=[];
try{
let r=await request('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'review',topic:'derivative',text:'TEST-ONLY-DELETE-ME',answer:'4'})});assert.equal(r.status,200);const {id}=await r.json();ids.push(id);
const all=await (await request('/api/records')).json();const record=all.records.find(x=>x.id===id);assert.equal(record.payload.text,'TEST-ONLY-DELETE-ME');assert.equal(record.owner,undefined);
r=await request('/api/records',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version:0,rating:3})});assert.equal(r.status,200);
r=await request('/api/records',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version:0,rating:3})});assert.equal(r.status,409);
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lU8AAAAASUVORK5CYII=','base64');
const form=new FormData();form.set('image',new Blob([bytes],{type:'image/png'}),'fixture.png');form.set('topic','derivative');form.set('text','TEST-IMAGE-DELETE-ME');
r=await request('/api/upload',{method:'POST',body:form});assert.equal(r.status,200,await r.clone().text());const upload=await r.json();ids.push(upload.id);
r=await request('/api/upload?id='+upload.id);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
assert.equal((await request('/api/upload?id=does-not-exist')).status,404);
console.log('PASS: authentication, origin, no-key state, encrypted CRUD, FSRS, version conflict, image round-trip, missing record');
}finally{for(const id of ids){const r=await request('/api/records',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});assert.equal(r.status,200);assert.equal((await request('/api/upload?id='+id)).status,404);}console.log('PASS: test data and image deletion');}
