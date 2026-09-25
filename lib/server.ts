import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export {env};
export class HttpError extends Error{constructor(message:string,public status=400){super(message);}}
export async function owner(request:Request){const u=await getChatGPTUser();if(!u)throw new HttpError('早觉雨大人，请先登录后再保存学习记录。',401);if(request.method!=='GET'){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new HttpError('请求来源不匹配',403);}return u.userId;}
export function db(){if(!env.DB)throw new HttpError('早觉雨大人，学习记录暂时无法连接，请保留输入后重试。',503);return env.DB;}
export function secret(){if(!env.STORAGE_KEY)throw new HttpError('早觉雨大人，加密存储尚未配置，暂不接收图片。',503);return env.STORAGE_KEY;}
export function failure(e:unknown){return Response.json({error:e instanceof HttpError?e.message:'早觉雨大人，这一步暂时没有完成。输入已保留，请稍后重试。'},{status:e instanceof HttpError?e.status:503,headers:{'Cache-Control':'no-store'}});}
export async function boundedBody(request:Request,max:number){const reader=request.body?.getReader();if(!reader)return new Uint8Array();const parts:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError('内容过大，请缩小后重试',413);}parts.push(value);}const out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
export async function json(request:Request,max=100000){const raw=new TextDecoder().decode(await boundedBody(request,max));try{return JSON.parse(raw);}catch{throw new HttpError('请求内容格式不正确');}}
