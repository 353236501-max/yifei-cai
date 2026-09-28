import {failure,HttpError,json,env} from '@/lib/server';
import {validateModelConfig,providers} from '@/lib/providers';
import {modelKey,modelRequest} from '@/lib/model-request';
export async function POST(request:Request){
 try{
  const b=await json(request,10000);
  let config;
  try{config=validateModelConfig({...b.config,textModel:b.config?.textModel||'list'},env.MODEL_ALLOWED_HOSTS);}
  catch(e){throw new HttpError((e as Error).message);}
  const apiKey=modelKey(b.key,config.provider==='deepseek'?env.DEEPSEEK_API_KEY:'');
  const providerName=providers.find(p=>p.id===config.provider)!.name;
  const data=await modelRequest(config.baseUrl+'/models',{headers:{Authorization:'Bearer '+apiKey}},providerName,20_000);
  if(!Array.isArray(data?.data))throw new HttpError('早觉雨大人，服务返回的模型列表格式不正确，请检查基础地址。',502);
  return Response.json({models:data.data.map((x:any)=>x?.id).filter((x:unknown)=>typeof x==='string'&&x.length<150).slice(0,300)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
