export async function GET(){return Response.json({connected:false,error:'早觉雨大人，本地资料只在本机工作台中读取。请打开本机网页并启动资料服务；原始教材没有上传到本站。'},{status:503});}
export const POST=GET;
