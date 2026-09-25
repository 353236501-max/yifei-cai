import type {Plugin} from 'vite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import http from 'node:http';
export function localLibrary():Plugin{return {name:'yuzhi-local-library',configureServer(server){server.middlewares.use((req,res,next)=>{
 if(!req.url?.startsWith('/api/library/'))return next();
 const host=req.headers.host||'';const origin=req.headers.origin;
 if(!/^(localhost|127\.0\.0\.1):\d+$/.test(host)|| (origin&&origin!==`http://${host}`)||req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'早觉雨大人，本地资料仅允许本机同源访问。'}));return;}
 let token:string;try{token=readFileSync(resolve(server.config.root,'.sites-runtime/library/token'),'utf8').trim();}catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'早觉雨大人，本地知识库服务尚未启动。'}));return;}
 const request=http.request({hostname:'127.0.0.1',port:8765,path:req.url.slice('/api/library'.length),method:req.method,headers:{'X-Library-Token':token,...(req.headers['content-type']?{'Content-Type':req.headers['content-type']}:{}),...(req.headers['content-length']?{'Content-Length':req.headers['content-length']}:{}),...(req.headers.range?{Range:req.headers.range}:{})}},upstream=>{res.writeHead(upstream.statusCode||502,upstream.headers);upstream.pipe(res);});
 request.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'早觉雨大人，本地知识库暂时未连接，请启动本地资料服务。'}));});req.pipe(request);res.on('close',()=>request.destroy());
 });}};}
