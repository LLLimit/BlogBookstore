import {defineConfig,loadEnv} from 'vite';
import {existsSync,rmSync} from 'node:fs';
import {appendFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';

const root=dirname(fileURLToPath(import.meta.url));
export default defineConfig(async({command,mode,isPreview})=>{
  const env={...loadEnv(mode,root,'BOOKSTORE_'),...process.env};
  const bundled=resolve(root,'.local/php/php.exe');
  const php=env.BOOKSTORE_PHP_BIN||(existsSync(bundled)?bundled:'php');
  const available=command==='serve'&&spawnSync(php,['-v'],{windowsHide:true,stdio:'ignore'}).status===0;
  const port=available?await new Promise((done,error)=>{const socket=createServer();socket.once('error',error);socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>done(p));});}):null;
  let child;
  async function startBackend(server){
    server.middlewares.use((req,res,next)=>{
      let path;
      try{path=decodeURIComponent((req.url||'').split('?')[0]);}catch{res.statusCode=400;res.end();return;}
      if(/(?:^|\/)\.(?:bookstore|local|git)(?:\/|$)|(?:^|\/)\.env(?:\.|\/|$)/i.test(path)
        || /\.php(?:\/|$)/i.test(path)&&(!/^\/(?:api|admin)\//.test(path)||path!==(req.url||'').split('?')[0])){
        res.statusCode=404;res.end();return;
      }
      next();
    });
    if(!available){
      server.middlewares.use((req,res,next)=>{
        if(/^\/admin(?:\/|$)/.test(req.url||'')){
          res.statusCode=503;res.setHeader('Content-Type','text/html; charset=utf-8');
          res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>书店后台</title><body><h1>后台需要 PHP</h1><p>安装 PHP 并启用 cURL、DOM / XML 扩展，将 BOOKSTORE_PHP_BIN 填入 .env 后重新启动。服务器部署时直接使用 PHP 网站即可。</p><a href="../">返回书店</a></body></html>');return;
        }
        if(/^\/api\/.*\.php(?:\?|$)/.test(req.url||'')){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end('{"error":"PHP backend is not running"}');return;}
        next();
      });
      return;
    }
    await mkdir(resolve(root,'.local'),{recursive:true});
    const configFile=resolve(root,'.local/config.json');
    child=spawn(php,['-S','127.0.0.1:'+port,'-t',resolve(root,isPreview?'dist':'public')],{
      windowsHide:true,stdio:['ignore','ignore','pipe'],
      env:{...env,BOOKSTORE_DEV:'1',BOOKSTORE_DATA_DIR:env.BOOKSTORE_DATA_DIR||resolve(root,'.local/data'),...(existsSync(configFile)?{BOOKSTORE_CONFIG_FILE:configFile}:{})}
    });
    const log=data=>appendFile(resolve(root,'.local/php-server.log'),data).catch(()=>{});
    child.stderr.on('data',log);
    child.on('error',error=>log(error.message+'\n'));
    const stop=()=>child?.kill();
    process.once('exit',stop);
    server.httpServer?.once('close',()=>{stop();process.removeListener('exit',stop);});
    // Wait for the development server to listen before Vite accepts requests.
    let timer,ready;
    try{
      await new Promise((done,error)=>{
        ready=data=>{if(data.toString().includes('Development Server')&&data.toString().includes('started'))done();};
        child.stderr.on('data',ready);
        child.once('error',error);
        child.once('exit',code=>error(new Error('PHP 后台启动失败，退出码 '+code+'。请查看 .local/php-server.log。')));
        timer=setTimeout(()=>error(new Error('PHP 后台启动超时，请查看 .local/php-server.log。')),5000);
      });
    }catch(error){stop();throw error;}
    finally{clearTimeout(timer);child.stderr.off('data',ready);}
  }
  return {
    base:'./',
    server:{
      proxy:available?{'/api':{target:'http://127.0.0.1:'+port},'/admin':{target:'http://127.0.0.1:'+port}}:undefined,
      fs:{deny:['.env','.env.*','**/.git/**','**/.local/**','**/.bookstore/**','**/*.pem','**/*.key','**/*.crt']}
    },
    build:{chunkSizeWarningLimit:650,rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/three/'))return 'three';}}}},
    plugins:[{
      name:'bookstore-server',
      configureServer:startBackend,
      configurePreviewServer:startBackend,
      closeBundle(){
        // Runtime passwords, sessions and feed caches must never enter a release.
        const dist=resolve(root,'dist'),privatePath=resolve(dist,'.bookstore');
        if(dirname(privatePath)!==dist)throw new Error('Invalid runtime data path');
        if(existsSync(privatePath))rmSync(privatePath,{recursive:true,force:true});
      }
    }]
  };
});
