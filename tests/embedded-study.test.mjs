import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {pdfNotes,embeddedStudyContext} from '../lib/pdf-notes.ts';
import {topics} from '../lib/curriculum.ts';
import {mathMarkdown} from '../lib/math-markdown.ts';

test('every course topic has self-contained PDF-based learning and reinforcement',()=>{
 assert.equal(topics.length,35);
 for(const topic of topics){
  const notes=pdfNotes.filter(n=>n.topics.includes(topic.id));
  assert(notes.length>0,topic.id);
  assert(notes.some(n=>n.content.length>600),topic.id+' needs a substantive review');
  assert(notes.flatMap(n=>n.exercises).length>=2,topic.id);
  assert(embeddedStudyContext(topic.id).every(n=>n.content&&n.exercises.length===2));
 }
 assert.deepEqual(embeddedStudyContext('unknown'),[]);
});

test('all published lessons, hints and solutions render through the real Markdown/KaTeX pipeline',()=>{
 for(const note of pdfNotes){
  for(const field of [note.content,...note.exercises.flatMap(e=>[e.question,e.hint,e.solution])]){
   assert(!/[\uFFFD\uE000-\uF8FF\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(field),note.id+' invalid text');
   const html=renderToStaticMarkup(createElement(Markdown,{remarkPlugins:[remarkMath],rehypePlugins:[[rehypeKatex,{throwOnError:true,trust:false}]]},mathMarkdown(field)));
   assert(!html.includes('katex-error'),note.id);
   const expected=[...field.matchAll(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)].length;
   assert.equal((html.match(/class="katex"/g)||[]).length,expected,note.id+' lost a math delimiter');
  }
 }
});

test('model LaTeX delimiters normalize without rewriting code',()=>{
 const input=String.raw`inline \(x^2\), display \[\frac12\]`;
 assert.match(mathMarkdown(input),/\$x\^2\$/);
 const fenced='```tex\n\\[x\\]\n```';
 assert.equal(mathMarkdown(fenced),fenced);
 assert.equal(mathMarkdown('`\\(x\\)`'),'`\\(x\\)`');
});

function simpson(f,a,b,n=4000){const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3;}
test('calculus parameters, symmetry and integral-equation solution agree with independent evaluations',()=>{
 const integral=simpson(x=>x/(Math.sin(x)+Math.cos(x)),0,Math.PI/2);
 assert(Math.abs(integral-Math.PI*Math.log(1+Math.sqrt(2))/(2*Math.sqrt(2)))<1e-10);
 for(const x of [.01,.2,.5,1]){
  assert(Math.log1p(x)<=x-(1-Math.log(2))*x*x+1e-12);
  const rhs=1+simpson(t=>(x-t)*Math.cosh(t),0,x);
  assert(Math.abs(rhs-Math.cosh(x))<1e-10);
 }
 assert(Math.log(2)>1-(1-Math.log(2)+.001));
 let x=1;for(let n=1;n<12;n++){assert(x<2);assert(2-x<=(2+Math.sqrt(3))**(1-n)+1e-14);x=Math.sqrt(2+x);}
});
test('ODE reference solutions satisfy equations and initial conditions numerically',()=>{
 const f=x=>x*x*(Math.exp(x)-Math.E);
 const g=x=>Math.exp(x)*(1-x+x**3/6);
 const h=1e-4;
 for(const x of [.3,.7,1.2]){
  const df=(f(x+h)-f(x-h))/(2*h);
  assert(Math.abs(df-2*f(x)/x-x*x*Math.exp(x))<1e-6);
  const dg=(g(x+h)-g(x-h))/(2*h),ddg=(g(x+h)-2*g(x)+g(x-h))/h**2;
  assert(Math.abs(ddg-2*dg+g(x)-x*Math.exp(x))<1e-6);
 }
 assert.equal(f(1),0);assert.equal(g(0),1);assert(Math.abs((g(h)-g(-h))/(2*h))<1e-7);
});
test('data structure solutions match explicit stack, merge and inversion simulations',()=>{
 function stack(target){let next=1,max=0,s=[];for(const v of target){while(s.at(-1)!==v&&next<=5){s.push(next++);max=Math.max(max,s.length);}if(s.pop()!==v)return null;}return max;}
 assert.equal(stack([3,2,5,4,1]),3);assert.equal(stack([3,1,2,5,4]),null);
 let weights=[2,3,7,9,12],cost=0;while(weights.length>1){weights.sort((a,b)=>a-b);const x=weights.shift()+weights.shift();cost+=x;weights.push(x);}assert.equal(cost,71);
 const a=[4,1,3,2,2];let inversions=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)inversions+=+(a[i]>a[j]);assert.equal(inversions,6);
});
test('cache and virtual-memory solutions match independent state simulation',()=>{
 function hits(ways){const groups=Array.from({length:4/ways},()=>[]);let count=0;for(const addr of [0,4,64,0,68,16,20,80]){const block=Math.floor(addr/16),set=groups[block%groups.length];const i=set.indexOf(block);if(i>=0){count++;set.splice(i,1);}else if(set.length===ways)set.shift();set.push(block);}return count;}
 assert.equal(hits(1),2);assert.equal(hits(2),4);
 function faults(lru){const frames=[];let misses=0;for(const p of [1,2,3,1,4,1,2,5]){const i=frames.indexOf(p);if(i<0){misses++;if(frames.length===3)frames.shift();frames.push(p);}else if(lru){frames.splice(i,1);frames.push(p);}}return misses;}
 assert.equal(faults(false),7);assert.equal(faults(true),6);
 assert.equal(0x2a*1024+(0x1234%1024),0xaa34);
 assert.equal((8+512+512**2)*2048,537935872);
});
test('CRC and floating-point examples decode independently',()=>{
 function rem(value){const g=0b1011;while(value>=8){const shift=Math.floor(Math.log2(value))-3;value^=g<<shift;}return value;}
 assert.equal(rem(0b1101<<3),1);assert.equal(rem(0b1101001),0);
 const b=new ArrayBuffer(4),view=new DataView(b);view.setUint32(0,0xc1200000,true);assert.equal(view.getFloat32(0,true),-10);assert.deepEqual([...new Uint8Array(b)],[0,0,32,193]);
 const pieces=[1480,1480,1040];assert.equal(pieces.reduce((a,b)=>a+b),4000);assert.deepEqual([0,pieces[0]/8,(pieces[0]+pieces[1])/8],[0,185,370]);
});
