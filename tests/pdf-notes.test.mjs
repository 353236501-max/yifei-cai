import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {pdfNotes} from '../lib/pdf-notes.ts';
import {studyTask} from '../lib/study-task.ts';

test('PDF note has a physical-page reference and every formula renders',()=>{
 for(const note of pdfNotes){
  assert(note.source.endsWith('.pdf'));
  assert(note.pages.length>0&&note.pages.every(page=>Number.isInteger(page)&&page>0));
  assert.equal(note.exercises.length,2);
  const text=[note.content,...note.exercises.flatMap(exercise=>[exercise.question,exercise.hint,exercise.solution])].join('\n');
  assert.equal((text.match(/\$/g)||[]).length%2,0);
  for(const match of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){
   assert.doesNotThrow(()=>katex.renderToString(match[1]||match[2],{throwOnError:true,displayMode:!!match[1]}));
  }
 }
});
test('two exercise answers agree with independent polynomial quadrature',()=>{
 // t=u² removes the square-root singularity before Simpson integration.
 function integral(fn,upper){const n=2000,h=upper/n;let sum=fn(0)+fn(upper);for(let i=1;i<n;i++)sum+=(i%2?4:2)*fn(i*h);return sum*h/3;}
 function ratio(x,upper,f){const numerator=integral(t=>t*f(t),upper);const denominator=integral(u=>2*u*Math.sqrt(f(u*u)),Math.sqrt(x));return numerator/denominator**2;}
 assert(Math.abs(ratio(1e-6,Math.log1p(2e-6),t=>3*t)-6)<3e-5);
 const x=1e-5,coefficient=(ratio(x,x,t=>2*t+3*t*t)-.75)/x;
 assert(Math.abs(coefficient-27/160)<1e-5);
});
test('study modes require conditions, provenance and distinct reinforcement tasks',()=>{
 for(const mode of ['lesson','practice'])assert.match(studyTask(mode),/公式断裂、题干缺失/);
 assert.match(studyTask('lesson'),/方法选择与替代解法/);
 assert.match(studyTask('practice'),/一道强化题，一道综合迁移题/);
});
