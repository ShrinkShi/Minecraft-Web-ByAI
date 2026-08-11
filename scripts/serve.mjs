import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.cwd());
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||4173);
const mime=new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.svg','image/svg+xml'],['.webp','image/webp'],['.ico','image/x-icon']
]);

function safePath(requestUrl='/'){
  const pathname=decodeURIComponent(new URL(requestUrl,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const resolved=path.resolve(root,relative);
  if(resolved!==root&&!resolved.startsWith(`${root}${path.sep}`))return null;
  return resolved;
}

const server=http.createServer(async(req,res)=>{
  try{
    let file=safePath(req.url);
    if(!file){res.writeHead(403);res.end('Forbidden');return;}
    const info=await stat(file).catch(()=>null);
    if(info?.isDirectory())file=path.join(file,'index.html');
    const body=await readFile(file);
    res.writeHead(200,{
      'Content-Type':mime.get(path.extname(file).toLowerCase())||'application/octet-stream',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    });
    if(req.method==='HEAD')res.end();else res.end(body);
  }catch(error){
    if(error?.code==='ENOENT'){res.writeHead(404);res.end('Not Found');return;}
    console.error(error);res.writeHead(500);res.end('Internal Server Error');
  }
});

server.listen(port,host,()=>console.log(`Static server listening on http://${host}:${port}`));
for(const signal of['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
