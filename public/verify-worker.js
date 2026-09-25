/* Runs only bounded, authored SymPy checks; never executes user code. */
let runtime;
onmessage=async ({data})=>{try{const {topic,n}=data;if(!Number.isInteger(n)||n<2||n>8)throw Error('Invalid parameters');if(!runtime){importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');runtime=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});await runtime.loadPackage('sympy');}runtime.globals.set('topic_id',String(topic));runtime.globals.set('n',n);const result=runtime.runPython(`
import sympy as s, json
x,y,h=s.symbols('x y h', real=True)
checks={
'limit': lambda: s.limit(s.sin(n*x)/x,x,0),
'derivative': lambda: s.limit(((n+h)**2-n**2)/h,h,0),
'integral': lambda: s.integrate(2*x,(x,0,n)),
'multivariable': lambda: s.diff(x*x+y*y,x).subs(x,n),
'ode': lambda: (x*x+n).subs(x,1),
'det': lambda: s.Matrix([[n,1],[2,3]]).det(),
'matrix': lambda: (s.Matrix([[1,n],[0,1]])**2)[0,1],
'vector': lambda: s.Matrix([[1,0,n],[0,1,1]]).rank(),
'system': lambda: s.Integer((n+2)-n),
'eigen': lambda: max(s.diag(n,n+2).eigenvals()),
'quadratic': lambda: s.expand(x*x+2*n*x*y+3*y*y).coeff(x,1).coeff(y,1)/2
}
if topic_id not in checks: raise ValueError('此主题暂不支持符号检查')
result=checks[topic_id]()
json.dumps({'result':str(result),'engine':'SymPy '+s.__version__, 'formalized':False,'lean_status':'not_run','numeric_status':'symbolic_computed','human_review_required':True})
`);postMessage({ok:true,...JSON.parse(result)});}catch(e){postMessage({ok:false,error:String(e.message||e)});}};
