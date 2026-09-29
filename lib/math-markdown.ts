// Preserve fenced/inline code while accepting the two common LaTeX delimiter styles.
export function mathMarkdown(text:string):string{
 return text.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part,i)=>i%2?part:part
  .replace(/\\\[([\s\S]*?)\\\]/g,(_,formula)=>'\n\n$$\n'+formula.trim()+'\n$$\n\n')
  .replace(/\\\(([^\n]*?)\\\)/g,(_,formula)=>'$'+formula.trim()+'$')
  .replace(/\$\$([\s\S]*?)\$\$/g,(_,formula)=>'\n\n$$\n'+formula.trim()+'\n$$\n\n')
 ).join('');
}
