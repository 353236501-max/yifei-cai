import type {PdfNote} from './pdf-note-types';
import {sourceMap} from './pdf-source-map.ts';

type Task=readonly [title:string,question:string,hint:string,solution:string];
export function note(topic:string,title:string,content:string,tasks:readonly Task[],sourceTopic=topic):PdfNote{
 const source=sourceTopic==='calculus'?{source:'(205)--第十周5.18-5.24答案_已解密.pdf',documentId:'c52cfef6ad5d3ee7b24fc573',pages:[7]}:sourceMap[sourceTopic];
 if(!source)throw new Error('Missing reviewed PDF reference: '+sourceTopic);
 return {...source,id:'embedded-'+topic,topics:[topic],title,
  sourceDetail:'参考已核对页面的考点，讲解与题目为原创整理；延伸内容不代表原页逐项覆盖。文件名中的年份未作官方真题鉴定。',
  content,exercises:tasks.map(([title,question,hint,solution],i)=>({id:topic+'-reinforcement-'+(i+1),title,question,hint,solution}))};
}
