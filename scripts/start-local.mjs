import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const children=[];
const busy=(port,host)=>new Promise(resolve=>{const socket=net.createConnection({host,port});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.setTimeout(1000,()=>{socket.destroy();resolve(false)});});
const webRunning=await busy(5173,'localhost')||await busy(5173,'127.0.0.1'),libraryRunning=await busy(8765,'127.0.0.1');
const bundled=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.TUTOR_PYTHON||(existsSync(bundled)?bundled:'python');
function start(exe,args){const child=spawn(exe,args,{stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});children.push(child);child.on('error',e=>console.error(e.message));return child;}
if(!libraryRunning){
 const check=spawnSync(python,['-c','import pypdfium2'],{stdio:'inherit',windowsHide:true});
 if(check.status!==0){console.error('早觉雨大人，本地 PDF 服务需要 Python 和 pypdfium2。请查看 README 的环境说明。');process.exit(1);}
 start(python,['local_library/service.py']);
}
if(!webRunning){
 const prepare=spawnSync(process.execPath,['scripts/prepare-local.mjs'],{stdio:'inherit',windowsHide:true});
 if(prepare.status!==0){for(const c of children)c.kill();process.exit(prepare.status||1);}
 start(process.execPath,['scripts/run-framework.mjs','dev','--host','127.0.0.1']);
}
console.log('\n早觉雨大人，请打开 http://localhost:5173/ 。启动窗口请保持打开，按 Ctrl+C 停止本次启动的服务。');
if(webRunning||libraryRunning)console.log('检测到已有服务端口；已保留现有进程。如果页面无法使用，请先检查端口占用。');
function stop(){for(const c of children)c.kill();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);

