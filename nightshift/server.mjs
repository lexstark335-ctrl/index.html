import http from 'node:http';
import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {normalizeContent} from './dist/content.js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
export function createLocalServer(directory=root){
  let writes=Promise.resolve();
  return http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      const port=req.socket.localPort;const allowedHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      if(!allowedHosts.includes(req.headers.host))return json(403,{error:'仅支持从本机预览地址访问。'});
      const url=new URL(req.url,`http://${req.headers.host}`);
      if(url.pathname==='/api/local-config'&&req.method==='GET')return json(200,{canWrite:true});
      if(url.pathname==='/api/content'&&req.method==='PUT'){
        if(req.headers.origin!==`http://${req.headers.host}`||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'资料只能由本机同源编辑器写入。'});
        if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'请使用 JSON 资料。'});
        let size=0;const chunks=[];
        for await(const chunk of req){size+=chunk.length;if(size>1_000_000)return json(413,{error:'资料不能超过 1 MB。'});chunks.push(chunk);}
        let content;try{content=normalizeContent(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(error){return json(400,{error:error.message});}
        const job=writes.catch(()=>{}).then(async()=>{const target=path.join(directory,'content.json');const temporary=path.join(directory,'content.json.pending');await writeFile(temporary,JSON.stringify(content,null,2)+'\n','utf8');await rename(temporary,target);});writes=job;await job;return json(200,{saved:true});
      }
      if(url.pathname.startsWith('/api/'))return json(404,{error:'接口不存在。'});
      if(!['GET','HEAD'].includes(req.method))return json(405,{error:'不支持此操作。'});
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return json(400,{error:'地址格式错误。'});}
      if(pathname==='/' )pathname='/index.html';
      const filename=path.resolve(directory,'.'+pathname);const relative=path.relative(directory,filename);
      if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(/[\\/]/).some(part=>part.startsWith('.')))return json(403,{error:'该路径不可访问。'});
      if(!(await stat(filename)).isFile())return json(404,{error:'文件不存在。'});
      const data=await readFile(filename);res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')json(404,{error:'文件不存在。'});else{console.error(error.message);json(500,{error:'本地保存或读取失败，请检查文件权限。'});}}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const port=Number(process.env.PORT||4173);const server=createLocalServer();
  server.on('request',(req,res)=>{res.once('finish',()=>{const requestPath=new URL(req.url,'http://localhost').pathname;console.log(`${req.method} ${requestPath} -> ${res.statusCode}`);});});
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。可以设置 PORT 后重新启动。`:error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`NIGHTSHIFT is ready\nLocal: http://127.0.0.1:${port}\nContent editor writes to dist/content.json\nPress Ctrl+C to stop.`));
}
