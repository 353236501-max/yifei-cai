"use client";
import {useState} from 'react';
import type {PdfNote} from '@/lib/pdf-note-types';
import MathText from './math-text';

export default function PdfStudy({note,practice,onSave}:{note:PdfNote;practice:boolean;onSave?:(question:string,solution:string)=>void}){
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 return <article className="solution">
  <h3>{note.title}</h3>
  <details className="source-note"><summary>参考资料：{note.source} · 物理页码 {note.pages.join('、')}</summary><p>{note.sourceDetail||'已核对所列原页；讲解与练习为原创整理和迁移。'}</p></details>
  <p className="muted">早觉雨大人，本页讲解、题目与解析已随网页内置，无需导入 PDF，也无需配置模型。来源信息供追溯，未附教材全文。</p>
  {practice?<details><summary>先复习本题所用知识与解题方法</summary><MathText>{note.content}</MathText></details>:<MathText>{note.content}</MathText>}
  {note.exercises.map((exercise,index)=><section className="variant" key={exercise.id}>
   <h4>{index+1}. {exercise.title}</h4>
   <MathText>{exercise.question}</MathText>
   <label htmlFor={exercise.id+'-draft'}>早觉雨大人的解题草稿（保留在当前页面）</label>
   <textarea id={exercise.id+'-draft'} className="w-full rounded-md border p-3" rows={4} value={drafts[exercise.id]||''} onChange={event=>setDrafts({...drafts,[exercise.id]:event.target.value})} placeholder="先列条件，再写方法；公式可使用 LaTeX。"/>
   {drafts[exercise.id]&&<details><summary>查看草稿的公式排版</summary><MathText>{drafts[exercise.id]}</MathText></details>}
   <details><summary>需要一点提示</summary><MathText>{exercise.hint}</MathText></details>
   <details><summary>展开参考答案与分步解析</summary><MathText>{exercise.solution}</MathText><p className="muted">早觉雨大人，核对时先找第一处不同的推理，再检查条件与计算。</p></details>
   {onSave&&<button className="resource-link" onClick={()=>onSave(exercise.question+'\n\n我的步骤：\n'+(drafts[exercise.id]||'尚未填写'),exercise.solution)}>将这道题与草稿加入错题</button>}
  </section>)}
  <p className="muted">早觉雨大人，做完后试着说出本题的方法与适用条件，再回来核对。形式化验证：Lean 未运行。</p>
 </article>;
}
