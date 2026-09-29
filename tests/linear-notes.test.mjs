import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfNotes} from '../lib/pdf-notes.ts';
import {topics} from '../lib/curriculum.ts';

const I=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
const scale=(a,k)=>a.map(row=>row.map(x=>x*k));
const add=(a,b)=>a.map((row,i)=>row.map((x,j)=>x+b[i][j]));
const mul=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>s+x*b[k][j],0)));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const pow=(a,n)=>{let p=I(a.length);while(n--)p=mul(p,a);return p;};
const close=(a,b)=>a.forEach((row,i)=>row.forEach((x,j)=>assert(Math.abs(x-b[i][j])<1e-8,`${x} != ${b[i][j]}`)));
const det=a=>a.length===1?a[0][0]:a[0].reduce((s,x,j)=>s+(-1)**j*x*det(a.slice(1).map(row=>row.filter((_,k)=>k!==j))),0);
const rank=a=>{a=a.map(row=>[...row]);let r=0;for(let j=0;j<a[0].length&&r<a.length;j++){let p=a.findIndex((row,i)=>i>=r&&Math.abs(row[j])>1e-9);if(p<0)continue;[a[p],a[r]]=[a[r],a[p]];const pivot=a[r][j];a[r]=a[r].map(x=>x/pivot);for(let i=r+1;i<a.length;i++){const k=a[i][j];a[i]=a[i].map((x,c)=>x-k*a[r][c]);}r++;}return r;};

test('notes and exercise identifiers are unique and map to real syllabus topics',()=>{
 assert.equal(new Set(pdfNotes.map(n=>n.id)).size,pdfNotes.length);
 const exercises=pdfNotes.flatMap(n=>n.exercises);
 assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);
 for(const n of pdfNotes){assert.match(n.documentId,/^[a-f0-9]{24}$/);assert(n.topics.every(id=>topics.some(t=>t.id===id)));}
});
test('determinant parameter branches and adjugate ranks are checked by minors',()=>{
 for(const t of [-3,-2,-1,0,1,2,4]){
  const a=[[t,1,1],[1,t,1],[1,1,t]];
  assert.equal(det(a),(t-1)**2*(t+2));
  assert.equal(rank(a),t===1?1:t===-2?2:3);
  const adj=transpose(a.map((row,i)=>row.map((_,j)=>(-1)**(i+j)*det(a.filter((_,r)=>r!==i).map(row=>row.filter((_,c)=>c!==j))))));
  assert.equal(rank(adj),t===1?0:t===-2?1:3);
 }
 assert.equal((-8/2)**2,16);
});
test('matrix inverse and power formulas agree with multiplication',()=>{
 const a=[[1,1],[0,2]],eye=I(2);
 close(mul(a,scale(add(scale(eye,3),scale(a,-1)),.5)),eye);
 for(let n=0;n<9;n++)close(pow(a,n),add(scale(a,2**n-1),scale(eye,2-2**n)));
 const N=[[0,1,0],[0,0,1],[0,0,0]],C=add(I(3),N);
 close(mul(C,add(add(I(3),scale(N,-1)),mul(N,N))),I(3));
 for(let n=0;n<9;n++)close(pow(C,n),add(add(I(3),scale(N,n)),scale(mul(N,N),n*(n-1)/2)));
});
test('vector and linear-system parameter solutions satisfy every original equation',()=>{
 for(const t of [-2,0,2,5])assert.equal(rank([[1,0,1,2],[0,1,1,1],[1,1,t,3]]),t===2?2:3);
 for(const u of [-3,0,2])close(mul([[1,0,1],[0,1,1],[1,1,2]],[[2-u],[2-u],[u]]),[[2],[2],[4]]);
 for(const t of [-2,0,2,5])for(const s of [-2,1,3])close(mul([[1,1,1],[1,t,1],[1,1,t]],[[1],[(s-1)/(t-1)],[(1-s)/(t-1)]]),[[1],[s],[2-s]]);
 for(const u of [-2,0,3])for(const v of [-1,0,4]){
  close(mul([[1,1,1],[1,1,1],[1,1,1]],[[1-u-v],[u],[v]]),[[1],[1],[1]]);
  close(mul([[1,2,-1,0],[0,1,1,1]],[[1+3*u+2*v],[1-u-v],[u],[v]]),[[3],[1]]);
 }
 close(mul([[1,2,-1,0],[0,1,1,1]],[[3,2],[-1,-1],[1,0],[0,1]]),[[0,0],[0,0]]);
});
test('eigenvalue power formulas and orthogonal diagonalization are verified',()=>{
 for(const t of [-2,0,3])for(let n=1;n<8;n++)close(pow([[2,t,0],[0,2,0],[0,0,3]],n),[[2**n,n*t*2**(n-1),0],[0,2**n,0],[0,0,3**n]]);
 const k=1/Math.sqrt(2),Q=[[k,k,0],[-k,k,0],[0,0,1]],B=[[2,1,0],[1,2,0],[0,0,3]];
 close(mul(transpose(Q),Q),I(3));close(mul(mul(transpose(Q),B),Q),[[1,0,0],[0,3,0],[0,0,3]]);
 for(let n=0;n<8;n++)close(pow(B,n),[[(3**n+1)/2,(3**n-1)/2,0],[(3**n-1)/2,(3**n+1)/2,0],[0,0,3**n]]);
});
test('quadratic completions reproduce the original matrices at and beyond boundaries',()=>{
 for(const t of [-2,-Math.sqrt(5/3),0,Math.sqrt(5/3),2]){
  const A=[[1,t,0],[t,2,1],[0,1,3]],T=[[0,1/3,1],[3*t/5,1,0],[1,0,0]],D=[[3,0,0],[0,5/3,0],[0,0,1-3*t*t/5]];
  close(mul(mul(transpose(T),D),T),A);
  assert(Math.abs(det(A)-(5-3*t*t))<1e-9);
  assert.equal(rank(A),Math.abs(5-3*t*t)<1e-9?2:3);
 }
 for(const c of [-2,1,3]){
  const T=[[1,1,1],[0,0,1],[0,1,0]],D=[[1,0,0],[0,c-1,0],[0,0,0]],A=[[1,1,1],[1,1,1],[1,1,c]];
  close(mul(mul(transpose(T),D),T),A);assert.equal(rank(A),c===1?1:2);
 }
});
