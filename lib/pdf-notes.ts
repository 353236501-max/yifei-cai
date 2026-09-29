import type {PdfNote} from './pdf-note-types';
import {linearNotes} from './pdf-linear-notes.ts';
import {calculusReviewNotes} from './pdf-calculus-notes.ts';
import {dataStructureNotes} from './pdf-ds-notes.ts';
import {organizationNotes} from './pdf-co-notes.ts';
import {operatingSystemNotes} from './pdf-os-notes.ts';
import {networkNotes} from './pdf-network-notes.ts';

const calculusNote:PdfNote={
  "id": "calculus-integral-limit",
  "topics": [
    "derivative",
    "limit",
    "integral"
  ],
  "title": "导数定义 → 局部等价 → 变限积分 → 极限阶数",
  "source": "(205)--第十周5.18-5.24答案_已解密.pdf",
  "documentId": "c52cfef6ad5d3ee7b24fc573",
  "pages": [
    7
  ],
  "sourceDetail": "第 5 题",
  "content": "早觉雨大人，这类综合题可以分成四步：从导数读出局部形态，检查根号条件，判断积分阶数，最后计算系数。每一步都有明确的依据。\n\n**资料考点与补充推导。** 原页第 5 题涉及导数定义、等价无穷小、变限积分和洛必达法则。下面是助教按这一方法链重新整理的复习讲解与原创改编，不是原题转录。资料属于混合卷种，本页这些考点适用于数学二。\n\n**一、由导数得到什么？** 设 $f$ 在 $0$ 附近连续，在 $0$ 可导，$f(0)=0$、$f'(0)=a>0$。由定义有\n$$f(t)=at+o(t),\\qquad t\\to0^+.$$\n所以右侧充分靠近 $0$ 时 $f(t)>0$，$\\sqrt{f(t)}$ 有定义，且 $\\sqrt{f(t)}\\sim\\sqrt a\\,t^{1/2}$。这里 $a>0$ 同时决定根号的定义域和最低阶；若 $a=0$，必须继续寻找首个非零阶，不能沿用这套系数。\n\n**二、先数阶，再运算。** $tf(t)$ 的最低阶为 $t^2$，积分后是三阶；$\\sqrt{f(t)}$ 的最低阶为 $t^{1/2}$，积分后是 $3/2$ 阶，再平方也是三阶。因此比值可能有非零有限极限。若上下阶数不相同，要重新判断趋于零还是发散。\n\n**三、为什么能在积分中使用等价？** 若 $g(t)=c t^p+o(t^p)$、$p>-1$，则\n$$\\int_0^xg(t)\\,dt=\\frac{c}{p+1}x^{p+1}+o(x^{p+1}).$$\n证明要点：对任意 $\\varepsilon>0$，在一个足够小的区间内，余项绝对值不超过 $\\varepsilon t^p$，积分后的误差就不超过 $\\varepsilon x^{p+1}/(p+1)$。这说明替换的条件，避免把“等价可以随便移进积分”当作口诀。\n\n**四、参数化方法总结。** 对 $b,\\lambda>0$，\n$$\\int_0^{\\ln(1+bx)}tf(t)\\,dt\\sim\\frac{ab^3}{3}x^3,\\qquad\n\\left(\\int_0^{\\lambda x}\\sqrt{f(t)}\\,dt\\right)^2\\sim\\frac{4a\\lambda^3}{9}x^3.$$\n比值为 $3b^3/(4\\lambda^3)$。分子上限改变时要整体取三次方；分母上限改变时，积分后再平方。$a$ 抵消是两个最低阶系数共同作用的结果，并不意味着导数条件可以省略。\n\n**五、另一条路：洛必达。** 先确认是 $0/0$ 型。分子导数要保留 $\\ln(1+bx)$ 的链式因子 $b/(1+bx)$；分母是平方，需保留系数 $2$，再对变上限积分求导。若一轮求导仍留有积分，可结合第三步的积分等价处理。仅有 $f'(0)$ 时，不要反复求导并擅自假定 $f''$ 存在。\n\n**复习自测。** 能否解释根号为何有定义？能否先预测阶数？能否写出积分余项估计？能否指出链式法则的每个因子？遇到主项相消时，能否判断要多展开几阶？早觉雨大人，能把这些条件说清楚，就已经把一道题变成一类题的方法了。",
  "exercises": [
    {
      "id": "calculus-scaled-limit",
      "title": "强化：变上限与积分阶数",
      "question": "设 $f$ 在 $0$ 附近连续且在 $0$ 可导，$f(0)=0$、$f'(0)=3$，求\n$$\\lim_{x\\to0^+}\\frac{\\int_0^{\\ln(1+2x)}tf(t)\\,dt}{\\left(\\int_0^x\\sqrt{f(t)}\\,dt\\right)^2}.$$",
      "hint": "先确定分子和分母的阶数，再处理变上限。",
      "solution": "提示：先判两侧阶数，再处理上限。答案为 $6$：分子等价于 $8x^3$，分母等价于 $4x^3/3$。易错点是把上限的 $2$ 当成一次因子。"
    },
    {
      "id": "calculus-cancellation",
      "title": "迁移：主项消去后的高阶项",
      "question": "设 $f$ 在 $0$ 附近二阶连续可导，$f(0)=0$、$f'(0)=2$、$f''(0)=6$。求\n$$\\lim_{x\\to0^+}\\frac1x\\left[\\frac{\\int_0^x tf(t)\\,dt}{\\left(\\int_0^x\\sqrt{f(t)}\\,dt\\right)^2}-\\frac34\\right].$$",
      "hint": "主项相消后，需要比一阶等价多保留一阶。",
      "solution": "这里主项被减掉，单纯一阶等价不够。由 $f(t)=2t+3t^2+o(t^2)$ 得\n$$\\int_0^x tf(t)\\,dt=\\frac23x^3+\\frac34x^4+o(x^4),$$\n$$\\int_0^x\\sqrt{f(t)}\\,dt=\\sqrt2\\left(\\frac23x^{3/2}+\\frac3{10}x^{5/2}+o(x^{5/2})\\right).$$\n分母平方为 $\\frac89x^3+\\frac45x^4+o(x^4)$。比值展开为 $\\frac34+\\frac{27}{160}x+o(x)$，所以答案是 $\\frac{27}{160}$。关键变化是“相减后的消去”要求多保留一阶，而不是简单换数字。"
    }
  ]
};

export const pdfNotes:PdfNote[]=[...calculusReviewNotes,calculusNote,...linearNotes,...dataStructureNotes,...organizationNotes,...operatingSystemNotes,...networkNotes];
export const studyContentVersion='2026-09-29';

// The server selects the published notes itself. Client-supplied snippets cannot replace this provenance.
export function embeddedStudyContext(topicId:string){
 return pdfNotes.filter(note=>note.topics.includes(topicId)).map(note=>({
  title:note.title,source:note.source,pages:note.pages,kind:'根据PDF考点原创整理，含相关方法的延伸；不是PDF原文',
  content:note.content,exercises:note.exercises
 }));
}
