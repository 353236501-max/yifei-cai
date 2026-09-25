"use client";
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export default function MathText({children}:{children:string}){return <div className="prose-study"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex,{throwOnError:false,trust:false}]]} components={{a:({children,href})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,img:()=>null}}>{children}</Markdown></div>;}
