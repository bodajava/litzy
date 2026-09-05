const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/Users/abdelrhmannounir/Desktop/litzy';
const T={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json','.svg':'image/svg+xml','.webm':'video/webm','.mov':'video/quicktime','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const f=path.join(ROOT,p);
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end();}
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('404');}
    res.writeHead(200,{'Content-Type':T[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(d);
  });
}).listen(4321,()=>console.log('serving on 4321'));
