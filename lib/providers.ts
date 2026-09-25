export type ProviderId='qwen'|'deepseek'|'siliconflow'|'compatible';
export type ModelConfig={provider:ProviderId;baseUrl:string;textModel:string;visionModel:string};
export const providers=[
 {id:'qwen',name:'通义千问',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',textModel:'qwen-plus',visionModel:'qwen3-vl-plus',docs:'https://help.aliyun.com/zh/model-studio/get-api-key'},
 {id:'deepseek',name:'DeepSeek',baseUrl:'https://api.deepseek.com',textModel:'deepseek-chat',visionModel:'',docs:'https://api-docs.deepseek.com/'},
 {id:'siliconflow',name:'硅基流动',baseUrl:'https://api.siliconflow.cn/v1',textModel:'Qwen/Qwen3.6-27B',visionModel:'',docs:'https://docs.siliconflow.cn/'},
 {id:'compatible',name:'其他兼容接口',baseUrl:'',textModel:'',visionModel:'',docs:'https://docs.siliconflow.cn/docs/api/chat-completions-post'},
] as const;
export const initialConfig:ModelConfig={provider:'qwen',baseUrl:providers[0].baseUrl,textModel:providers[0].textModel,visionModel:providers[0].visionModel};
export function validateModelConfig(value:unknown,extraHosts=''):ModelConfig{
 const c=value as ModelConfig;if(!c||!providers.some(p=>p.id===c.provider))throw Error('请选择模型服务');
 let url:URL;try{url=new URL(c.baseUrl);}catch{throw Error('请填写有效的 HTTPS API 地址');}
 if(url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||url.hostname.includes(':')||/^[\d.]+$/.test(url.hostname))throw Error('API 地址必须使用允许的公网服务域名，不能使用本机或 IP 地址');
 const allowed=new Set(['dashscope.aliyuncs.com','dashscope-intl.aliyuncs.com','api.deepseek.com','api.siliconflow.cn',...extraHosts.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)]);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port&&url.port!=='443'||!allowed.has(url.hostname))throw Error('此 API 地址未被允许。可使用千问、DeepSeek、硅基流动；其他域名需加入服务端 MODEL_ALLOWED_HOSTS。');
 if(!/^[A-Za-z0-9_./:@+\-]{1,150}$/.test(c.textModel||''))throw Error('请填写服务商控制台中的文本模型 ID');
 if(c.visionModel&&!/^[A-Za-z0-9_./:@+\-]{1,150}$/.test(c.visionModel))throw Error('图片模型 ID 格式不正确');
 return {...c,baseUrl:url.href.replace(/\/+$/,'')};
}
